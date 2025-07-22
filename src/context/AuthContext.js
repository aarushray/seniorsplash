import React, { createContext, useState, useEffect, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../firebase/config'; // add firestore import

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const playerRef = doc(firestore, 'players', user.uid);
        const playerSnap = await getDoc(playerRef);

        if (!playerSnap.exists()) {
          await setDoc(playerRef, {
            uid: user.uid,
            name: user.displayName || 'Unnamed Player',
            fullName: user.displayName || 'Unnamed Player',
            email: user.email,
            photoURL: user.photoURL || null,
            createdAt: new Date(),
            isAlive: true,
            targetId: null,
          });
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
