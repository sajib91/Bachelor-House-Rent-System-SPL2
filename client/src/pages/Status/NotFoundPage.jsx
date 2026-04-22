// src/pages/Status/NotFoundPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './StatusPages.module.css';
import Button from '../../components/common/Button/Button';
import { FaQuestionCircle } from 'react-icons/fa';

const NotFoundPage = () => {
  return (
    <div className={styles.statusContainer}>
      <FaQuestionCircle className={styles.statusIcon} />
      <h1 className={styles.statusTitle}>404 - Page Not Found</h1>
      <p className={styles.statusMessage}>
        Oops! The page you are looking for does not exist or may have been moved.
      </p>
      <Link to="/">
        <Button>Go to Homepage</Button>
      </Link>
    </div>
  );
};
export default NotFoundPage;