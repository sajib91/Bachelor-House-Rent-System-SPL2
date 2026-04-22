// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService'; // Ensure this path is correct

const initialState = {
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start true to check storage
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
      };
    case 'LOGOUT':
      // Clearing localStorage and apiClient token is handled by the logout function
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
      };
    case 'LOAD_USER': // Called on initial load from storage
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: !!(action.payload.token && action.payload.user),
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const storedToken = localStorage.getItem('token');
        const storedUserString = localStorage.getItem('user');

        if (storedToken && storedUserString) {
          const storedUser = JSON.parse(storedUserString);
          authService.setAuthToken(storedToken); // Set token for subsequent API calls
          // Optionally, verify token by fetching current user
          // try {
          //   const { user: freshUser } = await authService.getCurrentUser();
          //   dispatch({ type: 'LOAD_USER', payload: { user: freshUser, token: storedToken } });
          // } catch (verifyError) {
          //   console.warn('Stored token invalid, logging out.');
          //   localStorage.removeItem('user');
          //   localStorage.removeItem('token');
          //   authService.setAuthToken(null);
          //   dispatch({ type: 'LOAD_USER', payload: { user: null, token: null } });
          // }
          dispatch({ type: 'LOAD_USER', payload: { user: storedUser, token: storedToken } });

        } else {
          authService.setAuthToken(null); // Ensure no lingering token in axios
          dispatch({ type: 'LOAD_USER', payload: { user: null, token: null } });
        }
      } catch (error) { // Catch JSON.parse errors or other issues
        console.error('Failed to load user from storage:', error);
        authService.setAuthToken(null);
        dispatch({ type: 'LOAD_USER', payload: { user: null, token: null } });
      }
    };
    loadUserFromStorage();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    authService.setAuthToken(token); // Update axios headers
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user: userData, token } });
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    authService.setAuthToken(null); // Update axios headers
    dispatch({ type: 'LOGOUT' });
  };

  // This might not be needed if LOAD_USER is robust enough
  // const setUserAndToken = (userData, token) => {
  //   dispatch({ type: 'LOAD_USER', payload: { user: userData, token } });
  // };

  const setIsLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, /*setUserAndToken,*/ setIsLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};