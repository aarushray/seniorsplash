import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { firestore } from '../firebase/config';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export const reassignTargetsAfterPurge = async () => {
  const alivePlayersQuery = query(
    collection(firestore, 'players'),
    where('isAlive', '==', true)
  );
  const alivePlayersSnap = await getDocs(alivePlayersQuery);
  let alivePlayers = [];
  alivePlayersSnap.forEach((docSnap) => {
    alivePlayers.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (alivePlayers.length < 2) {
    // If only one player is left, they are the winner.
    if (alivePlayers.length === 1) {
      const gameRef = doc(firestore, 'game', 'state');
      await updateDoc(gameRef, {
        gameOver: true,
        winner: alivePlayers[0].id,
      });
      await updateDoc(doc(firestore, 'players', alivePlayers[0].id), {
        targetId: null,
      });
    }
    return;
  }

  shuffleArray(alivePlayers);

  for (let i = 0; i < alivePlayers.length; i++) {
    const currentPlayer = alivePlayers[i];
    const targetPlayer = alivePlayers[(i + 1) % alivePlayers.length];
    const playerRef = doc(firestore, 'players', currentPlayer.id);

    await updateDoc(playerRef, {
      targetId: targetPlayer.id
    });
  }
};