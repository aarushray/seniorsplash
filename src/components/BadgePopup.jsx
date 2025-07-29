import React from 'react';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export const getThemeColors = (icon, badgeId) => {
    if (icon === '🩸' || badgeId.includes('thanatos') || badgeId.includes('death')) {
      return {
        gradient: 'linear-gradient(270deg, #dc2626, #ef4444, #b91c1c, #f87171)',
        border: '#dc2626',
        glow: 'rgba(220, 38, 38, 0.6)',
        text: '#fff',
        backgroundArt: 'blood'
      };
    }
    else if (icon === '🌑' || icon === '🖤' || badgeId.includes('erebus')) {
      return {
        gradient: 'linear-gradient(270deg, #9333ea, #a855f7, #7c3aed, #c084fc)',
        border: '#9333ea',
        glow: 'rgba(147, 51, 234, 0.6)',
        text: '#fff',
        backgroundArt: 'shadow'
      };
    }
    else if (icon === '⚔️' || icon === '🔥' || badgeId.includes('ares') || badgeId.includes('hades')) {
      return {
        gradient: 'linear-gradient(270deg, #fb923c, #fbbf24, #f59e0b, #fde047)',
        border: '#fb923c',
        glow: 'rgba(251, 146, 60, 0.6)',
        text: '#000',
        backgroundArt: 'fire'
      };
    }
    else if (icon === '🏹' || badgeId.includes('artemis')) {
      return {
        gradient: 'linear-gradient(270deg, #22c55e, #4ade80, #16a34a, #86efac)',
        border: '#22c55e',
        glow: 'rgba(34, 197, 94, 0.6)',
        text: '#fff',
        backgroundArt: 'nature'
      };
    }
    else if (icon === '🌊' || badgeId.includes('poseidon')) {
      return {
        gradient: 'linear-gradient(270deg, #3b82f6, #6366f1, #2563eb, #93c5fd)',
        border: '#3b82f6',
        glow: 'rgba(59, 130, 246, 0.6)',
        text: '#fff',
        backgroundArt: 'water'
      };
    }
    else if (icon === '✨' || icon === '🧵' || badgeId.includes('angel_of_light') || badgeId.includes('fates')) {
      return {
        gradient: 'linear-gradient(270deg, #facc15, #fde047, #eab308, #fef08a)',
        border: '#facc15',
        glow: 'rgba(250, 204, 21, 0.6)',
        text: '#000',
        backgroundArt: 'light'
      };
    }
    else if (icon === '🪓' || badgeId.includes('jack')) {
      return {
        gradient: 'linear-gradient(270deg, #d97706, #f59e0b, #b45309, #fbbf24)',
        border: '#d97706',
        glow: 'rgba(180, 83, 9, 0.6)',
        text: '#fff',
        backgroundArt: 'wood'
      };
    }
    // Default rainbow theme
    else {
      return {
        gradient: 'linear-gradient(270deg, #ff6ec4, #7873f5, #4ade80, #facc15)',
        border: '#6b7280',
        glow: 'rgba(107, 114, 128, 0.6)',
        text: '#fff',
        backgroundArt: 'stars'
      };
    }
  };



const BadgePopup = ({ badge, onClose }) => {
  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }, []);

  const getBackgroundArt = (artType) => {
    // [existing getBackgroundArt unchanged]
  };

  const theme = getThemeColors(badge.icon, badge.id);

  return (
    <>
      <style>{`
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .badge-popup-bg {
          background: ${theme.gradient};
          background-size: 500% 500%;
          animation: gradientMove 12s ease-in-out infinite;
          border: 2px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          overflow: hidden;
          box-shadow: 0 0 80px ${theme.glow}, inset 0 0 20px ${theme.glow};
        }

        .badge-popup-glow {
          box-shadow:
            0 0 40px ${theme.glow},
            0 0 80px ${theme.glow}30,
            inset 0 0 40px rgba(255,255,255,0.1),
            0 0 0 2px ${theme.border};
        }

        @keyframes fadeInScale {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(30px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .popup-enter {
          animation: fadeInScale 0.4s ease-out forwards;
        }

        /* Background art animations unchanged */
        /* Fire, Water, Light, Nature, Shadow, Blood, Wood, Stars */
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500" onClick={onClose}></div>

        <div
          className="relative badge-popup-bg badge-popup-glow popup-enter rounded-3xl p-10 shadow-2xl w-[92%] max-w-3xl mx-4 transform transition-all duration-500"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            dangerouslySetInnerHTML={{ __html: getBackgroundArt(theme.backgroundArt) }}
          />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 transition-all duration-200 flex items-center justify-center backdrop-blur-sm border border-white/20 z-10"
            style={{ color: theme.text }}
          >
            <span className="text-lg font-semibold">✕</span>
          </button>

          <div className="relative z-10 flex items-start gap-8">
            <div className="flex-shrink-0">
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full blur-xl opacity-60"
                  style={{
                    background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)`,
                    transform: 'scale(2)'
                  }}
                ></div>
                <span
                  className="relative text-8xl block"
                  style={{
                    filter: `drop-shadow(0 0 60px ${theme.glow})`,
                    textShadow: `0 0 80px ${theme.glow}`
                  }}
                >
                  {badge.icon}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3
                className="text-3xl font-extrabold mb-4 leading-tight"
                style={{
                  color: theme.text,
                  textShadow: '0 2px 6px rgba(0,0,0,0.4)'
                }}
              >
                {badge.title}
              </h3>
              <p
                className="text-lg opacity-95 leading-relaxed mb-6"
                style={{
                  color: theme.text,
                  textShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
                {badge.description}
              </p>

              <div className="flex gap-3">
                <span
                  className="inline-block px-4 py-1.5 text-sm font-semibold rounded-full bg-black/30 backdrop-blur-sm border border-white/20"
                  style={{ color: theme.text }}
                >
                  {badge.category.toUpperCase()}
                </span>

                <span
                  className="inline-block px-4 py-1.5 text-sm font-semibold rounded-full bg-white/20 backdrop-blur-sm border border-white/30"
                  style={{ color: theme.text }}
                >
                  ✨ LEGENDARY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BadgePopup;
