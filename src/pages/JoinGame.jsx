import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
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
    setError(''); // Clear previous errors
    
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinGame();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Join the Game</h2>
          <p className="text-gray-400">Welcome to the Game Lobby! Enter the PIN to continue.</p>
        </div>
        
        {/* Join Game Form */}
        <div className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="Enter Game PIN"
              className="w-full px-4 py-3 bg-transparent border-b border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors text-center text-lg tracking-widest"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyPress={handleKeyPress}
              maxLength="4"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleJoinGame}
            disabled={isJoining || !pin}
            className="w-full py-3 bg-gray-800 text-white font-semibold border border-gray-600 rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining Game...' : 'Join Game'}
          </button>
        </div>

        {/* Divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">OR</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400">
            Don't have the PIN?{' '}
            <button
              onClick={() => navigate('/dashboard')}
              className="text-white hover:underline font-semibold"
            >
              Go to Dashboard
            </button>
          </p>
          <p className="text-gray-400">
            Need to logout?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-white hover:underline font-semibold"
            >
              Back to Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;