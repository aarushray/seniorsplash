import React, { createContext, useState, useEffect, useContext } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, firestore } from "../firebase/config";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // Fetch player document from Firestore
          let isAdmin = false;
          try {
            const playerRef = doc(firestore, "players", user.uid);
            const playerSnap = await getDoc(playerRef);

            if (!playerSnap.exists()) {
              await setDoc(playerRef, {
                uid: user.uid,
                name: user.displayName || "",
                fullName: user.displayName || "",
                email: user.email,
                photoURL: user.photoURL || null,
                createdAt: new Date(),
                isAlive: true,
                targetId: null,
                isAdmin: false, // default to false on creation
              });
            } else {
              // Get isAdmin from Firestore
              const playerData = playerSnap.data();
              isAdmin = !!playerData.isAdmin;
            }
          } catch (firestoreError) {
            console.error("Error handling player document:", firestoreError);
          }

          // Merge isAdmin into currentUser object
          setCurrentUser({
            ...user,
            isAdmin,
          });
        } else {
          setCurrentUser(null);
        }
      } catch (authError) {
        console.error("Error in auth state change:", authError);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};