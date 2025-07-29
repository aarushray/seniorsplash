import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

const LeaderBoard = () => {
  const [classStats, setClassStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedClass, setExpandedClass] = useState(null);
  const [globalTopKiller, setGlobalTopKiller] = useState(null);
  const navigate = useNavigate();


  useEffect(() => {
    fetchClassLeaderboard();
  }, []);

  const fetchClassLeaderboard = async () => {
    try {
      setLoading(true);

      const playersQuery = query(collection(firestore, 'players'));
      const playersSnap = await getDocs(playersQuery);
      const allPlayers = playersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Find global top killer
      const topKiller = allPlayers.reduce((top, player) => 
        (player.kills || 0) > (top?.kills || 0) ? player : top, null
      );
      setGlobalTopKiller(topKiller);

      const classSummary = {};

      allPlayers.forEach(player => {
        const studentClass = player.studentClass || 'Unknown';

        if (!classSummary[studentClass]) {
          classSummary[studentClass] = {
            className: studentClass,
            totalPlayers: 0,
            alivePlayers: 0,
            totalKills: 0,
            topKiller: null,
            topKillerKills: 0,
            players: []
          };
        }

        classSummary[studentClass].totalPlayers++;
        classSummary[studentClass].players.push(player);

        if (player.isAlive) {
          classSummary[studentClass].alivePlayers++;
        }

        const kills = player.kills || 0;
        classSummary[studentClass].totalKills += kills;

        if (kills > classSummary[studentClass].topKillerKills) {
          classSummary[studentClass].topKiller = player.fullName;
          classSummary[studentClass].topKillerKills = kills;
        }
      });

      const sortedClasses = Object.values(classSummary).sort((a, b) => {
        if (b.alivePlayers !== a.alivePlayers) return b.alivePlayers - a.alivePlayers;
        if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
        return b.totalPlayers - a.totalPlayers;
      });

      setClassStats(sortedClasses);
    } catch (err) {
      console.error('Error fetching class leaderboard:', err);
      setError('Failed to load class statistics');
    } finally {
      setLoading(false);
    }
  };

  const getClassRankIcon = (index) => {
    switch (index) {
      case 0: return '🚀';
      case 1: return '🛸';
      case 2: return '🤖';
      default: return '🎯';
    }
  };

  const getClassColor = (index) => {
    switch (index) {
      case 0: return 'from-cyan-400 to-blue-600';
      case 1: return 'from-violet-400 to-indigo-600';
      case 2: return 'from-pink-400 to-red-600';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const toggleClassExpansion = (className) => {
    setExpandedClass(expandedClass === className ? null : className);
  };

  const hasGlobalTopKiller = (classData) => {
    return globalTopKiller && classData.players.some(player => player.id === globalTopKiller.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-6xl text-cyan-400">
          ⚡️
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-red-400">
          <div className="text-6xl mb-4">💥</div>
          <h2 className="text-2xl font-extrabold mb-2">SYSTEM ERROR</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-slate-200 font-mono">
      {/* Custom CSS for animations */}
      <style jsx>{`
        .champion-shimmer {
          background: linear-gradient(
            -45deg,
            rgba(6, 182, 212, 0.1),
            rgba(59, 130, 246, 0.2),
            rgba(147, 51, 234, 0.2),
            rgba(6, 182, 212, 0.1)
          );
          background-size: 400% 400%;
          animation: shimmer 3s ease-in-out infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .target-pulse {
          animation: targetPulse 2s ease-in-out infinite;
        }
        
        @keyframes targetPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        
        .eliminated-class {
          filter: grayscale(100%);
          opacity: 0.4;
        }
        
        .mvp-glow:hover {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
        }
      `}</style>

      <motion.header initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} className="p-8 text-center relative">
        <h1 className="text-5xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500">
          ⚔️ CLASH OF THE CLASSES ⚔️
        </h1>
        <p className="text-purple-300 text-lg mt-2">Who will survive the arena?</p>
      </motion.header>
        
        {/* Back to Dashboard Button */}
        <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg backdrop-blur-md border border-gray-600/50"
        >
            <span className="text-lg">🏠</span>
            <span className="font-mono">BACK TO DASHBOARD</span>
        </motion.button>

      <main className="max-w-6xl mx-auto px-6 pb-10">
        <div className="grid gap-8">
          {classStats.map((classData, index) => (
            <motion.div
              key={classData.className}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                rounded-xl border border-gray-700 p-6 shadow-lg transition-all duration-300 backdrop-blur-md relative cursor-pointer
                ${index === 0 ? 'champion-shimmer' : 'bg-black/30 hover:shadow-cyan-500/20'}
                ${classData.alivePlayers === 0 ? 'eliminated-class' : ''}
              `}
              onClick={() => toggleClassExpansion(classData.className)}
              whileHover={{ scale: 1.02 }}
            >
              {/* Rank Badge */}
              <div className="absolute -top-4 left-4 z-10">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${getClassColor(index)} flex items-center justify-center text-white font-extrabold text-xl shadow-md ${index === 0 ? 'animate-pulse' : ''}`}>
                  #{index + 1}
                </div>
              </div>

              {/* Target Icon for Global Top Killer */}
              {hasGlobalTopKiller(classData) && (
                <div className="absolute -top-2 right-4 text-2xl target-pulse">
                  🎯
                </div>
              )}

              {/* Class Header */}
              <div className="flex items-center justify-between mb-6 pl-20">
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold flex items-center gap-3 text-cyan-300">
                    {getClassRankIcon(index)} M25{classData.className}
                  </h2>
                  <motion.div
                    animate={{ rotate: expandedClass === classData.className ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-xl text-gray-400"
                  >
                    ▼
                  </motion.div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400">
                    {classData.totalPlayers > 0 ? Math.round((classData.alivePlayers / classData.totalPlayers) * 100) : 0}%
                  </div>
                  <div className="text-gray-400 text-sm">Survival Rate</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="👥" value={classData.totalPlayers} label="Total Players" color="blue" />
                <StatCard icon="🫀" value={classData.alivePlayers} label="Alive" color="green" />
                <StatCard icon="💣" value={classData.totalKills} label="Eliminations" color="red" />
                <ClassMVPCard classData={classData} />
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Health</span>
                  <span>{classData.alivePlayers} / {classData.totalPlayers}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${classData.totalPlayers > 0 ? (classData.alivePlayers / classData.totalPlayers) * 100 : 0}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                    className={`h-full rounded-full bg-gradient-to-r ${getClassColor(index)} shadow-md`}
                  />
                </div>
              </div>

              {/* Expanded Player List */}
              <AnimatePresence>
                {expandedClass === classData.className && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-6 border-t border-gray-700 pt-6"
                  >
                    <h3 className="text-xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                      👥 Class Roster
                    </h3>
                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {classData.players
                        .sort((a, b) => (b.kills || 0) - (a.kills || 0))
                        .map((player, playerIndex) => (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: playerIndex * 0.05 }}
                            className={`
                              flex items-center justify-between p-3 rounded-lg border transition-all duration-200
                              ${player.isAlive 
                                ? 'bg-green-900/20 border-green-500/30 hover:bg-green-900/30' 
                                : 'bg-red-900/20 border-red-500/30 hover:bg-red-900/30'
                              }
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${player.isAlive ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                              <span className="font-semibold text-white">{player.fullName}</span>
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                player.isAlive 
                                  ? 'bg-green-500/20 text-green-300' 
                                  : 'bg-red-500/20 text-red-300'
                              }`}>
                                {player.isAlive ? 'Alive' : 'Eliminated'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-yellow-400">{player.kills || 0}</span>
                              <span className="text-red-400">💀</span>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* System Totals */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }} 
          className="mt-10 text-center"
        >
          <h3 className="text-3xl font-extrabold text-pink-400 mb-4">🌌 SYSTEM WIDE TOTALS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <TotalStat value={classStats.reduce((sum, cls) => sum + cls.totalPlayers, 0)} label="Total Players" color="blue" />
            <TotalStat value={classStats.reduce((sum, cls) => sum + cls.alivePlayers, 0)} label="Alive" color="green" />
            <TotalStat value={classStats.reduce((sum, cls) => sum + cls.totalKills, 0)} label="Kills" color="red" />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

// Enhanced Class MVP Card Component
const ClassMVPCard = ({ classData }) => {
  const hasMVP = classData.topKillerKills > 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="bg-gradient-to-br from-purple-500/20 to-purple-800/30 p-4 rounded-xl text-center border border-purple-400/30 backdrop-blur-md mvp-glow transition-all duration-300"
    >
      <div className="text-3xl mb-2">⚔️</div>
      {hasMVP ? (
        <>
          <div className="text-lg font-bold text-purple-300 truncate" title={classData.topKiller}>
            {classData.topKiller}
          </div>
          <div className="text-sm text-purple-400">{classData.topKillerKills} kills</div>
        </>
      ) : (
        <>
          <div className="text-lg font-bold text-gray-400">No Splashes Yet</div>
          <div className="text-sm text-gray-500">Class MVP</div>
        </>
      )}
    </motion.div>
  );
};

// Standard Stat Card Component
const StatCard = ({ icon, value, label, color }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className={`bg-gradient-to-br from-${color}-500/20 to-${color}-800/30 p-4 rounded-xl text-center border border-${color}-400/30 backdrop-blur-md transition-all duration-200`}
  >
    <div className="text-3xl mb-2">{icon}</div>
    <div className={`text-2xl font-bold text-${color}-300`}>{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
  </motion.div>
);

// Total Stats Component
const TotalStat = ({ value, label, color }) => (
  <div>
    <div className={`text-4xl font-bold text-${color}-400`}>{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
  </div>
);

export default LeaderBoard;