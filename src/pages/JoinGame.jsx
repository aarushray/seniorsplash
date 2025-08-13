import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../firebase/config';
import { doc, updateDoc, getDoc, onSnapshot, query } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { getGamePin } from '../utils/gamePin';

const JoinGame = () => {
  const { currentUser } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameStatus, setGameStatus] = useState(null);
  const [isGameStatusLoading, setIsGameStatusLoading] = useState(true);
  const [joinAttempts, setJoinAttempts] = useState(0);
  const [lastJoinAttempt, setLastJoinAttempt] = useState(0);
  const navigate = useNavigate();


  useEffect(() => {
    if (!currentUser) return;
  
    const gameRef = doc(firestore, 'game', 'state');
    
    // Real-time listener for game status
    const unsubscribe = onSnapshot(gameRef, (gameDoc) => {
      if (gameDoc.exists()) {
        const data = gameDoc.data();
        setGameStatus(data);
        setGameStarted(data.gameStarted || false);
      } else {
        setGameStatus(null);
        setGameStarted(false);
      }
      setIsGameStatusLoading(false);
    }, (error) => {
      console.error('Error listening to game status:', error);
      setIsGameStatusLoading(false);
    });
  
    return () => unsubscribe();
  }, [currentUser]);

// Replace the handleJoinGame function with this optimized version
const handleJoinGame = async () => {
  if (!currentUser) {
    navigate('/login');
    return;
  }

  // Use cached game status instead of fetching again
  if (gameStatus?.gameStarted) {
    setError('Game has already started. You cannot join now.');
    return;
  }

  const gamePin = await getGamePin();
  console.log('Game PIN:', gamePin);
  console.log('Entered PIN:', pin);

  if (pin !== gamePin) {
    setError('Incorrect PIN. Please try again.');
    return;
  }

  setIsJoining(true);
  setError('');
  
  try {
    // Direct document reference instead of query
    const playerRef = doc(firestore, 'players', currentUser.uid);
    
    // Check if player exists and update
    const playerDoc = await getDoc(playerRef);
    if (playerDoc.exists()) {
      await updateDoc(playerRef, {
        isInGame: true,
        gameJoinedAt: new Date()
      });
      navigate('/dashboard');
    } else {
      setError('Player profile not found. Please contact support.');
    }
  } catch (err) {
    console.error('Error joining game:', err);
    setError('Failed to join game. Please try again.');
  } finally {
    setIsJoining(false);
  }
};


  // Remove handleKeyPress, use form onSubmit instead

  const throttledJoinGame = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastJoinAttempt;
    
    // Prevent more than 3 attempts per minute
    if (joinAttempts >= 3 && timeSinceLastAttempt < 60000) {
      setError('Too many join attempts. Please wait before trying again.');
      return;
    }
    
    // Reset attempts after 1 minute
    if (timeSinceLastAttempt > 60000) {
      setJoinAttempts(0);
    }
    
    setJoinAttempts(prev => prev + 1);
    setLastJoinAttempt(now);
    
    await handleJoinGame();
  }, [joinAttempts, lastJoinAttempt]);
  
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap');
        
        body {
          background: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 50%, #0a0e1a 100%);
          background-attachment: fixed;
          color: #f1f5f9;
          font-family: 'Rajdhani', sans-serif;
          position: relative;
          overflow-x: hidden;
        }
        
        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23334155' fill-opacity='0.1' d='M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E");
          background-size: cover;
          animation: waveFloat 20s ease-in-out infinite;
          z-index: -1;
        }

        @keyframes waveFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.02); }
        }

        .glass-card {
          background: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(71, 85, 105, 0.3);
          border-radius: 24px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .glass-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(59, 130, 246, 0.1);
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(71, 85, 105, 0.5);
        }

        .glow-text {
          text-shadow: 0 0 15px currentColor;
        }

        .pin-input {
          background: rgba(15, 23, 42, 0.8);
          border: 2px solid rgba(71, 85, 105, 0.3);
          color: #f1f5f9;
          transition: all 0.3s ease;
        }

        .pin-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          background: rgba(15, 23, 42, 0.9);
        }

        .join-button {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
          transition: all 0.3s ease;
        }

        .join-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
        }

        .join-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="w-full max-w-md">
          <div className="glass-card p-8">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                  <span className="text-white text-3xl">🌊</span>
                </div>
                <h1 className="text-4xl font-bold font-heading glow-text">
                  <span className="text-blue-400">SENIOR</span>{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    SPLASH
                  </span>
                </h1>
              </div>
              <h2 className="text-2xl font-semibold text-slate-300 font-heading tracking-wide">
                🎯 JOIN THE BATTLE
              </h2>
              <p className="text-slate-400 mt-2">Enter the game PIN to join the arena</p>
            </div>

            {/* PIN Input Section */}
            {isGameStatusLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin text-2xl mb-2">💧</div>
                <p className="text-slate-400">Checking arena status...</p>
              </div>
            ) : (

// Replace your current form onSubmit with this:
              <form className="space-y-6" onSubmit={async (e) => { 
                e.preventDefault();
                const sanPin = pin.replace(/\D/g, '').slice(0, 4);
                setPin(sanPin); // This is still good for UI consistency
                
                // But use sanPin directly in the join logic instead of waiting for state to update
                if (!currentUser) {
                  navigate('/login');
                  return;
                }

                if (gameStatus?.gameStarted) {
                  setError('Game has already started. You cannot join now.');
                  return;
                }

                const gamePin = await getGamePin();
                console.log('Game PIN:', gamePin);
                console.log('Entered PIN:', sanPin); // Use sanPin here instead of pin

                if (sanPin !== gamePin) { // Use sanPin here instead of pin
                  setError('Incorrect PIN. Please try again.');
                  return;
                }

                // Apply throttling check
                const now = Date.now();
                const timeSinceLastAttempt = now - lastJoinAttempt;
                
                if (joinAttempts >= 3 && timeSinceLastAttempt < 60000) {
                  setError('Too many join attempts. Please wait before trying again.');
                  return;
                }
                
                if (timeSinceLastAttempt > 60000) {
                  setJoinAttempts(0);
                }
                
                setJoinAttempts(prev => prev + 1);
                setLastJoinAttempt(now);

                setIsJoining(true);
                setError('');
                
                try {
                  const playerRef = doc(firestore, 'players', currentUser.uid);
                  const playerDoc = await getDoc(playerRef);
                  
                  if (playerDoc.exists()) {
                    await updateDoc(playerRef, {
                      isInGame: true,
                      gameJoinedAt: new Date()
                    });
                    navigate('/dashboard');
                  } else {
                    setError('Player profile not found. Please contact support.');
                  }
                } catch (err) {
                  console.error('Error joining game:', err);
                  setError('Failed to join game. Please try again.');
                } finally {
                  setIsJoining(false);
                }
              }}>
                <div className="relative">
                  <label className="block text-slate-300 text-sm font-semibold mb-3 uppercase tracking-wider">
                    🔐 Game PIN
                  </label>
                  <input
                    type="text"
                    placeholder="••••"
                    className="pin-input w-full px-6 py-6 rounded-2xl text-center text-3xl font-bold tracking-[0.5em] font-mono focus:outline-none placeholder-slate-500"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength="4"
                    required
                  />
                  <div className="absolute inset-0 rounded-2xl pointer-events-none border-2 border-transparent bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 transition-opacity duration-300 focus-within:opacity-100"></div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-900/30 border border-red-500/50 rounded-2xl p-4 backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-red-400 text-xl">⚠️</span>
                      <p className="text-red-300 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {/* Join Button */}
                <button
                  type="submit"
                  disabled={isJoining || pin.length !== 4}
                  className="join-button w-full py-5 text-white font-bold rounded-2xl text-lg font-heading tracking-wide relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center space-x-3">
                    {isJoining ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>JOINING BATTLE...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>JOIN THE SPLASH</span>
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] transition-transform duration-500 hover:translate-x-[100%]"></div>
                </button>
              </form>
            )}

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-slate-400 text-sm">
                Need help?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-pink-400 hover:text-pink-300 font-medium transition-colors duration-200 underline decoration-pink-400/50 hover:decoration-pink-300"
                >
                  Back to Login
                </button>
              </p>
            </div>

            {/* Status Indicator */}
            <div className="mt-6 flex items-center justify-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                gameStarted ? 'bg-red-400' : 'bg-green-400'
              }`}></div>
              <span className="text-slate-400 text-xs font-mono">
                ARENA_STATUS: {gameStarted ? 'IN_PROGRESS' : 'ACTIVE'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default JoinGame;