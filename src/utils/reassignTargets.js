import { doc, getDocs, updateDoc, query, where, collection, getDoc, writeBatch } from 'firebase/firestore';
import { getPurgeModeStatus } from './PurgeMode';
import { firestore } from '../firebase/config';

/**
 * Reassigns the killer's target ensuring cross-class targeting with priority system.
 * Also reassigns targets for all other assassins who were targeting the same victim.
 * @param {string} killerUid - The UID of the killer (current user).
 * @param {string} victimId - The ID of the victim.
 */
export async function reassignTargets(killerUid, victimId) {
  try {
    // Find victim by ID
    const victimRef = doc(firestore, 'players', victimId);
    const victimSnap = await getDoc(victimRef);
    
    if (!victimSnap.exists()) {
      throw new Error('Victim not found');
    }
    
    const victimData = victimSnap.data();
    const isPurgeMode = await getPurgeModeStatus();

    // Find ALL players who were targeting this victim (before marking victim as dead)
    const affectedAssassinsQuery = query(
      collection(firestore, 'players'),
      where('targetId', '==', victimId),
      where('isAlive', '==', true),
      where('isInGame', '==', true)
    );
    
    const affectedAssassinsSnap = await getDocs(affectedAssassinsQuery);
    const affectedAssassins = affectedAssassinsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`Found ${affectedAssassins.length} assassin(s) targeting ${victimData.fullName || 'victim'}`);

    // Mark victim as eliminated regardless of purge mode
    await updateDoc(victimRef, {
      isAlive: false,
      targetId: null,
      eliminatedBy: killerUid,
      eliminatedAt: new Date()
    });

    if (!isPurgeMode) {
      // Get all alive players who are in the game (excluding the now-dead victim)
      const alivePlayersQuery = query(
        collection(firestore, 'players'),
        where('isAlive', '==', true),
        where('isInGame', '==', true)
      );

      const alivePlayersSnap = await getDocs(alivePlayersQuery);
      const alivePlayers = alivePlayersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(player => {
          // Double-check that the player is actually alive and in the game
          if (!player.isAlive || !player.isInGame) {
            console.warn(`Skipping player ${player.id} - isAlive: ${player.isAlive}, isInGame: ${player.isInGame}`);
            return false;
          }
          return player.id !== victimId; // Exclude the victim
        });

      // Check if game is over
      if (alivePlayers.length === 1) {
        // Only one player left - they win
        const winner = alivePlayers[0];
        const winnerRef = doc(firestore, 'players', winner.id);
        
        await updateDoc(winnerRef, {
          targetId: null,
          isWinner: true
        });
        
        const gameRef = doc(firestore, 'game', 'state');
        await updateDoc(gameRef, {
          gameOver: true,
          winner: winner.id,
          gameEndedAt: new Date()
        });
        
        console.log(`Game over! Winner: ${winner.fullName}`);
        return null;
      }

      // Reassign targets for ALL affected assassins
      const batch = writeBatch(firestore);
      const reassignmentResults = [];

      for (const assassin of affectedAssassins) {
        const newTargetId = await findNewTargetForPlayer(
          assassin.id, 
          assassin.studentClass || 'Unknown', // CHANGE: use studentClass instead of class
          alivePlayers,
          victimData
        );

        if (newTargetId) {
          const assassinRef = doc(firestore, 'players', assassin.id);
          batch.update(assassinRef, {
            targetId: newTargetId,
            targetAssignedAt: new Date()
          });

          const newTarget = alivePlayers.find(p => p.id === newTargetId);
          reassignmentResults.push({
            assassin: assassin.fullName,
            assassinClass: assassin.studentClass, // CHANGE: use studentClass instead of class
            newTarget: newTarget?.fullName,
            newTargetClass: newTarget?.studentClass // CHANGE: use studentClass instead of class
          });
        } else {
          // No target available for this assassin
          const assassinRef = doc(firestore, 'players', assassin.id);
          batch.update(assassinRef, {
            targetId: null
          });
          
          reassignmentResults.push({
            assassin: assassin.fullName,
            assassinClass: assassin.studentClass, // CHANGE: use studentClass instead of class
            newTarget: null,
            newTargetClass: null
          });
        }
      }

      // Execute all target reassignments
      await batch.commit();

      // Log all reassignments
      console.log('Target reassignments completed:');
      reassignmentResults.forEach(result => {
        if (result.newTarget) {
          console.log(`${result.assassin} (${result.assassinClass}) → ${result.newTarget} (${result.newTargetClass})`);
        } else {
          console.log(`${result.assassin} (${result.assassinClass}) → No target available`);
        }
      });

      return reassignmentResults;
      
    } else {
      // In purge mode, targets are not reassigned immediately
      console.log('Purge mode active - target reassignment deferred');
      return null;
    }
    
  } catch (error) {
    console.error('Error in reassignTargets:', error);
    throw error;
  }
}

/**
 * Find a new target for a specific player using the 4-layer priority system
 * @param {string} playerId - The player who needs a new target
 * @param {string} playerClass - The player's class
 * @param {Array} alivePlayers - Array of all alive players
 * @param {Object} victimData - Data of the eliminated victim
 * @returns {Promise<string|null>} - New target ID or null
 */
