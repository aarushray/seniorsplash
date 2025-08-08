import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ClassDominationPopup = ({ isVisible, winningClass, playerCount, onClose }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="relative bg-gradient-to-br from-cyan-900 via-blue-900 to-purple-900 border-2 border-cyan-400 rounded-3xl p-8 max-w-md mx-4 shadow-2xl"
            style={{
              boxShadow: '0 0 50px rgba(34, 211, 238, 0.5), inset 0 0 20px rgba(34, 211, 238, 0.2)'
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-cyan-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Holographic content */}
            <div className="text-center">
              {/* Crown icon */}
              <div className="mb-4">
                <div className="text-6xl animate-pulse glow-text text-yellow-400">
                  👑
                </div>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-4 glow-text text-cyan-400">
                CLASS DOMINATION
              </h2>

              {/* Winning class */}
              <div className="mb-6">
                <div className="text-xl text-white mb-2">Victorious Class:</div>
                <div className="text-4xl font-bold glow-text text-yellow-400">
                  {winningClass}
                </div>
              </div>

              {/* Player count */}
              <div className="mb-6">
                <div className="text-lg text-cyan-300">
                  {playerCount} {playerCount === 1 ? 'Player' : 'Players'} Remaining
                </div>
              </div>

              {/* Sci-fi message */}
              <div className="text-sm text-cyan-200 italic">
                "The balance has shifted. One class stands supreme."
              </div>

              {/* Holographic effects */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-blue-400/5 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClassDominationPopup;
