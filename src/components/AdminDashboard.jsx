import React from 'react';
import StartGame from '../utils/StartGame'; // adjust path if needed

const AdminDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <StartGame />
      {/* Later: add kill verification, view players, etc. */}
    </div>
  );
};

export default AdminDashboard;
