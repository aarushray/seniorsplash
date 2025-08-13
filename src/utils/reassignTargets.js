import { doc, getDocs, updateDoc, query, where, collection, getDoc, writeBatch } from 'firebase/firestore';
import { getPurgeModeStatus } from './PurgeMode';
import { firestore } from '../firebase/config';

export async function reassignTargets(killerUid, victimId) {
  try {
    // Fetch victim data
    const victimRef = doc(firestore, 'players', victimId);
    const victimSnap = await getDoc(victimRef);
    if (!victimSnap.exists()) throw new Error('Victim not found');
    const victimData = victimSnap.data();

    const isPurgeMode = await getPurgeModeStatus();

    // Fetch all alive, in-game players in one go
    const playersSnap = await getDocs(
      query(
        collection(firestore, 'players'),
        where('isAlive', '==', true),
        where('isInGame', '==', true)
      )
    );

    const allPlayers = playersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Separate alive players & assassin mapping
    const alivePlayers = allPlayers.filter(p => p.isAlive && p.id !== victimId);
    const alivePlayersMap = Object.fromEntries(alivePlayers.map(p => [p.id, p]));

    // Build assassin count map in one pass
    const assassinCountMap = {};
    for (const p of allPlayers) {
      if (p.targetId) {
        assassinCountMap[p.targetId] = (assassinCountMap[p.targetId] || 0) + 1;
      }
    }

    // Find assassins who targeted the victim
    const affectedAssassins = allPlayers.filter(
      p => p.targetId === victimId && p.isAlive
    );

    // Mark victim as dead
    await updateDoc(victimRef, {
      isAlive: false,
      targetId: null,
      eliminatedBy: killerUid,
      eliminatedAt: new Date()
    });

    // Early exit if Purge Mode
    if (isPurgeMode) {
      console.log('Purge mode active - skipping reassignment');
      return null;
    }

    // Check game over
    if (alivePlayers.length === 1) {
      const winner = alivePlayers[0];
      await updateDoc(doc(firestore, 'players', winner.id), {
        targetId: null,
        isWinner: true
      });
      await updateDoc(doc(firestore, 'game', 'state'), {
        gameOver: true,
        winner: winner.id,
        gameEndedAt: new Date()
      });
      console.log(`Game over! Winner: ${winner.fullName}`);
      return null;
    }

    // Reassign targets (in-memory, then batch update)
    const batch = writeBatch(firestore);
    const reassignmentResults = [];

    for (const assassin of affectedAssassins) {
      const newTargetId = findNewTargetForPlayerFast(
        assassin,
        alivePlayers,
        victimData,
        assassinCountMap
      );

      const assassinRef = doc(firestore, 'players', assassin.id);
      if (newTargetId) {
        batch.update(assassinRef, {
          targetId: newTargetId,
          targetAssignedAt: new Date()
        });
        reassignmentResults.push({
          assassin: assassin.fullName,
          assassinClass: assassin.studentClass,
          newTarget: alivePlayersMap[newTargetId]?.fullName,
          newTargetClass: alivePlayersMap[newTargetId]?.studentClass
        });
      } else {
        batch.update(assassinRef, { targetId: null });
        reassignmentResults.push({
          assassin: assassin.fullName,
          assassinClass: assassin.studentClass,
          newTarget: null,
          newTargetClass: null
        });
      }
    }

    await batch.commit();

    console.log('Target reassignments completed:', reassignmentResults);
    return reassignmentResults;

  } catch (error) {
    console.error('Error in reassignTargets:', error);
    throw error;
  }
}


function findNewTargetForPlayerFast(assassin, alivePlayers, victimData, assassinCountMap) {
  const playerClass = assassin.studentClass;
  const potentialTargets = alivePlayers.filter(p => p.id !== assassin.id && p.studentClass !== playerClass);
  if (potentialTargets.length === 0) return null;

  // Layer 1
  if (victimData.targetId) {
    const victimTarget = potentialTargets.find(p => p.id === victimData.targetId);
    if (victimTarget) return victimTarget.id;
  }

  // Layer 2
  const noAssassinTargets = potentialTargets.filter(p => (assassinCountMap[p.id] || 0) === 0);
  if (noAssassinTargets.length > 0) return randomPick(noAssassinTargets).id;

  // Layer 3
  return randomPick(potentialTargets).id;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
