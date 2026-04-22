const crypto = require('crypto');
const User = require('../models/User');


// --- Controller for Email Verification ---
// @desc    Verify user's email address
// @route   GET /api/auth/verify-email/:token
// @access  Public (link from email)
exports.verifyEmail = async (req, res, next) => {
  const { token: rawTokenFromParams } = req.params;

  if (!rawTokenFromParams) {
    return res.status(400).json({ success: false, message: 'Verification token not provided.' });
  }

  // Hash the token from the URL params to match the one stored in DB
  const hashedToken = crypto
    .createHash('sha256')
    .update(rawTokenFromParams)
    .digest('hex');

  try {
    // Find user by the hashed token and check if token is not expired
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() }, // Check if token is still valid
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token. Please request a new one.' });
    }

    // Mark user as verified and clear verification token fields
    user.isVerified = true;
    user.verificationToken = undefined; // Or null
    user.verificationTokenExpires = undefined; // Or null
    await user.save({ validateBeforeSave: false }); // Skip validation if only updating these fields

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });

  } catch (error) {
    console.error('Email Verification Error:', error);
    next(error);
  }
};