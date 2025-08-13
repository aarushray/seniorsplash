import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Wait for Firebase to finish restoring the session
  if (loading) {
    return <div>Loading...</div>; // or your spinner
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
