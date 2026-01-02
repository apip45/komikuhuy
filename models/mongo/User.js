/**
 * ===========================================
 * AF-Komik V2 - User Model (MongoDB)
 * ===========================================
 * 
 * User model for authentication and user management.
 * Stored in MongoDB Atlas.
 * 
 * Features:
 * - Secure password hashing with bcrypt
 * - Password comparison method for authentication
 * - Role-based access control (user, admin)
 * - Account status tracking (active/inactive)
 * - Email verification support (optional)
 * 
 * Security:
 * - Passwords are hashed using bcrypt with salt rounds of 12
 * - Password field is excluded from query results by default
 * - Password reset and email verification tokens supported
 * 
 * Indexes:
 * - email: Unique index for fast lookup during login
 * - username: Unique index for fast lookup and validation
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ===========================================
// Constants for password hashing
// ===========================================

/**
 * BCRYPT_SALT_ROUNDS: Number of salt rounds for bcrypt hashing
 * 
 * Why 12 salt rounds?
 * - Lower values (8-10): Faster but less secure
 * - Higher values (14+): More secure but slower
 * - 12 is a good balance between security and performance
 * - Each increment doubles the computation time
 * 
 * Approximate hashing times:
 * - 10 rounds: ~65ms
 * - 12 rounds: ~260ms (recommended)
 * - 14 rounds: ~1s
 */
const BCRYPT_SALT_ROUNDS = 12;

// ===========================================
// User Schema Definition
// ===========================================

const userSchema = new mongoose.Schema({
  /**
   * Username - unique identifier chosen by the user
   * 
   * Validation rules:
   * - Required field
   * - Must be unique across all users
   * - 3-20 characters long
   * - Only alphanumeric characters and underscores allowed
   * - Automatically trimmed of whitespace
   */
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
    match: [
      /^[a-zA-Z0-9_]+$/,
      'Username can only contain letters, numbers, and underscores'
    ]
  },

  /**
   * Email - unique email address for the user
   * 
   * Validation rules:
   * - Required field
   * - Must be unique across all users
   * - Must be a valid email format
   * - Automatically converted to lowercase
   * - Automatically trimmed of whitespace
   */
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\S+@\S+\.\S+$/,
      'Please enter a valid email address'
    ]
  },

  /**
   * Password - securely hashed user password
   * 
   * Security features:
   * - Minimum 8 characters required
   * - Hashed using bcrypt before storage
   * - Excluded from query results by default (select: false)
   * - Never stored in plain text
   * 
   * To include password in query:
   * User.findOne({ email }).select('+password')
   */
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Security: don't include password in query results
  },

  /**
   * Role - user role for authorization
   * 
   * Available roles:
   * - 'user': Regular user (default)
   * - 'admin': Administrator with full access
   * 
   * Used by:
   * - isAdmin middleware for route protection
   * - Role-based feature visibility
   */
  role: {
    type: String,
    enum: {
      values: ['user', 'admin'],
      message: 'Role must be either user or admin'
    },
    default: 'user'
  },

  /**
   * Account Status - whether the account is active
   * 
   * Use cases:
   * - Deactivated accounts cannot log in
   * - Soft delete - mark inactive instead of deleting
   * - Admin can reactivate accounts
   */
  isActive: {
    type: Boolean,
    default: true
  },

  /**
   * Email Verification Status
   * 
   * Future use:
   * - Restrict features for unverified users
   * - Send verification email on registration
   */
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  /**
   * User Profile - additional profile information
   * 
   * Fields:
   * - avatar: URL to profile picture
   * - displayName: Name shown on profile (can differ from username)
   */
  profile: {
    avatar: {
      type: String,
      default: null
    },
    displayName: {
      type: String,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
      default: null
    }
  },

  /**
   * Password Reset Fields
   * 
   * Used for forgot password functionality:
   * - passwordResetToken: Hashed token sent to user
   * - passwordResetExpires: Token expiration time
   */
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },

  /**
   * Email Verification Fields
   * 
   * Used for email verification functionality:
   * - emailVerificationToken: Token sent to user's email
   * - emailVerificationExpires: Token expiration time
   */
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },

  /**
   * Last Login Timestamp
   * 
   * Tracks when the user last logged in successfully
   */
  lastLoginAt: {
    type: Date,
    default: null
  }

}, {
  // ===========================================
  // Schema Options
  // ===========================================
  
  /**
   * timestamps: Automatically manage createdAt and updatedAt
   * - createdAt: Set when document is first created
   * - updatedAt: Updated whenever document is modified
   */
  timestamps: true,
  
  /**
   * toJSON/toObject: Include virtual fields when converting
   */
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===========================================
// Indexes for Performance
// ===========================================

/**
 * Indexes improve query performance for frequently accessed fields
 * 
 * Note: email and username already have indexes via unique: true in schema
 * We only add additional indexes here that aren't already created
 */
userSchema.index({ role: 1 }); // For admin user queries

// ===========================================
// Pre-save Middleware: Password Hashing
// ===========================================

/**
 * Hash password before saving to database
 * 
 * This middleware runs before every save() operation.
 * It automatically hashes the password if it has been modified.
 * 
 * How bcrypt works:
 * 1. Generate a salt (random string)
 * 2. Combine password with salt
 * 3. Hash the combination multiple times (based on salt rounds)
 * 4. Result is a string containing: algorithm, salt rounds, salt, and hash
 * 
 * Example bcrypt output:
 * $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.s/Q3fRqG0VJ.Sq
 * ^^^^  ^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 * |     |  |-> Hash (31 chars)
 * |     |-> Salt (22 chars)
 * |-> Algorithm + Salt Rounds ($2b$12$)
 */
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  // This prevents re-hashing on every save
  if (!this.isModified('password')) {
    return next();
  }

  try {
    console.log('[USER MODEL] Hashing password for user:', this.username || this.email);
    
    // Generate salt and hash password
    // bcrypt.hash() combines salt generation and hashing in one step
    const hashedPassword = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
    
    // Replace plain text password with hashed version
    this.password = hashedPassword;
    
    console.log('[USER MODEL] ✓ Password hashed successfully');
    next();
  } catch (error) {
    console.error('[USER MODEL] ✗ Error hashing password:', error.message);
    next(error);
  }
});

