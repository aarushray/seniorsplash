import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth, firestore, storage } from '../firebase/config';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';

const SubmitKillProof = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [formData, setFormData] = useState({
    targetName: '',
    location: '',
    description: ''
  });
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [alivePlayers, setAlivePlayers] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [lastSubmissionAttempt, setLastSubmissionAttempt] = useState(0);


  const getCachedAlivePlayers = () => {
    const cached = localStorage.getItem('alivePlayers');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache valid for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    return null;
  };

  const clearAlivePlayersCache = () => {
    localStorage.removeItem('alivePlayers');
  };


  const fetchAlivePlayers = useCallback(async () => {
    try {
      // Check cache first
      const cachedPlayers = getCachedAlivePlayers();
      if (cachedPlayers) {
        setAlivePlayers(cachedPlayers);
        return;
      }
      
      // If no cache, fetch from database
      const playersRef = collection(firestore, 'players');
      const aliveQuery = query(playersRef, where('isAlive', '==', true));
      const querySnapshot = await getDocs(aliveQuery);
      
      const players = [];
      querySnapshot.forEach((doc) => {
        const playerData = doc.data();
        if (playerData.fullName && playerData.fullName.trim()) {
          players.push({
            id: doc.id,
            fullName: playerData.fullName.trim()
          });
        }
      });
      
      // Sort alphabetically by full name
      players.sort((a, b) => a.fullName.localeCompare(b.fullName));
      
      // Cache the data
      localStorage.setItem('alivePlayers', JSON.stringify({
        data: players,
        timestamp: Date.now()
      }));
      
      setAlivePlayers(players);
    } catch (error) {
      console.error('Error fetching alive players:', error);
      setError('Failed to load player list. Please refresh the page.');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAlivePlayers();
    }
  }, [user, fetchAlivePlayers]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePlayerSelect = (playerName) => {
    setFormData({
      ...formData,
      targetName: playerName
    });
    setIsDropdownOpen(false);
  };

// Modify handleMediaChange (around line 80)
const handleMediaChange = (e) => {
  const file = e.target.files[0];
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Please select an image or video file.');
      return;
    }
    
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File too large. Max size: ${file.type.startsWith('video/') ? '50MB for videos' : '10MB for images'}`);
      return;
    }

    setMedia(file);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    setError('');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }
};

// Modify your handleSubmit function (around line 100)
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');
  setUploadProgress(0);

  const now = Date.now();
  if (now - lastSubmissionAttempt < 20000) {
    setError('Please wait before submitting another proof.');
    setIsLoading(false);
    return;
  }

  setLastSubmissionAttempt(now);
  setIsLoading(true);
  setError('');
  setUploadProgress(0);

  try {
    // Parallel database calls for better performance
    const [gameSnap, submitterSnap] = await Promise.all([
      getDoc(doc(firestore, 'game', 'state')),
      getDoc(doc(firestore, 'players', user.uid))
    ]);
    
    const gameData = gameSnap.data();
    const isPurgeMode = gameData?.purgeMode || false;
    
    if (!submitterSnap.exists()) {
      setError('Player data not found. Please contact an admin.');
      setIsLoading(false);
      return;
    }
    
    const submitterData = submitterSnap.data();
    const trimmedTargetName = formData.targetName.trim();

    if (!isPurgeMode) {
      // Non-purge mode: Check if the target matches the assigned target
      if (!submitterData.targetId) {
        setError('You do not have an assigned target. Please contact an admin.');
        setIsLoading(false);
        return;
      }

      const targetRef = doc(firestore, 'players', submitterData.targetId);
      const targetSnap = await getDoc(targetRef);
      
      if (!targetSnap.exists()) {
        setError('Your assigned target was not found. Please contact an admin.');
        setIsLoading(false);
        return;
      }
      
      const targetData = targetSnap.data();
      const assignedTargetName = targetData.fullName.trim();
      
      if (assignedTargetName.toLowerCase() !== trimmedTargetName.toLowerCase()) {
        setError(`It is not Purge Mode. You may only assassinate your assigned target: ${assignedTargetName}`);
        setIsLoading(false);
        return;
      }

      if (!targetData.isAlive) {
        setError(`${assignedTargetName} has already been eliminated. Please refresh your dashboard for a new target.`);
        setIsLoading(false);
        return;
      }
    } else {
      // Purge mode: Find the player by name and check if they are alive
      const playersRef = collection(firestore, 'players');
      const playerQuery = query(playersRef, where('fullName', '==', trimmedTargetName));
      const playerSnapshot = await getDocs(playerQuery);
      
      if (playerSnapshot.empty) {
        setError(`No player found with name: ${trimmedTargetName}`);
        setIsLoading(false);
        return;
      }
      
      if (playerSnapshot.size > 1) {
        setError(`Multiple players found with name: ${trimmedTargetName}. Please contact an admin.`);
        setIsLoading(false);
        return;
      }
      
      const targetDoc = playerSnapshot.docs[0];
      const targetData = targetDoc.data();
      
      if (!targetData.isAlive) {
        setError(`${trimmedTargetName} has already been eliminated.`);
        setIsLoading(false);
        return;
      }
    }

    // Media upload with better progress tracking
    const timestamp = Date.now();
    const fileExtension = media.name.split('.').pop();
    const fileName = `${timestamp}_${user.uid}.${fileExtension}`;
    const mediaRef = ref(storage, `kill-proofs/${fileName}`);
    
    // Upload media first
    setUploadProgress(25);
    const uploadResult = await uploadBytes(mediaRef, media);
    setUploadProgress(75);
    
    const mediaUrl = await getDownloadURL(uploadResult.ref);
    setUploadProgress(90);

    const proofData = {
      submittedBy: user.uid,
      submitterName: submitterData?.fullName?.trim() || 'Unknown',
      submitterEmail: user.email,
      targetName: trimmedTargetName,
      location: formData.location.trim(),
      description: formData.description.trim(),
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      fileName: fileName,
      timestamp: new Date(),
      status: 'pending',
      adminNotes: '',
      reviewedBy: null,
      reviewedAt: null,
    };

    clearAlivePlayersCache();
    // Create kill proof document
    await addDoc(collection(firestore, 'killProofs'), proofData);
    setUploadProgress(100);

    // Clear cache to force refresh of player list
    localStorage.removeItem('alivePlayers');
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);

  } catch (err) {
    console.error('Submission error:', err);
    setError('Failed to submit proof. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap');
        
        body {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          background-attachment: fixed;
          color: #E2E8F0;
          font-family: 'Rajdhani', sans-serif;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .glow-text {
          text-shadow: 0 0 20px currentColor;
        }

        .upload-progress {
          background: linear-gradient(90deg, #10b981 0%, #10b981 var(--progress), transparent var(--progress));
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          <div className="glass-card rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Header */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-bold font-heading glow-text mb-4">
                <span className="text-red-400">💀 SUBMIT</span>{' '}
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  KILL PROOF
                </span>
              </h1>
              <p className="text-gray-400 text-lg">Document your victory with photo/video evidence</p>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Target Name - Now a Dropdown */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  🎯 Target Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="targetName"
                    id="targetName"
                    value={formData.targetName}
                    onChange={handleInputChange}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Select target from dropdown"
                    className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white/20 transition-all duration-200 cursor-pointer"
                    required
                    readOnly
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 w-full mt-2 bg-slate-800 border border-white/20 rounded-2xl shadow-2xl max-h-60 overflow-hidden"
                    >
                      <div className="max-h-60 overflow-y-auto" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#475569 #1e293b'
                      }}>
                        {alivePlayers.length > 0 ? (
                          alivePlayers.map((player) => (
                            <button
                              key={player.id}
                              type="button"
                              onClick={() => handlePlayerSelect(player.fullName)}
                              className="w-full px-4 py-3 text-left text-white hover:bg-white/10 transition-colors duration-200 border-b border-white/10 last:border-b-0"
                            >
                              {player.fullName}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-400 text-center">
                            No alive players found
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Location */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  📍 Location
                </label>
                <input
                  type="text"
                  name="location"
                  id="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Where did the elimination happen?"
                  className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white/20 transition-all duration-200"
                  required
                />
              </motion.div>

              {/* Description */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  📝 Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe how the elimination happened..."
                  rows={4}
                  className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white/20 transition-all duration-200 resize-none"
                  required
                />
              </motion.div>

              {/* Media Upload */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  📸 Proof Media (Photo or Video)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    className="hidden"
                    id="media-upload"
                    required
                  />
                  <label
                    htmlFor="media-upload"
                    className={`w-full px-4 py-8 bg-white/10 border-2 border-dashed border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                      mediaPreview ? 'border-green-500/50' : ''
                    }`}
                  >
                    {mediaPreview ? (
                      <div className="w-full">
                        {mediaType === 'video' ? (
                          <video 
                            src={mediaPreview} 
                            controls 
                            className="w-full h-48 object-cover rounded-xl mb-4"
                          />
                        ) : (
                          <img 
                            src={mediaPreview} 
                            alt="Preview" 
                            className="w-full h-48 object-cover rounded-xl mb-4"
                          />
                        )}
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-green-400">✓</span>
                          <p className="text-green-400 text-center">
                            {mediaType === 'video' ? 'Video' : 'Image'} selected
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-4xl mb-4">📷🎥</div>
                        <p className="text-center text-gray-400 mb-2">
                          Click to upload photo or video proof
                        </p>
                        <p className="text-center text-gray-500 text-sm">
                          Max: 10MB for images, 50MB for videos
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </motion.div>

              {/* Upload Progress */}
              {isLoading && uploadProgress > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Uploading...</span>
                    <span className="text-blue-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <motion.div 
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4"
                >
                  <p className="text-red-300 text-sm text-center">{error}</p>
                </motion.div>
              )}

              {/* Success Message */}
              {uploadProgress === 100 && !error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/20 border border-green-500/50 rounded-2xl p-4"
                >
                  <p className="text-green-300 text-sm text-center flex items-center justify-center gap-2">
                    <span className="text-lg">✅</span>
                    Proof submitted successfully! Awaiting admin verification...
                  </p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-2xl transition-all duration-300 font-heading text-lg"
                  disabled={isLoading}
                >
                  Return to Dashboard
                </motion.button>
                
                <motion.button
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  type="submit"
                  disabled={isLoading || uploadProgress === 100}
                  className="flex-1 py-4 bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 hover:from-red-500 hover:via-orange-500 hover:to-yellow-500 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl font-heading text-lg"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      SUBMITTING...
                    </span>
                  ) : uploadProgress === 100 ? (
                    '✅ SUBMITTED'
                  ) : (
                    '💥 SUBMIT PROOF'
                  )}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default SubmitKillProof;