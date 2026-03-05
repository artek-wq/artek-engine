
import React, { createContext, useContext } from 'react';

// Context definition with default "authenticated" values to prevent errors in components still using this
const AuthContext = createContext({
  currentUser: { email: 'admin@artek.com', id: 'admin-user' },
  isAuthenticated: true,
  isLoading: false,
  login: async () => ({ success: true }),
  logout: async () => {},
  supabaseClient: null
});

export const useAuth = () => useContext(AuthContext);

// Simplified provider that just renders children
export const AuthProvider = ({ children }) => {
  return <>{children}</>;
};

export default AuthContext;
