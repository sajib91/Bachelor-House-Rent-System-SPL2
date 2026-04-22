const User = require('../models/User'); // User model
const jwt = require('jsonwebtoken');    // For generating JWT
const dotenv = require('dotenv');       // To access JWT_SECRET from .env
const crypto = require('crypto');
const { assessDocumentVerification } = require('../utils/propertyIntelligence');

dotenv.config({ path: '../.env' }); // Ensure .env from backend root is loaded if not already

const sendEmail = require('../utils/emailService'); // Import your email service

const PASSWORD_RESET_GENERIC_MESSAGE = 'If an account with that email exists, a password reset OTP has been sent.';
const OTP_EXPIRES_MS = Number(process.env.PASSWORD_RESET_OTP_EXPIRES_MS || 10 * 60 * 1000);
const OTP_COOLDOWN_MS = Number(process.env.PASSWORD_RESET_OTP_COOLDOWN_MS || 60 * 1000);
const OTP_MAX_REQUESTS_PER_WINDOW = Number(process.env.PASSWORD_RESET_OTP_MAX_REQUESTS || 5);
const OTP_REQUEST_WINDOW_MS = Number(process.env.PASSWORD_RESET_OTP_WINDOW_MS || 15 * 60 * 1000);
const SYSTEM_ADMIN_USER_ID = process.env.SYSTEM_ADMIN_USER_ID || 'admin';
const SYSTEM_ADMIN_PASSWORD = process.env.SYSTEM_ADMIN_PASSWORD || 'admin@123';
const SYSTEM_ADMIN_TOKEN_SUBJECT = 'system-admin';

const buildUsername = (fullName, email) => {
  const seed = (fullName || email || 'tenant').toString().trim().toLowerCase();
  const slug = seed.replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24) || 'tenant';
  return `${slug}.${Date.now().toString(36).slice(-4)}`;
};

// --- Helper function to generate JWT ---
const generateToken = (userId, userRole) => {
  return jwt.sign(
    { id: userId, role: userRole }, // Payload: data to store in the token
    process.env.JWT_SECRET || 'bachelor-house-rent-system-dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Token expiration time
  );
};

const getOtpThrottleState = (user) => {
  const now = Date.now();

  const previousWindowStart = user.passwordResetOtpWindowStartedAt
    ? new Date(user.passwordResetOtpWindowStartedAt).getTime()
    : 0;

  const hasActiveWindow = previousWindowStart && now - previousWindowStart <= OTP_REQUEST_WINDOW_MS;
  const windowStart = hasActiveWindow ? previousWindowStart : now;
  const requestCount = hasActiveWindow ? Number(user.passwordResetOtpRequestCount || 0) : 0;

  const lastRequestedAt = user.passwordResetOtpRequestedAt
    ? new Date(user.passwordResetOtpRequestedAt).getTime()
    : 0;
  const retryAfterMs = lastRequestedAt ? OTP_COOLDOWN_MS - (now - lastRequestedAt) : 0;

  return {
    now,
    windowStart,
    requestCount,
    retryAfterMs: Math.max(0, retryAfterMs),
  };
};

const generatePasswordResetOtp = () => crypto.randomInt(100000, 999999).toString();

const sendPasswordResetOtpEmail = async (email, otp) => {
  const emailMessage = `
      <h2>Password Reset Request</h2>
      <p>You (or someone else) requested a password reset for your To-Let Globe account.</p>
      <p>Use this one-time code to reset your password:</p>
      <p style="font-size: 24px; font-weight: 700; letter-spacing: 0.2em;">${otp}</p>
      <p>This code is valid for ${Math.max(1, Math.floor(OTP_EXPIRES_MS / 60000))} minutes.</p>
      <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
    `;

  await sendEmail({
    email,
    subject: 'Password Reset Request - To-Let Globe',
    html: emailMessage,
    text: `Use this password reset code: ${otp}`,
  });
};

const issuePasswordResetOtp = async (user) => {
  const throttle = getOtpThrottleState(user);

  if (throttle.requestCount >= OTP_MAX_REQUESTS_PER_WINDOW) {
    return {
      blocked: true,
      statusCode: 429,
      message: 'Too many OTP requests. Please try again in a few minutes.',
    };
  }

  if (throttle.retryAfterMs > 0) {
    return {
      blocked: true,
      statusCode: 429,
      message: `Please wait ${Math.ceil(throttle.retryAfterMs / 1000)} seconds before requesting another OTP.`,
    };
  }

  const otp = generatePasswordResetOtp();
  user.passwordResetOtp = crypto.createHash('sha256').update(otp).digest('hex');
  user.passwordResetOtpExpires = throttle.now + OTP_EXPIRES_MS;
  user.passwordResetOtpRequestedAt = throttle.now;
  user.passwordResetOtpRequestCount = throttle.requestCount + 1;
  user.passwordResetOtpWindowStartedAt = throttle.windowStart;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save({ validateBeforeSave: false });

  await sendPasswordResetOtpEmail(user.email, otp);

  return { blocked: false };
};

