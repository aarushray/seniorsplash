import { collection, getDoc, getDocs, doc, query, where } from 'firebase/firestore';
import { firestore } from '../firebase/config';

/**
 * Find all players targeting a specific player
 * @param {string} targetPlayerName - Name of the player to find assassins for
 * @returns {Promise<Object>} - Object containing target info and their assassins
 */
export const getAssassinsForPlayer = async (targetPlayerName) => {
  try {
    // First, find the target player by name
    const playersQuery = query(collection(firestore, 'players'));
    const playersSnapshot = await getDocs(playersQuery);
    
    let targetPlayer = null;
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fullName?.toLowerCase() === targetPlayerName.toLowerCase()) {
        targetPlayer = { id: doc.id, ...data };
      }
    });
    
    if (!targetPlayer) {
      return {
        success: false,
        message: `Player "${targetPlayerName}" not found`,
        target: null,
        assassins: []
      };
    }
    
    // Find all players targeting this player
    const assassinQuery = query(
      collection(firestore, 'players'),
      where('targetId', '==', targetPlayer.id),
      where('isAlive', '==', true)
    );
    
    const assassinSnapshot = await getDocs(assassinQuery);
    const assassins = [];
    
    assassinSnapshot.forEach((doc) => {
      const assassinData = doc.data();
      
      assassins.push({
        id: doc.id,
        name: assassinData.fullName,
        class: assassinData.studentClass || 'Unknown', // Use studentClass field
        kills: assassinData.kills || 0,
        splashes: assassinData.splashes || 0,
        email: assassinData.email,
        targetAssignedAt: assassinData.targetAssignedAt
      });
    });
    
    return {
      success: true,
      message: `Found ${assassins.length} assassin(s) targeting ${targetPlayer.fullName}`,
      target: {
        id: targetPlayer.id,
        name: targetPlayer.fullName,
        class: targetPlayer.studentClass || 'Unknown', // Use studentClass field
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
    const playersQuery = query(
      collection(firestore, 'players'),
      where('isAlive', '==', true)
    );
    
    const playersSnapshot = await getDocs(playersQuery);
    const relationships = [];
    
    playersSnapshot.forEach((doc) => {
      const playerData = doc.data();
      if (playerData.targetId) {
        relationships.push({
          assassinId: doc.id,
          assassinName: playerData.fullName,
          assassinClass: playerData.studentClass || 'Unknown', // Use studentClass field
          targetId: playerData.targetId,
          targetAssignedAt: playerData.targetAssignedAt
        });
      }
    });
    
    return relationships;
  } catch (error) {
    console.error('Error getting targeting relationships:', error);
    return [];
  }
};

export default getAssassinsForPlayer;