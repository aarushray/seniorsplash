import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Particulars from './pages/Particulars';
import SubmitKillProof from './pages/SubmitKillProof';
import PrivateRoute from './components/PrivateRoute';
import JoinGame from './pages/JoinGame';
import AdminDashboard from './components/AdminDashboard';
import './index.css';
import AdminRoute from './components/AdminRoute';

function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/particulars" element={<Particulars />} />
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
        path="/admindash"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
      />
    </Routes>
  );
}

export default App;