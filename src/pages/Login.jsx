import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { firestore } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const gameRef = doc(firestore, 'game', 'state');
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists() || !gameSnap.data().gameStarted) {
        navigate("/dashboard");
      } else {
        navigate("/joingame");
      }
    } catch (err) {
      setError('💀 Invalid credentials - you cannot enter the arena');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-blue-900 flex items-center justify-center px-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-blue-300 rounded-full opacity-40 animate-ping"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-25 animate-pulse"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-5xl font-bold mb-2">
              🌊 <span className="text-blue-400">SENIOR</span> <br /> <span className="text-red-400">SPLASH</span> 🌊
            </h1>
            <div className="text-sm text-gray-400 tracking-widest">
              ═══ SENIOR ELIMINATION GAME ═══
            </div>
          </div>
          
          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-2">Enter the Arena</h2>
            <p className="text-gray-300">
              💀 <em>Only the worthy may enter the dark waters...</em> 💀
            </p>
          </div>
        </div>
        
        {/* Login Form */}
        <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded-lg p-8 border border-gray-600 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🔱 Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email..."
                className="w-full px-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-all duration-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                🗝️ Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password..."
                className="w-full px-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-all duration-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-3">
                <p className="text-red-300 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg border border-blue-500"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Entering Arena...
                </span>
              ) : (
                '⚔️ Login ⚔️'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-gray-800 text-gray-400 font-medium">
                  ～ OR  ～
                </span>
              </div>
            </div>
          </div>


          {/* Navigation Links */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-gray-400">
              🆕 New to the arena?{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline transition-colors"
              >
                Sign Up
              </button>
            </p>
            
            <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
              <p>🌊 <em>May the waters guide your aim...</em> 🌊</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;