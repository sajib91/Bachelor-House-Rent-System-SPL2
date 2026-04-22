// src/pages/Status/UnauthorizedPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './StatusPages.module.css';
import Button from '../../components/common/Button/Button';
import { FaUserLock } from 'react-icons/fa';

const UnauthorizedPage = () => {
  return (
    <div className={styles.statusContainer}>
      <FaUserLock className={`${styles.statusIcon} ${styles.statusIconError}`} />
      <h1 className={styles.statusTitle}>Access Denied</h1>
      <p className={styles.statusMessage}>
        Sorry, you do not have the necessary permissions to access this page.
      </p>
      <Link to="/">
        <Button variant="secondary">Go to Homepage</Button>
      </Link>
    </div>
  );
};
export default UnauthorizedPage;