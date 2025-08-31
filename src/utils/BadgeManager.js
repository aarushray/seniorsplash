import {
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  increment,
} from "firebase/firestore";
import { firestore } from "../firebase/config";
import { checkEligibleBadges, badges } from "./Badges";

export const awardBadge = async (playerId, badgeId) => {
  try {
    const playerRef = doc(firestore, "players", playerId);

    // Check if player already has badge
    const playerDoc = await getDoc(playerRef);
    const currentBadges = playerDoc.data()?.badges || [];

    if (currentBadges.includes(badgeId)) {
      console.log(`Player ${playerId} already has badge ${badgeId}`);
      return false;
    }

    // Award the badge
    await updateDoc(playerRef, {
      badges: arrayUnion(badgeId),
      lastBadgeEarned: badgeId,
      lastBadgeTimestamp: new Date(),
    });

    console.log(`Badge ${badgeId} awarded to player ${playerId}`);
    return true;
  } catch (error) {
    console.error("Error awarding badge:", error);
    return false;
  }
};

export const checkAndAwardBadges = async (
  playerId,
  actionType,
  additionalData = {},
) => {
  try {
    const playerRef = doc(firestore, "players", playerId);
    const playerDoc = await getDoc(playerRef);

    if (!playerDoc.exists()) return [];

    const playerData = playerDoc.data();
    const eligibleBadges = checkEligibleBadges(
      playerData,
      actionType,
      additionalData,
    );

    const awardedBadges = [];

    for (const badge of eligibleBadges) {
      const success = await awardBadge(playerId, badge.id);
      if (success) {
        awardedBadges.push(badge);
      }
    }

    return awardedBadges;
  } catch (error) {
    console.error("Error checking badges:", error);
    return [];
  }
};

export const hasPlayerEarnedBadge = (player, badgeId) => {
  return player.badges?.includes(badgeId) || false;
};

export const getPlayerBadges = (player) => {
  const playerBadgeIds = player.badges || [];
  return badges.filter((badge) => playerBadgeIds.includes(badge.id));
};

export const getBadgeById = (badgeId) => {
  return badges.find((badge) => badge.id === badgeId);
};

export const getPlayerBadgeStats = (player) => {
  const earnedBadges = getPlayerBadges(player);
  return {
    total: earnedBadges.length,
    milestone: earnedBadges.filter((b) => b.category === "milestone").length,
    special: earnedBadges.filter((b) => b.category === "special").length,
    streak: earnedBadges.filter((b) => b.category === "streak").length,
    survival: earnedBadges.filter((b) => b.category === "survival").length,
    rare: earnedBadges.filter((b) => b.category === "rare").length,
  };
};

export const checkSurvivalBadges = async (playerId) => {
  try {
    const playerRef = doc(firestore, "players", playerId);
    const playerDoc = await getDoc(playerRef);

    if (!playerDoc.exists() || !playerDoc.data().isAlive) return;

    const newBadges = await checkAndAwardBadges(playerId, "survival_check");
    return newBadges;
  } catch (error) {
    console.error("Error checking survival badges:", error);
    return [];
  }
};
