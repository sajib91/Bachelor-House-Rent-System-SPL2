import React from 'react';
import styles from './InputField.module.css'; // Create this

const InputField = React.forwardRef(({ label, id, type = "text", icon, error, ...rest }, ref) => {
  return (
    <div className={styles.inputGroup}>
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.inputIcon}>{icon}</span>}
        <input
          id={id}
          type={type}
          className={`${styles.inputField} ${icon ? styles.inputWithIcon : ''} ${error ? styles.inputError : ''}`}
          ref={ref}
          {...rest}
        />
      </div>
      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
});
InputField.displayName = "InputField"; // For better debugging
export default InputField;