// ===========================================
// Instance Methods
// ===========================================

/**
 * Compare password for authentication
 * 
 * This method compares a plain text password with the stored hash.
 * Used during login to verify the user's password.
 * 
 * How bcrypt.compare() works:
 * 1. Extract salt from stored hash
 * 2. Hash the candidate password with the same salt
 * 3. Compare the resulting hash with stored hash
 * 4. Return true if they match, false otherwise
 * 
 * @param {string} candidatePassword - Plain text password to check
 * @returns {Promise<boolean>} - True if password matches, false otherwise
 * 
 * Usage:
 * const user = await User.findOne({ email }).select('+password');
 * const isMatch = await user.comparePassword(inputPassword);
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('[USER MODEL] Comparing password for user:', this.username || this._id);
    
    // bcrypt.compare() is timing-safe to prevent timing attacks
    // It takes the same amount of time regardless of where the comparison fails
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    
    console.log(`[USER MODEL] Password comparison result: ${isMatch ? 'Match' : 'No match'}`);
    return isMatch;
  } catch (error) {
    console.error('[USER MODEL] ✗ Error comparing password:', error.message);
    throw error;
  }
};

/**
 * Update last login timestamp
 * 
 * Called after successful login to track user activity.
 * 
 * @returns {Promise<User>} - Updated user document
 */
userSchema.methods.updateLastLogin = async function() {
  this.lastLoginAt = new Date();
  return this.save({ validateBeforeSave: false });
};

/**
 * Get public profile (safe to expose)
 * 
 * Returns user data without sensitive fields.
 * Used for API responses and client-side display.
 * 
 * @returns {Object} - Safe user data
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    profile: this.profile,
    isEmailVerified: this.isEmailVerified,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt
  };
};

// ===========================================
// Static Methods
// ===========================================

/**
 * Find user by email and include password field
 * 
 * Used for authentication when password comparison is needed.
 * 
 * @param {string} email - User's email address
 * @returns {Promise<User|null>} - User with password field included
 */
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

/**
 * Find user by username or email
 * 
 * Used for login when user can enter either username or email.
 * 
 * @param {string} identifier - Username or email
 * @returns {Promise<User|null>} - User with password field included
 */
userSchema.statics.findByCredentials = function(identifier) {
  const isEmail = identifier.includes('@');
  const query = isEmail 
    ? { email: identifier.toLowerCase() }
    : { username: identifier };
  
  return this.findOne(query).select('+password');
};

/**
 * Check if email is already registered
 * 
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} - True if email exists
 */
userSchema.statics.emailExists = async function(email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

/**
 * Check if username is already taken
 * 
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} - True if username exists
 */
userSchema.statics.usernameExists = async function(username) {
  const user = await this.findOne({ username });
  return !!user;
};

// ===========================================
// Create and Export Model
// ===========================================

const User = mongoose.model('User', userSchema);

module.exports = User;
