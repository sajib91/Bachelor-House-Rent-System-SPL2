// src/pages/Auth/VerifyEmailPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../../services/authService';
import styles from './AuthPages.module.css'; // Can reuse some styles
import AuthLayout from '../../components/layout/AuthLayout';
import Button from '../../components/common/Button/Button';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState({ loading: true, message: '', success: false });

  useEffect(() => {
    if (!token) {
      setVerificationStatus({ loading: false, message: 'Invalid verification link.', success: false });
      toast.error('Invalid verification link.');
      return;
    }

    const verify = async () => {
      try {
        const response = await authService.verifyEmail(token);
        if (response.success) {
          setVerificationStatus({ loading: false, message: response.message || 'Email verified successfully!', success: true });
          toast.success(response.message || 'Email verified successfully! You can now log in.');
        } else {
          setVerificationStatus({ loading: false, message: response.message || 'Email verification failed.', success: false });
          toast.error(response.message || 'Email verification failed. Link may be invalid or expired.');
        }
      } catch (error) {
        const errMsg = error.response?.data?.message || error.message || 'An error occurred during verification.';
        setVerificationStatus({ loading: false, message: errMsg, success: false });
        toast.error(errMsg);
      }
    };
    verify();
  }, [token]);

  return (
    <AuthLayout>
      <div className={styles.statusCard}> {/* Create .statusCard style in AuthPages.module.css */}
        <h2 className="main-heading">Email Verification</h2>
        {verificationStatus.loading ? (
          <p className="subheading">Verifying your email...</p>
        ) : (
          <>
            <p className={verificationStatus.success ? styles.serverSuccess : styles.serverError}>
              {verificationStatus.message}
            </p>
            {verificationStatus.success && (
              <Button onClick={() => navigate('/login')} className={styles.marginTopMedium}>
                Proceed to Login
              </Button>
            )}
            {!verificationStatus.success && (
               <Button onClick={() => navigate('/register')} variant="secondary" className={styles.marginTopMedium}>
                Try Registering Again
              </Button>
            )}
          </>
        )}
      </div>
    </AuthLayout>
  );
};
export default VerifyEmailPage;