import apiClient, { setAuthToken as setApiClientAuthToken } from './apiService';

// Define more specific response types if needed, or handle 'any' carefully
const register = async (payload) => {
  const response = await apiClient.post('/auth/register', payload);
  return response.data; // { success: boolean, message: string, user?: object, warning?: string }
};

const login = async (payload) => {
  const response = await apiClient.post('/auth/login', payload);
  return response.data; // { success: boolean, message: string, token?: string, user?: object }
};

const verifyEmail = async (token) => {
  const response = await apiClient.get(`/auth/verify-email/${token}`);
  return response.data; // { success: boolean, message: string }
};

const forgotPassword = async (payload) => {
  const response = await apiClient.post('/auth/forgot-password', payload);
  return response.data; // { success: boolean, message: string }
};

const resendPasswordOtp = async (payload) => {
  const response = await apiClient.post('/auth/resend-password-otp', payload);
  return response.data;
};

const resetPassword = async (payload, token) => {
  const response = token
    ? await apiClient.post(`/auth/reset-password/${token}`, payload)
    : await apiClient.post('/auth/reset-password', payload);
  return response.data; // { success: boolean, message: string }
};

const getCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data; // { success: boolean, user: object }
};

const resendVerificationEmail = async (email) => {
    const response = await apiClient.post('/auth/resend-verification-email', { email });
    return response.data; // Expected: { success: boolean, message: string }
};

// Expose setAuthToken through authService if needed elsewhere, or use it internally in apiClient
const setAuthToken = (token) => {
    setApiClientAuthToken(token);
};

const authService = {
  register, login, verifyEmail, forgotPassword, resendPasswordOtp, resetPassword, getCurrentUser, setAuthToken, resendVerificationEmail
};
export default authService;