import React, { useState, useEffect } from 'react';
import { badges } from '../utils/Badges';
import BadgeSlot from './BadgeSlot';
import BadgePopup from './BadgePopup';
import ClassDominationPopup from './ClassDominationPopup';
import { motion } from 'framer-motion';

const PlayerDashboard = ({ playerData }) => {
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showClassDomination, setShowClassDomination] = useState(false);
  const [classDominationData, setClassDominationData] = useState(null);

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

  // Check for class domination on component mount
  useEffect(() => {
    const classDomination = localStorage.getItem('classDomination');
    if (classDomination) {
      try {
        const data = JSON.parse(classDomination);
        setClassDominationData(data);
        setShowClassDomination(true);
        // Clear from localStorage so it doesn't show again on refresh
        localStorage.removeItem('classDomination');
      } catch (error) {
        console.error('Error parsing class domination data:', error);
      }
    }
  }, []);

  const handleCloseClassDomination = () => {
    setShowClassDomination(false);
    setClassDominationData(null);
  };

  const handleBadgeClick = (badge) => {
    setSelectedBadge(badge);
  };

  return (
    <div className="relative h-auto py-3 px-4"> 
      <h2 className="text-2xl font-bold mb-6 border-b border-border-color pb-3 font-heading flex items-center gap-3">
        🏆 <span className="glow-text text-accent-red">ACHIEVEMENTS</span>
      </h2>

      {/* 2x5 Badge Grid with increased row gap and reduced bottom padding */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 p-4 pb-2">
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

      {/* Class Domination Popup */}
      <ClassDominationPopup
        isVisible={showClassDomination}
        winningClass={classDominationData?.winningClass}
        playerCount={classDominationData?.playerCount}
        onClose={handleCloseClassDomination}
      />
    </div>
  );
};

export default PlayerDashboard;