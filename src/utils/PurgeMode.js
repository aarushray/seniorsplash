
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { reassignTargetsAfterPurge } from './reassignTargetsAfterPurge';

export const togglePurgeMode = async () => {
  const statusRef = doc(firestore, 'game', 'status');
  const statusSnap = await getDoc(statusRef);

  if (statusSnap.exists()) {
    const currentStatus = statusSnap.data().purgeMode;
    const newStatus = !currentStatus;
    await setDoc(statusRef, { purgeMode: newStatus }, { merge: true });

    if (!newStatus) {
      // Purge mode is being deactivated, reassign targets
      await reassignTargetsAfterPurge();
    }
    return newStatus;
  } else {
    await setDoc(statusRef, { purgeMode: true });
    return true;
  }
};

export const getPurgeModeStatus = async () => {
    const statusRef = doc(firestore, 'game', 'status');
    const statusSnap = await getDoc(statusRef);
    if (statusSnap.exists()) {
        return statusSnap.data().purgeMode || false;
    }
    return false;
};
