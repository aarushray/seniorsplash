import { doc, updateDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

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
        assignedTargets: {}
    });

  // Reset all players
    const playersSnap = await getDocs(collection(firestore, 'players'));
    for (const playerDoc of playersSnap.docs) {
        await updateDoc(doc(firestore, 'players', playerDoc.id), {
        isAlive: true,
        isInGame: false,
        targetId: null,
        kills: 0,
        proofs: []
        });
        // TODO: Send in-app or email notification to playerDoc.data().email
    }

    // TODO: Show post-game stats screen for kills

    // Clear all announcements
    const announcementsSnap = await getDocs(collection(firestore, 'announcements'));
    for (const announcementDoc of announcementsSnap.docs) {
        await deleteDoc(doc(firestore, 'announcements', announcementDoc.id));
    }
}

export default endGame;