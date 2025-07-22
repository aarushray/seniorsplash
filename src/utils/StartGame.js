import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import assignTargets from './assignTargets';

/**
 * Starts the game by assigning targets and updating game state
 */
export async function startGame() {
  try {
    // Assign targets to all players
    
    // Update game state to started
    const gameStateRef = doc(firestore, 'game', 'state');
    await updateDoc(gameStateRef, { 
      gameStarted: true,
      gameEnded: false 
    });
    await assignTargets();
    return { success: true };
  } catch (error) {
    console.error('Failed to start game:', error);
    // alert('YASSIGNTARGETS IS ISSUE');
    throw error;
  }
}

const StartGame = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('');

  const handleStartGame = async () => {
    try {
      setStatus('Assigning targets...');
      // await assignTargets();
      console.log('assignTargets finished');
      const gameStateRef = doc(firestore, 'game', 'state');
      await updateDoc(gameStateRef, { gameStarted: true });
      setStatus('Game has started! Targets assigned.');
      alert('Game has started! Targets assigned.');
    } catch (error) {
      console.error('Failed to start game:', error);
      // alert('handlestartgame IS ISSUE');
      alert(error?.message || JSON.stringify(error) || 'Failed to start game. Check console for details.');
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
