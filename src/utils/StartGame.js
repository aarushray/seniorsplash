import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, collection, query, where, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import assignTargets from './assignTargets';

// Export this function for use in AdminDashboard
export const startGame = async () => {
  try {
    console.log('Preparing game...');

    const gameStartTime = new Date();
    
    const playersQuery = query(
    collection(firestore, 'players'),
    where('isInGame', '==', true)
  );
  const playersSnapshot = await getDocs(playersQuery);

  // Only process players who are actually in the game
  for (const playerDoc of playersSnapshot.docs) {
        await updateDoc(doc(firestore, 'players', playerDoc.id), {
            // Core game state
            isAlive: true,
            isInGame: true,
            
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

// Component version that uses the exported function
const StartGame = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('');

  const handleStartGame = async () => {
    setStatus('Starting game...');
    try {
      const result = await startGame();
      setStatus('Game has started! Targets assigned.');
      alert(`Game has started! ${result.playerCount} players updated with start time.`);
    } catch (error) {
      setStatus('Failed to start game');
      alert(error?.message || 'Failed to start game. Check console for details.');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Admin: Start the Game</h1>
      <button
        onClick={handleStartGame}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Start Game
      </button>
      <p className="mt-4">{status}</p>
    </div>
  );
};

export default StartGame;