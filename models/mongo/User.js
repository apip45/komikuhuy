/**
 * ===========================================
 * AF-Komik V2 - User Model (MongoDB)
 * ===========================================
 * 
 * User model for authentication and user data.
 * Stored in MongoDB Atlas.
 * 
 * Fields:
 * - username: Unique username
 * - email: Unique email address
 * - password: Hashed password
 * - role: User role (user, admin)
 * - createdAt: Account creation date
 * - updatedAt: Last update date
 * 
 * STRUCTURE ONLY - Implementation pending Phase 2
 */

const mongoose = require('mongoose');

// User schema definition
const userSchema = new mongoose.Schema({
  // Username - unique identifier chosen by user
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },

  // Email - unique email address
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },

  // Password - hashed using bcrypt
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },

  // User role - for authorization
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  // Email verification status
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // Profile information
  profile: {
    avatar: {
      type: String,
      default: null
    },
    displayName: {
      type: String,
      default: null
    }
  },

  // Password reset fields
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Email verification fields
  emailVerificationToken: String,
  emailVerificationExpires: Date

}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// TODO: Add pre-save hook for password hashing
// TODO: Add method for password comparison
// TODO: Add method for generating password reset token
// TODO: Add method for generating email verification token

// Create and export the model
const User = mongoose.model('User', userSchema);

module.exports = User;
