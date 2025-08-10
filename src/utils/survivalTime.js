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

    if (!playerData.isAlive) {
      if (playerData.eliminatedAt && playerData.gameJoinedAt) {
        const eliminatedTime = playerData.eliminatedAt.toDate ? 
          playerData.eliminatedAt.toDate() : new Date(playerData.eliminatedAt);
        const joinTime = playerData.gameJoinedAt.toDate ? 
          playerData.gameJoinedAt.toDate() : new Date(playerData.gameJoinedAt);
        const survivalMs = eliminatedTime - joinTime;
        
        // Format the final survival time
        const days = Math.floor(survivalMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((survivalMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((survivalMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setSurvivalTime(`Survived: ${days}d ${hours}h ${minutes}m`);
        } else if (hours > 0) {
          setSurvivalTime(`Survived: ${hours}h ${minutes}m`);
        } else {
          setSurvivalTime(`Survived: ${minutes}m`);
        }
      } else {
        setSurvivalTime('Eliminated');
      }
      return;
    }

    // Check if game has started
    if (!gameState || !gameState.gameStarted) {
      setSurvivalTime('Game not started');
      return;
    }

    // Use game start time or player join time, whichever is more recent
    let startTime = null;
    if (gameState.gameStartedAt && playerData.gameJoinedAt) {
      const gameStart = gameState.gameStartedAt.toDate ? 
        gameState.gameStartedAt.toDate() : new Date(gameState.gameStartedAt);
      const playerJoin = playerData.gameJoinedAt.toDate ? 
        playerData.gameJoinedAt.toDate() : new Date(playerData.gameJoinedAt);
      startTime = gameStart > playerJoin ? gameStart : playerJoin;
    } else if (gameState.gameStartedAt) {
      startTime = gameState.gameStartedAt.toDate ? 
        gameState.gameStartedAt.toDate() : new Date(gameState.gameStartedAt);
    } else if (playerData.gameJoinedAt) {
      startTime = playerData.gameJoinedAt.toDate ? 
        playerData.gameJoinedAt.toDate() : new Date(playerData.gameJoinedAt);
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