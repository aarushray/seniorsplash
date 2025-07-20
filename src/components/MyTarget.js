import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase';

const MyTarget = () => {
    const { currentUser } = useAuth();
    const [targetInfo, setTargetInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gameStarted, setGameStarted] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;

            try {
                // 1. Check if game has started
                const gameRef = doc(firestore, 'game', 'state');
                const gameSnap = await getDoc(gameRef);
                if (gameSnap.exists() && gameSnap.data().gameStarted) {
                    setGameStarted(true);
                } else {
                    setGameStarted(false);
                    setLoading(false);
                    return;
                }

                // 2. Get current player's document
                const playerRef = doc(firestore, 'players', currentUser.uid);
                const playerSnap = await getDoc(playerRef);
                const targetId = playerSnap.data()?.target;

                if (!targetId) {
                    setTargetInfo({ name: 'No target assigned yet.' });
                    setLoading(false);
                    return;
                }

                // 3. Get the target's data
                const targetRef = doc(firestore, 'players', targetId);
                const targetSnap = await getDoc(targetRef);

                if (targetSnap.exists()) {
                    const data = targetSnap.data();
                    setTargetInfo({ name: data.name || data.codename || 'Unknown' });
                } else {
                    setTargetInfo({ name: 'Target not found.' });
                }

                setLoading(false);
            } catch (error) {
                console.error('Error fetching target:', error);
                setTargetInfo({ name: 'Error retrieving target' });
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    if (loading) return <p>Loading...</p>;
    if (!gameStarted) return <p>The game hasn’t started yet.</p>;

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-2">Your Assigned Target:</h2>
            <p className="text-xl">{targetInfo?.name}</p>
        </div>
    );
};

export default MyTarget;
