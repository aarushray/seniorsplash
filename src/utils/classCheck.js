import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

export const checkClassDomination = async () => {
  try {
    // Get all alive players who are in the game
    const playersQuery = query(
      collection(firestore, 'players'),
      where('isAlive', '==', true),
      where('isInGame', '==', true)
    );
    
    const playersSnapshot = await getDocs(playersQuery);
    
    if (playersSnapshot.empty) {
      // Clear any existing class domination state
      await updateDoc(doc(firestore, 'game', 'state'), {
        classDomination: null
      });
      return { hasWinningClass: false, message: 'No alive players found' };
    }
    
    // Extract player data and sort by class for adjacent comparison
    const players = playersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort players by class to group them together
    players.sort((a, b) => (a.studentClass || '').localeCompare(b.studentClass || ''));
    
    // Check if all adjacent players are from the same class
    let allSameClass = true;
    let winningClass = null;
    
    if (players.length >= 1) {
      const firstClass = players[0].studentClass;
      winningClass = firstClass;
      
      for (let i = 1; i < players.length; i++) {
        if (players[i].studentClass !== firstClass) {
          allSameClass = false;
          break;
        }
      }
    } else {
      allSameClass = false;
    }
    
    if (allSameClass) {
      // Store class domination state in Firestore
      await updateDoc(doc(firestore, 'game', 'state'), {
        classDomination: {
          winningClass: winningClass,
          playerCount: players.length,
          timestamp: new Date()
        }
      });
      
      return {
        hasWinningClass: true,
        winningClass: winningClass,
        playerCount: players.length
      };
    } else {
      // Clear any existing class domination state
      await updateDoc(doc(firestore, 'game', 'state'), {
        classDomination: null
      });
      
      return { hasWinningClass: false, message: 'No class domination detected' };
    }
  } catch (error) {
    console.error('Error checking class domination:', error);
    throw error;
  }
};

// Function to get current class domination state
export const getClassDominationState = async () => {
  try {
    const gameRef = doc(firestore, 'game', 'state');
    const gameSnap = await getDoc(gameRef);
    
    if (gameSnap.exists() && gameSnap.data().classDomination) {
      return gameSnap.data().classDomination;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting class domination state:', error);
    return null;
  }
};

// Function to clear class domination state
export const clearClassDominationState = async () => {
  try {
    await updateDoc(doc(firestore, 'game', 'state'), {
      classDomination: null
    });
  } catch (error) {
    console.error('Error clearing class domination state:', error);
    throw error;
  }
};
