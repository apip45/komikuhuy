/**
 * ===========================================
 * AF-Komik V2 - Authentication Controller
 * ===========================================
 * 
 * Handles all authentication-related operations:
 * - User registration
 * - User login
 * - User logout
 * - Session management
 * 
 * This controller provides both:
 * - Web routes (EJS views with redirects)
 * - API routes (JSON responses)
 * 
 * Security Features:
 * - Password hashing with bcrypt (handled in User model)
 * - Session-based authentication
 * - Input validation
 * - Brute force protection (future)
 * 
 * Session Data Structure:
 * req.session = {
 *   userId: ObjectId,      // MongoDB user ID
 *   userRole: string,      // 'user' or 'admin'
 *   username: string,      // User's username
 *   returnTo: string       // URL to redirect after login (optional)
 * }
 */

const User = require('../models/mongo/User');
const logger = require('../config/logger');
const { 
  successResponse, 
  errorResponse, 
  created, 
  badRequest, 
  unauthorized, 
  conflict, 
  serverError 
} = require('../utils/apiResponse');

// ===========================================
// WEB CONTROLLERS (EJS Views)
// ===========================================

/**
 * Render login page
 * 
 * @route GET /login
 * @access Public
 */
const getLoginPage = (req, res) => {
  console.log('[AUTH] Rendering login page');
  
  // If already logged in, redirect to home or intended destination
  if (req.session && req.session.userId) {
    console.log('[AUTH] User already logged in, redirecting to home');
    return res.redirect('/');
  }
  
  // Get any flash messages or errors
  const error = req.query.error || null;
  const success = req.query.success || null;
  
  res.render('pages/login', {
    title: 'Login - AF-Komik',
    error: error,
    success: success
  });
};

/**
 * Render registration page
 * 
 * @route GET /register
 * @access Public
 */
const getRegisterPage = (req, res) => {
  console.log('[AUTH] Rendering registration page');
  
  // If already logged in, redirect to home
  if (req.session && req.session.userId) {
    console.log('[AUTH] User already logged in, redirecting to home');
    return res.redirect('/');
  }
  
  // Get any flash messages or errors
  const error = req.query.error || null;
  
  res.render('pages/register', {
    title: 'Register - AF-Komik',
    error: error
  });
};

/**
 * Handle user registration (Web)
 * 
 * @route POST /register
 * @access Public
 * 
 * Flow:
 * 1. Validate input fields
 * 2. Check if email/username already exists
 * 3. Create new user (password hashed automatically)
 * 4. Log in the user (create session)
 * 5. Redirect to home page
 */
