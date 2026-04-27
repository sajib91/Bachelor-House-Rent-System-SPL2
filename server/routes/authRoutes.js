const express = require('express');
const router = express.Router(); // Create an Express router instance

// Import controller functions
const authController = require('../controllers/authController');
const verifyEmailController = require('../controllers/verifyEmailController');

// Import controller functions (we'll create these next)
// const {
//   registerUser,
//   loginUser,
//   // forgotPassword, // Will add later
//   // resetPassword,  // Will add later
//   // getCurrentUser, // Will add later
// } = require('../controllers/authController');

// const { verifyEmail } = require('../controllers/verifyEmailController'); // Updated import

// Import body for using it directly in routes
// const { body } = require('express-validator');

// Import input validation middleware
const { validateRegistration, validateLogin, validateResetPassword, validateForgotPassword} = require('../middleware/validationMiddleware');

// Import authentication middleware
const { getCurrentUser} = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware'); // Import auth middleware

// --- Define Authentication Routes ---

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, (req, res, next) => {
  authController.registerUser(req, res, next);
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token (login)
// @access  Public
router.post('/login', validateLogin, (req, res, next) => {
  authController.loginUser(req, res, next);
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user's details
// @access  Private
router.get('/me', protect, getCurrentUser); // Apply 'protect' middleware

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address using token from email link
// @access  Public
router.get('/verify-email/:token', verifyEmailController.verifyEmail);

// Example of an admin-only route
// @route   GET /api/auth/admin-dashboard-summary
// @desc    Get some admin data (example)
// @access  Private/Admin
router.get(
  '/admin-summary',
  protect,                          // First, ensure user is logged in
  authorizeRoles('Admin'),          // Then, ensure user is an Admin
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to the Admin Summary!',
      adminData: { users: 150, newSignupsToday: 5 } // Example data
    });
  }
);

// @route   POST /api/auth/forgot-password
// @desc    User requests a password reset email
// @access  Public
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);

// @route   POST /api/auth/resend-password-otp
// @desc    User requests a fresh password reset OTP
// @access  Public
router.post('/resend-password-otp', validateForgotPassword, authController.resendPasswordOtp);

// @route   POST /api/auth/reset-password/:token
// @desc    Set new password after verifying reset token
// @access  Public
router.post('/reset-password', validateResetPassword, authController.resetPassword);
router.post('/reset-password/:token', validateResetPassword, authController.resetPassword);

// @route   POST /api/auth/resend-verification-email
// @desc    Resend email verification link
// @access  Public
router.post('/resend-verification-email', authController.resendVerificationEmail);

// @route   GET /api/auth/admin/pending-verifications
// @desc    List pending user verification requests
// @access  Private/Admin
router.get('/admin/pending-verifications', protect, authorizeRoles('Admin'), authController.getPendingVerifications);

// @route   PATCH /api/auth/admin/users/:userId/verification
// @desc    Approve/reject user verification
// @access  Private/Admin
router.patch('/admin/users/:userId/verification', protect, authorizeRoles('Admin'), authController.reviewUserVerification);

// @route   GET /api/auth/admin/users
// @desc    List all users for moderation
// @access  Private/Admin
router.get('/admin/users', protect, authorizeRoles('Admin'), authController.getAllUsersForAdmin);

// @route   PATCH /api/auth/admin/users/:userId/ban
// @desc    Ban/unban user account
// @access  Private/Admin
router.patch('/admin/users/:userId/ban', protect, authorizeRoles('Admin'), authController.setUserBanStatus);

// @route   DELETE /api/auth/admin/users/:userId
// @desc    Delete user account
// @access  Private/Admin
router.delete('/admin/users/:userId', protect, authorizeRoles('Admin'), authController.deleteUserAccountByAdmin);

module.exports = router; // Export the router to be used in server.js