import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// UI convenience only: the backend enforces authentication and RBAC on every request.
export default function RequireAuth({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <p role="alert" className="p-6 text-red-700">You do not have access to this page.</p>;
  }
  return children;
}
