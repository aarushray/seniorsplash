
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Particulars = () => {
  const { currentUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Load existing user data when component mounts
  React.useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const playerRef = doc(firestore, 'players', currentUser.uid);
        const playerSnap = await getDoc(playerRef);
        
        if (playerSnap.exists()) {
          const playerData = playerSnap.data();
          // Pre-fill form with existing data (if any)
          setFullName(playerData.fullName || '');
          setStudentClass(playerData.studentClass || '');
          setStudentId(playerData.studentId || '');
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [currentUser, navigate]);

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!currentUser) {
    navigate('/login');
    return;
  }

  console.log('Current user UID:', currentUser.uid); // Add this debug log

  setIsSubmitting(true);
  setError('');

  try {
    const userRef = doc(firestore, 'players', currentUser.uid);
    
    const trimmedFullName = fullName.trim();
    const trimmedStudentClass = studentClass.trim();
    const trimmedStudentId = studentId.trim();
    
    // Keep using updateDoc since the document should exist
    await updateDoc(userRef, {
      fullName: trimmedFullName,
      studentClass: trimmedStudentClass,
      studentId: trimmedStudentId,

      
      isAlive: true,
      isInGame: false,
      targetId: null,
      
      // Statistics that reset each game
      kills: 0,
      splashes: 0,
      purgeKills: 0,
      recentKills: [],
      bountyKills: 0,
      
      // Proof and verification
      proofs: [],
      pendingProofs: [],
      
      // Timing and assignments
      gameJoinedAt: null,
      targetAssignedAt: null,
      eliminatedAt: null,
      eliminatedBy: null,
      lastKnownLocation: '',
      locationUpdatedAt: null,
      
      // Badge system
      badges: [],
      lastBadgeEarned: null,
      lastBadgeTimestamp: null,
      earnedBadges: [],
      
      // Profile fields that should persist
      // fullName: KEEP
      // email: KEEP
      // studentClass: KEEP
      // profilePhotoURL: KEEP
      // avatarIndex: KEEP
      deathMessage: null,
      messageToKiller: null
    });

    navigate('/joingame');
  } catch (err) {
    setError('Failed to save your information. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
    <style>{`
      body {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
        background-attachment: fixed;
        color: #E2E8F0;
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
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-4 py-8">
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
              <div className="flex items-center justify-center mb-6">
                <motion.div 
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 shadow-2xl"
                >
                  <span className="text-white text-2xl">🌊</span>
                </motion.div>
                <h1 className="text-4xl font-bold font-heading text-white glow-text">
                  <span className="text-blue-400">SENIOR</span>{' '}
                  <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    SPLASH
                  </span>
                </h1>
              </div>
              <p className="text-gray-400 text-lg">Enter your details</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  className="w-full pl-4 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </motion.div>

              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <input
                  type="text"
                  placeholder="Class format: 60X"
                  className="w-full pl-4 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  required
                />
              </motion.div>

              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                <input
                  type="text"
                  placeholder="Student ID"
                  className="w-full pl-4 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/20 transition-all duration-200 backdrop-blur-sm"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </motion.div>

              {error && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4 backdrop-blur-sm">
                    <p className="text-red-300 text-sm text-center">{error}</p>
                  </div>
                </motion.div>
              )}

              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting || !fullName || !studentClass || !studentId}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl font-heading text-lg relative overflow-hidden"
              >
                <span className="relative z-10">
                  {isSubmitting ? 'Saving...' : '🚀 Continue to Game'}
                </span>
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
    
  
  };

export default Particulars;
