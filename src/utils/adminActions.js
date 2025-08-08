import { collection, addDoc, Timestamp, setDoc, doc, updateDoc, getDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { badges } from './Badges';
import { reassignTargets } from './reassignTargets';
import { createKillAnnouncement } from '../components/Announcements';

export const removePlayerFromGame = async (fullName) => {
  try {
    // Find player by fullName
    const trimmedFullName = fullName.trim();
    
    // Get all players and filter by trimmed fullName
    const playersRef = collection(firestore, 'players');
    const querySnapshot = await getDocs(playersRef);
    
    // Filter players by trimmed fullName
    const matchingPlayers = querySnapshot.docs.filter(doc => {
      const playerData = doc.data();
      return playerData.fullName?.trim() === trimmedFullName;
    });
    
    if (matchingPlayers.length === 0) {
      throw new Error(`No player found with name: ${trimmedFullName}`);
    }
    
    if (matchingPlayers.length > 1) {
      throw new Error(`Multiple players found with name: ${trimmedFullName}`);
    }
    
    const playerDoc = matchingPlayers[0];
    const playerData = playerDoc.data();
    
    
    // Update player status
    await updateDoc(playerDoc.ref, {
      isInGame: false,
      isAlive: false,
      targetId: null,
      removedFromGame: true,
      removedAt: new Date(),
      lastKnownLocation: 'Removed from game'
    });
    
    // If player had a target, we need to reassign it
    if (playerData.targetId) {
      // Find who was targeting the removed player
      const assassinQuery = query(playersRef, where('targetId', '==', playerDoc.id));
      const assassinSnapshot = await getDocs(assassinQuery);
      
      // Reassign the removed player's target to their assassin(s)
      for (const assassinDoc of assassinSnapshot.docs) {
        await updateDoc(assassinDoc.ref, {
          targetId: playerData.targetId,
          targetAssignedAt: new Date()
        });
      }
    }
    
    return {
      success: true,
      playerName: playerData.fullName,
      playerClass: playerData.studentClass
    };
    
  } catch (error) {
    console.error('Error removing player:', error);
    throw error;
  }
};


export const sendAnnouncement = async (message, type = 'admin') => {
  if (!message.trim()) throw new Error('Announcement message is required');
  
  await addDoc(collection(firestore, 'announcements'), {
    message: message.trim(),
    type,
    timestamp: Timestamp.now(),
  });
};

export const setBounty = async (targetName, prize, description = '') => {
  if (!targetName.trim() || !prize.trim()) {
    throw new Error('Target name and prize are required');
  }
  
  const bountyRef = doc(firestore, 'game', 'bounty');
  await setDoc(bountyRef, {
    isActive: true,
    targetName: targetName.trim(),
    prize: prize.trim(),
    description: description.trim(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
  });
};

export const removeBounty = async () => {
  const bountyRef = doc(firestore, 'game', 'bounty');
  await setDoc(bountyRef, {
    isActive: false,
    removedAt: new Date()
  });
};

export const clearAllPendingKills = async () => {
  const pendingKillsQuery = query(
    collection(firestore, 'killProofs'),
    where('status', '==', 'pending')
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
    const playerRef = doc(firestore, 'players', playerId);
    const playerSnap = await getDoc(playerRef);
    
    if (!playerSnap.exists()) return [];
    
    const playerData = playerSnap.data();
    const currentBadges = playerData.badges || [];
    const newBadges = [];
    
    for (const badge of badges) {
      if (currentBadges.includes(badge.id)) continue;
      
      let qualifies = false;
      
      switch (badge.trigger) {
        case 'kill_count':
          qualifies = (playerData.kills || 0) >= badge.requirement;
          break;
        case 'kill_streak':
          qualifies = (playerData.splashes || 0) >= badge.requirement;
          break;
        case 'bounty_kill':
          qualifies = (playerData.bountyKills || 0) >= badge.requirement;
          break;
        case 'purge_kill':
          qualifies = (playerData.purgeKills || 0) >= badge.requirement;
          break;
        case 'survival_time':
          const joinDate = playerData.joinedAt?.toDate() || new Date();
          const daysSurvived = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          qualifies = daysSurvived >= badge.requirement;
          break;
        case 'game_winner':
          qualifies = playerData.isWinner || false;
          break;
      }
      
      if (qualifies) {
        newBadges.push(badge.id);
      }
    }
    
    return newBadges;
  } catch (error) {
    console.error('Error checking badge requirements:', error);
    return [];
  }
};