// --- Controller for User Registration ---
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
  // Input validation will be handled by middleware before this controller is reached
  const { username, fullName, email, password, role, phoneNumber, verificationType, verificationDocumentUrl } = req.body;

  try {
    const normalizedRole = role || 'Tenant';
    if (!['Tenant', 'Landlord'].includes(normalizedRole)) {
      return res.status(400).json({ success: false, message: 'Only Tenant or Landlord registration is allowed.' });
    }

    if (normalizedRole === 'Landlord' && verificationType !== 'NID') {
      return res.status(400).json({ success: false, message: 'Landlord registration requires NID verification.' });
    }

    if (normalizedRole === 'Tenant' && !['Student ID', 'NID'].includes(verificationType || 'Student ID')) {
      return res.status(400).json({ success: false, message: 'Tenant registration requires Student ID or NID verification.' });
    }

    if (!verificationDocumentUrl) {
      return res.status(400).json({ success: false, message: 'Verification document upload is required.' });
    }

    // 1. Check if user (email or username) already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }
    const resolvedUsername = username || buildUsername(fullName, email);
    const existingUserByUsername = await User.findOne({ username: resolvedUsername });
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }
    if (phoneNumber) {
      const existingUserByPhone = await User.findOne({ phoneNumber });
      if (existingUserByPhone) {
        return res.status(400).json({ success: false, message: 'Phone number is already registered' });
      }
    }

    // 2. Create new user instance (password will be hashed by pre-save hook in User model)
    const newUser = new User({
      username: resolvedUsername,
      fullName: fullName || username,
      email,
      password, // Send plain password; model will hash it
      phoneNumber,
      role: normalizedRole,
      verificationType: verificationType || 'Student ID',
      verificationDocumentUrl,
      verificationStatus: 'Pending',
      isVerified: false,
    });

    // 3. Save the new user to the database as pending admin verification
    await newUser.save();

      res.status(201).json({
        success: true,
        message: 'Registration submitted successfully. Please wait for admin verification approval before login.',
        user: { // Send back some non-sensitive user info
          id: newUser._id,
          username: newUser.username,
          fullName: newUser.fullName,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          role: newUser.role,
          verificationStatus: newUser.verificationStatus,
        },
      });

      } catch (error) {
      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(val => val.message);
        return res.status(400).json({ success: false, message: messages.join(', ') });
      }
      console.error('Registration Error:', error);
      next(error); // Pass to global error handler
    }
};

// --- Controller for User Login ---
// @desc    Authenticate user and get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
  const { email, password, emailOrUsername, role } = req.body;

  try {
    // 1. Check if email and password are provided (basic check, validator middleware does more)
    if (!(email || emailOrUsername) || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email (or username) and password' });
    }

    const requestedRole = role || null;
    const identifier = (emailOrUsername || email || '').trim();

    if (requestedRole === 'Admin') {
      if (identifier !== SYSTEM_ADMIN_USER_ID || password !== SYSTEM_ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      }

      const token = generateToken(SYSTEM_ADMIN_TOKEN_SUBJECT, 'Admin');
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: SYSTEM_ADMIN_TOKEN_SUBJECT,
          username: SYSTEM_ADMIN_USER_ID,
          fullName: 'System Admin',
          email: `${SYSTEM_ADMIN_USER_ID}@system.local`,
          role: 'Admin',
          isVerified: true,
          verificationStatus: 'Verified',
          verificationType: 'NID',
        },
      });
    }

    const query = email
      ? { email }
      : emailOrUsername
        ? { $or: [{ email: emailOrUsername }, { username: emailOrUsername }, { phoneNumber: emailOrUsername }] }
        : null;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // 2. Find user by email, username, or phone number. Explicitly select password because it's `select: false` in schema.
    const user = await User.findOne(query).select('+password');

    // 3. If user not found or password doesn't match, send generic error
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' }); // Generic message
    }

    // 4. Compare entered password with stored hashed password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' }); // Generic message
    }

    if (requestedRole && requestedRole !== user.role) {
      return res.status(403).json({ success: false, message: `This account is not registered as ${requestedRole}.` });
    }

    if (['Tenant', 'Landlord'].includes(user.role)) {
      const currentVerificationStatus = user.verificationStatus || (user.isVerified ? 'Verified' : 'Pending');

      if (currentVerificationStatus !== 'Verified' || !user.isVerified) {
        const rejectionMessage = currentVerificationStatus === 'Rejected'
          ? 'Your account verification was rejected by admin. Please contact support.'
          : 'Your registration is pending admin verification approval. Please try again later.';

        return res.status(403).json({ success: false, message: rejectionMessage });
      }
    }

    // 5. (Optional but recommended) Check if account is verified
    // if (!user.isVerified) {
    //   return res.status(401).json({ success: false, message: 'Account not verified. Please check your email.' });
    // }

    // 6. User authenticated, generate JWT
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { // Send back some non-sensitive user info
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Login Error:', error);
    next(error); // Or res.status(500).json({ success: false, message: 'Server error during login' });
  }
};
// (getCurrentUser and other controllers will be added later)

