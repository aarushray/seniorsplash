import React, { useState } from 'react';
import { storage, firestore } from '../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function SubmitKillProof() {
  const [victimName, setVictimName] = useState('');
  const [image, setImage] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!image || !victimName) {
      alert('Please enter a name and upload an image.');
      return;
    }

    const imageRef = ref(storage, `proofs/${Date.now()}_${image.name}`);
    try {
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(firestore, 'killproofs'), {
        imageUrl,
        victimName,
        submittedBy: currentUser.email,
        timestamp: Timestamp.now(),
      });

      alert('Proof submitted!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Try again.');
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Submit Kill Proof</h2>
      <input
        type="text"
        placeholder="Victim's Full Name"
        className="border p-2 w-full mb-4"
        value={victimName}
        onChange={(e) => setVictimName(e.target.value)}
      />
      <input
        type="file"
        accept="image/*"
        className="mb-4"
        onChange={(e) => setImage(e.target.files[0])}
      />
      <button
        onClick={handleUpload}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded w-full"
      >
        Submit Proof
      </button>
    </div>
  );
}

export default SubmitKillProof;