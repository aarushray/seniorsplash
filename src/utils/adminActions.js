import {
  collection,
  addDoc,
  Timestamp,
  setDoc,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "../firebase/config";
import { badges } from "./Badges";

export const removePlayerFromGame = async (fullName) => {
  try {
    // ✅ Fetch all players in one go (same efficient pattern)
    const playersSnap = await getDocs(
      query(collection(firestore, "players"), where("isInGame", "==", true)),
    );

    const allPlayers = playersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // ✅ Build efficient maps in one pass
    const nameToIdMap = Object.fromEntries(
      allPlayers.map((p) => [p.fullName?.toLowerCase(), p.id]),
    );

    // Find player by name (case-insensitive)
    const playerId = nameToIdMap[fullName.toLowerCase()];
    if (!playerId) {
      throw new Error(`Player "${fullName}" not found in game`);
    }

    const player = allPlayers.find((p) => p.id === playerId);
    if (!player.isInGame) {
      throw new Error(`Player "${fullName}" is not currently in a game`);
    }

    // ✅ Simple removal - no target reassignment needed
    await updateDoc(doc(firestore, "players", playerId), {
      isInGame: false,
      targetId: null,
      isAlive: false,
      removedAt: new Date(),
      removedBy: "admin",
    });

    const results = {
      removedPlayer: player.fullName,
      playerId: playerId,
      message: `Player "${player.fullName}" successfully removed from game`,
    };

    console.log("Player removal completed:", results);
    return results;
  } catch (error) {
    console.error("Error removing player from game:", error);
    throw error;
  }
};

export const setBounty = async (targetName, prize, description = "") => {
  if (!targetName.trim() || !prize.trim()) {
    throw new Error("Target name and prize are required");
  }

  const bountyRef = doc(firestore, "game", "bounty");
  await setDoc(bountyRef, {
    isActive: true,
    targetName: targetName.trim(),
    prize: prize.trim(),
    description: description.trim(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
  });
};

export const removeBounty = async () => {
  const bountyRef = doc(firestore, "game", "bounty");
  await setDoc(bountyRef, {
    isActive: false,
    removedAt: new Date(),
  });
};

export const clearAllPendingKills = async () => {
  const pendingKillsQuery = query(
    collection(firestore, "killProofs"),
    where("status", "==", "pending"),
  );

  const pendingKillsSnapshot = await getDocs(pendingKillsQuery);
  const batch = writeBatch(firestore);

  pendingKillsSnapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
};

export const checkBadgeRequirements = async (playerId) => {
  try {
    const playerRef = doc(firestore, "players", playerId);
    const playerSnap = await getDoc(playerRef);

    if (!playerSnap.exists()) return [];

    const playerData = playerSnap.data();
    const currentBadges = playerData.badges || [];
    const newBadges = [];

    for (const badge of badges) {
      if (currentBadges.includes(badge.id)) continue;

      let qualifies = false;

      switch (badge.trigger) {
        case "kill_count":
          qualifies = (playerData.kills || 0) >= badge.requirement;
          break;
        case "kill_streak":
          qualifies = (playerData.splashes || 0) >= badge.requirement;
          break;
        case "bounty_kill":
          qualifies = (playerData.bountyKills || 0) >= badge.requirement;
          break;
        case "purge_kill":
          qualifies = (playerData.purgeKills || 0) >= badge.requirement;
          break;
        case "survival_time":
          const joinDate = playerData.joinedAt?.toDate() || new Date();
          const daysSurvived = Math.floor(
            (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          qualifies = daysSurvived >= badge.requirement;
          break;
        case "game_winner":
          qualifies = playerData.isWinner || false;
          break;
      }

      if (qualifies) {
        newBadges.push(badge.id);
      }
    }

    return newBadges;
  } catch (error) {
    console.error("Error checking badge requirements:", error);
    return [];
  }
};

export const revivedPlayer = async (fullName) => {
  try {
    // ✅ Fetch all players in one go (same efficient pattern)
    const playersSnap = await getDocs(
      query(
        collection(firestore, "players"),
        where("isInGame", "==", false),
        where("isAlive", "==", false),
      ),
    );

    const allPlayers = playersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // ✅ Build efficient maps in one pass
    const nameToIdMap = Object.fromEntries(
      allPlayers.map((p) => [p.fullName?.toLowerCase(), p.id]),
    );

    // Find player by name (case-insensitive)
    const playerId = nameToIdMap[fullName.toLowerCase()];
    if (!playerId) {
      throw new Error(`Player "${fullName}" not NOT in game`);
    }

    const player = allPlayers.find((p) => p.id === playerId);
    if (player.isInGame) {
      throw new Error(`Player "${fullName}" is currently in a game`);
    }

    // ✅ Simple removal - no target reassignment needed
    await updateDoc(doc(firestore, "players", playerId), {
      isInGame: true,
      targetId: null,
      isAlive: true,
      removedAt: null,
      removedBy: null,
    });

    const results = {
      revivedPlayer: player.fullName,
      playerId: playerId,
      message: `Player "${player.fullName}" successfully revived`,
    };

    return results;
  } catch (error) {
    console.error("Error reviving player:", error);
    throw error;
  }
};
