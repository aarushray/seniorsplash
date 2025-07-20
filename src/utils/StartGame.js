import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import assignTargets from './assignTargets';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

const StartGame = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('');

  const handleStartGame = async () => {
    try {
      setStatus('Assigning targets...');
      await assignTargets();

      // This assumes you have a document called 'state' in a collection called 'game'
      const gameStateRef = doc(firestore, 'game', 'state');
      await updateDoc(gameStateRef, { gameStarted: true });

      setStatus('Game has started! Targets assigned.');
      alert('Game has started! Targets assigned.');
    } catch (error) {
      console.error('Failed to start game:', error);
      setStatus(error.message || 'Failed to start game. Check console for details.');
      alert('Failed to start game. Check console for details.');
    }
  };

  const isAdmin = currentUser?.email === 'aarushray210207@gmail.com'; // <- Update to your admin's email

  if (!isAdmin) {
    return <p>You are not authorized to start the game.</p>;
  }

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
