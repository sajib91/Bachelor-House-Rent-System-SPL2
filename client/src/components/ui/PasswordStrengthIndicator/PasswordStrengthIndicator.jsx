import React from 'react';
import styles from './PasswordStrengthIndicator.module.css';

const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9\s]/)) score++; // Special character
    return score;
  };

  const strength = getStrength();
  let strengthText = 'Too Short';
  let strengthColor = styles.weak; // Default to weak or very weak

  if (strength === 0 && password && password.length > 0) strengthText = 'Very Weak';
  else if (strength === 1 && password.length < 8) strengthText = 'Too Short';
  else if (strength <= 2) { strengthText = 'Weak'; strengthColor = styles.weak; }
  else if (strength === 3) { strengthText = 'Medium'; strengthColor = styles.medium; }
  else if (strength === 4) { strengthText = 'Strong'; strengthColor = styles.strong; }
  else if (strength >= 5) { strengthText = 'Very Strong'; strengthColor = styles.veryStrong; }
  if (password.length > 0 && password.length < 8) {
    strengthText = 'Too Short';
    strengthColor = styles.tooShort;
  }


  if (!password) {
    return null; // Don't render if no password
  }

  return (
    <div className={styles.strengthContainer}>
      <div className={styles.strengthBar}>
        <div className={`${styles.strengthLevel} ${strengthColor}`} style={{ width: `${(strength / 5) * 100}%` }}></div>
      </div>
      <span className={`${styles.strengthText} ${strengthColor}`}>{strengthText}</span>
    </div>
  );
};
export default PasswordStrengthIndicator;