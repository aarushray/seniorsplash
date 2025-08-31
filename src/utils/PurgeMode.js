import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { firestore } from "../firebase/config";
import {
  collection,
  getDocs,
  writeBatch,
  query,
  where,
} from "firebase/firestore";

export const togglePurgeMode = async () => {
  try {
    const gameRef = doc(firestore, "game", "state");
    const gameSnap = await getDoc(gameRef);

    let currentStatus = false;

    if (gameSnap.exists()) {
      currentStatus = gameSnap.data()?.purgeMode || false;
    }

    const newStatus = !currentStatus;

    // Use setDoc with merge to ensure the document exists
    await setDoc(
      gameRef,
      {
        purgeMode: newStatus,
        lastUpdated: new Date(),
        updatedBy: "admin",
      },
      { merge: true },
    );

    if (newStatus) {
      console.log("Purge mode enabled. All targets will be cleared.");
      await clearAllTargets();
    }

    console.log("Purge mode updated in Firestore:", newStatus);
    return newStatus;
  } catch (error) {
    console.error("Error toggling purge mode:", error);
    throw error;
  }
};

export const getPurgeModeStatus = async () => {
  try {
    const gameRef = doc(firestore, "game", "state");
    const gameSnap = await getDoc(gameRef);

    if (gameSnap.exists()) {
      const status = gameSnap.data()?.purgeMode || false;
      console.log("Retrieved purge mode status:", status);
      return status;
    } else {
      console.log("Game state document does not exist, defaulting to false");
      return false;
    }
  } catch (error) {
    console.error("Error getting purge mode status:", error);
    return false;
  }
};

export const clearAllTargets = async () => {
  try {
    // Only get players who are actually in the game and alive
    const playersQuery = query(
      collection(firestore, "players"),
      where("isInGame", "==", true),
      where("isAlive", "==", true),
    );

    const playersSnap = await getDocs(playersQuery);

    if (playersSnap.size === 0) {
      return;
    }

    const batch = writeBatch(firestore);

    playersSnap.forEach((doc) => {
      const playerRef = doc.ref;
      batch.update(playerRef, {
        targetId: null,
        targetAssignedAt: null,
        assignedAssassin: null,
        assignedVictim: null,
        victimAssignedAt: null,
        assassinAssignedAt: null,
      });
    });

    await batch.commit();
  } catch (error) {
    console.error("Error clearing all targets:", error);
    throw error;
  }
};
