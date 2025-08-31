export const filterPlayerData = (playerData, isOwnData = false) => {
  if (!playerData) return null;

  const publicFields = {
    id: playerData.id,
    fullName: playerData.fullName,
    avatarIndex: playerData.avatarIndex,
    profilePhotoURL: playerData.profilePhotoURL,
    isAlive: playerData.isAlive,
    kills: playerData.kills || 0,
    lastKnownLocation: playerData.lastKnownLocation,
    locationUpdatedAt: playerData.locationUpdatedAt,
    messageToKiller: playerData.messageToKiller,
  };

  // If it's the user's own data, include additional fields
  if (isOwnData) {
    return {
      ...publicFields,
      targetId: playerData.targetId,
      email: playerData.email,
      studentClass: playerData.studentClass,
      gameStartTime: playerData.gameStartTime,
      badges: playerData.badges,
      // Still exclude admin flags and other sensitive data
    };
  }

  return publicFields;
};
