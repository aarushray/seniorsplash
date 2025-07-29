import React from 'react';
import { motion } from 'framer-motion';
import { getThemeColors } from './BadgePopup';

const BadgeSlot = ({ badgeInfo, isEarned }) => {
  const theme = getThemeColors(badgeInfo.icon, badgeInfo.id);

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center"
      whileHover={isEarned ? {
        scale: 1.1,
        y: -8,
        transition: {
          duration: 0.2,
          ease: "easeOut"
        }
      } : {}}
      whileTap={isEarned ? { scale: 0.95 } : {}}
      style={{
        zIndex: 30,
      }}
    >
      {/* Badge Container */}
      <motion.div
        className={`
          relative w-20 h-20 rounded-xl flex items-center justify-center mb-2
          transition-all duration-300 ease-in-out
          ${isEarned
            ? 'bg-black/60 border-2 cursor-pointer'
            : 'bg-gray-800/50 border-2 border-gray-600/30'
          }
        `}
        style={{
          borderColor: isEarned ? theme.border : '',
          boxShadow: isEarned ? `0 0 50px ${theme.glow}40` : 'none'
        }}
        whileHover={isEarned ? {
          boxShadow: `0 0 50px ${theme.glow}, 0 0 100px ${theme.glow}40`,
        } : {}}
      >
        {/* Always-on Glow Layer */}
        {isEarned && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{
              background: `radial-gradient(circle, ${theme.glow} 30%, transparent 100%)`,
              opacity: 0.4,
              zIndex: -3,
              filter: 'blur(8px)'
            }}
          />
        )}


        {/* Badge Icon */}
        <motion.span
          className={`text-3xl transition-all duration-300 ${isEarned ? 'text-white' : 'text-gray-500'}`}
          whileHover={isEarned ? {
            textShadow: `0 0 20px ${theme.glow}`,
            scale: 1.1
          } : {}}
        >
          {badgeInfo.icon || '🏆'}
        </motion.span>

        {/* Hover Radial Glow */}
        {isEarned && (
          <motion.div
            className="absolute inset-0 rounded-xl opacity-60"
            style={{
              background: `radial-gradient(circle, ${theme.glow} 100%, transparent 0%)`,
              zIndex: -1
            }}
            whileHover={{
              opacity: 0.6,
              scale: 1.3,
              transition: {
                duration: 0.2,
                ease: "easeOut"
              }
            }}
          />
        )}

        {/* Hover Aura Ring */}
        {isEarned && (
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0"
            style={{
              background: `conic-gradient(${theme.glow}, transparent, ${theme.glow})`,
              zIndex: -2,
              filter: 'blur(8px)'
            }}
            whileHover={{
              opacity: 0.8,
              scale: 1.5,
              rotate: 360,
              transition: {
                duration: 2,
                ease: "linear",
                repeat: Infinity
              }
            }}
          />
        )}
      </motion.div>

      {/* Badge Name with Glow Effect */}
      <motion.div
        className={`text-center transition-all duration-300 ${
          isEarned ? 'opacity-100' : 'opacity-40'
        }`}
        whileHover={isEarned ? {
          scale: 1.05,
          textShadow: `0 0 15px ${theme.glow}`,
        } : {}}
      >
        <p 
          className={`text-xs font-bold font-heading leading-tight max-w-[80px] ${
            isEarned 
              ? 'text-white' 
              : 'text-gray-500'
          }`}
          style={{
            textShadow: isEarned ? `0 0 10px ${theme.glow}80` : 'none',
            color: isEarned ? '#ffffff' : '#6b7280'
          }}
        >
          {badgeInfo.title}
        </p>
      </motion.div>

      {/* Enhanced Tooltip for Earned Badges */}
      {isEarned && (
        <motion.div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-6 px-4 py-3 text-white text-sm rounded-lg whitespace-nowrap z-50 pointer-events-none opacity-0"
          style={{
            background: `linear-gradient(135deg, ${theme.glow}20, rgba(0,0,0,0.95))`,
            border: `1px solid ${theme.border}`,
            boxShadow: `0 8px 25px ${theme.glow}60`,
            backdropFilter: 'blur(10px)'
          }}
          whileHover={{
            opacity: 1,
            y: -5,
            transition: {
              delay: 0.5,
              duration: 0.2
            }
          }}
        >
          <div className="font-semibold text-center" style={{ color: theme.text || '#ffffff' }}>
            {badgeInfo.title}
          </div>
          {badgeInfo.description && (
            <div className="text-xs opacity-80 mt-1 text-center max-w-[200px]">
              {badgeInfo.description}
            </div>
          )}
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
            style={{ borderTopColor: theme.border }}
          ></div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default BadgeSlot;