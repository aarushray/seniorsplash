// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth'; // Initialize auth
import { getFirestore } from 'firebase/firestore'; // If you're using Firestore
import { getStorage } from 'firebase/storage'; // If you're using Storage


const firebaseConfig = {
  apiKey: "AIzaSyAiQ-RNWANPzmOvwdOccaUXLO0eVAj7roA",
  authDomain: "senior-splash-b225f.firebaseapp.com",
  projectId: "senior-splash-b225f",
  storageBucket: "senior-splash-b225f.firebasestorage.app",
  messagingSenderId: "744844064311",
  appId: "1:744844064311:web:0af8b58f19862838ffb1b2",
  measurementId: "G-CNMMTWHWK7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app); // Firebase auth
export const firestore = getFirestore(app); // Firestore (if you're using it)
export const storage = getStorage(app); // Storage (if you're using it)