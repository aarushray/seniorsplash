import React, { useState } from 'react';
import { firestore } from '../firebase/config';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { reassignTarget } from '../utils/reassignTargets';

function SubmitKillProof() {
  const [otherPlayerName, setOtherPlayerName] = useState('');
  const [confirmationType, setConfirmationType] = useState('elimination'); // 'elimination' or 'death'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const getPlayerName = async (uid) => {
    const playerRef = doc(firestore, 'players', uid);
    const playerSnap = await getDoc(playerRef);
    return playerSnap.exists() ? playerSnap.data().fullName : null;
  };

  const handleConfirmation = async () => {
    if (!otherPlayerName) {
      setError('Please enter the player\'s name.');
      return;
    }
    setLoading(true);
    setError('');

    const currentUserFullName = await getPlayerName(currentUser.uid);
    if (!currentUserFullName) {
        setError('Could not find your player data.');
        setLoading(false);
        return;
    }

    try {
        if (confirmationType === 'elimination') {
            // User is the killer
            const killerName = currentUserFullName;
            const victimName = otherPlayerName;

            const q = query(collection(firestore, 'confirmations'),
                where('victimName', '==', victimName),
                where('killerName', '==', killerName),
                where('status', '==', 'victim_confirmed')
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const confirmationDoc = querySnapshot.docs[0];
                await updateDoc(confirmationDoc.ref, { status: 'confirmed', killerId: currentUser.uid });

                await reassignTarget(currentUser.uid, victimName);

                const announcementMessage = `${victimName} was eliminated by ${killerName}.`;
                await addDoc(collection(firestore, 'announcements'), {
                    message: announcementMessage,
                    type: 'kill',
                    timestamp: Timestamp.now(),
                });

                alert('Elimination confirmed!');
                navigate('/dashboard');
            } else {
                await addDoc(collection(firestore, 'confirmations'), {
                    killerId: currentUser.uid,
                    killerName: killerName,
                    victimName: victimName,
                    status: 'killer_confirmed',
                    timestamp: Timestamp.now(),
                });
                alert('Confirmation submitted. Waiting for the other player to confirm.');
                navigate('/dashboard');
            }
        } else { // confirmationType === 'death'
            // User is the victim
            const victimName = currentUserFullName;
            const killerName = otherPlayerName;

            const q = query(collection(firestore, 'confirmations'),
                where('killerName', '==', killerName),
                where('victimName', '==', victimName),
                where('status', '==', 'killer_confirmed')
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const confirmationDoc = querySnapshot.docs[0];
                await updateDoc(confirmationDoc.ref, { status: 'confirmed', victimId: currentUser.uid });

                const killerId = confirmationDoc.data().killerId;
                await reassignTarget(killerId, victimName);

                const announcementMessage = `${victimName} was eliminated by ${killerName}.`;
                await addDoc(collection(firestore, 'announcements'), {
                    message: announcementMessage,
                    type: 'kill',
                    timestamp: Timestamp.now(),
                });

                alert('Your elimination has been confirmed.');
                navigate('/dashboard');
            } else {
                await addDoc(collection(firestore, 'confirmations'), {
                    victimId: currentUser.uid,
                    victimName: victimName,
                    killerName: killerName,
                    status: 'victim_confirmed',
                    timestamp: Timestamp.now(),
                });
                alert('Confirmation of death submitted. Waiting for the other player to confirm.');
                navigate('/dashboard');
            }
        }
    } catch (err) {
        console.error("Confirmation failed:", err);
        setError("Confirmation failed. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 border border-gray-700 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-400">💀 Confirm Elimination 💀</h1>
          <p className="text-gray-400 mt-2">Confirm your action or your fate.</p>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={() => setConfirmationType('elimination')}
            className={`px-4 py-2 rounded-l-lg font-semibold transition-colors ${
              confirmationType === 'elimination' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            I Eliminated Someone
          </button>
          <button
            onClick={() => setConfirmationType('death')}
            className={`px-4 py-2 rounded-r-lg font-semibold transition-colors ${
              confirmationType === 'death' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            I Was Eliminated
          </button>
        </div>

        <div className="space-y-6">
          <input
            type="text"
            placeholder={confirmationType === 'elimination' ? "Victim's Full Name" : "Killer's Full Name"}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500 transition-colors"
            value={otherPlayerName}
            onChange={(e) => setOtherPlayerName(e.target.value)}
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={handleConfirmation}
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors border ${
              loading
                ? 'bg-gray-600 cursor-not-allowed'
                : confirmationType === 'elimination'
                ? 'bg-red-600 hover:bg-red-700 border-red-500'
                : 'bg-blue-600 hover:bg-blue-700 border-blue-500'
            }`}
          >
            {loading ? 'Submitting...' : `Confirm ${confirmationType === 'elimination' ? 'Elimination' : 'Death'}`}
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors border border-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubmitKillProof;