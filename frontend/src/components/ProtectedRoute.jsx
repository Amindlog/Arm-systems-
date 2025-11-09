import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth';

const ProtectedRoute = ({ children, requiredRole, requiredAnyRole }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const user = authService.getUser();

  if (requiredRole && !authService.hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  if (requiredAnyRole && !authService.hasAnyRole(...requiredAnyRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;

