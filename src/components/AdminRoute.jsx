import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return <div>Loading...</div>;
  }

  // Not logged in - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Not admin - redirect to dashboard
  if (!currentUser.isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // User is admin - show admin dashboard
  return children;
};

export default AdminRoute;
