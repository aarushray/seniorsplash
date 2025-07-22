import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase/config';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const announcementsRef = collection(firestore, 'announcements');
    const q = query(announcementsRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const announcementsData = [];
      querySnapshot.forEach((doc) => {
        announcementsData.push({ id: doc.id, ...doc.data() });
      });
      setAnnouncements(announcementsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getAnnouncementStyle = (type) => {
    switch (type) {
      case 'kill':
        return 'border-l-4 border-red-500';
      case 'admin':
        return 'border-l-4 border-blue-500';
      case 'event':
        return 'border-l-4 border-yellow-500';
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-400">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center text-blue-400">📢 Announcements 📢</h2>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {announcements.length > 0 ? (
          announcements.map(announcement => (
            <div key={announcement.id} className={`bg-gray-700 p-4 rounded-lg ${getAnnouncementStyle(announcement.type)}`}>
              <p className="text-white">{announcement.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(announcement.timestamp.seconds * 1000).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center p-4">
            <p className="text-gray-400">No announcements yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
