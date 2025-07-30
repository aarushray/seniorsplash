import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect } from 'react';
import { firestore } from '../firebase/config';

export const useSurvivalTime = (playerData, setSurvivalTime) => {

  useEffect(() => {
    if (!playerData?.gameJoinedAt) {
      console.log('No gameJoinedAt found, setting survival time to --');
      setSurvivalTime('--');
      return;
    }

    let interval;
    let gameStateUnsubscribe;

    // Subscribe to real-time game state changes
    const gameRef = doc(firestore, 'game', 'state');
    gameStateUnsubscribe = onSnapshot(gameRef, (gameSnap) => {
      try {
        if (gameSnap.exists()) {
          const gameData = gameSnap.data();
          
          if (!gameData.gameStarted) {
            setSurvivalTime('--');
            // Clear any existing interval
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
            return;
          }

          // Game has started - start the survival timer
          const updateSurvivalTime = () => {
            try {
              // Handle both Firestore Timestamp and regular Date objects
              const joinTime = playerData.gameJoinedAt.toDate ?
                playerData.gameJoinedAt.toDate() :
                new Date(playerData.gameJoinedAt);

              const now = new Date();
              const diffMs = now - joinTime;

              // Handle negative time (future date)
              if (diffMs < 0) {
                setSurvivalTime('0m');
                return;
              }

              // Calculate time components
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

              // Format display based on duration
              if (hours === 0 && minutes < 5) {
                setSurvivalTime(`${minutes}m ${seconds}s`);
              } else if (hours === 0) {
                setSurvivalTime(`${minutes}m`);
              } else if (hours < 24) {
                setSurvivalTime(`${hours}h ${minutes}m`);
              } else {
                const days = Math.floor(hours / 24);
                const remainingHours = hours % 24;
                setSurvivalTime(`${days}d ${remainingHours}h`);
              }
            } catch (error) {
              console.error('Error calculating survival time:', error);
              setSurvivalTime('--');
            }
          };

          // Clear any existing interval before starting a new one
          if (interval) {
            clearInterval(interval);
          }

          // Call immediately to get initial value
          updateSurvivalTime();

          // Calculate update frequency dynamically
          const getUpdateFrequency = () => {
            try {
              const joinTime = playerData.gameJoinedAt.toDate ?
                playerData.gameJoinedAt.toDate() :
                new Date(playerData.gameJoinedAt);

              const now = new Date();
              const diffMs = now - joinTime;
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

              // Update every second for first 5 minutes, then every minute
              return (hours === 0 && minutes < 5) ? 1000 : 60000;
            } catch (error) {
              console.error('Error calculating update frequency:', error);
              return 60000; // Default to 1 minute
            }
          };

          interval = setInterval(updateSurvivalTime, getUpdateFrequency());
        } else {
          setSurvivalTime('--');
        }
      } catch (error) {
        console.error('Error in game state listener:', error);
        setSurvivalTime('--');
      }
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up survival time hook');
      if (interval) {
        clearInterval(interval);
      }
      if (gameStateUnsubscribe) {
        gameStateUnsubscribe();
      }
    };
  }, [playerData?.gameJoinedAt, setSurvivalTime]);
};