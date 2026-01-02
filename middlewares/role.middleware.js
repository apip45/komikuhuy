/**
 * ===========================================
 * AF-Komik V2 - Role Authorization Middleware
 * ===========================================
 * 
 * Middleware functions to protect routes based on user roles.
 * Must be used AFTER authentication middleware.
 * 
 * Role System:
 * - 'user': Regular user with basic access
 * - 'admin': Administrator with full access
 * 
 * Usage Examples:
 * 
 * // Web routes (redirects with 403 error)
 * router.get('/admin', isAuthenticated, isAdmin, adminController.dashboard);
 * 
 * // API routes (returns 403 JSON)
 * router.delete('/api/comics/:id', isAuthenticatedAPI, isAdminAPI, comicController.delete);
 * 
 * // Custom role check
 * router.get('/mod', isAuthenticated, hasRole(['admin', 'moderator']), modController.panel);
 */

const logger = require('../config/logger');
const { forbidden } = require('../utils/apiResponse');

/**
 * Check if user is an admin (for Web routes)
 * 
 * Prerequisites:
 * - Must be used AFTER isAuthenticated middleware
 * - req.user must be set by isAuthenticated
 * 
 * Behavior:
 * - If admin: calls next() to continue
 * - If not admin: renders 403 error page
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdmin = (req, res, next) => {
  console.log('[ROLE] Checking admin status...');
  
  // Check if user exists on request (should be set by isAuthenticated)
  if (!req.user) {
    console.log('[ROLE] ✗ No user on request - auth middleware may not have run');
    logger.error('isAdmin called without user on request');
    return res.redirect('/login?error=' + encodeURIComponent('Please log in'));
  }
  
  // Check user role
  if (req.user.role !== 'admin') {
    console.log(`[ROLE] ✗ User ${req.user.username} is not an admin (role: ${req.user.role})`);
    logger.warn(`Unauthorized admin access attempt by: ${req.user.username} to ${req.path}`);
    
    // Render 403 forbidden page
    return res.status(403).render('errors/403', {
      title: '403 - Access Denied',
      message: 'You do not have permission to access this page.'
    });
  }
  
  console.log(`[ROLE] ✓ Admin access granted: ${req.user.username}`);
  logger.info(`Admin access: ${req.user.username} accessed ${req.path}`);
  next();
};

/**
 * Check if user is an admin (for API routes)
 * 
 * Prerequisites:
 * - Must be used AFTER isAuthenticatedAPI middleware
 * - req.user must be set by isAuthenticatedAPI
 * 
 * Behavior:
 * - If admin: calls next() to continue
 * - If not admin: returns 403 JSON response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdminAPI = (req, res, next) => {
  console.log('[ROLE-API] Checking admin status...');
  
  // Check if user exists on request
  if (!req.user) {
    console.log('[ROLE-API] ✗ No user on request');
    return forbidden(res, 'Authentication required');
  }
  
  // Check user role
  if (req.user.role !== 'admin') {
    console.log(`[ROLE-API] ✗ User ${req.user.username} is not an admin`);
    logger.warn(`API: Unauthorized admin access attempt by: ${req.user.username} to ${req.path}`);
    return forbidden(res, 'Admin access required');
  }
  
  console.log(`[ROLE-API] ✓ Admin access granted: ${req.user.username}`);
  logger.info(`API: Admin access: ${req.user.username} accessed ${req.path}`);
  next();
};

/**
 * Check if user has one of the specified roles (for Web routes)
 * 
 * Use this for more flexible role-based access control.
 * 
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 * 
 * Example:
 * router.get('/moderate', isAuthenticated, hasRole(['admin', 'moderator']), controller);
 */
const hasRole = (roles) => {
  return (req, res, next) => {
    console.log(`[ROLE] Checking if user has role: [${roles.join(', ')}]`);
    
    if (!req.user) {
      console.log('[ROLE] ✗ No user on request');
      return res.redirect('/login?error=' + encodeURIComponent('Please log in'));
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`[ROLE] ✗ User ${req.user.username} role ${req.user.role} not in [${roles.join(', ')}]`);
      logger.warn(`Unauthorized access: ${req.user.username} (${req.user.role}) to ${req.path}`);
      
      return res.status(403).render('errors/403', {
        title: '403 - Access Denied',
        message: 'You do not have permission to access this page.'
      });
    }
    
    console.log(`[ROLE] ✓ Role check passed: ${req.user.username} (${req.user.role})`);
    next();
  };
};

/**
 * Check if user has one of the specified roles (for API routes)
 * 
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
const hasRoleAPI = (roles) => {
  return (req, res, next) => {
    console.log(`[ROLE-API] Checking if user has role: [${roles.join(', ')}]`);
    
    if (!req.user) {
      console.log('[ROLE-API] ✗ No user on request');
      return forbidden(res, 'Authentication required');
    }
    
    if (!roles.includes(req.user.role)) {
      console.log(`[ROLE-API] ✗ User ${req.user.username} role ${req.user.role} not in [${roles.join(', ')}]`);
      logger.warn(`API: Unauthorized access: ${req.user.username} (${req.user.role}) to ${req.path}`);
      return forbidden(res, `Required role: ${roles.join(' or ')}`);
    }
    
    console.log(`[ROLE-API] ✓ Role check passed: ${req.user.username}`);
    next();
  };
};

module.exports = {
  isAdmin,
  isAdminAPI,
  hasRole,
  hasRoleAPI
};
