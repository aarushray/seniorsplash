import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../firebase/config';

/**
 * Find all players targeting a specific player
 * @param {string} targetPlayerName - Name of the player to find assassins for
 * @returns {Promise<Object>} - Object containing target info and their assassins
 */
export const getAssassinsForPlayer = async (targetPlayerName) => {
  try {
    // ✅ Fetch all players in one go (same efficient pattern)
    const playersSnap = await getDocs(
      query(
        collection(firestore, 'players'),
        where('isInGame', '==', true)
      )
    );

    const allPlayers = playersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ✅ Build efficient maps in one pass
    const nameToIdMap = Object.fromEntries(allPlayers.map(p => [p.fullName?.toLowerCase(), p.id]));
    const playerMap = Object.fromEntries(allPlayers.map(p => [p.id, p]));

    // Find target player by name (case-insensitive)
    const targetPlayerId = nameToIdMap[targetPlayerName.toLowerCase()];
    if (!targetPlayerId) {
      return {
        success: false,
        message: `Player "${targetPlayerName}" not found`,
        target: null,
        assassins: []
      };
    }

    const targetPlayer = playerMap[targetPlayerId];

    // ✅ Find assassins efficiently using the map
    const assassins = allPlayers.filter(p => 
      p.targetId === targetPlayerId && 
      p.isAlive && 
      p.isInGame
    ).map(assassin => ({
      id: assassin.id,
      name: assassin.fullName,
      class: assassin.studentClass || 'Unknown',
      kills: assassin.kills || 0,
      splashes: assassin.splashes || 0,
      email: assassin.email,
      targetAssignedAt: assassin.targetAssignedAt
    }));

    return {
      success: true,
      message: `Found ${assassins.length} assassin(s) targeting ${targetPlayer.fullName}`,
      target: {
        id: targetPlayer.id,
        name: targetPlayer.fullName,
        class: targetPlayer.studentClass || 'Unknown',
        isAlive: targetPlayer.isAlive,
        kills: targetPlayer.kills || 0,
        splashes: targetPlayer.splashes || 0
      },
      assassins: assassins
    };

  } catch (error) {
    console.error('Error finding assassins:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      target: null,
      assassins: []
    };
  }
};

/**
 * Get all targeting relationships in the game
 * @returns {Promise<Array>} - Array of all targeting relationships
 */
export const getAllTargetingRelationships = async () => {
  try {
    // ✅ Single query for all players
    const playersSnap = await getDocs(
      query(
        collection(firestore, 'players'),
        where('isInGame', '==', true)
      )
    );

    const allPlayers = playersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // ✅ Build targeting map efficiently
    const targetMap = {};
    allPlayers.forEach(player => {
      if (player.targetId) {
        if (!targetMap[player.targetId]) {
          targetMap[player.targetId] = [];
        }
        targetMap[player.targetId].push({
          assassinId: player.id,
          assassinName: player.fullName,
          assassinClass: player.studentClass || 'Unknown',
          targetId: player.targetId,
          targetAssignedAt: player.targetAssignedAt
        });
      }
    });

    // ✅ Convert to flat array efficiently
    const relationships = Object.values(targetMap).flat();

    return relationships;
  } catch (error) {
    console.error('Error getting targeting relationships:', error);
    return [];
  }
};

export default getAssassinsForPlayer;