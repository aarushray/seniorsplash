import React, { useState, useEffect } from 'react';
import { badges } from '../utils/Badges';
import BadgeSlot from './BadgeSlot';
import BadgePopup from './BadgePopup';
import { motion } from 'framer-motion';

const PlayerDashboard = ({ playerData }) => {
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);

  useEffect(() => {
    if (playerData?.badges) {
      const badgesMap = badges.reduce((acc, badge) => {
        acc[badge.id] = badge;
        return acc;
      }, {});
      
      const fetchedBadges = playerData.badges.map(badgeId => badgesMap[badgeId]).filter(Boolean);
      setEarnedBadges(fetchedBadges);
    }
  }, [playerData]);

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
  };

  return (
    <div className="relative h-[350px] py-3 px-4"> 
      <h2 className="text-2xl font-bold mb-6 border-b border-border-color pb-3 font-heading flex items-center gap-3">
        🏆 <span className="glow-text text-accent-red">ACHIEVEMENTS</span>
      </h2>

      {/* Badge Grid with overflow visible to show hover effects */}
      <div className="grid grid-cols-5 gap-6 justify-items-center p-4 overflow-visible relative z-10">
        {badges.slice(0, 10).map((badge, index) => {
          const isEarned = earnedBadges.some(earned => earned.id === badge.id);
          return (
            <div 
              key={badge.id} 
              className="cursor-pointer relative z-20"
              onClick={() => isEarned && handleBadgeClick(badge)}
              style={{ 
                // Ensure badges have enough space around them for hover effects
                padding: '10px',
                margin: '-10px', // Negative margin to maintain visual spacing
              }}
            >
              <BadgeSlot 
                badgeInfo={badge} 
                isEarned={isEarned}
              />
            </div>
          );
        })}
      </div>

      {selectedBadge && (
        <BadgePopup 
          badge={selectedBadge} 
          onClose={() => setSelectedBadge(null)} 
        />
      )}
    </div>
  );
};

export default PlayerDashboard;