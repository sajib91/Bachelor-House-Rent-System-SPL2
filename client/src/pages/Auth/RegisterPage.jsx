import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import authService from '../../services/authService';
import AuthLayout from '../../components/layout/AuthLayout';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const RegisterPage = () => {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { role: 'Tenant', verificationType: 'Student ID', instituteType: 'University' },
  });
  const navigate = useNavigate();
  const [serverError, setServerError] = useState(null);
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const passwordValue = watch('password', '');
  const selectedRole = watch('role', 'Tenant');

  React.useEffect(() => {
    if (selectedRole === 'Landlord') {
      setValue('verificationType', 'NID');
    }
  }, [selectedRole, setValue]);

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDocument(true);
    try {
      const formData = new FormData();
      formData.append('photos', file);
      const response = await axios.post(`${API_BASE_URL}/upload`, formData);
      setIdDocumentUrl(response.data.urls?.[0] || '');
      toast.success('ID document uploaded successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload ID document.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingProfilePicture(true);
    try {
      const formData = new FormData();
      formData.append('photos', file);
      const response = await axios.post(`${API_BASE_URL}/upload`, formData);
      setProfilePictureUrl(response.data.urls?.[0] || '');
      toast.success('Profile picture uploaded successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to upload profile picture.');
    } finally {
      setUploadingProfilePicture(false);
    }
  };

  const onSubmit = async (data) => {
    setServerError(null);

    if (data.password !== data.confirmPassword) {
      const message = 'Passwords do not match.';
      setServerError(message);
      toast.error(message);
      return;
    }

    if (!idDocumentUrl) {
      const message = 'Please upload your identity document before registration.';
      setServerError(message);
      toast.error(message);
      return;
    }

    try {
      const response = await authService.register({
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        role: data.role,
        instituteType: data.role === 'Tenant' ? data.instituteType : undefined,
        instituteName: data.role === 'Tenant' ? data.instituteName : undefined,
        hometown: data.role === 'Tenant' ? data.hometown : undefined,
        profilePictureUrl,
        verificationType: data.verificationType,
        verificationDocumentUrl: idDocumentUrl,
      });

      if (response.success) {
        toast.success(response.message || 'Registration submitted. Wait for admin approval before login.');
        navigate('/login');
      } else {
        const fieldErrors = Array.isArray(response.errors)
          ? response.errors.map((item) => item.message).join(' ')
          : '';
        const finalMessage = fieldErrors || response.message || 'Registration failed.';
        setServerError(finalMessage);
        toast.error(finalMessage);
      }
    } catch (error) {
      const backendErrors = error.response?.data?.errors;
      const aggregatedErrors = Array.isArray(backendErrors)
        ? backendErrors.map((item) => item.message).join(' ')
        : '';
      const errMsg = aggregatedErrors || error.response?.data?.message || error.message || 'An unexpected registration error occurred.';
      setServerError(errMsg);
      toast.error(errMsg);
    }
  };

  return (
    <AuthLayout>
      <div style={containerStyle}>
        <form onSubmit={handleSubmit(onSubmit)} style={formStyle} noValidate>
          <h2 className="main-heading">Register</h2>
          <p style={subheadingStyle}>Create your account as Tenant or Landlord (Admin cannot register).</p>
          {serverError && <p style={errorTextStyle}>{serverError}</p>}

          <div style={inputGridStyle}>
            <Field label="Registration role" error={errors.role?.message}>
              <select {...register('role', { required: 'Choose your role' })} style={inputStyle}>
                <option value="Tenant">Tenant</option>
                <option value="Landlord">Landlord</option>
              </select>
            </Field>
            <Field label="Full name" error={errors.fullName?.message}>
              <input {...register('fullName', { required: 'Full name is required' })} style={inputStyle} placeholder="Md. Rahim" />
            </Field>
            <Field label="Username" error={errors.username?.message}>
              <input {...register('username')} style={inputStyle} placeholder="Optional handle" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Please provide a valid email address.',
                  },
                })}
                style={inputStyle}
                placeholder="rahim@email.com"
              />
            </Field>
            <Field label="Phone number" error={errors.phoneNumber?.message}>
              <input
                {...register('phoneNumber', {
                  required: 'Phone number is required',
                  minLength: { value: 8, message: 'Phone number must be between 8 and 20 characters.' },
                  maxLength: { value: 20, message: 'Phone number must be between 8 and 20 characters.' },
                })}
                style={inputStyle}
                placeholder="01XXXXXXXXX"
              />
            </Field>
            {selectedRole === 'Tenant' && (
              <Field label="Institute type" error={errors.instituteType?.message}>
                <select {...register('instituteType', { required: 'Institute type is required for tenants' })} style={inputStyle}>
                  <option value="School">School</option>
                  <option value="College">College</option>
                  <option value="University">University</option>
                  <option value="Other Institute">Other's Institute</option>
                </select>
              </Field>
            )}
            {selectedRole === 'Tenant' && (
              <Field label="Institute name" error={errors.instituteName?.message}>
                <input
                  {...register('instituteName', {
                    required: 'Institute name is required for tenants',
                    minLength: { value: 2, message: 'Institute name must be at least 2 characters.' },
                    maxLength: { value: 160, message: 'Institute name cannot exceed 160 characters.' },
                  })}
                  style={inputStyle}
                  placeholder="Dhaka University"
                />
              </Field>
            )}
            {selectedRole === 'Tenant' && (
              <Field label="Home town" error={errors.hometown?.message}>
                <input
                  {...register('hometown', {
                    required: 'Home town is required for tenants',
                    minLength: { value: 2, message: 'Home town must be at least 2 characters.' },
                    maxLength: { value: 120, message: 'Home town cannot exceed 120 characters.' },
                  })}
                  style={inputStyle}
                  placeholder="Dhaka"
                />
              </Field>
            )}
            <Field label="Profile picture" error={errors.profilePicture?.message}>
              <input type="file" accept="image/*" onChange={handleProfilePictureUpload} style={{ ...inputStyle, padding: '10px 12px' }} />
              <small style={helperTextStyle}>
                {uploadingProfilePicture
                  ? 'Uploading profile picture...'
                  : profilePictureUrl
                    ? 'Profile picture uploaded and attached.'
                    : 'Upload your profile photo (optional).'}
              </small>
            </Field>
            <Field label="Verification type" error={errors.verificationType?.message}>
              <select {...register('verificationType', { required: 'Choose a verification type' })} style={inputStyle}>
                {selectedRole === 'Landlord' ? (
                  <option value="NID">NID</option>
                ) : (
                  <>
                    <option value="Student ID">Student ID</option>
                    <option value="NID">NID</option>
                  </>
                )}
              </select>
            </Field>
            <Field label="Identity document" error={errors.identityDocument?.message}>
              <input type="file" accept="image/*" onChange={handleDocumentUpload} style={{ ...inputStyle, padding: '10px 12px' }} />
              <small style={helperTextStyle}>{uploadingDocument ? 'Uploading document...' : idDocumentUrl ? 'Document uploaded and attached.' : 'Upload a clear image of your ID.'}</small>
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <input
                type="password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters long.' },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,
                    message: 'Password must include uppercase, lowercase, number, and special character.',
                  },
                })}
                style={inputStyle}
                placeholder="Create a password"
              />
            </Field>
            <Field label="Confirm password" error={errors.confirmPassword?.message}>
              <input type="password" {...register('confirmPassword', { required: 'Confirm your password', validate: (value) => value === passwordValue || 'Passwords do not match' })} style={inputStyle} placeholder="Repeat password" />
            </Field>
          </div>

          <p style={helperTextStyle}>
            {selectedRole === 'Landlord'
              ? 'Landlord accounts require NID verification and admin approval before publishing seats.'
              : 'Tenant accounts require Student ID or NID verification and admin approval.'}
          </p>

          <button type="submit" disabled={isSubmitting} style={submitStyle}>
            {isSubmitting ? 'Registering...' : 'Create account'}
          </button>
          <p style={footerTextStyle}>
            Already have an account? <Link to="/login" style={linkStyle}>Login</Link>
          </p>
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

const containerStyle = { maxWidth: '920px', margin: '0 auto', padding: '20px' };
const formStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.22)' };
const subheadingStyle = { color: 'rgba(255,255,255,0.72)', marginTop: '8px' };
const inputGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '24px' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(8,12,18,0.78)', color: '#fff' };
const submitStyle = { marginTop: '22px', width: '100%', border: '0', borderRadius: '999px', padding: '14px 18px', fontWeight: 800, background: 'linear-gradient(135deg, #ffd166 0%, #f08a5d 100%)', color: '#09111b' };
const errorTextStyle = { color: '#ff9b9b', fontSize: '0.92rem' };
const helperTextStyle = { color: 'rgba(255,255,255,0.62)', margin: 0, fontSize: '0.88rem' };
const footerTextStyle = { color: 'rgba(255,255,255,0.72)', marginTop: '18px' };
const linkStyle = { color: '#ffd166', fontWeight: 700, textDecoration: 'none' };

export default RegisterPage;