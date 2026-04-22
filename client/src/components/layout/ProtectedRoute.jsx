// frontend/src/layout/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <div style={{ textAlign: 'center', color: 'var(--color-text-primary)', marginTop: '50px' }}>Authenticating...</div>; // Or a spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If allowedRoles are specified, check if the user has one of them
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;

    if (!allowedRoles.includes(userRole)) {
      // Redirect to unauthorized page or home if role doesn't match
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }
  // If authenticated and roles match (or no roles specified), render the child routes
  return <Outlet />;
};

export default ProtectedRoute;