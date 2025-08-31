import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const AdminDashboard = () => {
    const [fullName, setFullName] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [message, setMessage] = useState('');

    const handleUpdateAdminStatus = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!fullName) {
            setMessage('Please enter a full name.');
            return;
        }

        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('fullName', '==', fullName));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setMessage(`User with full name "${fullName}" not found.`);
                return;
            }

            // Since you've confirmed fullName is unique, we'll update the first doc found.
            const userDoc = querySnapshot.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
                isAdmin: isAdmin
            });

            setMessage(`Successfully updated ${fullName}'s admin status to ${isAdmin}.`);
            setFullName('');
            setIsAdmin(false);

        } catch (error) {
            console.error("Error updating admin status: ", error);
            setMessage('An error occurred. Check the console for details.');
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Admin Dashboard</h1>
            <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                <h2>Set User Admin Status</h2>
                <form onSubmit={handleUpdateAdminStatus}>
                    <div style={{ marginBottom: '10px' }}>
                        <label htmlFor="fullName" style={{ marginRight: '10px' }}>User Full Name:</label>
                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter full name"
                            style={{ padding: '8px', width: '250px' }}
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label>
                            <input
                                type="checkbox"
                                checked={isAdmin}
                                onChange={(e) => setIsAdmin(e.target.checked)}
                                style={{ marginRight: '5px' }}
                            />
                            Set as Admin
                        </label>
                    </div>
                    <button type="submit" style={{ padding: '10px 15px', cursor: 'pointer' }}>
                        Update Status
                    </button>
                </form>
                {message && <p style={{ marginTop: '15px', color: message.startsWith('Successfully') ? 'green' : 'red' }}>{message}</p>}
            </div>
        </div>
    );
};

export default AdminDashboard;