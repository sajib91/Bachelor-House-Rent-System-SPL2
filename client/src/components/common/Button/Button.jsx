import React from 'react';
import styles from './Button.module.css';

const Button = ({ children, type = 'button', variant = 'primary', onClick, disabled = false, className = '', ...props }) => {
  const buttonClasses = `
    ${styles.button}
    ${styles[variant]}
    ${className}
  `;
  return (
    <button type={type} className={buttonClasses.trim()} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  );
};
export default Button;