const registerWeb = async (req, res) => {
  console.log('[AUTH] Processing web registration...');
  
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // ===========================================
    // Input Validation
    // ===========================================
    
    // Check required fields
    if (!username || !email || !password || !confirmPassword) {
      console.log('[AUTH] ✗ Registration failed: Missing required fields');
      return res.redirect('/register?error=' + encodeURIComponent('All fields are required'));
    }
    
    // Check password confirmation
    if (password !== confirmPassword) {
      console.log('[AUTH] ✗ Registration failed: Passwords do not match');
      return res.redirect('/register?error=' + encodeURIComponent('Passwords do not match'));
    }
    
    // Check password length
    if (password.length < 8) {
      console.log('[AUTH] ✗ Registration failed: Password too short');
      return res.redirect('/register?error=' + encodeURIComponent('Password must be at least 8 characters'));
    }
    
    // ===========================================
    // Check Existing Users
    // ===========================================
    
    // Check if email already exists
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      console.log('[AUTH] ✗ Registration failed: Email already exists');
      logger.warn(`Registration attempt with existing email: ${email}`);
      return res.redirect('/register?error=' + encodeURIComponent('Email is already registered'));
    }
    
    // Check if username already exists
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      console.log('[AUTH] ✗ Registration failed: Username already exists');
      logger.warn(`Registration attempt with existing username: ${username}`);
      return res.redirect('/register?error=' + encodeURIComponent('Username is already taken'));
    }
    
    // ===========================================
    // Create New User
    // ===========================================
    
    console.log(`[AUTH] Creating new user: ${username}`);
    
    const newUser = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password, // Will be hashed by pre-save middleware
      role: 'user',
      isActive: true,
      profile: {
        displayName: username
      }
    });
    
    console.log(`[AUTH] ✓ User created successfully: ${newUser._id}`);
    logger.info(`New user registered: ${username} (${email})`);
    
    // ===========================================
    // Create Session (Auto Login)
    // ===========================================
    
    req.session.userId = newUser._id;
    req.session.userRole = newUser.role;
    req.session.username = newUser.username;
    
    console.log(`[AUTH] ✓ Session created for new user: ${newUser._id}`);
    logger.info(`Session created for user: ${username}`);
    
    // Update last login
    await newUser.updateLastLogin();
    
    // Redirect to home page
    res.redirect('/?success=' + encodeURIComponent('Welcome to AF-Komik!'));
    
  } catch (error) {
    console.error('[AUTH] ✗ Registration error:', error.message);
    logger.error('Registration error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.redirect('/register?error=' + encodeURIComponent(messages.join(', ')));
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.redirect('/register?error=' + encodeURIComponent('Username or email already exists'));
    }
    
    res.redirect('/register?error=' + encodeURIComponent('Registration failed. Please try again.'));
  }
};

/**
 * Handle user login (Web)
 * 
 * @route POST /login
 * @access Public
 * 
 * Flow:
 * 1. Validate input
 * 2. Find user by email or username
 * 3. Verify password
 * 4. Create session
 * 5. Redirect to intended destination or home
 */
const loginWeb = async (req, res) => {
  console.log('[AUTH] Processing web login...');
  
  try {
    const { email, password, remember } = req.body;
    
    // ===========================================
    // Input Validation
    // ===========================================
    
    if (!email || !password) {
      console.log('[AUTH] ✗ Login failed: Missing credentials');
      return res.redirect('/login?error=' + encodeURIComponent('Email and password are required'));
    }
    
    // ===========================================
    // Find User
    // ===========================================
    
    // Find user by email or username (email field accepts both)
    console.log(`[AUTH] Looking up user: ${email}`);
    const user = await User.findByCredentials(email);
    
    if (!user) {
      console.log('[AUTH] ✗ Login failed: User not found');
      logger.warn(`Failed login attempt - user not found: ${email}`);
      return res.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
    }
    
    // Check if account is active
    if (!user.isActive) {
      console.log('[AUTH] ✗ Login failed: Account deactivated');
      logger.warn(`Login attempt on deactivated account: ${email}`);
      return res.redirect('/login?error=' + encodeURIComponent('Your account has been deactivated'));
    }
    
    // ===========================================
    // Verify Password
    // ===========================================
    
    console.log('[AUTH] Verifying password...');
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('[AUTH] ✗ Login failed: Invalid password');
      logger.warn(`Failed login attempt - wrong password: ${email}`);
      return res.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
    }
    
    // ===========================================
    // Create Session
    // ===========================================
    
    console.log(`[AUTH] ✓ Password verified for user: ${user.username}`);
    
    // Store user data in session
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    
    // Handle "Remember Me" option
    if (remember) {
      // Extend session to 30 days
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      console.log('[AUTH] Remember me enabled - session extended to 30 days');
    }
    
    console.log(`[AUTH] ✓ Session created: ${user._id}`);
    logger.info(`User logged in: ${user.username} (${user.email})`);
    
    // Update last login timestamp
    await user.updateLastLogin();
    
    // ===========================================
    // Redirect
    // ===========================================
    
    // Redirect to original destination or home
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo; // Clean up
    
    console.log(`[AUTH] Redirecting to: ${returnTo}`);
    res.redirect(returnTo);
    
  } catch (error) {
    console.error('[AUTH] ✗ Login error:', error.message);
    logger.error('Login error:', error);
    res.redirect('/login?error=' + encodeURIComponent('Login failed. Please try again.'));
  }
};

