import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { auth, firestore, storage } from '../firebase/config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';

const Profile = () => {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [deathMessage, setDeathMessage] = useState('');
  const [messageToKiller, setMessageToKiller] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [killerMessageWordCount, setKillerMessageWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [playerData, setPlayerData] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // Avatar options - themed around Senior Splash
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

  const loadPlayerData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const playerRef = doc(firestore, 'players', user.uid);
      const playerSnap = await getDoc(playerRef);
      
      if (playerSnap.exists()) {
        const data = playerSnap.data();
        setPlayerData(data);
        setSelectedAvatar(data.avatarIndex || 0);
        setDeathMessage(data.deathMessage || '');
        setMessageToKiller(data.messageToKiller || '');
        setWordCount(data.deathMessage ? data.deathMessage.split(' ').length : 0);
        setKillerMessageWordCount(data.messageToKiller ? data.messageToKiller.split(' ').length : 0);
        
        // Set existing profile photo if available
        if (data.profilePhotoURL) {
          setPhotoPreview(data.profilePhotoURL);
        }
      }
    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadPlayerData();
    }
  }, [user, loadPlayerData]);

  const handleMessageChange = (e) => {
    const message = e.target.value;
    const words = message.trim().split(/\s+/).filter(word => word.length > 0);
    
    if (words.length <= 15) {
      setDeathMessage(message);
      setWordCount(words.length);
    }
  };

  const handleKillerMessageChange = (e) => {
    const message = e.target.value;
    const words = message.trim().split(/\s+/).filter(word => word.length > 0);
    
    if (words.length <= 20) {
      setMessageToKiller(message);
      setKillerMessageWordCount(words.length);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      
      setProfilePhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePhoto = async () => {
    if (!profilePhoto || !user) return null;
    
    setIsUploadingPhoto(true);
    try {
      // Delete old photo if exists
      if (playerData?.profilePhotoURL) {
        try {
          const oldPhotoRef = ref(storage, `profile-photos/${user.uid}`);
          await deleteObject(oldPhotoRef);
        } catch (error) {
          console.log('No old photo to delete or error deleting:', error);
        }
      }
      
      // Upload new photo
      const photoRef = ref(storage, `profile-photos/${user.uid}`);
      const snapshot = await uploadBytes(photoRef, profilePhoto);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview('');
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      let profilePhotoURL = playerData?.profilePhotoURL || '';
      
      // Upload photo if a new one was selected
      if (profilePhoto) {
        const uploadedURL = await uploadProfilePhoto();
        if (uploadedURL) {
          profilePhotoURL = uploadedURL;
        }
      } else if (!photoPreview) {
        // User removed the photo
        if (playerData?.profilePhotoURL) {
          try {
            const oldPhotoRef = ref(storage, `profile-photos/${user.uid}`);
            await deleteObject(oldPhotoRef);
          } catch (error) {
            console.log('Error deleting old photo:', error);
          }
        }
        profilePhotoURL = '';
      }
      
      const playerRef = doc(firestore, 'players', user.uid);
      await updateDoc(playerRef, {
        avatarIndex: selectedAvatar,
        deathMessage: deathMessage.trim(),
        messageToKiller: messageToKiller.trim(),
        profilePhotoURL: profilePhotoURL,
        profileUpdatedAt: new Date()
      });
      
      // Show success and navigate back
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center"
        >
          <div className="text-6xl mb-4">⚙️</div>
          <p className="text-xl text-gray-400">Loading profile...</p>
        </motion.div>
      </div>
    );
  }

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

        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 16px;
        }

        .photo-upload-area {
          border: 2px dashed rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        .photo-upload-area:hover {
          border-color: rgba(168, 85, 247, 0.5);
          background: rgba(168, 85, 247, 0.1);
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-6xl"
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
                <span className="text-purple-400">⚙️ CUSTOMIZE</span>{' '}
                <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  PROFILE
                </span>
              </h1>
              <p className="text-gray-400 text-lg">
                Customize your avatar, photo, and final messages
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Photo Upload */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold font-heading text-center mb-6">
                  📸 Profile Photo
                </h2>
                
                {/* Photo Preview/Upload Area */}
                <div className="flex flex-col items-center space-y-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img 
                        src={photoPreview} 
                        alt="Profile preview" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-purple-500 shadow-2xl"
                      />
                      <button
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-gray-500 flex items-center justify-center bg-gray-800/50">
                      <span className="text-4xl text-gray-500">📷</span>
                    </div>
                  )}
                  
                  <div className="w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl transition-all duration-300 cursor-pointer text-center block"
                    >
                      {isUploadingPhoto ? '📤 Uploading...' : '📸 Choose Photo'}
                    </label>
                  </div>
                  
                  <p className="text-xs text-gray-400 text-center">
                    Max 5MB • JPG, PNG, GIF
                  </p>
                </div>
              </motion.div>

              {/* Avatar Selection */}
              <motion.div 
                initial={{ x: 0, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold font-heading text-center mb-6">
                  🎭 Avatar Backup
                </h2>
                
                {/* Current Selection Display */}
                <div className="flex justify-center mb-6">
                  <motion.div 
                    key={selectedAvatar}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <span className="text-4xl">{avatars[selectedAvatar]?.emoji}</span>
                  </motion.div>
                </div>
                
                <p className="text-center text-lg font-semibold text-purple-300 mb-6">
                  {avatars[selectedAvatar]?.name}
                </p>

                {/* Avatar Grid */}
                <div className="avatar-grid max-h-60 overflow-y-auto pr-2">
                  {avatars.map((avatar, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedAvatar(index)}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 ${
                        selectedAvatar === index
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl scale-110'
                          : 'bg-white/10 hover:bg-white/20 border border-white/20'
                      }`}
                    >
                      {avatar.emoji}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Messages */}
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold font-heading text-center mb-6">
                  💬 Messages
                </h2>
                
                {/* Message to Killer */}
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300">
                    Message to your killer (max 20 words) - <span className="text-red-400">Shown on Target File</span>
                  </label>
                  
                  <textarea
                    value={messageToKiller}
                    onChange={handleKillerMessageChange}
                    placeholder="Good luck, you'll need it..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white/20 transition-all duration-200 resize-none"
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${killerMessageWordCount > 20 ? 'text-red-400' : 'text-gray-400'}`}>
                      {killerMessageWordCount}/20 words
                    </span>
                    {killerMessageWordCount > 20 && (
                      <span className="text-red-400 text-sm">Too many words!</span>
                    )}
                  </div>
                </div>

                {/* Death Message */}
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300">
                    Death announcement (max 15 words)
                  </label>
                  
                  <textarea
                    value={deathMessage}
                    onChange={handleMessageChange}
                    placeholder="GG, you got me! See you in Valhalla..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-white/20 transition-all duration-200 resize-none"
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${wordCount > 15 ? 'text-red-400' : 'text-gray-400'}`}>
                      {wordCount}/15 words
                    </span>
                    {wordCount > 15 && (
                      <span className="text-red-400 text-sm">Too many words!</span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Preview Section */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Target File Preview */}
              <div className="bg-white/5 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                  🎯 Target File Preview
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Target" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-red-400"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">{avatars[selectedAvatar]?.emoji}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-red-300 text-lg">
                      {playerData?.fullName || 'Your Name'}
                    </p>
                    <p className="text-gray-400 text-sm">Target Acquired</p>
                  </div>
                </div>
                {messageToKiller && (
                  <div className="bg-yellow-600/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-200 italic text-sm">
                      "{messageToKiller}"
                    </p>
                  </div>
                )}
              </div>

              {/* Death Announcement Preview */}
              <div className="bg-white/5 border border-gray-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
                  💀 Death Announcement Preview
                </h3>
                <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {photoPreview ? (
                      <img 
                        src={photoPreview} 
                        alt="Player" 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">{avatars[selectedAvatar]?.emoji}</span>
                    )}
                    <span className="font-bold text-red-300">
                      {playerData?.fullName || 'Your Name'}
                    </span>
                    <span className="text-gray-400">was eliminated</span>
                  </div>
                  {deathMessage && (
                    <p className="text-gray-300 italic text-sm">
                      "{deathMessage}"
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-4 mt-8"
            >
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-4 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-2xl transition-all duration-300 font-heading text-lg"
              >
                ← Cancel
              </button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={isSaving || wordCount > 15 || killerMessageWordCount > 20 || isUploadingPhoto}
                className="flex-1 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-500 hover:via-pink-500 hover:to-red-500 text-white font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl font-heading text-lg"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SAVING...
                  </span>
                ) : (
                  '✨ SAVE PROFILE'
                )}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Profile;