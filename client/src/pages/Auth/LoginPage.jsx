import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import AuthLayout from '../../components/layout/AuthLayout';

const LoginPage = () => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      role: 'Tenant',
    },
  });
  const { login: contextLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);
  const selectedRole = watch('role');

  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (data) => {
    setServerError(null);
    try {
      const response = await authService.login({
        emailOrUsername: data.identifier,
        password: data.password,
        role: data.role,
      });

      if (response.success && response.user && response.token) {
        contextLogin(response.user, response.token);
        toast.success('Login successful!');
        navigate(from, { replace: true });
      } else {
        setServerError(response.message || 'Login failed.');
        toast.error(response.message || 'Login failed.');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      setServerError(errMsg);
      toast.error(errMsg);
    }
  };

  return (
    <AuthLayout>
      <div style={containerStyle}>
        <form onSubmit={handleSubmit(onSubmit)} style={formStyle}>
          <h2 className="main-heading">Login</h2>
          <p style={subheadingStyle}>Login with your role: Admin, Landlord, or Tenant.</p>
          {serverError && <p style={errorTextStyle}>{serverError}</p>}

          <div style={fieldGridStyle}>
            <Field label="Login role" error={errors.role?.message}>
              <select {...register('role', { required: 'Role is required' })} style={inputStyle}>
                <option value="Tenant">Tenant</option>
                <option value="Landlord">Landlord</option>
                <option value="Admin">Admin</option>
              </select>
            </Field>
            <Field label={selectedRole === 'Admin' ? 'Admin User ID' : 'Email / User ID'} error={errors.identifier?.message}>
              <input
                type="text"
                {...register('identifier', { required: 'Email/User ID is required' })}
                style={inputStyle}
                placeholder={selectedRole === 'Admin' ? 'admin' : 'you@example.com'}
              />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input type="password" {...register('password', { required: 'Password is required' })} style={inputStyle} placeholder="Your password" />
            </Field>
          </div>

          <button type="submit" style={submitStyle} disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>

          <div style={linksStyle}>
            <Link to="/forgot-password" style={linkStyle}>Forgot password?</Link>
            <Link to="/register" style={linkStyle}>Register</Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

const Field = ({ label, error, children }) => (
  <div style={{ display: 'grid', gap: '8px' }}>
    <label style={{ fontWeight: 600 }}>{label}</label>
    {children}
    {error && <span style={errorTextStyle}>{error}</span>}
  </div>
);

const containerStyle = { maxWidth: '560px', margin: '0 auto', padding: '20px' };
const formStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.22)' };
const subheadingStyle = { color: 'rgba(255,255,255,0.72)', marginTop: '8px' };
const fieldGridStyle = { display: 'grid', gap: '16px', marginTop: '24px' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const submitStyle = { marginTop: '22px', width: '100%', border: '0', borderRadius: '999px', padding: '14px 18px', fontWeight: 800, background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b' };
const errorTextStyle = { color: '#ff9b9b', fontSize: '0.92rem' };
const linksStyle = { display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '18px', flexWrap: 'wrap' };
const linkStyle = { color: '#ffd166', fontWeight: 700, textDecoration: 'none' };

export default LoginPage;