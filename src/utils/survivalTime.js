import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firestore } from '../firebase/config';

export const useSurvivalTime = (playerData, setSurvivalTime) => {
  const [gameState, setGameState] = useState(null);

  // Listen to game state
  useEffect(() => {
    const gameStateRef = doc(firestore, 'game', 'state');
    
    const unsubscribe = onSnapshot(gameStateRef, (doc) => {
      if (doc.exists()) {
        setGameState(doc.data());
      } else {
        setGameState(null);
      }
    }, (error) => {
      console.error('Error listening to game state:', error);
      setGameState(null);
    });

    return () => unsubscribe();
  }, []);

  // Calculate survival time
  useEffect(() => {
    if (!playerData) {
      setSurvivalTime('--');
      return;
    }

    // Check if game has started
    if (!gameState || !gameState.gameStarted) {
      setSurvivalTime('Game not started');
      return;
    }

    // Use game start time or player join time, whichever is more recent
    const gameStartTime = gameState.gameStartedAt;
    const playerJoinTime = playerData.gameJoinedAt;
    
    // Determine which timestamp to use
    let startTime = null;
    if (gameStartTime && playerJoinTime) {
      // Use the later of the two times
      const gameStart = gameStartTime.toDate ? gameStartTime.toDate() : new Date(gameStartTime);
      const playerJoin = playerJoinTime.toDate ? playerJoinTime.toDate() : new Date(playerJoinTime);
      startTime = gameStart > playerJoin ? gameStart : playerJoin;
    } else if (gameStartTime) {
      startTime = gameStartTime.toDate ? gameStartTime.toDate() : new Date(gameStartTime);
    } else if (playerJoinTime) {
      startTime = playerJoinTime.toDate ? playerJoinTime.toDate() : new Date(playerJoinTime);
    }

    if (!startTime) {
      setSurvivalTime('No start time');
      return;
    }

    const updateSurvivalTime = () => {
      try {
        const now = new Date();
        const diffMs = now - startTime;
        
        if (diffMs < 0) {
          setSurvivalTime('--');
          return;
        }
        
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        
        if (days > 0) {
          setSurvivalTime(`${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setSurvivalTime(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setSurvivalTime(`${minutes}m ${seconds}s`);
        } else {
          setSurvivalTime(`${seconds}s`);
        }
      } catch (error) {
        console.error('Error calculating survival time:', error);
        setSurvivalTime('Error');
      }
    };

    updateSurvivalTime();
    const interval = setInterval(updateSurvivalTime, 1000); // Update every second for more precision

    return () => clearInterval(interval);
  }, [playerData, gameState, setSurvivalTime]);
};