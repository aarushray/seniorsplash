import { collection, addDoc, doc, updateDoc, getDoc, writeBatch, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { badges } from './Badges';
import { reassignTargets } from './reassignTargets';

// Optimized handleVerify for ~150 players
export const handleVerify = async (proof, adminNotes, setProcessingIds, setAdminNotes) => {
  setProcessingIds(prev => new Set(prev).add(proof.id));

  try {
    const batch = writeBatch(firestore);

    // ✅ Fetch all players in one query
    const playersSnapshot = await getDocs(collection(firestore, 'players'));
    const players = playersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

    // Find killer & victim quickly
    const killer = players.find(p => p.id === proof.submittedBy);
    const victim = players.find(p => p.fullName?.toLowerCase() === proof.targetName.toLowerCase());

    if (!killer) throw new Error("Killer not found.");
    if (!victim) {
      alert("Victim not found. Please check the name.");
      return cleanupProcessing(setProcessingIds, proof.id);
    }
    if (!victim.isAlive) {
      alert("Victim is not alive.");
      return cleanupProcessing(setProcessingIds, proof.id);
    }

    // Get bounty data
    const gameSnap = await getDoc(doc(firestore, 'game', 'bounty'));
    const gameStateSnap = await getDoc(doc(firestore, 'game', 'state'));
    const gameData = gameSnap.data() || {};

    // Check if this is a bounty kill
    const isBountyKill = gameData.targetName?.toLowerCase() === proof.targetName.toLowerCase();
    const isPurgeMode = gameStateSnap.data()?.purgeMode;

    // Update killer stats
    const newKillCount = (killer.kills || 0) + 1;
    const newSplashCount = (killer.splashes || 0) + 1;
    const newBountyKills = isBountyKill ? (killer.bountyKills || 0) + 1 : (killer.bountyKills || 0);
    const newPurgeKills = isPurgeMode ? (killer.purgeKills || 0) + 1 : (killer.purgeKills || 0);

    console.log("bounty kill", isBountyKill, "purge mode", isPurgeMode);
    console.log(newBountyKills, "and", newPurgeKills);

    batch.update(doc(firestore, 'players', killer.id), {
      kills: newKillCount,
      splashes: newSplashCount,
      bountyKills: newBountyKills,
      lastKillAt: new Date(),
      purgeKills: newPurgeKills
    });

    // Update victim
    batch.update(doc(firestore, 'players', victim.id), {
      isAlive: false,
      targetId: null,
      targetAssignedAt: null,
      eliminatedBy: killer.id,
      eliminatedAt: new Date(),
      deathLocation: proof.location
    });

    // Commit kill/elimination changes
    await batch.commit();

    if (killer) {
      killer.kills = newKillCount;
      killer.splashes = newSplashCount;
      killer.bountyKills = newBountyKills;
      killer.purgeKills = newPurgeKills;
    }

    // ✅ Now check badges for all alive players using in-memory data
    const alivePlayers = players.filter(p => p.isAlive && p.id !== victim.id);
    const badgeUpdatesBatch = writeBatch(firestore);
    const allNewBadges = [];

    // Check badges for each alive player
    for (const player of alivePlayers) {
      const newBadges = checkBadgeRequirementsInMemory(player, alivePlayers, isBountyKill, isPurgeMode);
      
      if (newBadges.length > 0) {
        badgeUpdatesBatch.update(doc(firestore, 'players', player.id), {
          badges: [...(player.badges || []), ...newBadges],
          lastBadgeEarned: newBadges[newBadges.length - 1],
          lastBadgeTimestamp: new Date()
        });
        
        // Track all new badges for logging
        allNewBadges.push(...newBadges);
        
        // Log killer's badges specifically
        if (player.id === killer.id) {
          console.log(`Killer awarded badges:`, newBadges);
        }
      }
    }

    // Execute badge updates if any
    if (allNewBadges.length > 0) {
      await badgeUpdatesBatch.commit();
      console.log(`Updated badges for ${allNewBadges.length} total badges`);
    }

    // Reassign target if not purge mode
    if (!gameData.purgeMode) {
      await reassignTargets(killer.id, victim.id);
    }

    // Update proof status
    await updateDoc(doc(firestore, 'killProofs', proof.id), {
      status: 'verified',
      reviewedBy: 'admin',
      reviewedAt: new Date(),
      adminNotes
    });

    // Log activity
    await addDoc(collection(firestore, 'activityLog'), {
      type: 'elimination',
      killerId: killer.id,
      killerName: proof.submitterName,
      victimId: victim.id,
      victimName: victim.fullName,
      location: proof.location,
      verifiedAt: new Date(),
      badgesAwarded: allNewBadges,
      killCount: newKillCount,
      splashCount: newSplashCount,
      isBountyKill: isBountyKill
    });

    setAdminNotes('');
    const badgeText = allNewBadges.length > 0 ? ` (${allNewBadges.length} badge${allNewBadges.length > 1 ? 's' : ''} awarded!)` : '';
    alert(`✅ Kill verified! ${victim.fullName} eliminated by ${killer.fullName}${badgeText}`);

  } catch (error) {
    console.error('Error verifying kill:', error);
    alert('Error verifying kill. Please try again.');
  } finally {
    cleanupProcessing(setProcessingIds, proof.id);
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
    cleanupProcessing(setProcessingIds, proof.id);
  }
};

// Helper to stop processing spinner
const cleanupProcessing = (setProcessingIds, proofId) => {
  setProcessingIds(prev => {
    const newSet = new Set(prev);
    newSet.delete(proofId);
    return newSet;
  });
};

// ✅ OPTIMIZED: Check badge requirements using in-memory data
const checkBadgeRequirementsInMemory = (player, alivePlayers, isBountyKill = false, isPurgeMode = false) => {
  const newBadges = [];
  const currentBadges = player.badges || [];


  // Check each badge requirement
  for (const badge of badges) {
    // Skip if already earned
    if (currentBadges.includes(badge.id)) continue;

    let qualifies = false;

    if (badge.trigger == "bounty_kill"){
      console.log (isBountyKill, "and", player.bountyKills);
    }

    if (badge.trigger == "purge_kill"){
      console.log (isPurgeMode, "and", player.purgeKills);
    }

    switch (badge.trigger) {
      case 'kill_count':
        qualifies = (player.kills || 0) >= badge.requirement;
        break;
        
      case 'kill_streak':
        // Use splashes for current streak (as per your existing logic)
        qualifies = (player.splashes || 0) >= badge.requirement;
        break;
        
      case 'bounty_kill':
        qualifies = isBountyKill && (player.bountyKills || 0) >= badge.requirement;
        break;
        
      case 'purge_kill':
        qualifies = isPurgeMode && (player.purgeKills || 0) >= badge.requirement;
        break;
        
      case 'survival_time':
        const joinDate = player.joinedAt?.toDate ? player.joinedAt.toDate() : new Date(player.joinedAt || Date.now());
        const daysSurvived = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
        qualifies = daysSurvived >= badge.requirement && player.isAlive;
        break;
    }

    if (qualifies) {
      newBadges.push(badge.id);
    }
  }

  return newBadges;
};
