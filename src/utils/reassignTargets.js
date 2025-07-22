import { doc, getDocs, updateDoc, query, where, collection, getDoc } from 'firebase/firestore';
import { getPurgeModeStatus } from './PurgeMode';
import { firestore } from '../firebase/config';

/**
 * Reassigns the killer's target to the victim's target and marks the victim as eliminated.
 * @param {string} killerUid - The UID of the killer (current user).
 * @param {string} victimName - The full name of the victim.
 */
export async function reassignTarget(killerUid, victimName) {
  // Find victim by name
  const victimQuery = query(
    collection(firestore, 'players'),
    where('fullName', '==', victimName)
  );
  const victimSnap = await getDocs(victimQuery);

  if (!victimSnap.empty) {
    const victimDoc = victimSnap.docs[0];
    const victimData = victimDoc.data();

    const isPurgeMode = await getPurgeModeStatus();

    // Mark victim as eliminated regardless of purge mode
    await updateDoc(doc(firestore, 'players', victimDoc.id), {
      isAlive: false,
      targetId: null, // Clear victim's target
    });

    if (!isPurgeMode) {
      const killerRef = doc(firestore, 'players', killerUid);
      const killerSnap = await getDoc(killerRef);
      const killerData = killerSnap.data();

      // Get all alive players
      const alivePlayersQuery = query(
        collection(firestore, 'players'),
        where('isAlive', '==', true)
      );
      const alivePlayersSnap = await getDocs(alivePlayersQuery);
      const alivePlayers = alivePlayersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If only two players are left (killer and victim's target), they battle it out
      if (alivePlayers.length === 1 && alivePlayers[0].id === killerUid) {
        // This means the killer is the last person standing. They are the winner.
        await updateDoc(killerRef, {
          targetId: null, // Winner has no target
        });
        const gameRef = doc(firestore, 'game', 'state');
        await updateDoc(gameRef, {
          gameOver: true,
          winner: killerUid,
        });
        return null;
      } else {
        // Reassign the victim's target to the killer
        await updateDoc(killerRef, {
          targetId: victimData.targetId,
        });
        return victimData.targetId;
      }
    } else {
      // In purge mode, targets are not reassigned immediately.
      // The killer's target remains unchanged until purge mode is deactivated.
      return null;
    }
  } else {
    throw new Error('Victim not found');
  }
}