/**
 * Handle user logout (Web)
 * 
 * @route POST /logout
 * @access Private (requires authentication)
 * 
 * Flow:
 * 1. Log the logout action
 * 2. Destroy session
 * 3. Clear session cookie
 * 4. Redirect to home page
 */
const logoutWeb = (req, res) => {
  const username = req.session.username || 'Unknown';
  const userId = req.session.userId;
  
  console.log(`[AUTH] Processing logout for user: ${username}`);
  
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error('[AUTH] ✗ Error destroying session:', err.message);
      logger.error('Logout error:', err);
      return res.redirect('/?error=' + encodeURIComponent('Logout failed'));
    }
    
    console.log(`[AUTH] ✓ Session destroyed for user: ${username} (${userId})`);
    logger.info(`User logged out: ${username}`);
    
    // Clear the session cookie
    res.clearCookie('connect.sid');
    
    // Redirect to home page with success message
    res.redirect('/login?success=' + encodeURIComponent('You have been logged out'));
  });
};

/**
 * Render user profile page
 * 
 * @route GET /profile
 * @access Private (requires authentication)
 */
const getProfilePage = async (req, res) => {
  console.log('[AUTH] Rendering profile page');
  
  try {
    // Get user data from database
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      console.log('[AUTH] ✗ User not found for profile');
      return res.redirect('/login?error=' + encodeURIComponent('Please log in again'));
    }
    
    res.render('pages/profile', {
      title: 'Profile - AF-Komik',
      user: user.getPublicProfile()
    });
    
  } catch (error) {
    console.error('[AUTH] ✗ Error loading profile:', error.message);
    logger.error('Profile page error:', error);
    res.redirect('/?error=' + encodeURIComponent('Error loading profile'));
  }
};

// ===========================================
// API CONTROLLERS (JSON Responses)
// ===========================================

/**
 * Register new user (API)
 * 
 * @route POST /api/auth/register
 * @access Public
 * @returns {Object} JSON response with user data
 */
const registerAPI = async (req, res) => {
  console.log('[AUTH-API] Processing API registration...');
  
  try {
    const { username, email, password } = req.body;
    
    // ===========================================
    // Input Validation
    // ===========================================
    
    if (!username || !email || !password) {
      console.log('[AUTH-API] ✗ Registration failed: Missing fields');
      return badRequest(res, 'All fields are required', {
        username: !username ? 'Username is required' : null,
        email: !email ? 'Email is required' : null,
        password: !password ? 'Password is required' : null
      });
    }
    
    if (password.length < 8) {
      console.log('[AUTH-API] ✗ Registration failed: Password too short');
      return badRequest(res, 'Password must be at least 8 characters');
    }
    
    // ===========================================
    // Check Existing Users
    // ===========================================
    
    const emailExists = await User.emailExists(email);
    if (emailExists) {
      console.log('[AUTH-API] ✗ Registration failed: Email exists');
      return conflict(res, 'Email is already registered', { email: 'Email is already registered' });
    }
    
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      console.log('[AUTH-API] ✗ Registration failed: Username exists');
      return conflict(res, 'Username is already taken', { username: 'Username is already taken' });
    }
    
    // ===========================================
    // Create User
    // ===========================================
    
    const newUser = await User.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: 'user',
      isActive: true,
      profile: {
        displayName: username
      }
    });
    
    console.log(`[AUTH-API] ✓ User created: ${newUser._id}`);
    logger.info(`API: New user registered: ${username} (${email})`);
    
    // ===========================================
    // Create Session
    // ===========================================
    
    req.session.userId = newUser._id;
    req.session.userRole = newUser.role;
    req.session.username = newUser.username;
    
    await newUser.updateLastLogin();
    
    console.log(`[AUTH-API] ✓ Session created for: ${newUser.username}`);
    
    return created(res, 'User registered successfully', {
      user: newUser.getPublicProfile()
    });
    
  } catch (error) {
    console.error('[AUTH-API] ✗ Registration error:', error.message);
    logger.error('API Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      return badRequest(res, 'Validation failed', errors);
    }
    
    if (error.code === 11000) {
      return conflict(res, 'Username or email already exists');
    }
    
    return serverError(res, 'Registration failed');
  }
};

