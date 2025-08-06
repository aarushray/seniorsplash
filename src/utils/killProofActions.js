import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { query, doc, updateDoc, getDoc, writeBatch, getDocs, where} from 'firebase/firestore';
import { badges } from './Badges';
import { reassignTargets } from './reassignTargets';
import { createKillAnnouncement } from '../components/Announcements';

const checkBadgeRequirements = async (playerId) => {
  try {
    // Get the CURRENT player data from database (which should now be updated)
    const playerRef = doc(firestore, 'players', playerId);
    const playerSnap = await getDoc(playerRef);
    
    if (!playerSnap.exists()) return [];
    
    const playerData = playerSnap.data();
    const currentBadges = playerData.badges || [];
    const newBadges = [];
    
    // Check each badge requirement
    for (const badge of badges) {
      if (currentBadges.includes(badge.id)) continue; // Already has this badge
      
      let qualifies = false;
      
      switch (badge.trigger) {
        case 'kill_count':
          qualifies = (playerData.kills || 0) >= badge.requirement;
          break;
        case 'kill_streak': // This should use splashes for current streak
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
          // ✅ UPDATED: Check if player is alive AND only one class remains
          qualifies = await checkAngelOfLightRequirements(playerId, playerData);
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

// ✅ NEW FUNCTION: Check if Angel of Light should be awarded
const checkAngelOfLightRequirements = async (playerId, playerData) => {
  try {
    // Must be alive
    if (!playerData.isAlive) {
      return false;
    }

    // Get all alive players
    const playersQuery = query(
      collection(firestore, 'players'), 
      where('isAlive', '==', true)
    );
    const playersSnapshot = await getDocs(playersQuery);
    
    const alivePlayersByClass = {};
    let totalAlivePlayers = 0;
    
    // Group alive players by class
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isAlive && data.studentClass) {
        const className = data.studentClass;
        if (!alivePlayersByClass[className]) {
          alivePlayersByClass[className] = [];
        }
        alivePlayersByClass[className].push({
          id: doc.id,
          ...data
        });
        totalAlivePlayers++;
      }
    });

    // Count how many classes have alive players
    const classesWithAlivePlayers = Object.keys(alivePlayersByClass).length;
    
    console.log(`Angel of Light check for ${playerData.fullName}:`);
    console.log(`- Player is alive: ${playerData.isAlive}`);
    console.log(`- Total alive players: ${totalAlivePlayers}`);
    console.log(`- Classes with alive players: ${classesWithAlivePlayers}`);
    console.log(`- Alive players by class:`, alivePlayersByClass);
    
    // Award Angel of Light if:
    // 1. Player is alive
    // 2. Only ONE class has alive players remaining
    // 3. This player is in that class
    if (classesWithAlivePlayers === 1) {
      const remainingClass = Object.keys(alivePlayersByClass)[0];
      const playerIsInRemainingClass = playerData.studentClass === remainingClass;
      
      console.log(`- Only class ${remainingClass} remains`);
      console.log(`- Player ${playerData.fullName} is in class ${playerData.studentClass}`);
      console.log(`- Player qualifies: ${playerIsInRemainingClass}`);
      
      return playerIsInRemainingClass;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking Angel of Light requirements:', error);
    return false;
  }
};

export const handleVerify = async (proof, adminNotes, setProcessingIds, setAdminNotes) => {
  setProcessingIds(prev => new Set(prev).add(proof.id));
  
  try {
    const batch = writeBatch(firestore);
    
    // Get killer's current data
    const killerRef = doc(firestore, 'players', proof.submittedBy);
    const killerSnap = await getDoc(killerRef);
    const killerData = killerSnap.data();
    
    // Calculate new values
    const newKillCount = (killerData.kills || 0) + 1;
    const newSplashCount = (killerData.splashes || 0) + 1;
    
    // Update killer - increment both kills and splashes
    batch.update(killerRef, {
      kills: newKillCount,
      splashes: newSplashCount,
      lastKillAt: new Date()
    });

    // Find victim by name
    const playersQuery = query(collection(firestore, 'players'));
    const playersSnapshot = await getDocs(playersQuery);
    let victimId = null;
    
    playersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fullName?.toLowerCase() === proof.targetName.toLowerCase()) {
        victimId = doc.id;
      }
    });
    
    if (!victimId) {
      alert('Victim not found in database. Please check the name.');
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(proof.id);
        return newSet;
      });
      return;
    }

    // Check if victim is bounty
    const gameRef = doc(firestore, 'game', 'bounty');
    const gameSnap = await getDoc(gameRef);
    const gameData = gameSnap.data();
    const targetName = gameData?.targetName?.toLowerCase() || '';

    // Check if victim is bounty
    if ( targetName && proof.targetName.toLowerCase() === targetName ) {
      console.log('Bounty kill detected');
      const newBountyKills = (killerData.bountyKills || 0) + 1;
      batch.update(killerRef, {
        bountyKills: newBountyKills,
        lastKillAt: new Date()
      });
    }

    // Update victim - mark as eliminated and reset their streak
    const victimRef = doc(firestore, 'players', victimId);
    batch.update(victimRef, {
      isAlive: false,
      targetId: null,
      targetAssignedAt: null,
      eliminatedBy: proof.submittedBy,
      eliminatedAt: new Date(),
      deathLocation: proof.location
    });
    
    // COMMIT THE BATCH FIRST to update the database
    await batch.commit();
    
    // ✅ IMPORTANT: Check badges for ALL alive players after elimination
    // This ensures Angel of Light is awarded when a class elimination happens
    const allPlayersQuery = query(
      collection(firestore, 'players'), 
      where('isAlive', '==', true)
    );
    const allPlayersSnapshot = await getDocs(allPlayersQuery);
    
    const allNewBadges = [];
    
    // Check badges for each alive player (including the killer)
    for (const playerDoc of allPlayersSnapshot.docs) {
      const playerId = playerDoc.id;
      const newBadges = await checkBadgeRequirements(playerId);
      
      if (newBadges.length > 0) {
        const playerData = playerDoc.data();
        const currentBadges = playerData.badges || [];
        
        await updateDoc(doc(firestore, 'players', playerId), {
          badges: [...currentBadges, ...newBadges],
          lastBadgeEarned: newBadges[newBadges.length - 1],
          lastBadgeTimestamp: new Date()
        });
        
        // Track if this is the killer's badges for the announcement
        if (playerId === proof.submittedBy) {
          allNewBadges.push(...newBadges);
        }
        
        console.log(`✅ Awarded badges to ${playerData.fullName}:`, newBadges);
      }
    }
    
    await createKillAnnouncement(proof, newKillCount, allNewBadges);
    
    // Check if purge mode
    const isPurgeMode = gameData?.purgeMode || false;
    
    // Assign new target if not purge mode
    if (!isPurgeMode) {
      await reassignTargets(proof.submittedBy, victimId);
    }
    
    // Update proof status in a separate operation
    const proofRef = doc(firestore, 'killProofs', proof.id);
    await updateDoc(proofRef, {
      status: 'verified',
      reviewedBy: 'admin',
      reviewedAt: new Date(),
      adminNotes: adminNotes
    });
    
    // Add to activity log
    await addDoc(collection(firestore, 'activityLog'), {
      type: 'elimination',
      killerId: proof.submittedBy,
      killerName: proof.submitterName,
      victimId: victimId,
      victimName: proof.targetName,
      location: proof.location,
      verifiedAt: new Date(),
      badgesAwarded: allNewBadges,
      killCount: newKillCount,
      splashCount: newSplashCount
    });
    
    setAdminNotes('');
    const badgeText = allNewBadges.length > 0 ? ` (${allNewBadges.length} badge${allNewBadges.length > 1 ? 's' : ''} awarded!)` : '';
    alert(`✅ Kill verified! ${proof.targetName} eliminated by ${proof.submitterName}${badgeText}`);
    
  } catch (error) {
    console.error('Error verifying kill:', error);
    alert('Error verifying kill. Please try again.');
  } finally {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(proof.id);
      return newSet;
    });
  }
};

export const handleReject = async (proof, adminNotes, setProcessingIds, setAdminNotes) => {
  setProcessingIds(prev => new Set(prev).add(proof.id));
  
  try {
    const proofRef = doc(firestore, 'killProofs', proof.id);
    await updateDoc(proofRef, {
      status: 'rejected',
      reviewedBy: 'admin',
      reviewedAt: new Date(),
      adminNotes: adminNotes
    });

    setAdminNotes('');
    alert(`❌ Kill proof rejected for ${proof.targetName}`);
    
  } catch (error) {
    console.error('Error rejecting proof:', error);
    alert('Error rejecting proof. Please try again.');
  } finally {
    setProcessingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(proof.id);
      return newSet;
    });
  }
};