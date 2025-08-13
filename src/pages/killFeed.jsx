import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';

const KillFeed = () => {
  const [eliminations, setEliminations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProof, setSelectedProof] = useState(null);

  useEffect(() => {
    const fetchEliminations = async () => {
      try {
        // ✅ DEFINE the query first
        const q = query(
          collection(firestore, 'killProofs'),
          where('status', '==', 'verified'),
          orderBy('timestamp', 'desc')
        );
  
        const querySnapshot = await getDocs(q);
        const verificationsData = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          verificationsData.push({
            id: doc.id,
            killer: data.submitterName,
            victim: data.targetName,
            videoUrl: data.mediaUrl,
            timestamp: data.timestamp,
            thumbnailUrl: data.mediaUrl,
            location: data.location,
            description: data.description,
            mediaType: data.mediaType
          });
        });
        
        setEliminations(verificationsData);
        setLoading(false);
        
      } catch (error) {
        console.error('Error fetching eliminations:', error);
        setError('Failed to load eliminations');
        setLoading(false);
      }
    };
  
    // Initial fetch
    fetchEliminations();
  
    // ✅ Poll every 30 seconds
    const interval = setInterval(fetchEliminations, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp.toDate());
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-mono">Loading eliminations...</p>
        </div>
      </div>
    );
  }

  if (error && eliminations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Unable to load feed</h2>
          <p className="mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse-slow"></div>
      <div className="absolute top-20 right-20 w-48 h-48 bg-blue-500/20 rounded-full blur-xl animate-pulse-medium"></div>
      <div className="absolute bottom-10 left-1/4 w-40 h-40 bg-indigo-500/20 rounded-full blur-xl animate-pulse-fast"></div>
      
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.header 
            className="text-center mb-12"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 font-heading tracking-wider">
              🎯 KILL FEED
            </h1>
            <p className="text-xl text-gray-300 font-light">
              Watch the latest eliminations from Senior Splash
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.history.back()}
              className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg font-heading"
            >
              Return to Dashboard
            </motion.button>
            {error && (
              <div className="mt-4 bg-yellow-500/20 text-yellow-200 px-4 py-2 rounded-lg inline-block">
                <small>⚠️ Connection issues detected</small>
              </div>
            )}
          </motion.header>

          {/* Eliminations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {eliminations.length === 0 ? (
              <motion.div 
                className="col-span-full text-center text-white text-xl py-16"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20">
                  <div className="text-6xl mb-4">🎯</div>
                  <p>No eliminations yet.</p>
                  <p className="text-gray-400 mt-2">The game hasn't started heating up!</p>
                </div>
              </motion.div>
            ) : (
              eliminations.map((elimination, index) => (
                <motion.div 
                  key={elimination.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/20 hover:border-white/40 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 cursor-pointer group"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  onClick={() => setSelectedProof(elimination)}
                  whileHover={{ y: -5 }}
                >
                  {/* Video/Image Container */}
                  <div className="relative bg-black/50 h-48 overflow-hidden">
                    {elimination.mediaType === 'video' ? (
                      <video
                        src={elimination.videoUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        muted
                        poster={elimination.thumbnailUrl}
                      />
                    ) : (
                      <img
                        src={elimination.videoUrl}
                        alt="Elimination proof"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center justify-between text-white text-sm">
                        <span className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                          {elimination.mediaType === 'video' ? '🎥' : '📸'} Media
                        </span>
                        <span className="bg-green-500/80 backdrop-blur-sm px-2 py-1 rounded-full">
                          ✅ Verified
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Elimination Info */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-white mb-3 leading-tight">
                      Watch <span className="text-red-400 font-extrabold">{elimination.killer}</span> eliminate{' '}
                      <span className="text-blue-400 font-extrabold">{elimination.victim}</span>
                    </h3>
                    
                    {elimination.location && (
                      <p className="text-gray-300 mb-2 flex items-center text-sm">
                        <span className="mr-2">📍</span>
                        {elimination.location}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-gray-400">
                        {formatTime(elimination.timestamp)}
                      </p>
                      <div className="flex items-center text-purple-300">
                        <span className="mr-1">👁️</span>
                        <span>Click to view</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedProof && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedProof(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white font-heading">
                  🎯 Elimination Details
                </h2>
                <button
                  onClick={() => setSelectedProof(null)}
                  className="text-white hover:text-red-400 text-2xl transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {/* Media */}
              <div className="mb-6 rounded-xl overflow-hidden bg-black/50">
                {selectedProof.mediaType === 'video' ? (
                  <video
                    src={selectedProof.videoUrl}
                    className="w-full max-h-96 object-contain"
                    controls
                    autoPlay
                  />
                ) : (
                  <img
                    src={selectedProof.videoUrl}
                    alt="Kill proof"
                    className="w-full max-h-96 object-contain"
                  />
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                <div className="space-y-4">
                  <div className="bg-red-500/20 p-4 rounded-lg border border-red-500/30">
                    <span className="font-bold text-red-300 block mb-1">Assassin</span>
                    <span className="text-xl font-bold">{selectedProof.killer}</span>
                  </div>
                  <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
                    <span className="font-bold text-blue-300 block mb-1">Target</span>
                    <span className="text-xl font-bold">{selectedProof.victim}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-purple-500/20 p-4 rounded-lg border border-purple-500/30">
                    <span className="font-bold text-purple-300 block mb-1">Location</span>
                    <span className="text-lg">{selectedProof.location}</span>
                  </div>
                  <div className="bg-indigo-500/20 p-4 rounded-lg border border-indigo-500/30">
                    <span className="font-bold text-indigo-300 block mb-1">Time</span>
                    <span className="text-lg">{selectedProof.timestamp.toDate().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedProof.description && (
                <div className="mt-6 bg-white/10 p-4 rounded-lg border border-white/20">
                  <span className="font-bold text-gray-300 block mb-2">Description</span>
                  <p className="text-gray-200">{selectedProof.description}</p>
                </div>
              )}

              <motion.button
                onClick={() => setSelectedProof(null)}
                className="mt-8 w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all duration-300 font-heading text-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Close Details
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KillFeed;