async function findNewTargetForPlayer(playerId, playerClass, alivePlayers, victimData) {
  // Exclude the player themselves from potential targets
  const potentialTargets = alivePlayers.filter(p => p.id !== playerId);
  
  if (potentialTargets.length === 0) {
    return null;
  }

  let newTargetId = null;
  let assignmentReason = '';
  
  // LAYER 1: Check if victim's target exists and is from a different class
  if (victimData.targetId) {
    const victimTarget = potentialTargets.find(p => p.id === victimData.targetId);
    
    if (victimTarget && victimTarget.studentClass !== playerClass) {
      newTargetId = victimData.targetId;
      assignmentReason = 'Layer 1: Inherited victim\'s target (different class)';
    }
  }
  
  // LAYER 2: Find alive player from different class that has NO current killers
  if (!newTargetId) {
    const differentClassPlayers = potentialTargets.filter(player => 
      player.studentClass !== playerClass
    );
    
    // Check which players have no current assassins
    const playersWithoutAssassins = [];
    
    for (const player of differentClassPlayers) {
      const assassinCount = await getAssassinCount(player.id);
      if (assassinCount === 0) {
        playersWithoutAssassins.push(player);
      }
    }
    
    if (playersWithoutAssassins.length > 0) {
      const randomIndex = Math.floor(Math.random() * playersWithoutAssassins.length);
      newTargetId = playersWithoutAssassins[randomIndex].id;
      assignmentReason = 'Layer 2: Different class player with no current assassins';
    }
  }
  
  // LAYER 3: Any alive player from different class (even if they have assassins)
  if (!newTargetId) {
    const differentClassPlayers = potentialTargets.filter(player => 
      player.studentClass !== playerClass
    );
    
    if (differentClassPlayers.length > 0) {
      const randomIndex = Math.floor(Math.random() * differentClassPlayers.length);
      newTargetId = differentClassPlayers[randomIndex].id;
      assignmentReason = 'Layer 3: Random different class player';
    }
  }
  
  // LAYER 4: No fallback - return null if no suitable target found
  if (!newTargetId) {
    assignmentReason = 'Layer 4: No suitable target available';
  }

  if (newTargetId) {
    const newTarget = potentialTargets.find(p => p.id === newTargetId);
    console.log(`Assignment for ${playerId}: ${assignmentReason} → ${newTarget?.fullName}`);
  }

  return newTargetId;
}

/**
 * Check if multiple assassins are targeting the same player
 * @param {string} targetId - The target player ID
 * @returns {Promise<number>} - Number of assassins targeting this player
 */
export async function getAssassinCount(targetId) {
  try {
    const assassinsQuery = query(
      collection(firestore, 'players'),
      where('targetId', '==', targetId),
      where('isAlive', '==', true),
      where('isInGame', '==', true)
    );
    
    const assassinsSnap = await getDocs(assassinsQuery);
    return assassinsSnap.size;
  } catch (error) {
    console.error('Error counting assassins:', error);
    return 0;
  }
}

/**
 * Get all players currently targeting a specific player
 * @param {string} targetId - The target player ID
 * @returns {Promise<Array>} - Array of assassin player data
 */
export async function getAssassinsTargeting(targetId) {
  try {
    const assassinsQuery = query(
      collection(firestore, 'players'),
      where('targetId', '==', targetId),
      where('isAlive', '==', true),
      where('isInGame', '==', true)
    );
    
    const assassinsSnap = await getDocs(assassinsQuery);
    const assassins = [];
    
    assassinsSnap.forEach(doc => {
      assassins.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return assassins;
  } catch (error) {
    console.error('Error getting assassins:', error);
    return [];
  }
}

/**
 * Get detailed targeting statistics for debugging
 * @returns {Promise<Object>} - Targeting statistics
 */
export async function getTargetingStats() {
  try {
    const playersQuery = query(
      collection(firestore, 'players'),
      where('isAlive', '==', true),
      where('isInGame', '==', true)
    );
    
    const playersSnap = await getDocs(playersQuery);
    const players = playersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(player => {
        // Double-check that the player is actually alive and in the game
        if (!player.isAlive || !player.isInGame) {
          console.warn(`Skipping player ${player.id} in stats - isAlive: ${player.isAlive}, isInGame: ${player.isInGame}`);
          return false;
        }
        return true;
      });
    
    const stats = {
      totalPlayers: players.length,
      classCounts: {},
      targetCounts: {},
      playersWithoutTargets: 0,
      playersWithoutAssassins: 0
    };
    
    // Count players by class
    players.forEach(player => {
      const playerClass = player.studentClass || 'Unknown'; // CHANGE: use studentClass instead of class
      stats.classCounts[playerClass] = (stats.classCounts[playerClass] || 0) + 1;
      
      if (!player.targetId) {
        stats.playersWithoutTargets++;
      }
    });
    
    // Count assassins per target
    for (const player of players) {
      const assassinCount = await getAssassinCount(player.id);
      stats.targetCounts[player.id] = {
        name: player.fullName,
        class: player.studentClass, // CHANGE: use studentClass instead of class
        assassins: assassinCount
      };
      
      if (assassinCount === 0) {
        stats.playersWithoutAssassins++;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting targeting stats:', error);
    return null;
  }
}