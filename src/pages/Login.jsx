import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { firestore } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/joingame");
    } catch (err) {
      setError(err.message);
    }
  };

const handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user document exists
    const userRef = doc(firestore, "players", user.uid);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        kills: 0,
        isInGame: false, // <-- Add new field here
        isAlive: true,
        createdAt: new Date()
      });
    }

    navigate('/joingame');
  } catch (err) {
    setError(err.message);
  }
};

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-500">{error}</p>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full">
          Login
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="mb-2">Or sign in with:</p>
        <button
          onClick={handleGoogleLogin}
          className="bg-red-600 text-white px-4 py-2 rounded w-full"
        >
          Google
        </button>
      </div>
    </div>
  );
};

export default Login;
