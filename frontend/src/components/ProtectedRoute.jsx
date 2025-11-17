import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ProtectedRoute = ({ children, requiredRole = null, requiredDepartment = null }) => {
  const { isAuthenticated, isCitizen, isOfficial, getDepartment, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRole === 'citizen' && !isCitizen()) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredRole === 'official' && !isOfficial()) {
    return <Navigate to="/" replace />;
  }

  // Check department requirements
  if (requiredDepartment && getDepartment() !== requiredDepartment) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
