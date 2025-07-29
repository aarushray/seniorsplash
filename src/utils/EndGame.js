import { doc, updateDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { badges } from './Badges';

/**
 * Ends the game and resets all relevant fields for a new game.
 */
export async function endGame() {
    // Update game-wide settings
    const gameStateRef = doc(firestore, 'game', 'state');
    await updateDoc(gameStateRef, {
        gameStarted: false,
        gameEnded: true,
        killFeed: [],
        assignedTargets: {},
        isPurgeMode: false,
        purgeStartTime: null,
        gameStartTime: null,
        lastTargetAssignment: null,
        activeBounty: null
    });

    // Reset all players
    const playersSnap = await getDocs(collection(firestore, 'players'));
    for (const playerDoc of playersSnap.docs) {
        await updateDoc(doc(firestore, 'players', playerDoc.id), {
            // Core game state
            isAlive: true,
            isInGame: true,
            targetId: null,
            
            // Statistics that reset each game
            kills: 0,
            splashes: 0,
            purgeKills: 0,
            recentKills: [],
            bountyKills: 0,
            
            // Proof and verification
            proofs: [],
            pendingProofs: [],
            
            // Timing and assignments
            gameJoinedAt: null,
            targetAssignedAt: null,
            eliminatedAt: null,
            eliminatedBy: null,
            lastKnownLocation: '',
            locationUpdatedAt: null,
            
            // Badge system
            badges: [],
            lastBadgeEarned: null,
            lastBadgeTimestamp: null,
            earnedBadges: [],
            
            // Profile fields that should persist
            // fullName: KEEP
            // email: KEEP
            // studentClass: KEEP
            // profilePhotoURL: KEEP
            // avatarIndex: KEEP
            deathMessage: null,
            messageToKiller: null
        });

        // TODO: Send in-app or email notification to playerDoc.data().email
    }
    
    await updateDoc(doc(firestore, 'game', 'state'), {
      gamePin: null
    });


    clearAllPendingKills();

    // Clear all announcements
    const announcementsSnap = await getDocs(collection(firestore, 'announcements'));
    for (const announcementDoc of announcementsSnap.docs) {
        await deleteDoc(doc(firestore, 'announcements', announcementDoc.id));
    }

    // Clear all pending proofs
    const proofsSnap = await getDocs(collection(firestore, 'proofs'));
    for (const proofDoc of proofsSnap.docs) {
        await deleteDoc(doc(firestore, 'proofs', proofDoc.id));
    }

    // Clear any active bounties
    const bountiesSnap = await getDocs(collection(firestore, 'bounties'));
    for (const bountyDoc of bountiesSnap.docs) {
        await deleteDoc(doc(firestore, 'bounties', bountyDoc.id));
    }

    // TODO: Archive game statistics for historical records
    // TODO: Generate final leaderboard
    // TODO: Show post-game stats screen for kills
    
    console.log('Game ended and all fields reset successfully');
}

const clearAllPendingKills = async () => {
  try {
    const killProofsRef = collection(firestore, 'killProofs');
    const killProofsSnapShot = await getDocs(killProofsRef);

    const deletions = killProofsSnapShot.docs.map((document) =>
      deleteDoc(doc(firestore, 'killProofs', document.id))
    );

    await Promise.all(deletions);
    
  } catch (error) {
    console.error('Error clearing pending kills:', error);
  }
};

export default endGame;