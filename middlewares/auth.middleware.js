/**
 * ===========================================
 * AF-Komik V2 - Authentication Middleware
 * ===========================================
 * 
 * Middleware to verify user authentication status.
 * Protects routes that require a logged-in user.
 * 
 * How it works:
 * 1. Checks if session exists and contains user data
 * 2. If authenticated, allows request to proceed (next())
 * 3. If not authenticated:
 *    - For web routes: redirects to login page
 *    - For API routes: returns 401 JSON response
 * 
 * Session Flow:
 * - User logs in → session.userId is set
 * - User makes request → this middleware checks session.userId
 * - Session expires → user must log in again
 * 
 * STRUCTURE ONLY - Full authentication logic will be implemented in Phase 2
 */

const logger = require('../config/logger');

/**
 * Check if user is authenticated (for web routes)
 * 
 * Usage:
 * router.get('/profile', isAuthenticated, profileController.getProfile);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAuthenticated = (req, res, next) => {
  console.log('[AUTH] Checking authentication status...');
  
  // TODO: Implement actual authentication check in Phase 2
  // This will verify:
  // 1. Session exists and is valid
  // 2. User ID is stored in session
  // 3. User exists in MongoDB database
  // 4. User account is active (not banned/deactivated)
  
  // Check if user ID exists in session
  if (req.session && req.session.userId) {
    console.log(`[AUTH] ✓ User authenticated: ${req.session.userId}`);
    logger.info(`User ${req.session.userId} authenticated successfully`);
    
    // User is authenticated, proceed to next middleware/route handler
    return next();
  }

  // User is not authenticated
  console.log('[AUTH] ✗ User not authenticated - redirecting to login');
  logger.warn(`Unauthenticated access attempt to: ${req.path}`);
  
  // Store the original URL so we can redirect back after login
  // This provides better UX - user ends up where they wanted to go
  req.session.returnTo = req.originalUrl;
  
  // Redirect to login page
  return res.redirect('/login');
};

/**
 * Check if user is authenticated (for API routes)
 * Returns JSON error instead of redirecting
 * 
 * Usage:
 * router.get('/api/user/profile', isAuthenticatedAPI, userController.getProfile);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAuthenticatedAPI = (req, res, next) => {
  console.log('[AUTH-API] Checking authentication status...');
  
  // TODO: Implement actual authentication check for API in Phase 2
  // This will also support:
  // - JWT token authentication for mobile apps
  // - API key authentication for integrations
  
  // Check if user ID exists in session
  if (req.session && req.session.userId) {
    console.log(`[AUTH-API] ✓ User authenticated: ${req.session.userId}`);
    return next();
  }

  // Return 401 Unauthorized error for API requests
  console.log('[AUTH-API] ✗ User not authenticated - returning 401');
  logger.warn(`Unauthenticated API access attempt to: ${req.path}`);
  
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    code: 'UNAUTHORIZED',
    message: 'You must be logged in to access this resource'
  });
};

module.exports = {
  isAuthenticated,
  isAuthenticatedAPI
};
