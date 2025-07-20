import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SubmitKillProof from './pages/SubmitKillProof';
import PrivateRoute from './components/PrivateRoute';
import JoinGame from './pages/JoinGame';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/submit-proof"
        element={
          <PrivateRoute>
            <SubmitKillProof />
          </PrivateRoute>
        }
      />
      <Route path="/joingame" element={<JoinGame />} />
      <Route
        path="/admindashboard"
        element={
          <PrivateRoute>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;