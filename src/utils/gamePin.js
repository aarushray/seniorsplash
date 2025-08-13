import { doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase/config';

const GAME_STATE_DOC = 'state';
const GAME_COLLECTION = 'game';

/**
 * Updates the game pin in Firebase
 * @param {string} newPin - The new game pin
 * @returns {Promise<void>}
 */
export const updateGamePin = async (newPin) => {
  try {
    const gameStateRef = doc(firestore, GAME_COLLECTION, GAME_STATE_DOC);
    await updateDoc(gameStateRef, {
      gamePin: newPin,
      gamePinUpdatedAt: new Date()
    });
    console.log('Game pin updated successfully');
  } catch (error) {
    console.error('Error updating game pin:', error);
    throw error;
  }
};

/**
 * Gets the current game pin from Firebase
 * @returns {Promise<string|null>}
 */
export const getGamePin = async () => {
  try {
    const gameStateRef = doc(firestore, "game", "state");
    const docSnap = await getDoc(gameStateRef);
    
    if (docSnap.exists()) {
      console.log('Game state document found:', docSnap.data());
      return docSnap.data().gamePin || null;
    } else {
      console.log('No game state document found');
      return null;
    }
  } catch (error) {
    console.error('Error getting game pin:', error);
    throw error;
  }
};

/**
 * Subscribes to real-time updates of the game pin
 * @param {function} callback - Function to call when game pin changes
 * @returns {function} Unsubscribe function
 */
export const subscribeToGamePin = (callback) => {
  const gameStateRef = doc(firestore, GAME_COLLECTION, GAME_STATE_DOC);
  
  return onSnapshot(gameStateRef, (doc) => {
    if (doc.exists()) {
      const gamePin = doc.data().gamePin || null;
      callback(gamePin);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to game pin:', error);
    callback(null);
  });
};

/**
 * Validates game pin format
 * @param {string} pin - The pin to validate
 * @returns {boolean}
 */
export const validateGamePin = (pin) => {
  // Check if pin is a string of 4-6 digits
  return /^\d{4,6}$/.test(pin);
};

/**
 * Generates a random 4-digit game pin
 * @returns {string}
 */
export const generateRandomPin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};