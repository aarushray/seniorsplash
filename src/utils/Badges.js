export const badges = [
  // Target Kill Milestones
  {
    id: "thanatos_touch",
    icon: "🩸",
    title: "Thanatos' Touch",
    description: "FIRST BLOOD! The god of peaceful death smiles.",
    trigger: "kill_count",
    requirement: 1,
    category: "milestone",
  },
  {
    id: "erebus_rising",
    icon: "🌑",
    title: "Erebus Rising",
    description:
      "You've tasted the shadows twice. Darkness starts to recognize you.",
    trigger: "kill_count",
    requirement: 2,
    category: "milestone",
  },
  {
    id: "wrath_of_ares",
    icon: "⚔️",
    title: "Wrath of Ares",
    description: "Your third kill... Blood follows wherever you go.",
    trigger: "kill_count",
    requirement: 3,
    category: "milestone",
  },
  {
    id: "angel_of_death",
    icon: "🖤",
    title: "Angel of Death",
    description: "You are death incarnate. You don't hunt. You erase.",
    trigger: "kill_count",
    requirement: 5,
    category: "milestone",
  },

  // Special Mode / Bounty
  {
    id: "artemis_vow",
    icon: "🏹",
    title: "Artemis' Vow",
    description: "You hunted a marked soul. Swift. Silent. Divine.",
    trigger: "bounty_kill",
    requirement: 1,
    category: "special",
  },
  {
    id: "hades_unleashed",
    icon: "🔥",
    title: "Hades Unleashed",
    description:
      "In the lawless chaos, you thrived. The underworld opens for you.",
    trigger: "purge_kill",
    requirement: 1,
    category: "special",
  },
  {
    id: "jack_the_reaper",
    icon: "💀",
    title: "Jack the Reaper",
    description: "You weren't part of the purge. You were the purge.",
    trigger: "purge_kill",
    requirement: 3,
    category: "special",
  },

  // Kill Streaks (multiple kills in short time)
  {
    id: "fury_of_the_fates",
    icon: "🧵",
    title: "Fury of the Fates",
    description: "You control destiny now. Thread by thread, they fall.",
    trigger: "kill_streak",
    requirement: 2, // 2 kills within 1 hour
    category: "streak",
  },

  // Survival Achievements
  {
    id: "poseidon_blessing",
    icon: "🌊",
    title: "Poseidon's Blessing",
    description: "Even the sea can't drown you now. You float above fate.",
    trigger: "survival_time",
    requirement: 5, // 5 days alive
    category: "survival",
  },

  // Rare Achievement
  {
    id: "angel_of_light",
    icon: "✨",
    title: "Angel of Light",
    description: "Untouched. Unbroken. The god of purity walks with you.",
    trigger: "game_winner",
    requirement: 1,
    category: "rare",
  },
];

// Badge checking logic
export const checkEligibleBadges = (playerData, actionType, gameData) => {
  const eligibleBadges = [];
  const currentBadges = playerData.badges || [];

  badges.forEach((badge) => {
    // Skip if already earned
    if (currentBadges.includes(badge.id)) return;

    let isEligible = false;

    switch (badge.trigger) {
      case "kill_count":
        isEligible = playerData.kills >= badge.requirement;
        break;

      case "bounty_kill":
        isEligible = actionType === "bounty_kill";
        break;

      case "purge_kill":
        isEligible =
          actionType === "purge_kill" &&
          (playerData.purgeKills || 0) >= badge.requirement;
        break;

      case "kill_streak":
        isEligible = checkKillStreak(playerData, badge.requirement);
        break;

      case "survival_time":
        isEligible = checkSurvivalTime(playerData, badge.requirement);
        break;

      case "game_winner":
        isEligible = actionType === "game_won";
        break;

      case "mutual_elimination":
        isEligible = actionType === "mutual_elimination";
        break;
    }

    if (isEligible) {
      eligibleBadges.push(badge);
    }
  });

  return eligibleBadges;
};

// Helper functions
const checkKillStreak = (playerData, requiredStreak) => {
  const recentKills = playerData.recentKills || [];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const killsInLastHour = recentKills.filter(
    (kill) => new Date(kill.timestamp) > oneHourAgo,
  );

  return killsInLastHour.length >= requiredStreak;
};

const checkSurvivalTime = (playerData, requiredDays) => {
  if (!playerData.gameJoinedAt) return false;

  // Handle both Firestore Timestamp and regular Date objects
  const gameJoinDate = playerData.gameJoinedAt.toDate
    ? playerData.gameJoinedAt.toDate()
    : new Date(playerData.gameJoinedAt);

  const daysSinceJoined = Math.floor(
    (Date.now() - gameJoinDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return daysSinceJoined >= requiredDays && playerData.isAlive;
};
