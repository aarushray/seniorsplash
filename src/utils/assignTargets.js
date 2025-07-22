import { collection, getDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const assignTargets = async () => {

  const gameRef = doc(firestore, 'game', 'state');
  const gameSnap = await getDoc(gameRef);
  if (!gameSnap.exists() || !gameSnap.data().gameStarted) {
    throw new Error('Game has not started yet. No targets can be assigned.');
  }

  const querySnapshot = await getDocs(collection(firestore, 'players'));
  const players = [];
  querySnapshot.forEach((docSnap) => {
    players.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (players.length < 2) {
    throw new Error('Not enough players to start the game.');
  }

  shuffleArray(players);

  for (let i = 0; i < players.length; i++) {
    const currentPlayer = players[i];
    const targetPlayer = players[(i + 1) % players.length];
    const playerRef = doc(firestore, 'players', currentPlayer.id);

    await updateDoc(playerRef, {
      targetId: targetPlayer.id
    });
  }
};

export default assignTargets;
