import React, { useState, useEffect } from 'react';
import { endGame } from '../utils/EndGame';
import { startGame } from '../utils/StartGame';
import { togglePurgeMode, getPurgeModeStatus } from '../utils/PurgeMode';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '../firebase/config';

import ProofGallery from './ProofGallery';

const AdminDashboard = () => {
  const [status, setStatus] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announcementType, setAnnouncementType] = useState('admin');
  const [isPurgeMode, setIsPurgeMode] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState('');

  useEffect(() => {
    const fetchPurgeStatus = async () => {
      const status = await getPurgeModeStatus();
      setIsPurgeMode(status);
    };
    fetchPurgeStatus();
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
    } catch (err) {
      setPurgeStatus('Failed to update Purge Mode.');
      console.error('Purge mode error:', err);
      alert(err.message || 'Failed to update Purge Mode.');
    }
  };

  const handleSendAnnouncement = async () => {
    if (!announcement) {
      alert('Please enter an announcement message.');
      return;
    }
    try {
      await addDoc(collection(firestore, 'announcements'), {
        message: announcement,
        type: announcementType,
        timestamp: Timestamp.now(),
      });
      setAnnouncement('');
      alert('Announcement sent!');
    } catch (err) {
      console.error('Error sending announcement:', err);
      alert('Failed to send announcement.');
    }
  };

  return (
    <div>
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg mt-6">
        <h2 className="text-xl font-bold mb-4 text-center text-blue-400">📢 Admin Controls 📢</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-center text-white">Game Management</h3>
            <div className="flex flex-col space-y-4">
              <button
                onClick={handleStartGame}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start Game
              </button>
              <button
                onClick={handleEndGame}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                End Game
              </button>
              <button
                onClick={handleTogglePurgeMode}
                className={`px-4 py-2 text-white rounded ${
                  isPurgeMode ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isPurgeMode ? 'Deactivate Purge Mode' : 'Activate Purge Mode'}
              </button>
            </div>
            {status && <p className="mt-4 text-center text-sm text-gray-400">{status}</p>}
            {purgeStatus && <p className="mt-2 text-center text-sm text-yellow-400">{purgeStatus}</p>}
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-center text-white">Send Announcement</h3>
            <div className="flex flex-col space-y-4">
              <textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Enter announcement message..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                rows="3"
              />
              <select
                value={announcementType}
                onChange={(e) => setAnnouncementType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="admin">Admin Update (Blue)</option>
                <option value="event">Major Event (Gold)</option>
              </select>
              <button
                onClick={handleSendAnnouncement}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Send Announcement
              </button>
            </div>
          </div>
        </div>
      </div>
      <ProofGallery />
    </div>
  );
};

export default AdminDashboard;
