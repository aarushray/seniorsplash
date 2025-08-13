import { doc, collection, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import assignTargets from './assignTargets';
import { reassignTargets } from './reassignTargets';

// Export this function for use in AdminDashboard
export const startGame = async () => {
  try {
    const playersQuery = query(
    collection(firestore, 'players'),
    where('isInGame', '==', true)
  );
  const playersSnapshot = await getDocs(playersQuery);

  if (playersSnapshot.size < 2) {
    throw new Error(`Cannot start game with ${playersSnapshot.size} player(s). Minimum 2 players required.`);
  }

  const gameStartTime = new Date();
    // Create batch update
    const batch = writeBatch(firestore);    

    for (const playerDoc of playersSnapshot.docs) {
      const playerData = playerDoc.data();
      if (!playerData.isInGame) {
        console.warn(`Skipping player ${playerDoc.id} - not in game`);
        continue;
      }
      
      const playerRef = doc(firestore, 'players', playerDoc.id);
      batch.update(playerRef, {
        isAlive: true,
      });
    }
    
    // Update game state
    const gameStateRef = doc(firestore, 'game', 'state');
    batch.update(gameStateRef, { 
      gameStarted: true,
      gameEnded: false,
      gameStartedAt: gameStartTime
    });
    
    // Commit the batch
    await batch.commit();
    
    await assignTargets();
    
    return { success: true, playerCount: playersSnapshot.size };
    
  } catch (error) {
    console.error('Failed to start game:', error);
    throw error;
  }
};