// --- Controller for Forgot Password ---
// @desc    Initiate password reset process (send email with token)
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide an email address.' });
  }

  try {
    const user = await User.findOne({ email });

    // IMPORTANT: For security, always send a positive-sounding message,
    // whether the user exists or not, to prevent email enumeration attacks.
    if (!user) {
      // Log this attempt on the server if desired for monitoring
      console.warn(`Password reset attempt for non-existent email: ${email}`);
      return res.status(200).json({ success: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
    }

    // (Optional: Check if user is verified before allowing password reset)
    // if (!user.isVerified) {
    //   return res.status(400).json({ success: false, message: 'Please verify your email address first.'});
    // }

    try {
      const otpResult = await issuePasswordResetOtp(user);

      if (otpResult.blocked) {
        return res.status(otpResult.statusCode).json({ success: false, message: otpResult.message });
      }

      res.status(200).json({ success: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
    } catch (emailError) {
      console.error('Password Reset Email Sending Error:', emailError);
      res.status(200).json({ success: true, message: `${PASSWORD_RESET_GENERIC_MESSAGE} (Email sending may have issues)` });
    }

  } catch (error) {
    console.error('Forgot Password Error:', error);
    next(error);
  }
};

// --- Controller for Resend Password OTP ---
// @desc    Resend password reset OTP with cooldown and attempt limits
// @route   POST /api/auth/resend-password-otp
// @access  Public
exports.resendPasswordOtp = async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Please provide an email address.' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({ success: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
    }

    try {
      const otpResult = await issuePasswordResetOtp(user);

      if (otpResult.blocked) {
        return res.status(otpResult.statusCode).json({ success: false, message: otpResult.message });
      }

      return res.status(200).json({ success: true, message: PASSWORD_RESET_GENERIC_MESSAGE });
    } catch (emailError) {
      console.error('Resend Password OTP Email Error:', emailError);
      return res.status(200).json({ success: true, message: `${PASSWORD_RESET_GENERIC_MESSAGE} (Email sending may have issues)` });
    }
  } catch (error) {
    console.error('Resend Password OTP Error:', error);
    next(error);
  }
};

// --- Controller for Reset Password ---
// @desc    Reset user password after token verification
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    let user = null;

    if (req.body.email && req.body.otp) {
      const hashedOtp = crypto.createHash('sha256').update(req.body.otp).digest('hex');
      user = await User.findOne({
        email: req.body.email,
        passwordResetOtp: hashedOtp,
        passwordResetOtpExpires: { $gt: Date.now() },
      }).select('+passwordResetOtp +passwordResetOtpExpires');
    } else if (req.params.token) {
      const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
      user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      }).select('+passwordResetToken +passwordResetExpires');
    }

    if (!user) {
      return res.status(400).json({ success: false, message: req.body.otp ? 'OTP is invalid or has expired.' : 'Password reset token is invalid or has expired.' });
    }

    // 3. Set the new password (password hashing happens in User model pre-save hook)
    user.password = req.body.newPassword; // newPassword is from req.body, validated by middleware
    user.passwordResetToken = undefined; // Clear the token
    user.passwordResetExpires = undefined; // Clear the expiry
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpires = undefined;
    user.passwordResetOtpRequestedAt = undefined;
    user.passwordResetOtpRequestCount = 0;
    user.passwordResetOtpWindowStartedAt = undefined;

    await user.save(); // Save the user with the new password

    // 4. Optionally, generate a new token for immediate login after reset
    const newToken = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
      token: newToken, // Provide new token for convenience
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Reset Password Error:', error);
    next(error); // Pass to global error handler
  }
};

