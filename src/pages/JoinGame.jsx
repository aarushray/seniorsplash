import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const JoinGame = () => {
  const { currentUser } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const GAME_PIN = '1234';

  const handleJoinGame = async () => {
    if (!currentUser){
        navigate('/login');
        return;
    }

    if (pin !== GAME_PIN) {
      setError('Incorrect PIN. Please try again.');
      return;
    }

    setIsJoining(true);
    try {
      // Update the user's game status in Firestore
      const userRef = doc(firestore, 'players', currentUser.uid);
      await updateDoc(userRef, {
        isInGame: true,
      });

      // Navigate to the dashboard after successfully joining
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to join game. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="join-game-container">
      <h2 className="text-2xl font-bold mb-4">Join the Game</h2>
      <p>Welcome {currentUser?.email}, enter the PIN to join the game:</p>

      <input
        type="text"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="Enter PIN"
        className="p-2 border rounded mb-4"
      />

      {error && <p className="text-red-500">{error}</p>}

      <button
        onClick={handleJoinGame}
        disabled={isJoining}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {isJoining ? 'Joining...' : 'Join Game'}
      </button>
    </div>
  );
};

export default JoinGame;