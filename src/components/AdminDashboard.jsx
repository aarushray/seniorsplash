import { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp, setDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { endGame } from '../utils/EndGame';
import { startGame } from '../utils/StartGame';
import { togglePurgeMode, getPurgeModeStatus } from '../utils/PurgeMode';
import { motion, AnimatePresence } from 'framer-motion';
import { query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { getAssassinsForPlayer } from '../utils/assassinIdentity';
import { reassignTargetsAfterPurge } from '../utils/reassignTargetsAfterPurge';
import { handleVerify, handleReject } from '../utils/killProofActions';
import { updateGamePin, getGamePin, subscribeToGamePin, validateGamePin, generateRandomPin } from '../utils/gamePin';
import { removePlayerFromGame } from '../utils/adminActions';
import { checkClassDomination, clearClassDominationState } from '../utils/classCheck';
import ClassDominationPopup from './ClassDominationPopup';

const AdminDashboard = () => {
  const [killProofs, setKillProofs] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState('');
  const [isPurgeMode, setIsPurgeMode] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');
  const [searchPlayerName, setSearchPlayerName] = useState('');
  const [assassinResults, setAssassinResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [bountyTargetName, setBountyTargetName] = useState('');
  const [bountyPrize, setBountyPrize] = useState('');
  const [bountyDescription, setBountyDescription] = useState('');
  const [bountyStatus, setBountyStatus] = useState('');
  const [gamePin, setGamePin] = useState('');
  const [gamePinInput, setGamePinInput] = useState('');
  const [gamePinLoading, setGamePinLoading] = useState(false);
  const [removePlayerStudentId, setRemovePlayerStudentId] = useState('');
const [removePlayerStatus, setRemovePlayerStatus] = useState('');
const [isRemovingPlayer, setIsRemovingPlayer] = useState(false);
const [showClassDomination, setShowClassDomination] = useState(false);
const [classDominationData, setClassDominationData] = useState(null);
const [isCheckingClass, setIsCheckingClass] = useState(false);




  useEffect(() => {
  const unsubscribe = subscribeToGamePin((pin) => {
    setGamePin(pin || '');
    setGamePinInput(pin || '');
  });

  return () => unsubscribe();
}, []);

const handleRemovePlayer = async () => {
  if (!removePlayerStudentId.trim()) {
    alert('Please enter a name');
    return;
  }
  
  const confirmRemoval = window.confirm(
    `Are you sure you want to remove player with name "${removePlayerStudentId}" from the game? This action cannot be undone.`
  );
  
  if (!confirmRemoval) return;
  
  setIsRemovingPlayer(true);
  setRemovePlayerStatus('Removing player...');
  
  try {
    const result = await removePlayerFromGame(removePlayerStudentId.trim());
    
    if (result.success) {
      setRemovePlayerStatus(`Successfully removed ${result.playerName} (${result.playerClass})`);
      setRemovePlayerStudentId('');
      alert(`✅ Player ${result.playerName} has been removed from the game.`);
      
      // Clear status after 5 seconds
      setTimeout(() => setRemovePlayerStatus(''), 5000);
    }
  } catch (error) {
    console.error('Error removing player:', error);
    setRemovePlayerStatus(`Failed to remove player: ${error.message}`);
    alert(`❌ ${error.message}`);
    
    // Clear status after 5 seconds
    setTimeout(() => setRemovePlayerStatus(''), 5000);
  } finally {
    setIsRemovingPlayer(false);
  }
};


  // Add these handler functions
  const handleGamePinUpdate = async () => {
    if (!validateGamePin(gamePinInput)) {
      alert('Game pin must be 4-6 digits');
      return;
    }

    setGamePinLoading(true);
    try {
      await updateGamePin(gamePinInput);
      alert('Game pin updated successfully!');
    } catch (error) {
      alert('Error updating game pin: ' + error.message);
    } finally {
      setGamePinLoading(false);
    }
  };
  const handleGenerateRandomPin = () => {
    const randomPin = generateRandomPin();
    setGamePinInput(randomPin);
  };


  const handleSetBounty = async () => {
    if (!bountyTargetName.trim() || !bountyPrize.trim()) {
      alert('Please enter both target name and prize.');
      return;
    }
      setBountyStatus('Setting bounty...');
      try {
        await setBounty(bountyTargetName.trim(), bountyPrize.trim(), bountyDescription.trim());
        setBountyTargetName('');
        setBountyPrize('');
        setBountyDescription('');
        setBountyStatus('Bounty set successfully!');
        alert('🎯 Bounty has been set!');
        
        // Clear status after 3 seconds
        setTimeout(() => setBountyStatus(''), 3000);
      } catch (error) {
        console.error('Error setting bounty:', error);
        setBountyStatus('Failed to set bounty.');
        alert('Failed to set bounty. Please try again.');
      }
  };

const handleRemoveBounty = async () => {
  setBountyStatus('Removing bounty...');
  try {
    const bountyRef = doc(firestore, 'game', 'bounty');
    await setDoc(bountyRef, {
      isActive: false,
      removedAt: new Date()
    });
    setBountyStatus('Bounty removed successfully!');
    alert('🚫 Bounty has been removed!');
    
    // Clear status after 3 seconds
    setTimeout(() => setBountyStatus(''), 3000);
  } catch (error) {
    console.error('Error removing bounty:', error);
    setBountyStatus('Failed to remove bounty.');
    alert('Failed to remove bounty. Please try again.');
  }
};


useEffect(() => {
  const fetchPurgeStatus = async () => {
    try {
      const status = await getPurgeModeStatus();
      setIsPurgeMode(status);
    } catch (error) {
      console.error('Error fetching purge status:', error);
      setIsPurgeMode(false);
    }
  };
  fetchPurgeStatus();

  // ✅ SIMPLIFIED: Use getDocs instead of onSnapshot to avoid listener issues
  const loadKillProofs = async () => {
    try {
      const killProofsRef = collection(firestore, 'killProofs');
      const snapshot = await getDocs(killProofsRef);
      
      const proofsData = [];
      snapshot.forEach((doc) => {
        proofsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort manually
      proofsData.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.()?.getTime() || 0;
        const timeB = b.timestamp?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      
      setKillProofs(proofsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading kill proofs:', error);
      setKillProofs([]);
      setIsLoading(false);
    }
  };

  loadKillProofs();

  // Refresh every 30 seconds
  const interval = setInterval(loadKillProofs, 30000);

  return () => {
    clearInterval(interval);
  };
}, []);

  const handleStartGame = async () => {
    setStatus('Starting game...');
    try {
      await startGame();
      setStatus('Game has started!');
      alert('Game has started!');
    } catch (err) {
      setStatus('Failed to start game.');
      console.error('Start game error:', err);
      alert(err.message || 'Failed to start game.');
    }
  };

  const handleEndGame = async () => {
    setStatus('Ending game...');
    try {
      await endGame();
      setStatus('Game has ended.');
      alert('Game has ended. New game starts soon!');
    } catch (err) {
      setStatus('Failed to end game.');
      console.error('End game error:', err);
      alert(err.message || 'Failed to end game.');
    }
  };

  const handleTogglePurgeMode = async () => {
    setPurgeStatus('Updating Purge Mode...');
    try {
      const newStatus = await togglePurgeMode();
      setIsPurgeMode(newStatus);
      setPurgeStatus(`Purge Mode is now ${newStatus ? 'ON' : 'OFF'}.`);
      alert(`Purge Mode has been turned ${newStatus ? 'ON' : 'OFF'}.`);
      if (!newStatus) {
        console.log('Reassigning TARGETS NOWWW...');
        await reassignTargetsAfterPurge();
      }
    } catch (err) {
      setPurgeStatus('Failed to update Purge Mode.');
      console.error('Purge mode error:', err);
      alert(err.message || 'Failed to update Purge Mode.');
    }
  };


  const handleFindAssassins = async () => {
    if (!searchPlayerName.trim()) {
      alert('Please enter a player name');
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await getAssassinsForPlayer(searchPlayerName.trim());
      setAssassinResults(results);
      
      if (results.success) {
        console.log(`Found assassins for ${searchPlayerName}:`, results);
      } else {
        alert(results.message);
      }
    } catch (error) {
      console.error('Error finding assassins:', error);
      alert('Error finding assassins. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearAssassinSearch = () => {
    setSearchPlayerName('');
    setAssassinResults(null);
  };

  const handleCheckClassDomination = async () => {
    setIsCheckingClass(true);
    try {
      const result = await checkClassDomination();
      
      if (result.hasWinningClass) {
        setClassDominationData({
          winningClass: result.winningClass,
          playerCount: result.playerCount
        });
        setShowClassDomination(true);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error checking class domination:', error);
      alert('Failed to check class domination. Please try again.');
    } finally {
      setIsCheckingClass(false);
    }
  };

  const handleCloseClassDomination = () => {
    setShowClassDomination(false);
    setClassDominationData(null);
  };

  const handleClearClassDomination = async () => {
    try {
      await clearClassDominationState();
      alert('Class domination state cleared successfully!');
    } catch (error) {
      console.error('Error clearing class domination state:', error);
      alert('Failed to clear class domination state. Please try again.');
    }
  };

  const setBounty = async (targetName, prize, description) => {
  const bountyRef = doc(firestore, 'game', 'bounty');
  await setDoc(bountyRef, {
    isActive: true,
    targetName,
    prize,
    description,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  });
};

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'verified': return 'border-green-500/50 bg-green-500/10';
      case 'rejected': return 'border-red-500/50 bg-red-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'verified': return '✅';
      case 'rejected': return '❌';
      default: return '❓';
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
          <p className="text-xl text-gray-400">Loading admin dashboard...</p>
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl font-bold font-heading glow-text mb-4">
              <span className="text-red-400">⚔️ ADMIN</span>{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                DASHBOARD
              </span>
            </h1>
            <p className="text-gray-400 text-xl">
              Review and verify kill proofs
            </p>
          </motion.div>

          {/* Stats */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Game Management</h2>
          <div className="space-y-4">
            <button onClick={handleStartGame} className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-2xl">Start Game</button>
            <button onClick={handleEndGame} className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-2xl">End Game</button>
            <button onClick={handleTogglePurgeMode} className={`w-full py-3 text-white font-semibold rounded-2xl ${isPurgeMode ? 'bg-yellow-500' : 'bg-purple-600'}`}>
              {isPurgeMode ? 'Deactivate Purge Mode' : 'Activate Purge Mode'}
            </button>
            <button 
              onClick={handleCheckClassDomination}
              disabled={isCheckingClass}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200"
            >
              {isCheckingClass ? '🔍 Scanning...' : '🏆 Check Class Domination'}
            </button>
            <button 
              onClick={handleClearClassDomination}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold rounded-2xl transition-all duration-200"
            >
              🗑️ Clear Class Domination
            </button>
          </div>
          {status && <p className="mt-4 text-center text-sm text-gray-600">{status}</p>}
          {purgeStatus && <p className="mt-2 text-center text-sm text-yellow-600">{purgeStatus}</p>}
        </div>

<div>
  <h2 className="text-xl font-bold text-gray-300 mb-4">🚫 Remove Player</h2>
  <div className="space-y-4">
    <input
      type="text"
      value={removePlayerStudentId}
      onChange={(e) => setRemovePlayerStudentId(e.target.value)}
      placeholder="Enter student ID..."
      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white/20 transition-all duration-200"
      onKeyPress={(e) => e.key === 'Enter' && handleRemovePlayer()}
    />
    <button 
      onClick={handleRemovePlayer}
      disabled={isRemovingPlayer || !removePlayerStudentId.trim()}
      className="w-full py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all"
    >
      {isRemovingPlayer ? 'Removing...' : '🚫 Remove Player'}
    </button>
    {removePlayerStatus && (
      <p className={`mt-2 text-center text-sm ${
        removePlayerStatus.includes('Successfully') ? 'text-green-400' : 'text-red-400'
      }`}>
        {removePlayerStatus}
      </p>
    )}
    <p className="text-xs text-gray-400 text-center">
      ⚠️ Warning: This will remove the player from the game and reassign their target to their assassin(s).
    </p>
  </div>
</div>

      </div>


      <div className="bg-card-bg border border-border-color rounded-xl p-6">
  <h3 className="text-xl font-bold mb-4 font-heading text-primary-color">
    🔐 Game Pin Management
  </h3>
  
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-2">
        Current Game Pin: <span className="text-primary-color font-mono text-lg">{gamePin || 'Not Set'}</span>
      </label>
    </div>
    
    <div className="flex gap-2">
      <input
        type="text"
        value={gamePinInput}
        onChange={(e) => setGamePinInput(e.target.value)}
        placeholder="Enter 4-6 digit pin"
        className="flex-1 px-3 py-2 bg-background border border-border-color rounded-lg 
                   text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-color/50
                   font-mono text-center text-lg"
        maxLength={6}
        pattern="\d*"
      />
      
      <button
        onClick={handleGenerateRandomPin}
        className="px-4 py-2 bg-secondary-color hover:bg-secondary-color/80 
                   text-white rounded-lg transition-colors duration-200
                   flex items-center gap-2"
      >
        🎲 Random
      </button>
    </div>
    
    <button
      onClick={handleGamePinUpdate}
      disabled={gamePinLoading || !gamePinInput}
      className="w-full py-2 bg-primary-color hover:bg-primary-color/80 
                 disabled:bg-gray-600 disabled:cursor-not-allowed
                 text-white rounded-lg transition-colors duration-200
                 font-medium"
    >
      {gamePinLoading ? 'Updating...' : 'Update Game Pin'}
    </button>
    
    <p className="text-xs text-text-secondary">
      Game pin must be 4-6 digits. Players will use this to join the game.
    </p>
  </div>
</div>


  <div>
    <h2 className="text-xl font-bold text-gray-300 mb-4">🎯 Bounty Management</h2>
    <div className="space-y-4">
      <input
        type="text"
        value={bountyTargetName}
        onChange={(e) => setBountyTargetName(e.target.value)}
        placeholder="Target name..."
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:bg-white/20 transition-all duration-200"
      />
      <input
        type="text"
        value={bountyPrize}
        onChange={(e) => setBountyPrize(e.target.value)}
        placeholder="Prize (e.g., $50 Gift Card)..."
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:bg-white/20 transition-all duration-200"
      />
      <textarea
        value={bountyDescription}
        onChange={(e) => setBountyDescription(e.target.value)}
        placeholder="Description (optional)..."
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:bg-white/20 transition-all duration-200"
        rows="2"
      />
      <div className="flex space-x-2">
        <button 
          onClick={handleSetBounty}
          className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-2xl hover:from-yellow-600 hover:to-orange-600 transition-all"
        >
          💰 Set Bounty
        </button>
        <button 
          onClick={handleRemoveBounty}
          className="px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold rounded-2xl hover:from-gray-700 hover:to-gray-800 transition-all"
        >
          🚫 Remove
        </button>
      </div>
    </div>
    {bountyStatus && <p className="mt-4 text-center text-sm text-yellow-400">{bountyStatus}</p>}
  </div>


      {/* Add this section after the existing Game Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Game Management</h2>
          {/* ...existing game management buttons... */}
        </div>

        {/* NEW: Assassin Finder Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Find Assassins</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={searchPlayerName}
              onChange={(e) => setSearchPlayerName(e.target.value)}
              placeholder="Enter player name..."
              className="w-full px-4 py-3 bg-white/50 border-0 rounded-2xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/70 transition-all duration-200"
              onKeyPress={(e) => e.key === 'Enter' && handleFindAssassins()}
            />
            <div className="flex space-x-2">
              <button 
                onClick={handleFindAssassins} 
                disabled={isSearching}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-2xl disabled:opacity-50"
              >
                {isSearching ? 'Searching...' : 'Find Assassins'}
              </button>
              {assassinResults && (
                <button 
                  onClick={clearAssassinSearch}
                  className="px-4 py-3 bg-gray-500 text-white font-semibold rounded-2xl"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assassin Search Results */}
      {assassinResults && assassinResults.success && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 mb-6"
        >
          <h3 className="text-2xl font-bold mb-4 text-center">
            🎯 Assassins Targeting: <span className="text-red-400">{assassinResults.target.name}</span>
          </h3>
          
          {/* Target Info */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <h4 className="text-lg font-semibold mb-2">Target Information:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Class:</span>
                <p className="font-semibold">{assassinResults.target.class}</p>
              </div>
              <div>
                <span className="text-gray-400">Status:</span>
                <p className={`font-semibold ${assassinResults.target.isAlive ? 'text-green-400' : 'text-red-400'}`}>
                  {assassinResults.target.isAlive ? 'Alive' : 'Eliminated'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Total Kills:</span>
                <p className="font-semibold text-orange-400">{assassinResults.target.kills}</p>
              </div>
              <div>
                <span className="text-gray-400">Current Streak:</span>
                <p className="font-semibold text-purple-400">{assassinResults.target.splashes}</p>
              </div>
            </div>
          </div>

          {/* Assassins List */}
          {assassinResults.assassins.length > 0 ? (
            <div>
              <h4 className="text-lg font-semibold mb-3">
                Assassins ({assassinResults.assassins.length}):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assassinResults.assassins.map((assassin, index) => (
                  <motion.div
                    key={assassin.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/10 rounded-xl p-4 border border-red-500/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-bold text-red-400">{assassin.name}</h5>
                      <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full">
                        {assassin.class}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Kills:</span>
                        <span className="ml-1 font-semibold text-orange-400">{assassin.kills}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Streak:</span>
                        <span className="ml-1 font-semibold text-purple-400">{assassin.splashes}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Target Assigned:</span>
                        <p className="text-xs text-gray-300">
                          {assassin.targetAssignedAt ? 
                            new Date(assassin.targetAssignedAt.seconds * 1000).toLocaleString() : 
                            'Unknown'
                          }
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xl text-gray-400">🛡️ No assassins targeting this player</p>
              <p className="text-sm text-gray-500 mt-2">This player is currently safe!</p>
            </div>
          )}
        </motion.div>
      )}


          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Proofs', value: killProofs.length, color: 'blue' },
              { label: 'Pending', value: killProofs.filter(p => p.status === 'pending').length, color: 'yellow' },
              { label: 'Verified', value: killProofs.filter(p => p.status === 'verified').length, color: 'green' },
              { label: 'Rejected', value: killProofs.filter(p => p.status === 'rejected').length, color: 'red' }
            ].map((stat, index) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-2xl p-6 text-center"
              >
                <p className={`text-3xl font-bold text-${stat.color}-400 mb-2`}>
                  {stat.value}
                </p>
                <p className="text-gray-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Kill Proofs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {killProofs.map((proof, index) => (
                <motion.div
                  key={proof.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card rounded-2xl p-6 cursor-pointer hover:bg-white/15 transition-all duration-200 ${getStatusColor(proof.status)}`}
                  onClick={() => setSelectedProof(proof)}
                >
                  {/* Proof Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold font-heading">
                      {proof.submitterName} → {proof.targetName}
                    </h3>
                    <span className="text-2xl">
                      {getStatusIcon(proof.status)}
                    </span>
                  </div>

                  {/* Media Preview */}
                  <div className="mb-4">
                    {proof.mediaType === 'video' ? (
                      <video 
                        src={proof.mediaUrl}
                        className="w-full h-32 object-cover rounded-xl"
                        muted
                      />
                    ) : (
                      <img 
                        src={proof.mediaUrl}
                        alt="Kill proof"
                        className="w-full h-32 object-cover rounded-xl"
                      />
                    )}
                  </div>

                  {/* Proof Details */}
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-400">Location:</span> {proof.location}</p>
                    <p><span className="text-gray-400">Time:</span> {proof.timestamp.toDate().toLocaleString()}</p>
                    <p className="text-gray-300 line-clamp-2">{proof.description}</p>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      proof.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                      proof.status === 'verified' ? 'bg-green-500/20 text-green-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {proof.status.toUpperCase()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* Detailed Proof Modal */}
          <AnimatePresence>
            {selectedProof && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedProof(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="glass-card rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold font-heading">
                      Kill Proof Details
                    </h2>
```
                    <button
                      onClick={() => setSelectedProof(null)}
                      className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                      aria-label="Close"
                    >
                      <span className="text-2xl">✖</span>
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Media */}
                    <div>
                      {selectedProof.mediaType === 'video' ? (
                        <video
                          src={selectedProof.mediaUrl}
                          className="w-full h-64 object-cover rounded-xl mb-4"
                          controls
                        />
                      ) : (
                        <img
                          src={selectedProof.mediaUrl}
                          alt="Kill proof"
                          className="w-full h-64 object-cover rounded-xl mb-4"
                        />
                      )}
                      <div className="text-sm text-gray-400">
                        <p><span className="font-semibold text-gray-300">Location:</span> {selectedProof.location}</p>
                        <p><span className="font-semibold text-gray-300">Time:</span> {selectedProof.timestamp.toDate().toLocaleString()}</p>
                      </div>
                    </div>
                    {/* Details and Actions */}
                    <div>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold mb-2">Description</h3>
                        <p className="text-gray-200">{selectedProof.description}</p>
                      </div>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold mb-2">Status</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedProof.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' :
                          selectedProof.status === 'verified' ? 'bg-green-500/20 text-green-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {selectedProof.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold mb-2">Admin Notes</h3>
                        <textarea
                          className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-gray-200"
                          rows={3}
                          value={adminNotes}
                          onChange={e => setAdminNotes(e.target.value)}
                          placeholder="Add notes for this proof (optional)..."
                        />
                      </div>
                      {selectedProof.status === 'pending' && (
                        <div className="flex gap-4">
                          <button
                            className="flex-1 py-2 rounded-xl bg-green-500/80 hover:bg-green-600 text-white font-bold transition"
                            disabled={processingIds.has(selectedProof.id)}
                            onClick={() => handleVerify(selectedProof, adminNotes, setProcessingIds, setAdminNotes)}
                          >
                            {processingIds.has(selectedProof.id) ? 'Verifying...' : 'Verify'}
                          </button>
                          <button
                            className="flex-1 py-2 rounded-xl bg-red-500/80 hover:bg-red-600 text-white font-bold transition"
                            disabled={processingIds.has(selectedProof.id)}
                            onClick={() => handleReject(selectedProof, adminNotes, setProcessingIds, setAdminNotes)}
                          >
                            {processingIds.has(selectedProof.id) ? 'Rejecting...' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>

        {/* Class Domination Popup */}
        <ClassDominationPopup
          isVisible={showClassDomination}
          winningClass={classDominationData?.winningClass}
          playerCount={classDominationData?.playerCount}
          onClose={handleCloseClassDomination}
        />
    </>
  );
};
export default AdminDashboard;