import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('customerToken') || null);

  const login = (newToken) => {
    localStorage.setItem('customerToken', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('customerToken');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);