import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { query, doc, updateDoc, getDoc, writeBatch, getDocs} from 'firebase/firestore';
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
        bountyKills: newBountyKills, // ✅ Now actually updates the database
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
    
    // NOW check badges with updated data
    const updatedKillerData = {
      ...killerData,
      kills: newKillCount,
      splashes: newSplashCount,
      lastKillAt: new Date()
    };
    
    const newBadges = await checkBadgeRequirements(proof.submittedBy);
    
    // If there are new badges, update them in a separate operation
    if (newBadges.length > 0) {
      const currentBadges = killerData.badges || [];
      await updateDoc(killerRef, {
        badges: [...currentBadges, ...newBadges],
        lastBadgeEarned: newBadges[newBadges.length - 1],
        lastBadgeTimestamp: new Date()
      });
    }

    await createKillAnnouncement(proof, newKillCount, newBadges);
    
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
      badgesAwarded: newBadges,
      killCount: newKillCount,
      splashCount: newSplashCount
    });
    
    setAdminNotes('');
    const badgeText = newBadges.length > 0 ? ` (${newBadges.length} badge${newBadges.length > 1 ? 's' : ''} awarded!)` : '';
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
