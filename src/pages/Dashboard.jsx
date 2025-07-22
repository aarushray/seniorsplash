import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { firestore } from '../firebase/config';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Announcements from '../components/Announcements';

// Custom icons for the map
const skullIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const playerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const defaultIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const Dashboard = () => {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [target, setTarget] = useState(null);
  const [isInGame, setIsInGame] = useState(false);
  const [localLoading, setLocalLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [locationError, setLocationError] = useState('');
  const [watchId, setWatchId] = useState(null);
  const [isPurgeMode, setIsPurgeMode] = useState(false);

  useEffect(() => {
    const statusRef = doc(firestore, 'game', 'status');
    const unsubscribe = onSnapshot(statusRef, (doc) => {
      if (doc.exists()) {
        setIsPurgeMode(doc.data().purgeMode || false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Auto-track location when component mounts
  useEffect(() => {
    if (!currentUser || !navigator.geolocation) {
      setLocationError('⚠️ Location tracking unavailable - you are vulnerable!');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    };

    const watchPosition = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const userRef = doc(firestore, 'players', currentUser.uid);
          await updateDoc(userRef, { 
            latitude, 
            longitude,
            lastLocationUpdate: new Date()
          });
          setLocationError('');
        } catch (err) {
          console.error('Failed to update location:', err);
          setLocationError('💀 Failed to update your position - danger imminent!');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('🌊 Unable to track your movements in the shadows...');
      },
      options
    );

    setWatchId(watchPosition);

    return () => {
      if (watchPosition) {
        navigator.geolocation.clearWatch(watchPosition);
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLocalLoading(false);
      return;
    }

    let unsubscribeTarget = () => {};

    const playerRef = doc(firestore, 'players', currentUser.uid);
    const unsubscribePlayer = onSnapshot(playerRef, (playerDoc) => {
      unsubscribeTarget();

      if (playerDoc.exists()) {
        const playerData = playerDoc.data();
        setIsInGame(playerData.isInGame);

        if (playerData.targetId) {
          const targetRef = doc(firestore, 'players', playerData.targetId);
          unsubscribeTarget = onSnapshot(targetRef, (targetDoc) => {
            if (targetDoc.exists()) {
              setTarget(targetDoc.data());
            } else {
              setTarget(null);
            }
          }, (error) => {
            console.error('Error fetching target data:', error);
            setTarget(null);
          });
        } else {
          setTarget(null);
        }
      } else {
        setIsInGame(false);
        setTarget(null);
      }
      setLocalLoading(false);
    }, (error) => {
      console.error('Error fetching player data:', error);
      setLocalLoading(false);
    });

    return () => {
      unsubscribePlayer();
      unsubscribeTarget();
    };
  }, [currentUser]);

  // Real-time listener for all players
  useEffect(() => {
    const q = query(collection(firestore, 'players'), where('isInGame', '==', true));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const playersList = [];
      querySnapshot.forEach((doc) => {
        playersList.push({ id: doc.id, ...doc.data() });
      });
      setPlayers(playersList);
    });
    return () => unsubscribe();
  }, []);

  if (loading || localLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-blue-900 flex items-center justify-center">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-blue-300 rounded-full opacity-40 animate-ping"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-25 animate-pulse"></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin text-6xl mb-6">🌀</div>
          <p className="text-white text-xl">Entering the dark waters...</p>
          <p className="text-gray-400 text-sm mt-2">🔍 Scanning for targets...</p>
        </div>
      </div>
    );
  }

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
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
      await logout();
      navigate('/login');
    } catch (err) {
      console.error(err.message);
    }
  };

  const mapCenter = [1.3521, 103.8198];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-blue-900 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/6 left-1/5 w-3 h-3 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-cyan-300 rounded-full opacity-30 animate-ping"></div>
        <div className="absolute bottom-1/5 left-2/5 w-1 h-1 bg-blue-300 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute top-1/2 right-1/6 w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-25 animate-bounce"></div>
      </div>

      {/* Purge Mode Alert */}
      {isPurgeMode && (
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-red-800 border-b-4 border-red-500 p-4 text-center animate-pulse relative z-10">
          <div className="absolute inset-0 bg-red-600 opacity-20 animate-ping"></div>
          <h2 className="text-3xl font-bold text-white mb-1 relative z-10">
            ⚠️ PURGE MODE ACTIVE ⚠️
          </h2>
          <p className="text-yellow-300 text-lg relative z-10">
            💀 All players are valid targets. Trust no one. 💀
          </p>
        </div>
      )}

      {/* Header with enhanced styling */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 p-8 border-b border-gray-700 shadow-lg relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 via-transparent to-blue-900/10"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <h1 className="text-5xl font-bold text-center mb-3 animate-pulse">
            🌊 <span className="text-blue-400">AQUA</span> <span className="text-red-400">ASSASSIN</span> 🌊
          </h1>
          <p className="text-center text-gray-300 text-lg">
            💀 <em>Welcome to the Arena... Don't let them find you</em> 💀
          </p>
          
          {/* Enhanced Location Status */}
          <div className="mt-6 text-center">
            {locationError ? (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-red-400 text-sm animate-pulse">{locationError}</p>
              </div>
            ) : (
              <div className="bg-green-900/50 border border-green-500 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-green-400 text-sm">
                  🎯 <span className="animate-pulse">Your position is being tracked...</span> stay vigilant
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 relative z-10">
        {/* Enhanced Target Section */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 mb-6 border border-gray-700 shadow-2xl transform hover:scale-105 transition-all duration-300">
          <h2 className="text-2xl font-bold mb-6 text-center">
            🎯 <span className="text-red-400 animate-pulse">Your Target</span> 🎯
          </h2>
          {target ? (
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-xl p-6 border-2 border-red-500 shadow-lg transform hover:scale-105 transition-all duration-300">
                <div className="animate-pulse mb-2">
                  <p className="text-2xl font-bold text-red-300">💀 {target.fullName}</p>
                </div>
                <p className="text-gray-300 text-lg">📧 {target.email}</p>
                <div className="mt-4 p-3 bg-red-900/30 rounded-lg border border-red-700">
                  <p className="text-sm text-gray-300">
                    🌊 <em>Hunt them down with your water weapon...</em>
                  </p>
                  <p className="text-xs text-red-400 mt-1">
                    ⚡ Strike fast, strike silent ⚡
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center bg-gray-700/50 rounded-xl p-6 border border-gray-600 backdrop-blur-sm">
              <div className="animate-bounce mb-2">
                <p className="text-gray-400 text-xl">🕳️ No target assigned yet...</p>
              </div>
              <p className="text-sm text-gray-500 mt-2">The hunt has not begun</p>
              <div className="mt-4 text-xs text-gray-600">
                🌊 Prepare your weapon... the waters are stirring... 🌊
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Announcements Section */}
        <div className="mb-6 transform hover:scale-105 transition-all duration-300">
          <Announcements />
        </div>

        {/* Enhanced Map Section */}
        <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-8 border border-gray-700 shadow-2xl transform hover:scale-105 transition-all duration-300">
          <h3 className="text-2xl font-bold mb-6 text-center">
            🗺️ <span className="text-blue-400 animate-pulse">Battlefield Map</span> 🗺️
          </h3>
          <div className="rounded-xl overflow-hidden border-2 border-gray-600 shadow-inner" style={{ height: '450px' }}>
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {players.map(player => (
                player.latitude && player.longitude && (
                  <Marker
                    key={player.id}
                    position={[player.latitude, player.longitude]}
                    icon={
                      player.id === currentUser.uid 
                        ? playerIcon 
                        : player.id === target?.uid 
                          ? skullIcon 
                          : defaultIcon
                    }
                  >
                    <Popup>
                      <div className="text-center">
                        <strong className="text-lg">{player.fullName || player.name}</strong>
                        {player.id === currentUser.uid && (
                          <div className="text-blue-600 font-bold text-sm">(You)</div>
                        )}
                        {player.id === target?.uid && (
                          <div className="text-red-600 font-bold text-sm animate-pulse">🎯 TARGET</div>
                        )}
                        <div className="text-sm text-gray-600 mt-1">{player.email}</div>
                        {player.lastLocationUpdate && (
                          <div className="text-xs text-gray-500 mt-2 p-1 bg-gray-100 rounded">
                            Last seen: {new Date(player.lastLocationUpdate.seconds * 1000).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          </div>
          <div className="mt-6 text-center text-sm text-gray-400 space-y-2 bg-gray-700/30 p-4 rounded-lg backdrop-blur-sm">
            <p className="text-base">🔵 Blue = You | 🔴 Red = Your Target | ⚫ Gray = Other Players</p>
            <p className="italic">💧 <em>Use water weapons to eliminate your target</em> 💧</p>
            <p className="text-xs text-gray-500">🌊 Stay hidden in the shadows... trust no one... 🌊</p>
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex flex-col space-y-6 mt-8">
          <button
            className="bg-gradient-to-r from-red-600 via-red-700 to-red-600 hover:from-red-700 hover:via-red-800 hover:to-red-700 text-white py-4 px-8 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 border-2 border-red-500 shadow-2xl relative overflow-hidden group"
            onClick={() => navigate('/submit-proof')}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/20 to-transparent transform -skew-x-12 group-hover:animate-pulse"></div>
            <span className="relative z-10">💀 Submit Kill Proof 💀</span>
          </button>
          
          <button
            className="bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 hover:from-gray-600 hover:via-gray-500 hover:to-gray-600 text-gray-300 py-3 px-6 rounded-xl text-sm transition-all duration-300 transform hover:scale-105 border border-gray-600 shadow-lg"
            onClick={handleLogout}
          >
            🚪 Escape the Arena (Logout)
          </button>
        </div>

        {/* Player Stats Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 bg-gray-800/30 p-4 rounded-lg backdrop-blur-sm">
          <p>🌊 Active Players: {players.length} | 🎯 Targets Remaining: {players.filter(p => p.isAlive).length} 🌊</p>
          <p className="mt-1 italic">May the waters guide your aim... and may you emerge victorious from the depths...</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;