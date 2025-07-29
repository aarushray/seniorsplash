import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp, addDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { badges } from '../utils/Badges';
import { motion } from 'framer-motion';


const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const announcementsRef = collection(firestore, 'announcements');
    const q = query(announcementsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const announcementsData = [];
      querySnapshot.forEach((doc) => {
        announcementsData.push({ id: doc.id, ...doc.data() });
      });
      setAnnouncements(announcementsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getAnnouncementStyle = (type) => {
    switch (type) {
      case 'kill':
        return 'border-l-4 border-red-500';
      case 'admin':
        return 'border-l-4 border-blue-500';
      case 'Major event':
        return 'border-l-4 border-yellow-500';
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-400">Loading announcements...</p>
      </div>
    );
  }

    return (
    <div className="h-full flex flex-col min-h-0">
      <h2 className="text-2xl font-bold mb-4 border-b border-border-color pb-3 font-heading flex items-center gap-3 flex-shrink-0">
        📢 <span className="glow-text">MISSION UPDATES</span>
      </h2>
      
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {announcements.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              <div className="text-4xl mb-2">📡</div>
              <p>No mission updates at this time.</p>
              <p className="text-sm mt-1">Stay alert for new intel.</p>
            </div>
          ) : (
            announcements.map((announcement, index) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-l-4 ${
                  announcement.type === 'kill' 
                    ? 'bg-red-900/20 border-red-500 text-red-100' 
                    : announcement.type === 'admin'
                    ? 'bg-blue-900/20 border-blue-500 text-blue-100'
                    : 'bg-purple-900/20 border-purple-500 text-purple-100'
                }`}
              >
                <p className="font-medium leading-relaxed">{announcement.message}</p>
                <p className="text-xs mt-2 opacity-70">
                  {announcement.timestamp?.toDate ? 
                    announcement.timestamp.toDate().toLocaleString() : 
                    'Recently'
                  }
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
 
};

export const createKillAnnouncement = async (proof, killCount, newBadges) => {
  try {
    // Generate different announcement messages based on kill count and badges
    let announcementMessage;
    let announcementType = 'kill';
    
    // Special announcements for milestones
    if (killCount === 1) {
      announcementMessage = `💀 FIRST BLOOD! ${proof.submitterName} has drawn first blood by eliminating ${proof.targetName} at ${proof.location}! The hunt begins...`;
    } else if (killCount === 5) {
      announcementMessage = `🔥 KILLING SPREE! ${proof.submitterName} has reached 5 kills after eliminating ${proof.targetName}! They're on fire!`;
    } else if (killCount === 10) {
      announcementMessage = `⚡ RAMPAGE! ${proof.submitterName} is unstoppable with 10 eliminations! ${proof.targetName} was their latest victim!`;
    } else if (killCount % 10 === 0) {
      announcementMessage = `🏆 LEGENDARY! ${proof.submitterName} has reached ${killCount} eliminations! ${proof.targetName} never saw it coming!`;
    } else if (newBadges.length > 0) {
      // If they earned badges, mention it
      const badgeNames = newBadges.map(badgeId => {
        const badge = badges.find(b => b.id === badgeId);
        return badge ? badge.title : badgeId;
      }).join(', ');
      announcementMessage = `🎖️ ${proof.submitterName} eliminated ${proof.targetName} at ${proof.location} and earned: ${badgeNames}!`;
    } else {
      // Regular kill announcements with variety
      const killMessages = [
        `💥 ${proof.submitterName} has eliminated ${proof.targetName} at ${proof.location}! Another one bites the dust!`,
        `⚔️ ${proof.targetName} has been splashed by ${proof.submitterName} at ${proof.location}! The hunt continues!`,
        `🎯 Target down! ${proof.submitterName} successfully eliminated ${proof.targetName} at ${proof.location}!`,
        `💀 ${proof.targetName} has fallen to ${proof.submitterName} at ${proof.location}! Who's next?`,
        `🩸 The streets of ${proof.location} run red as ${proof.submitterName} takes down ${proof.targetName}!`,
        `⚡ Lightning strikes! ${proof.submitterName} eliminates ${proof.targetName} at ${proof.location}!`,
        `🔫 Clean shot! ${proof.targetName} eliminated by ${proof.submitterName} at ${proof.location}!`
      ];
      
      announcementMessage = killMessages[Math.floor(Math.random() * killMessages.length)];
    }
    
    // Add kill count to the message
    announcementMessage += ` (Kill #${killCount})`;
    
    // Create the announcement in Firestore
    await addDoc(collection(firestore, 'announcements'), {
      message: announcementMessage,
      type: announcementType,
      timestamp: Timestamp.now(),
      killData: {
        killerId: proof.submittedBy,
        killerName: proof.submitterName,
        victimName: proof.targetName,
        location: proof.location,
        killCount: killCount,
        badgesAwarded: newBadges
      }
    });
    
      console.log('Kill announcement created:', announcementMessage);
    } catch (error) {
      console.error('Error creating kill announcement:', error);
    }
  };

export default Announcements;