// @desc    Resend email verification link
// @route   POST /api/auth/resend-verification-email
// @access  Public
exports.resendVerificationEmail = async (req, res, next) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // If email is already verified, no need to resend
        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'Email is already verified.' });
        }

        // Generate a new verification token and expiry
        const verificationToken = user.getVerificationToken(); // Assuming this method generates and saves the hashed token
        await user.save(); // Save the user with the new token and expiry

        // Create the verification URL using the RAW token (for the link)
        // const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${verificationToken}`;

        const resendEmailMessage = `
            <h2>New Email Verification Link for Your Account</h2>
            <p>You requested a new email verification link for your To-Let Globe account.</p>
            <p>Please click the link below to verify your email address:</p>
            <p><a href="${verificationUrl}" target="_blank">Verify My Email Address</a></p>
            <p>This link is valid for 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        `;        
      
        // Send the email (this is where you'd call your email service)
        // For testing, you'll still be looking at Ethereal or your console.
        try {
            await sendEmail({
                email: user.email,
                subject: 'New Email Verification Link for Your Account',
                html: resendEmailMessage,
                message: `Please verify your email by clicking on this link: ${verificationUrl}`,
            });
            console.log(`New Email Verification URL sent to ${user.email}: ${verificationUrl}`);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            // Optionally, revert the token if email sending fails to prevent a valid but unsent token
            user.emailVerificationToken = undefined;
            user.emailVerificationTokenExpiry = undefined;
            await user.save();
            return next(new Error('Failed to send verification email. Please try again later.'));
        }

        res.status(200).json({ success: true, message: 'New verification email sent. Please check your inbox.' });

    } catch (error) {
        console.error('Error in resendVerificationEmail:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// --- Controller to Get Current Logged-in User ---
// @desc    Get current user's details (based on token)
// @route   GET /api/auth/me
// @access  Private (requires authentication)
exports.getCurrentUser = async (req, res, next) => {
  // req.user is populated by the 'protect' middleware
  try {
    // The user object (without password) is already attached by 'protect' middleware
    // If you needed to fetch more relations or do other logic, you could use req.user.id
    const user = req.user; // Already fetched and attached in protect middleware

    if (!user) { // Should not happen if protect middleware works correctly
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (String(user._id) === SYSTEM_ADMIN_TOKEN_SUBJECT || user.isSystemAdmin) {
      return res.status(200).json({
        success: true,
        user: {
          id: SYSTEM_ADMIN_TOKEN_SUBJECT,
          username: SYSTEM_ADMIN_USER_ID,
          fullName: 'System Admin',
          email: `${SYSTEM_ADMIN_USER_ID}@system.local`,
          role: 'Admin',
          isVerified: true,
          verificationStatus: 'Verified',
          verificationType: 'NID',
        },
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        verificationStatus: user.verificationStatus,
        verificationType: user.verificationType,
        verificationDocumentUrl: user.verificationDocumentUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Add other non-sensitive fields you want to return
      },
    });
  } catch (error) {
    console.error('Get Current User Error:', error);
    next(error);
  }
};

// @desc    Get users pending verification review
// @route   GET /api/auth/admin/pending-verifications
// @access  Private/Admin
exports.getPendingVerifications = async (req, res, next) => {
  try {
    const users = await User.find({ verificationStatus: 'Pending', role: { $in: ['Tenant', 'Landlord'] } })
      .select('fullName username email phoneNumber role verificationType verificationDocumentUrl verificationStatus createdAt')
      .sort({ createdAt: -1 });

    const enrichedUsers = users.map((userDoc) => {
      const user = userDoc.toObject();
      return {
        ...user,
        verificationInsights: assessDocumentVerification({
          url: user.verificationDocumentUrl,
          verificationType: user.verificationType,
          role: user.role,
        }),
      };
    });

    res.status(200).json({ success: true, users: enrichedUsers });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/reject a user verification
// @route   PATCH /api/auth/admin/users/:userId/verification
// @access  Private/Admin
exports.reviewUserVerification = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Verified', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Verified or Rejected.' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.verificationStatus = status;
    user.isVerified = status === 'Verified';
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `Verification ${status.toLowerCase()} successfully.`,
      user: {
        id: user._id,
        role: user.role,
        verificationStatus: user.verificationStatus,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};