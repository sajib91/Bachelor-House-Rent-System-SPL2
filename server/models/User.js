// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      minlength: [3, 'Username must be at least 3 characters long'],
    },
    fullName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+.\S+/, 'Please use a valid email address'],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: ['Tenant', 'Landlord', 'Admin', 'Content Creator', 'User', 'Owner'],
        message: '{VALUE} is not a supported role',
      },
      default: 'Tenant',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['Pending', 'Verified', 'Rejected'],
      default: 'Pending',
    },
    verificationType: {
      type: String,
      enum: ['Student ID', 'NID', 'Passport', 'Other'],
      default: 'Student ID',
    },
    verificationDocumentUrl: {
      type: String,
      trim: true,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordResetOtp: {
      type: String,
      select: false,
    },
    passwordResetOtpExpires: {
      type: Date,
      select: false,
    },
    passwordResetOtpRequestedAt: {
      type: Date,
      select: false,
    },
    passwordResetOtpRequestCount: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordResetOtpWindowStartedAt: {
      type: Date,
      select: false,
    },
    profileSummary: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// --- Mongoose Middleware (Hooks) ---

// 1. Pre-save hook to hash password before saving a NEW user
//    or when the password field is modified.
userSchema.pre('save', async function (next) {
  // `this` refers to the current user document being saved
  if (!this.isModified('password')) {
    // If password hasn't been changed, move to the next middleware
    return next();
  }

  // Hash the password
  try {
    const salt = await bcrypt.genSalt(10); // Generate a salt (10 rounds is common)
    this.password = await bcrypt.hash(this.password, salt); // Hash password with salt
    next();
  } catch (error) {
    next(error); // Pass error to the next middleware/error handler
  }
});

// --- Mongoose Instance Methods ---

// 2. Method to compare entered password with hashed password in DB
userSchema.methods.comparePassword = async function (enteredPassword) {
  // `this.password` is the hashed password from the DB (needs to be selected if `select: false`)
  // Since `password` field has `select: false`, we need to ensure it's available
  // when calling this method. Or, re-fetch the user with the password field.
  // For now, assume the user object calling this method has the password.
  return await bcrypt.compare(enteredPassword, this.password);
};

// 3. Method to generate and set the email verification token
userSchema.methods.getVerificationToken = function() {
    // Generate a random 20-byte token (40 hex characters)
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Hash the token and set it to the schema field
    // Store only the hashed token in the database for security
    this.verificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

    // Set expiry for the token (e.g., 10 minutes from now)
    // The expiry time will be in milliseconds
    this.verificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Return the raw, unhashed token to be sent in the email
    // This is the token the user will receive in the URL
    return verificationToken;
};

// 4. Method to generate and set the password reset token
userSchema.methods.getResetPasswordToken = function() {
    // Generate a random 20-byte token (40 hex characters)
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash the token and set it to the schema field
    // Store only the hashed token in the database for security
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiry for the token (e.g., 10 minutes from now)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Return the raw, unhashed token to be sent in the email
    // This is the token the user will receive in the URL
    return resetToken;
};

// Create and export the User model
// Mongoose will create a collection named 'users' (pluralized, lowercase)
const User = mongoose.model('User', userSchema);

module.exports = User;
