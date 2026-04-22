// backend/middleware/validationMiddleware.js
const { body, validationResult } = require('express-validator');

// Helper to format validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({ field: err.path, message: err.msg })),
    });
  }
  next(); // If no errors, proceed to the next middleware/controller
};

// Validation rules for User Registration
exports.validateRegistration = [
  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 40 }).withMessage('Username must be between 3 and 40 characters.')
    .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can only contain letters, numbers, underscores, periods, and hyphens.'),

  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 80 }).withMessage('Full name must be between 2 and 80 characters.'),

  body().custom((_, { req }) => {
    if (!req.body.username && !req.body.fullName) {
      throw new Error('Full name or username is required.');
    }
    return true;
  }),

  // Email
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(), // Canonicalize email address

  // Password
   body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/\d/).withMessage('Password must contain at least one number.')
    .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character.'),


  body('phoneNumber')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 8, max: 20 }).withMessage('Phone number must be between 8 and 20 characters.'),


  // Role (optional, if provided, must be valid)
  body('role')
    .optional()
    .isIn(['Tenant', 'Landlord'])
    .withMessage('Invalid role specified. Choose Tenant or Landlord.'),

  body('verificationType')
    .optional()
    .isIn(['Student ID', 'NID', 'Passport', 'Other'])
    .withMessage('Invalid verification type.'),

  body().custom((_, { req }) => {
    const selectedRole = req.body.role || 'Tenant';
    const verificationType = req.body.verificationType || 'Student ID';

    if (selectedRole === 'Landlord' && verificationType !== 'NID') {
      throw new Error('Landlord registration requires NID verification.');
    }

    if (selectedRole === 'Tenant' && !['Student ID', 'NID'].includes(verificationType)) {
      throw new Error('Tenant registration requires Student ID or NID verification.');
    }

    return true;
  }),

  // FirstName (optional)
  body('firstName')
    .optional({ checkFalsy: true }) // Treat empty strings as absent
    .trim()
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters.'),

  // LastName (optional)
  body('lastName')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters.'),

  // After all validation rules, apply the error handler
  handleValidationErrors,
];

// Validation rules for User Login
exports.validateLogin = [
  body('email')
    .optional({ checkFalsy: true })
    .trim(),

  body('emailOrUsername')
    .optional({ checkFalsy: true })
    .trim(),

  body().custom((_, { req }) => {
    const identifier = req.body.email || req.body.emailOrUsername;
    if (!identifier) {
      throw new Error('Email/User ID is required.');
    }
    return true;
  }),

  body('role')
    .optional({ checkFalsy: true })
    .isIn(['Admin', 'Landlord', 'Tenant'])
    .withMessage('Invalid role. Choose Admin, Landlord, or Tenant.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),

  handleValidationErrors,
];

// Validation rules for Forgot Password
exports.validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  handleValidationErrors, // Apply the error handling middleware
];

// Validation rules for Reset Password
exports.validateResetPassword = [
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('otp')
    .optional({ checkFalsy: true })
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  body('newPassword') // Assuming the new password field in the request body is 'newPassword'
    .notEmpty().withMessage('New password is required.')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
    .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter.')
    .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter.')
    .matches(/\d/).withMessage('New password must contain at least one number.')
    .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/).withMessage('New password must contain at least one special character.'),
  body('confirmNewPassword') // Assuming you have a confirmation field
    .notEmpty().withMessage('Confirm new password is required.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password and confirm new password do not match.');
      }
      return true;
    }),
  handleValidationErrors, // Apply the error handling middleware
];

