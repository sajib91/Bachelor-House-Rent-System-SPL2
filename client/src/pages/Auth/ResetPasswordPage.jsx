import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../../services/authService';
import AuthLayout from '../../components/layout/AuthLayout';

const ResetPasswordPage = () => {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      email: localStorage.getItem('resetEmail') || '',
      otp: '',
      password: '',
      confirmPassword: '',
    },
  });
  const { token } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const password = watch('password');
  const email = watch('email');

  useEffect(() => {
    if (!token) {
      setValue('email', localStorage.getItem('resetEmail') || '');
    }
  }, [setValue, token]);

  const onSubmit = async (data) => {
    setServerError(null);

    try {
      const payload = token
        ? { newPassword: data.password, confirmNewPassword: data.confirmPassword }
        : { email: data.email, otp: data.otp, newPassword: data.password, confirmNewPassword: data.confirmPassword };

      const response = await authService.resetPassword(payload, token);

      if (response.success) {
        localStorage.removeItem('resetEmail');
        toast.success(response.message || 'Password reset successfully!');
        navigate('/login');
      } else {
        setServerError(response.message || 'Failed to reset password.');
        toast.error(response.message || 'Failed to reset password.');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      setServerError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleResendOtp = async () => {
    const targetEmail = (email || '').trim();
    if (!targetEmail) {
      toast.error('Please enter your email first.');
      return;
    }

    setIsResendingOtp(true);
    try {
      const response = await authService.resendPasswordOtp({ email: targetEmail });
      if (response.success) {
        toast.success(response.message || 'A new OTP has been sent.');
      } else {
        toast.error(response.message || 'Unable to resend OTP right now.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to resend OTP right now.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <AuthLayout>
      <div style={containerStyle}>
        <form onSubmit={handleSubmit(onSubmit)} style={formStyle} noValidate>
          <h2 className="main-heading">Reset Password</h2>
          <p style={subheadingStyle}>{token ? 'Set a new password using your existing reset link.' : 'Enter the OTP we sent to your email and choose a new password.'}</p>
          {serverError && <p style={errorTextStyle}>{serverError}</p>}

          {!token && (
            <Field label="Email" error={errors.email?.message}>
              <input
                type="email"
                placeholder="Email address"
                style={inputStyle}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' },
                })}
              />
            </Field>
          )}

          {!token && (
            <Field label="OTP" error={errors.otp?.message}>
              <input type="text" placeholder="6-digit code" style={inputStyle} {...register('otp', { required: 'OTP is required', minLength: { value: 6, message: 'OTP must be 6 digits' }, maxLength: { value: 6, message: 'OTP must be 6 digits' } })} />
            </Field>
          )}

          {!token && (
            <div style={resendRowStyle}>
              <button type="button" onClick={handleResendOtp} disabled={isResendingOtp || isSubmitting} style={resendButtonStyle}>
                {isResendingOtp ? 'Sending OTP...' : 'Resend OTP'}
              </button>
            </div>
          )}

          <Field label="New password" error={errors.password?.message}>
            <input
              type="password"
              placeholder="New password"
              style={inputStyle}
              {...register('password', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
          </Field>

          <Field label="Confirm new password" error={errors.confirmPassword?.message}>
            <input
              type="password"
              placeholder="Confirm new password"
              style={inputStyle}
              {...register('confirmPassword', {
                required: 'Please confirm your new password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
          </Field>

          <button type="submit" disabled={isSubmitting} style={submitStyle}>
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
          <p style={footerTextStyle}>
            <Link to="/login" style={linkStyle}>Back to login</Link>
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
const resendRowStyle = { marginTop: '10px', display: 'flex', justifyContent: 'flex-end' };
const resendButtonStyle = { border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#f6f1e8', padding: '8px 14px', fontWeight: 700 };
const errorTextStyle = { color: '#ff9b9b', fontSize: '0.92rem' };
const footerTextStyle = { color: 'rgba(255,255,255,0.72)', marginTop: '18px' };
const linkStyle = { color: '#ffd166', fontWeight: 700, textDecoration: 'none' };

export default ResetPasswordPage;