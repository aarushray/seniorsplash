import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { firestore } from "../firebase/config";

export const useSurvivalTime = (playerData, setSurvivalTime) => {
  const [gameState, setGameState] = useState(null);
  const intervalRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Helper: Safe Firestore timestamp → Date
  const toDateSafe = (ts) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
    return null;
  };

  // Format time difference into readable string
  const formatTimeDifference = (diffMs, prefix = "") => {
    if (diffMs < 0) return "--";

    const days = Math.floor(diffMs / 86400000);
    const hours = Math.floor((diffMs % 86400000) / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);

    if (days > 0) {
      return `${prefix}${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${prefix}${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${prefix}${minutes}m`;
    }
  };

  // Listen to game state changes in real-time
  useEffect(() => {
    const gameStateRef = doc(firestore, "game", "state");

    unsubscribeRef.current = onSnapshot(
      gameStateRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setGameState(docSnap.data());
        } else {
          setGameState(null);
        }
      },
      (error) => {
        console.error("Error listening to game state:", error);
        setGameState(null);
      },
    );

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Calculate and update survival time
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // No player data
    if (!playerData) {
      setSurvivalTime("--");
      return;
    }

    const joinTime = toDateSafe(playerData.gameJoinedAt);
    const eliminatedTime = toDateSafe(playerData.eliminatedAt);
    const gameStartTime = toDateSafe(gameState?.gameStartedAt);

    // Player is dead - calculate final survival time
    if (!playerData.isAlive) {
      if (eliminatedTime && joinTime) {
        const diffMs = eliminatedTime - joinTime;
        setSurvivalTime(formatTimeDifference(diffMs, "Survived: "));
      } else if (eliminatedTime && gameStartTime) {
        // If no join time, use game start time
        const diffMs = eliminatedTime - gameStartTime;
        setSurvivalTime(formatTimeDifference(diffMs, "Survived: "));
      } else {
        setSurvivalTime("Eliminated");
      }
      return;
    }

    // Game hasn't started yet
    if (!gameState?.gameStarted || !gameStartTime) {
      setSurvivalTime("Game not started");
      return;
    }

    // Determine the actual start time for survival calculation
    // Use the later of game start time or player join time
    let survivalStartTime = gameStartTime;

    if (joinTime) {
      // If player joined after game started, use join time
      // If player joined before game started, use game start time
      survivalStartTime = joinTime > gameStartTime ? joinTime : gameStartTime;
    }

    if (!survivalStartTime) {
      setSurvivalTime("No start time available");
      return;
    }

    // Function to update survival time
    const updateSurvivalTime = () => {
      const now = new Date();
      const diffMs = now - survivalStartTime;

      if (diffMs < 0) {
        setSurvivalTime("--");
        return;
      }

      setSurvivalTime(formatTimeDifference(diffMs));
    };

    // Initial update
    updateSurvivalTime();

    // Set up interval for live updates (every 60 seconds)
    intervalRef.current = setInterval(updateSurvivalTime, 60000);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playerData, gameState, setSurvivalTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
};
