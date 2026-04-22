import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../../services/authService';
import AuthLayout from '../../components/layout/AuthLayout';

const ForgotPasswordPage = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [serverMessage, setServerMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    setServerMessage({ type: '', text: '' });
    try {
      const response = await authService.forgotPassword({ email: data.email });
      if (response.success) {
        localStorage.setItem('resetEmail', data.email);
        toast.success(response.message || 'A reset OTP has been sent.');
        setServerMessage({ type: 'success', text: response.message || 'A reset OTP has been sent. Check your email.' });
        navigate('/reset-password');
      } else {
        toast.error(response.message || 'Failed to send OTP.');
        setServerMessage({ type: 'error', text: response.message || 'Failed to send OTP.' });
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      toast.error(errMsg);
      setServerMessage({ type: 'error', text: errMsg });
    }
  };

  return (
    <AuthLayout>
      <div style={containerStyle}>
        <form onSubmit={handleSubmit(onSubmit)} style={formStyle} noValidate>
          <h2 className="main-heading">Forgot Password</h2>
          <p style={subheadingStyle}>We will send a one-time code to your email address.</p>

          {serverMessage.text && <p style={serverMessage.type === 'success' ? successTextStyle : errorTextStyle}>{serverMessage.text}</p>}

          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              placeholder="Your email address"
              style={inputStyle}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
              })}
            />
          </Field>

          <button type="submit" disabled={isSubmitting} style={submitStyle}>
            {isSubmitting ? 'Sending...' : 'Send OTP'}
          </button>
          <p style={footerTextStyle}>
            Remembered your password? <Link to="/login" style={linkStyle}>Login</Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
};

const Field = ({ label, error, children }) => (
  <label style={{ display: 'grid', gap: '8px' }}>
    <span style={{ fontWeight: 600 }}>{label}</span>
    {children}
    {error && <span style={errorTextStyle}>{error}</span>}
  </label>
);

const containerStyle = { maxWidth: '560px', margin: '0 auto', padding: '20px' };
const formStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.22)' };
const subheadingStyle = { color: 'rgba(255,255,255,0.72)', marginTop: '8px' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const submitStyle = { marginTop: '22px', width: '100%', border: '0', borderRadius: '999px', padding: '14px 18px', fontWeight: 800, background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b' };
const errorTextStyle = { color: '#ff9b9b', fontSize: '0.92rem' };
const successTextStyle = { color: '#8ff0b4', fontSize: '0.92rem' };
const footerTextStyle = { color: 'rgba(255,255,255,0.72)', marginTop: '18px' };
const linkStyle = { color: '#ffd166', fontWeight: 700, textDecoration: 'none' };

export default ForgotPasswordPage;