/**
 * Login user (API)
 * 
 * @route POST /api/auth/login
 * @access Public
 * @returns {Object} JSON response with user data
 */
const loginAPI = async (req, res) => {
  console.log('[AUTH-API] Processing API login...');
  
  try {
    const { email, password } = req.body;
    
    // ===========================================
    // Input Validation
    // ===========================================
    
    if (!email || !password) {
      console.log('[AUTH-API] ✗ Login failed: Missing credentials');
      return badRequest(res, 'Email and password are required');
    }
    
    // ===========================================
    // Find and Verify User
    // ===========================================
    
    const user = await User.findByCredentials(email);
    
    if (!user) {
      console.log('[AUTH-API] ✗ Login failed: User not found');
      logger.warn(`API: Failed login - user not found: ${email}`);
      return unauthorized(res, 'Invalid email or password');
    }
    
    if (!user.isActive) {
      console.log('[AUTH-API] ✗ Login failed: Account deactivated');
      return unauthorized(res, 'Your account has been deactivated');
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('[AUTH-API] ✗ Login failed: Invalid password');
      logger.warn(`API: Failed login - wrong password: ${email}`);
      return unauthorized(res, 'Invalid email or password');
    }
    
    // ===========================================
    // Create Session
    // ===========================================
    
    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.username = user.username;
    
    await user.updateLastLogin();
    
    console.log(`[AUTH-API] ✓ Login successful: ${user.username}`);
    logger.info(`API: User logged in: ${user.username}`);
    
    return successResponse(res, 200, 'Login successful', {
      user: user.getPublicProfile()
    });
    
  } catch (error) {
    console.error('[AUTH-API] ✗ Login error:', error.message);
    logger.error('API Login error:', error);
    return serverError(res, 'Login failed');
  }
};

/**
 * Logout user (API)
 * 
 * @route POST /api/auth/logout
 * @access Private
 * @returns {Object} JSON response
 */
const logoutAPI = (req, res) => {
  const username = req.session.username || 'Unknown';
  
  console.log(`[AUTH-API] Processing API logout for: ${username}`);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('[AUTH-API] ✗ Logout error:', err.message);
      logger.error('API Logout error:', err);
      return serverError(res, 'Logout failed');
    }
    
    console.log(`[AUTH-API] ✓ Logout successful: ${username}`);
    logger.info(`API: User logged out: ${username}`);
    
    res.clearCookie('connect.sid');
    
    return successResponse(res, 200, 'Logged out successfully');
  });
};

/**
 * Get current user (API)
 * 
 * @route GET /api/auth/me
 * @access Private
 * @returns {Object} JSON response with user data
 */
const getCurrentUser = async (req, res) => {
  console.log('[AUTH-API] Getting current user...');
  
  try {
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      console.log('[AUTH-API] ✗ User not found');
      return unauthorized(res, 'User not found');
    }
    
    console.log(`[AUTH-API] ✓ Current user: ${user.username}`);
    
    return successResponse(res, 200, 'User retrieved successfully', {
      user: user.getPublicProfile()
    });
    
  } catch (error) {
    console.error('[AUTH-API] ✗ Get user error:', error.message);
    logger.error('API Get user error:', error);
    return serverError(res, 'Failed to get user data');
  }
};

// ===========================================
// Export Controllers
// ===========================================

module.exports = {
  // Web controllers
  getLoginPage,
  getRegisterPage,
  registerWeb,
  loginWeb,
  logoutWeb,
  getProfilePage,
  
  // API controllers
  registerAPI,
  loginAPI,
  logoutAPI,
  getCurrentUser
};
