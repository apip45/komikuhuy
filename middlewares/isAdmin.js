/**
 * ===========================================
 * AF-Komik V2 - Admin Authorization Middleware
 * ===========================================
 * 
 * Middleware to verify admin privileges.
 * Protects admin-only routes and functionality.
 * 
 * STRUCTURE ONLY - Authorization logic not implemented yet.
 * This will be completed in Phase 2 with full auth implementation.
 */

const logger = require('../config/logger');

/**
 * Check if user has admin privileges
 * Must be used AFTER isAuthenticated middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdmin = (req, res, next) => {
  // TODO: Implement actual admin check
  // This will verify:
  // 1. User is authenticated (should be done by isAuthenticated middleware)
  // 2. User has admin role in MongoDB database
  // 3. Admin privileges are still valid
  
  // Placeholder: Check if user has admin role in session
  if (req.session && req.session.userRole === 'admin') {
    // User is admin, proceed to next middleware
    logger.info(`Admin access granted for user ${req.session.userId}`);
    return next();
  }

  // User is not admin
  logger.warn(`Unauthorized admin access attempt by user ${req.session?.userId || 'unknown'}`);
  
  // Return 403 Forbidden
  return res.status(403).render('errors/403', {
    title: 'Access Denied',
    layout: 'layouts/main',
    message: 'You do not have permission to access this resource'
  });
};

/**
 * Check if user has admin privileges for API routes
 * Returns JSON error instead of rendering error page
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdminAPI = (req, res, next) => {
  // TODO: Implement actual admin check for API
  // This will verify admin role from session or token
  
  // Placeholder: Check if user has admin role in session
  if (req.session && req.session.userRole === 'admin') {
    return next();
  }

  // Return forbidden error for API
  return res.status(403).json({
    success: false,
    error: 'Admin privileges required',
    code: 'FORBIDDEN'
  });
};

module.exports = {
  isAdmin,
  isAdminAPI
};
