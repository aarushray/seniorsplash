import { doc, collection, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import assignTargets from './assignTargets';

// Export this function for use in AdminDashboard
export const startGame = async () => {
  try {
    console.log('Preparing game...');

    
    const playersQuery = query(
    collection(firestore, 'players'),
    where('isInGame', '==', true)
  );
  const playersSnapshot = await getDocs(playersQuery);

  if (playersSnapshot.size < 2) {
    throw new Error(`Cannot start game with ${playersSnapshot.size} player(s). Minimum 2 players required.`);
  }

  const gameStartTime = new Date();
  // Only process players who are actually in the game
  for (const playerDoc of playersSnapshot.docs) {
        const playerData = playerDoc.data();
        // Double-check that the player is actually in the game
        if (!playerData.isInGame) {
          console.warn(`Skipping player ${playerDoc.id} - not in game`);
          continue;
        }
        
        await updateDoc(doc(firestore, 'players', playerDoc.id), {
            // Core game state
            isAlive: true,
            // Keep isInGame as true (don't change it)
            
            // Statistics that reset each game
            kills: 0,
            splashes: 0,
            purgeKills: 0,
            recentKills: [],
            bountyKills: 0,
            
            // Proof and verification
            proofs: [],
            pendingProofs: [],
                  
            removedFromGame: false,
            removedAt: null,
            
            // Timing and assignments
            gameJoinedAt: gameStartTime,
            eliminatedAt: null,
            eliminatedBy: null,
            lastKnownLocation: '',
            locationUpdatedAt: null,
            
            // Badge system
            badges: [],
            lastBadgeEarned: null,
            lastBadgeTimestamp: null,
            earnedBadges: [],

            deathMessage: null,
            messageToKiller: null
        });
      }

    
    // Create batch update
    const batch = writeBatch(firestore);
    
    
    console.log('Updating player join times...');
    
    
    // Update game state
    const gameStateRef = doc(firestore, 'game', 'state');
    batch.update(gameStateRef, { 
      gameStarted: true,
      gameEnded: false,
      gameStartedAt: gameStartTime
    });
    
    // Commit the batch
    await batch.commit();
    console.log('Game state updated to started');
    
    console.log('Assigning targets...');
    await assignTargets();
    
    console.log('Game has started! Targets assigned.');
    return { success: true, playerCount: playersSnapshot.size };
    
  } catch (error) {
    console.error('Failed to start game:', error);
    throw error;
  }
};