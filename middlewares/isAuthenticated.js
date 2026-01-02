/**
 * ===========================================
 * AF-Komik V2 - Authentication Middleware
 * ===========================================
 * 
 * Middleware to verify user authentication status.
 * Protects routes that require a logged-in user.
 * 
 * STRUCTURE ONLY - Authentication logic not implemented yet.
 * This will be completed in Phase 2 with full auth implementation.
 */

const logger = require('../config/logger');

/**
 * Check if user is authenticated
 * Redirects to login page if not authenticated
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAuthenticated = (req, res, next) => {
  // TODO: Implement actual authentication check
  // This will verify:
  // 1. Session exists and is valid
  // 2. User ID is stored in session
  // 3. User exists in MongoDB database
  
  // Placeholder: Check if user exists in session
  if (req.session && req.session.userId) {
    // User is authenticated, proceed to next middleware
    logger.info(`User ${req.session.userId} authenticated successfully`);
    return next();
  }

  // User not authenticated
  logger.warn('Unauthenticated access attempt');
  
  // Store the original URL for redirect after login
  req.session.returnTo = req.originalUrl;
  
  // Redirect to login page
  return res.redirect('/login');
};

/**
 * Check if user is authenticated for API routes
 * Returns JSON error instead of redirecting
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAuthenticatedAPI = (req, res, next) => {
  // TODO: Implement actual authentication check for API
  // This will verify:
  // 1. Session or token exists
  // 2. User is valid
  
  // Placeholder: Check if user exists in session
  if (req.session && req.session.userId) {
    return next();
  }

  // Return unauthorized error for API
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    code: 'UNAUTHORIZED'
  });
};

module.exports = {
  isAuthenticated,
  isAuthenticatedAPI
};
