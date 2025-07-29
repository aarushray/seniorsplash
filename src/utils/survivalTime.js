import { useEffect } from 'react';

export const useSurvivalTime = (playerData, setSurvivalTime) => {
  useEffect(() => {
    if (playerData?.gameJoinedAt) {
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

          console.log('Hours:', hours, 'Minutes:', minutes, 'Seconds:', seconds);

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

      const interval = setInterval(updateSurvivalTime, getUpdateFrequency());

      return () => {
        console.log('Cleaning up survival time interval');
        clearInterval(interval);
      };
    } else {
      console.log('No gameJoinedAt found, setting survival time to --');
      setSurvivalTime('--');
    }
  }, [playerData?.gameJoinedAt, setSurvivalTime]);
};