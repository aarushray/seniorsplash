import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/config';

const Dashboard = () => {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [target, setTarget] = useState(null);
  const [isInGame, setIsInGame] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerAndTarget = async () => {
      if (!currentUser) return;
      const playerRef = doc(firestore, 'players', currentUser.uid);
      const playerSnap = await getDoc(playerRef);

      if (playerSnap.exists()) {
        const playerData = playerSnap.data();
        setIsInGame(playerData.isInGame);

        if (playerData.targetId) {
          const targetRef = doc(firestore, 'players', playerData.targetId);
          const targetSnap = await getDoc(targetRef);
          if (targetSnap.exists()) {
            setTarget(targetSnap.data());
          }
        }
      }
      setLocalLoading(false);
    };
    fetchPlayerAndTarget();
  }, [currentUser]);

  if (loading || localLoading) return <div>Loading...</div>;
  if (!currentUser) {
    navigate('/register');
    return <div>Please register to access the dashboard.</div>;
  }
  if (!isInGame) {
    navigate('/joingame');
    return <div>Please join a game to access the dashboard.</div>;
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Welcome to the Arena! Don't die.</h1>
      <p>You're logged in. Submit proof once you’ve completed a kill.</p>
      {target ? (
        <div>
          <h2>Your Target:</h2>
          <p><strong>Name:</strong> {target.name}</p>
          <p><strong>Email:</strong> {target.email}</p>
        </div>
      ) : (
        <p>No target assigned yet. Game hasn't started.</p>
      )}
      <button
        className="mt-6 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded"
        onClick={() => navigate('/submit-proof')}
      >
        Submit Kill Proof
      </button>
      <br />
      <button
        className="mt-4 text-sm underline text-gray-500"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;