import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/config';
import { motion } from 'framer-motion';

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(firestore, 'players', user.uid), {
        uid: user.uid,
        email: user.email,
        kills: 0,
        isInGame: false,
        isAlive: true,
        badges: [],
        recentKills: [],
        purgeKills: 0,
        gameJoinedAt: null,
        lastBadgeEarned: null,
        lastBadgeTimestamp: null,
        createdAt: new Date()
      });

      navigate('/particulars');
    } catch (err) {
      console.error(err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          background-attachment: fixed;
          color: #E2E8F0;
          font-family: 'Rajdhani', sans-serif;
          overflow-x: hidden;
        }

        body::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='%23075985' fill-opacity='0.1' d='M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E");
          background-size: cover;
          animation: waveFloat 20s ease-in-out infinite;
          z-index: -1;
        }

        @keyframes waveFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.02); }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .glow-text {
          text-shadow: 0 0 20px currentColor;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl"></div>

            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8 relative z-10"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-3">
                  <span className="text-white text-xl">🌊</span>
                </div>
                <h1 className="text-3xl font-bold font-heading glow-text text-white">Senior Splash</h1>
              </div>
              <h2 className="text-xl font-semibold text-gray-300">Create an Account</h2>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {[{
                id: 'email',
                type: 'email',
                value: email,
                onChange: setEmail,
                placeholder: 'Email or username'
              }, {
                id: 'password',
                type: 'password',
                value: password,
                onChange: setPassword,
                placeholder: 'Password'
              }, {
                id: 'confirmPassword',
                type: 'password',
                value: confirmPassword,
                onChange: setConfirmPassword,
                placeholder: 'Confirm Password'
              }].map(({ id, type, value, onChange, placeholder }, i) => (
                <motion.div 
                  key={id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <input
                    id={id}
                    name={id}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full pl-4 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                    required
                  />
                </motion.div>
              ))}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 backdrop-blur-sm"
                >
                  <p className="text-red-300 text-sm text-center">{error}</p>
                </motion.div>
              )}

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl font-heading text-lg relative overflow-hidden"
              >
                {isLoading ? '🚧 Creating Account...' : '🚀 Register'}
              </motion.button>
            </form>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 text-center space-y-4 relative z-10"
            >
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-pink-400 hover:text-pink-300 font-medium transition-colors duration-200 glow-text"
                >
                  Log In
                </button>
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Register;
