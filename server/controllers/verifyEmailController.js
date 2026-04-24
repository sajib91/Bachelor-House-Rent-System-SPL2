const crypto = require('crypto');
const getDbClient = require('../config/dbClient');


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
    const db = getDbClient();
    const user = await db.user.findFirst({
      where: {
        verificationToken: hashedToken,
        verificationTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token. Please request a new one.' });
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });

  } catch (error) {
    console.error('Email Verification Error:', error);
    next(error);
  }
};