import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

/**
 * Verifies a kill and updates the chain.
 * @param {string} killerId - UID of the player who made the kill.
 * @param {string} victimId - UID of the player who was killed.
 */
export const verifyKill = async (killerId, victimId) => {
  const killerRef = doc(firestore, 'players', killerId);
  const victimRef = doc(firestore, 'players', victimId);

  const killerSnap = await getDoc(killerRef);
  const victimSnap = await getDoc(victimRef);

  if (!killerSnap.exists() || !victimSnap.exists()) {
    throw new Error('Killer or victim not found.');
  }

  const killerData = killerSnap.data();
  const victimData = victimSnap.data();

  // Mark victim as eliminated
  await updateDoc(victimRef, {
    isAlive: false,
  });

  // Transfer victim's target to the killer
  await updateDoc(killerRef, {
    targetId: victimData.targetId || null,
  });

  console.log(`Kill verified: ${victimData.email} eliminated by ${killerData.email}`);
};
