import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase/config';

const ProofGallery = () => {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const proofsRef = collection(firestore, 'killproofs');
    const q = query(proofsRef, orderBy('submittedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const proofsData = [];
      querySnapshot.forEach((doc) => {
        proofsData.push({ id: doc.id, ...doc.data() });
      });
      setProofs(proofsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching proofs: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-400">Loading kill proofs...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg mt-6">
      <h2 className="text-xl font-bold mb-4 text-center text-red-400">🩸 Kill Proof Gallery 🩸</h2>
      <div className="space-y-6">
        {proofs.length > 0 ? (
          proofs.map(proof => (
            <div key={proof.id} className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-white">Victim: {proof.victimName}</h3>
              <p className="text-sm text-gray-400">Submitted by: {proof.submittedBy}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(proof.submittedAt.seconds * 1000).toLocaleString()}
              </p>
              <div className="mt-4">
                <video controls src={proof.fileUrl} className="w-full rounded-lg" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-4">
            <p className="text-gray-400">No kill proofs have been submitted yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProofGallery;
