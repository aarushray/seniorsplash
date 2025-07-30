import React, { use, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, query, collection, where, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import Announcements from '../components/Announcements'; // Assuming this component is styled appropriately
import PlayerDashboard from '../components/PlayerDashboard';
import { getBadgeById } from '../utils/BadgeManager'; 
import { motion } from "framer-motion"
import { useSurvivalTime } from '../utils/survivalTime';
import { useCallback } from 'react';


const Dashboard = () => {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();

    const avatars = [
    { emoji: '🎯', name: 'Target' },
    { emoji: '🌊', name: 'Wave' },
    { emoji: '⚔️', name: 'Warrior' },
    { emoji: '🏹', name: 'Hunter' },
    { emoji: '🔥', name: 'Fire' },
    { emoji: '💀', name: 'Skull' },
    { emoji: '🗡️', name: 'Sword' },
    { emoji: '🛡️', name: 'Shield' },
    { emoji: '⚡', name: 'Lightning' },
    { emoji: '🌟', name: 'Star' },
    { emoji: '👑', name: 'Crown' },
    { emoji: '🦅', name: 'Eagle' },
    { emoji: '🐺', name: 'Wolf' },
    { emoji: '🦁', name: 'Lion' },
    { emoji: '🐉', name: 'Dragon' },
    { emoji: '🔮', name: 'Crystal' }
  ];

  // --- State Management ---
  const [playerData, setPlayerData] = useState(null);
  const [target, setTarget] = useState(null);
  const [allPlayers, setAllPlayers] = useState([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [isPurgeMode, setIsPurgeMode] = useState(false);
  const [survivalTime, setSurvivalTime] = useState('-');
  const [currentLocation, setCurrentLocation] = useState('');
  const [lastKnownLocation, setLastKnownLocation] = useState('');
  const [bountyData, setBountyData] = useState(null);
  const [bountyTimeRemaining, setBountyTimeRemaining] = useState('');
  const [newlyEarnedBadge, setNewlyEarnedBadge] = useState(null);


  // Add this useEffect to check for new badges
  useEffect(() => {
    if (playerData?.lastBadgeEarned && playerData?.lastBadgeTimestamp) {
      const badgeTime = playerData.lastBadgeTimestamp.toDate ? 
        playerData.lastBadgeTimestamp.toDate() : 
        new Date(playerData.lastBadgeTimestamp);
      const timeSinceBadge = Date.now() - badgeTime.getTime();
      
      // If badge was earned in the last 10 seconds, show notification
      if (timeSinceBadge < 10000) {
        const badge = getBadgeById(playerData.lastBadgeEarned);
        if (badge) {
          setNewlyEarnedBadge(badge);
          // Auto-hide after 5 seconds
          setTimeout(() => setNewlyEarnedBadge(null), 5000);
        }
      }
    }
  }, [playerData?.lastBadgeEarned, playerData?.lastBadgeTimestamp]);

// Bounty countdown timer
useEffect(() => {
  if (!bountyData?.expiresAt) {
    setBountyTimeRemaining('');
    return;
  }

  const updateCountdown = () => {
    try {
      const expiryTime = bountyData.expiresAt.toDate ? 
        bountyData.expiresAt.toDate() : 
        new Date(bountyData.expiresAt);
      
      const now = new Date();
      const diffMs = expiryTime - now;
      
      if (diffMs <= 0) {
        setBountyTimeRemaining('EXPIRED');
        return;
      }
      
      const minutes = Math.floor(diffMs / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setBountyTimeRemaining(`${minutes}:${String(seconds).padStart(2, '0')}`);
    } catch (error) {
      console.error('Error calculating countdown:', error);
      setBountyTimeRemaining('--:--');
    }
  };

  updateCountdown();
  const interval = setInterval(updateCountdown, 1000);
  
  return () => clearInterval(interval);
}, [bountyData?.expiresAt]);


  // Effect for Current Player and their Target Data
  useEffect(() => {
    if (!currentUser) {
      setLocalLoading(false);
      return;
    }

    let unsubscribeTarget = () => {};
    // Listen for changes to the current player's data
    
    const playerRef = doc(firestore, 'players', currentUser.uid);
    const unsubscribePlayer = onSnapshot(playerRef, (playerDoc) => {
      unsubscribeTarget();

      if (playerDoc.exists()) {
        const data = playerDoc.data();
        setPlayerData(data);

        if (data.targetId) {
          const targetRef = doc(firestore, 'players', data.targetId);
          // This nested snapshot will be automatically cleaned up when unsubscribePlayer is called
          unsubscribeTarget = onSnapshot(targetRef, (targetDoc) => {
            if (targetDoc.exists()) {
              setTarget(targetDoc.data());
            } else {
              setTarget(null);
            }
          }, (error) => {
            console.error('Error fetching target data:', error);
            setTarget(null);
          });
          } else {
            setTarget(null);}
        } else {
          setPlayerData(null); // Player doesn't exist in the collection
        }
        setLocalLoading(false);
      }, (error) => {
        setLocalLoading(false);
      });


    return () => {
      unsubscribePlayer(); unsubscribeTarget();
    }
  }, [currentUser]);


// Add this useEffect for Purge Mode listener
useEffect(() => {
  
  const statusRef = doc(firestore, 'game', 'state');
  
  const unsubscribe = onSnapshot(statusRef, (doc) => {
    
    if (doc.exists()) {
      const data = doc.data();
      const purgeMode = data.purgeMode || false;
      setIsPurgeMode(purgeMode);
    } else {
      setIsPurgeMode(false);
    }
  }, (error) => {
    console.error('Error listening to purge mode status:', error);
    setIsPurgeMode(false);
  });

  return () => {
    unsubscribe();
  };
}, []);

  useSurvivalTime(playerData, setSurvivalTime);


// Effect for Player's Last Known Location
useEffect(() => {
  if (playerData?.lastKnownLocation) {
    setLastKnownLocation(playerData.lastKnownLocation);
  }
}, [playerData?.lastKnownLocation]);

// Add this function for updating location
const updateLocation = async () => {
  if (!currentLocation.trim()) return;
  
  try {
    const playerRef = doc(firestore, 'players', currentUser.uid);
    await updateDoc(playerRef, {
      lastKnownLocation: currentLocation.trim(),
      locationUpdatedAt: new Date()
    });
    setCurrentLocation('');
  } catch (error) {
    console.error('Error updating location:', error);
  }
};

useEffect(() => {
  const bountyRef = doc(firestore, 'game', 'bounty');
  
  const unsubscribe = onSnapshot(bountyRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      if (data.isActive) {
        setBountyData(data);
      } else {
        setBountyData(null);
      }
    } else {
      setBountyData(null);
    }
  }, (error) => {
    console.error('Error listening to bounty data:', error);
    setBountyData(null);
  });

  return () => unsubscribe();
}, []);


  // Effect for All Players (for Leaderboard)
  useEffect(() => {
    const q = query(collection(firestore, 'players'), where('isInGame', '==', true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const playersList = [];
      querySnapshot.forEach((doc) => {
        playersList.push({ id: doc.id, ...doc.data() });
      });
      // Sort players by splashes for the leaderboard
      playersList.sort((a, b) => (b.kills || 0) - (a.kills || 0));
      setAllPlayers(playersList);
    });
    return () => unsubscribe();
  }, []);


  // --- Loading and Authentication Guards ---
  if (loading || localLoading) {
    return (
        <div className="min-h-screen bg-primary-bg flex items-center justify-center text-center">
            <div className="relative">
                <div className="animate-spin text-6xl mb-6 text-accent-blue">💧</div>
                <p className="text-text-primary text-xl">Entering the Arena...</p>
                <p className="text-text-secondary text-sm mt-2">Syncing mission data...</p>
            </div>
        </div>
    );
  }

  if (!currentUser) {
    navigate('/register');
    return null;
  }
  
  // --- Handlers ---
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(err.message);
    }
  };

  // --- Render ---
  return (
    <>
<style>{`
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap');
  :root {
    --primary-bg: linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 50%, #0a0e1a 100%);
    --card-bg: rgba(30, 41, 59, 0.6);
    --border-color: rgba(71, 85, 105, 0.3);
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --accent-red: #ef4444;
    --accent-blue: #3b82f6;
    --accent-purple: #a855f7;
    --accent-green: #22c55e;
    --accent-orange: #f59e0b;
    --font-primary: 'Rajdhani', sans-serif;
    --font-heading: 'Orbitron', monospace;
  }
  
  body {
    background: var(--primary-bg);
    background-attachment: fixed;
    color: var(--text-primary);
    font-family: var(--font-primary);
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

  .dashboard-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 32px;
    padding: 32px;
    max-width: 1600px;
    margin: 0 auto;
    align-items: stretch;
  }
  
  .glass-card {
    background: var(--card-bg);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
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
  
  .glass-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
    transition: left 0.5s;
  }

  .glass-card:hover::before {
    left: 100%;
  }
  
  .glow-text {
    text-shadow: 0 0 15px currentColor;
  }

  .target-pulse {
    animation: targetPulse 2s ease-in-out infinite;
  }

  @keyframes targetPulse {
    0%, 100% { 
      box-shadow: 0 0 40px rgba(239, 68, 68, 0.6), 
                  0 0 80px rgba(239, 68, 68, 0.3),
                  0 0 120px rgba(239, 68, 68, 0.1); 
    }
    50% { 
      box-shadow: 0 0 60px rgba(239, 68, 68, 0.8), 
                  0 0 120px rgba(239, 68, 68, 0.5),
                  0 0 180px rgba(239, 68, 68, 0.2); 
    }
  }

  header {
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border-color);
  }

  .dashboard-grid button {
    border: 1px solid rgba(71, 85, 105, 0.3);
  }

  .dashboard-grid button:hover {
    border-color: rgba(71, 85, 105, 0.6);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  .dashboard-grid .grid > div {
    background: rgba(30, 41, 59, 0.8) !important;
    border: 1px solid rgba(71, 85, 105, 0.3);
  }

  .bg-yellow-600\\/10 {
    background: rgba(251, 191, 36, 0.1) !important;
    border-color: rgba(251, 191, 36, 0.3) !important;
  }

  .text-text-secondary {
    color: #94a3b8 !important;
  }
  
  .text-text-primary {
    color: #f1f5f9 !important;
  }

  .bg-gradient-to-r.from-red-800 {
    background: linear-gradient(90deg, #7f1d1d, #dc2626, #7f1d1d) !important;
  }

  /* RIGHT COLUMN FLEX BEHAVIOR */
  .column-right {
    display: flex;
    flex-direction: column;
    gap: 32px;
    height: 100%;
  }

  /* Make announcements flexible - will shrink/expand */
  .announcements-container {
    flex: 1 1 0;
    min-height: 150px;
    display: flex;
    flex-direction: column;
  }

  /* Keep bounty fixed size */
  .bounty-container {
    flex: 0 0 auto;
  }

  /* Keep buttons fixed size */
  .column-right > button {
    flex: 0 0 auto;
  }

  @media (max-width: 1024px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
      gap: 24px;
      padding: 24px;
    }
  }
`}</style>


    {/* Purge Mode Banner */}
      {isPurgeMode && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-gradient-to-r from-red-800 via-red-600 to-red-800 p-6 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
          <h2 className="text-3xl font-bold text-white font-heading relative z-10">⚠️ PURGE MODE ACTIVE ⚠️</h2>
          <p className="text-yellow-300 text-lg relative z-10">All players are valid targets. Trust no one.</p>
        </motion.div>
      )}

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 border-b border-border-color text-center relative"
      >
        <h1 className="text-6xl font-bold font-heading glow-text">
          <span className="text-accent-blue">SENIOR</span>{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            SPLASH
          </span>
        </h1>
        <p className="text-text-secondary text-xl mt-2">
          Welcome, <span className="text-accent-purple font-semibold">{playerData?.fullName || 'Agent'}</span>. 
          One last splash, one epic memory.
        </p>
      </motion.header>
      
      <main className="dashboard-grid">
        {/* LEFT COLUMN */}
        <div className="column-left flex flex-col gap-8">
          
          {/* Enhanced Target Panel */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`glass-card ${target ? 'target-pulse' : ''}`}
          >
            <h2 className="text-2xl font-bold mb-6 border-b border-border-color pb-3 font-heading flex items-center gap-3">
              🎯 <span className="glow-text text-accent-red">TARGET FILE</span>
            </h2>
 

{target ? (
  <div className="flex items-center gap-8">


    <motion.div
      whileHover={{ scale: 1.05 }}
      className="relative"
    >
      {target.profilePhotoURL ? (
        <img 
          src={target.profilePhotoURL} 
          alt="Target Photo" 
          className="w-32 h-32 rounded-full object-cover border-4 border-accent-red shadow-2xl"
        />
      ) : (
        <div className="w-32 h-32 rounded-full border-4 border-accent-red shadow-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-4xl">
            {target.avatarIndex !== undefined ? 
              avatars[target.avatarIndex]?.emoji || '🎯' : 
              '🎯'
            }
          </span>
        </div>
      )}
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white animate-pulse"></div>
    </motion.div>

    <div className="flex-1">
      <p className="text-4xl font-bold text-accent-red mb-2 font-heading glow-text">
        {target.fullName}
      </p>
      
      {/* Message moved right next to the name */}
      {target.messageToKiller && (
        <div className="mb-4">
          <div className="p-3 bg-yellow-600/10 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-200 italic font-medium">
              "{target.messageToKiller}"
            </p>
          </div>
        </div>
      )}
      
      <div className="space-y-2 text-lg">
        <p className="text-text-secondary">
          <span className="text-accent-blue">Class:</span> M25{target.studentClass}
        </p>
        <p className="text-text-secondary">
          <span className="text-blue-400">Last seen:</span> 
          <span className="text-blue-300 font-semibold ml-2">
            {target.lastKnownLocation || 'Location unknown'}
          </span>
          {target.locationUpdatedAt && (
            <span className="text-xs text-slate-400 ml-2">
              ({new Date(target.locationUpdatedAt.toDate()).toLocaleTimeString()})
            </span>
          )}
        </p>
        <p className="text-text-secondary">
          <span className="text-red-400">Kills:</span> 
          <span className="text-red-400 font-bold ml-2">{target.kills || 0} 💀</span>
        </p>
      </div>
    </div>
  </div>
) : (
  <motion.div 
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 2, repeat: Infinity }}
    className="text-center py-12"
  >
    <div className="text-6xl mb-4">🎯</div>
    <p className="text-2xl text-text-secondary font-heading">
      INCOMING TARGET ASSIGNMENT...
    </p>
    <p className="text-text-secondary mt-2">Prepare for battle.</p>
  </motion.div>
)}
          </motion.div> 

          {/* Enhanced Stats Panel */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card"
          >
            <h2 className="text-2xl font-bold mb-6 border-b border-border-color pb-3 font-heading flex items-center gap-3">
              📊 <span className="glow-text">COMBAT STATS</span>
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl text-center text-white shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <p className="text-3xl font-bold font-heading">💀</p>
                  <p className="text-2xl font-bold mt-2">{playerData?.kills || 0}</p>
                  <p className="text-sm opacity-90">Assassinations</p>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 rounded-2xl text-center text-white shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <p className="text-3xl font-bold">{!currentUser?.isAlive ? '❤️' : '💔'}</p>
                  <p className="text-2xl font-bold mt-2 text-green-300 animate-pulse">{!currentUser?.isAlive ? 'Alive' : 'Dead'}</p>
                  <p className="text-sm opacity-90">{!currentUser?.isAlive ? 'Don\'t die...' : 'Bruh you died'}</p>
                </div>
              </motion.div>
              
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-gradient-to-br from-orange-600 to-red-700 p-6 rounded-2xl text-center text-white shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                <div className="relative z-10">
                  <p className="text-3xl font-bold">⏱️</p>
                  <p className="text-2xl font-bold mt-2">{survivalTime}</p>
                  <p className="text-sm opacity-90">Survival Time</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
          {/* Enhanced Achievements */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card flex-grow"
          >
            <PlayerDashboard playerData={playerData} />
          </motion.div>

          {/* Badge Notification */}
          {newlyEarnedBadge && (
            <motion.div 
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -180 }}
              className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-6 rounded-2xl shadow-2xl"
            >
              <div className="flex items-center space-x-4">
                <span className="text-4xl">{newlyEarnedBadge.icon}</span>
                <div>
                  <h3 className="font-bold text-lg font-heading">🏆 BADGE EARNED!</h3>
                  <p className="text-sm">{newlyEarnedBadge.title}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Enhanced Action Buttons */}
          <div className="flex flex-col space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-2xl font-heading text-lg relative overflow-hidden"
              onClick={() => navigate('/submit-proof')}
            >
              <span className="relative z-10">💀 SUBMIT SPLASH PROOF</span>
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-500"></div>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full text-text-secondary font-bold py-3 px-6 rounded-2xl transition-all duration-300 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 shadow-xl"
              onClick={handleLogout}
            >
              🚪 Escape the Arena
            </motion.button>
          </div>
        </div>

   <div className="column-right flex flex-col gap-8">
    
    {/* --- MOVED AND MODIFIED BUTTON --- */}
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="w-full text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-xl font-heading text-lg relative overflow-hidden"
  onClick={() => navigate('/profile')}
  title="Customize Profile"
>
  <span className="relative z-10">⚙️ CUSTOMIZE PROFILE</span>
  <div className="absolute inset-0 bg-white/10 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-500"></div>
</motion.button>

   {/* Leaderboard Navigation Button */}
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 shadow-xl font-heading text-lg relative overflow-hidden"
      onClick={() => navigate('/leaderboard')}
    >
      <span className="relative z-10">🏆 VIEW LEADERBOARDS</span>
      <div className="absolute inset-0 bg-white/10 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-500"></div>
    </motion.button>


    {/* Enhanced Announcements */}
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card announcements-container"
    >
      <Announcements />
    </motion.div>

{/* Enhance Location Update Box */}

<motion.div 
  initial={{ opacity: 0, x: -50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.25 }}
  className="glass-card bg-gradient-to-br from-slate-900 to-blue-900 border-2 border-blue-800/50"
>
  <h2 className="text-2xl font-bold mb-6 border-b border-blue-600/30 pb-3 font-heading flex items-center gap-3">
    📍 <span className="glow-text text-blue-400">LOCATION UPDATE</span>
  </h2>
  
  <div className="space-y-4">
    <div className="flex gap-3">
      <input
        type="text"
        value={currentLocation}
        onChange={(e) => setCurrentLocation(e.target.value)}
        placeholder="Enter your current location..."
        className="flex-1 bg-slate-800/50 border border-blue-600/30 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all"
        onKeyPress={(e) => e.key === 'Enter' && updateLocation()}
      />
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={updateLocation}
        disabled={!currentLocation.trim()}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all duration-300 shadow-lg"
      >
        📍 UPDATE
      </motion.button>
    </div>
    
    <div className="text-sm text-slate-300 bg-slate-800/30 rounded-lg p-3 border border-blue-600/20">
      {lastKnownLocation && (
        <p className="mt-2 text-blue-300">
          <span className="font-semibold">Last updated:</span> {lastKnownLocation}
        </p>
      )}
    </div>
  </div>
</motion.div>

{/* Bounty Status Box */}

<motion.div 
  initial={{ opacity: 0, x: 50 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.6 }}
  className={`glass-card bounty-container relative overflow-hidden border-2 transition-all duration-500 group ${
    bountyData 
      ? 'border-yellow-400/50 hover:border-yellow-300/70 hover:shadow-2xl hover:shadow-yellow-400/30' 
      : 'border-gray-600/30 hover:border-gray-500/50'
  }`}
  style={{
    background: bountyData 
      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 193, 7, 0.05) 50%, rgba(255, 215, 0, 0.1) 100%)'
      : 'linear-gradient(135deg, rgba(75, 85, 99, 0.1) 0%, rgba(55, 65, 81, 0.05) 50%, rgba(75, 85, 99, 0.1) 100%)',
    backdropFilter: 'blur(20px)',
  }}
>
  {bountyData ? (
    <>
      {/* Active Bounty - Holographic Border Animation */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 p-0.5 animate-pulse">
        <div className="rounded-2xl bg-slate-900/90 h-full w-full"></div>
      </div>

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-2 left-4 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
        <div className="absolute top-8 right-6 w-1 h-1 bg-amber-300 rounded-full animate-ping opacity-40" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-6 left-8 w-1 h-1 bg-yellow-500 rounded-full animate-ping opacity-50" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-2 right-4 w-1 h-1 bg-amber-400 rounded-full animate-ping opacity-30" style={{animationDelay: '0.5s'}}></div>
      </div>

      {/* Scanning Line Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent w-full h-0.5 animate-pulse group-hover:animate-none"></div>

      <div className="relative z-10 p-6">
        {/* Header with Holographic Text */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2 animate-bounce">🎯</div>
          <h3 className="text-2xl font-bold font-heading relative">
            <span className="absolute inset-0 text-yellow-400 blur-sm animate-pulse">BOUNTY TARGET</span>
            <span className="relative text-yellow-300 glow-text">BOUNTY TARGET</span>
          </h3>
          <div className="mt-2 h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse"></div>
        </div>

        {/* Target Name with Holographic Effect */}
        <div className="text-center mb-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 text-3xl font-bold font-heading text-yellow-400/50 blur-sm animate-pulse">
              {bountyData.targetName}
            </div>
            <div className="relative text-3xl font-bold font-heading text-yellow-300 glow-text">
              {bountyData.targetName}
            </div>
          </div>
        </div>

        {/* Prize Section */}
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-amber-300 mb-2 font-heading">
            PRIZE:
          </div>
          <div className="relative">
            <div className="absolute inset-0 text-xl font-bold text-yellow-400/40 blur-sm">
              {bountyData.prize}
            </div>
            <div className="relative text-xl font-bold text-yellow-200">
              {bountyData.prize}
            </div>
          </div>
        </div>

        {/* Timer with Holographic Styling */}
        {bountyTimeRemaining && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-amber-300 font-semibold">TIME REMAINING:</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-slate-700 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 rounded-full animate-pulse"></div>
                <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full" style={{width: bountyTimeRemaining === 'EXPIRED' ? '0%' : '75%'}}></div>
              </div>
              <span className={`text-sm font-bold font-mono ${bountyTimeRemaining === 'EXPIRED' ? 'text-red-400' : 'text-yellow-400'}`}>
                {bountyTimeRemaining}
              </span>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-4 text-center">
          <p className="text-sm text-amber-200/80 italic">
            {bountyData.description || 'Eliminate the target to claim the prize'}
          </p>
        </div>

        {/* Holographic Corner Accents */}
        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-yellow-400/60"></div>
        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-yellow-400/60"></div>
        <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-yellow-400/60"></div>
        <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-yellow-400/60"></div>
      </div>
    </>
  ) : (
    /* Inactive Bounty State */
    <div className="relative z-10 p-6">
      <div className="text-center">
        <div className="text-4xl mb-4 opacity-50">🎯</div>
        <h3 className="text-2xl font-bold font-heading text-gray-500 mb-4">
          NO ACTIVE BOUNTY
        </h3>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-gray-500/30 to-transparent mb-6"></div>
        <p className="text-gray-400 text-lg mb-6">
          Waiting for admin to set a bounty target...
        </p>
        <div className="text-gray-500 text-sm italic">
          Check back soon for high-value targets
        </div>
        
        {/* Inactive Corner Accents */}
        <div className="absolute top-3 left-3 w-4 h-4 border-l-2 border-t-2 border-gray-600/40"></div>
        <div className="absolute top-3 right-3 w-4 h-4 border-r-2 border-t-2 border-gray-600/40"></div>
        <div className="absolute bottom-3 left-3 w-4 h-4 border-l-2 border-b-2 border-gray-600/40"></div>
        <div className="absolute bottom-3 right-3 w-4 h-4 border-r-2 border-b-2 border-gray-600/40"></div>
      </div>
    </div>
  )}
</motion.div>

  </div>
      </main>
    </>
  );
};

export default Dashboard;