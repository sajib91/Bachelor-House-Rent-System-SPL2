// src/components/layout/AuthLayout.jsx
import React from 'react';
import styles from './AuthLayout.module.css';

const AuthLayout = ({ children }) => {
  return (
    <div className={styles.authPageContainer}>
      {/* <div className={styles.formWrapper}> */}
        {children}
      {/* </div> */}
    </div>
  );
};
export default AuthLayout;