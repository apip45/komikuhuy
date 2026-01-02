/**
 * ===========================================
 * AF-Komik V2 - Role Authorization Middleware
 * ===========================================
 * 
 * Middleware to verify user role and permissions.
 * Protects admin-only routes and functionality.
 * 
 * How it works:
 * 1. Must be used AFTER isAuthenticated middleware
 * 2. Checks user role stored in session
 * 3. If user has required role, allows request to proceed
 * 4. If user lacks required role:
 *    - For web routes: shows 403 Forbidden page
 *    - For API routes: returns 403 JSON response
 * 
 * User Roles:
 * - 'user': Regular user (default)
 * - 'admin': Administrator with full access
 * 
 * STRUCTURE ONLY - Full role logic will be implemented in Phase 2
 */

const logger = require('../config/logger');

/**
 * Check if user has admin role (for web routes)
 * Must be used AFTER isAuthenticated middleware
 * 
 * Usage:
 * router.get('/admin/dashboard', isAuthenticated, isAdmin, adminController.getDashboard);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdmin = (req, res, next) => {
  console.log('[ROLE] Checking admin privileges...');
  
  // TODO: Implement actual role check in Phase 2
  // This will verify:
  // 1. User is already authenticated (session.userId exists)
  // 2. User has admin role in MongoDB database
  // 3. Admin privileges are still valid (not revoked)
  
  // Get user ID from session for logging
  const userId = req.session?.userId || 'unknown';
  
  // Check if user has admin role in session
  if (req.session && req.session.userRole === 'admin') {
    console.log(`[ROLE] ✓ Admin access granted for user: ${userId}`);
    logger.info(`Admin access granted for user ${userId}`);
    
    // User is admin, proceed to next middleware/route handler
    return next();
  }

  // User is not admin
  console.log(`[ROLE] ✗ Admin access denied for user: ${userId}`);
  logger.warn(`Unauthorized admin access attempt by user ${userId} to: ${req.path}`);
  
  // Return 403 Forbidden error page
  return res.status(403).render('errors/403', {
    title: 'Access Denied',
    message: 'You do not have permission to access this resource. Admin privileges required.'
  });
};

/**
 * Check if user has admin role (for API routes)
 * Returns JSON error instead of rendering error page
 * Must be used AFTER isAuthenticatedAPI middleware
 * 
 * Usage:
 * router.get('/api/admin/users', isAuthenticatedAPI, isAdminAPI, adminController.getUsers);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdminAPI = (req, res, next) => {
  console.log('[ROLE-API] Checking admin privileges...');
  
  // Get user ID from session for logging
  const userId = req.session?.userId || 'unknown';
  
  // Check if user has admin role in session
  if (req.session && req.session.userRole === 'admin') {
    console.log(`[ROLE-API] ✓ Admin access granted for user: ${userId}`);
    return next();
  }

  // Return 403 Forbidden error for API requests
  console.log(`[ROLE-API] ✗ Admin access denied for user: ${userId}`);
  logger.warn(`Unauthorized admin API access attempt by user ${userId} to: ${req.path}`);
  
  return res.status(403).json({
    success: false,
    error: 'Admin privileges required',
    code: 'FORBIDDEN',
    message: 'You do not have permission to access this resource'
  });
};

/**
 * Factory function to create role-checking middleware
 * Allows checking for any role, not just admin
 * 
 * Usage:
 * router.get('/moderator/panel', isAuthenticated, hasRole('moderator'), modController.getPanel);
 * 
 * @param {string|string[]} allowedRoles - Role(s) that can access the route
 * @returns {Function} Express middleware function
 */
const hasRole = (allowedRoles) => {
  // Convert single role to array for consistent handling
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    console.log(`[ROLE] Checking for roles: ${roles.join(', ')}`);
    
    const userId = req.session?.userId || 'unknown';
    const userRole = req.session?.userRole;
    
    // Check if user's role is in the allowed roles list
    if (userRole && roles.includes(userRole)) {
      console.log(`[ROLE] ✓ Role '${userRole}' allowed for user: ${userId}`);
      return next();
    }
    
    // User doesn't have required role
    console.log(`[ROLE] ✗ Role '${userRole}' not in allowed roles [${roles.join(', ')}]`);
    logger.warn(`Role check failed for user ${userId}. Required: ${roles.join(', ')}, Has: ${userRole}`);
    
    return res.status(403).render('errors/403', {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.'
    });
  };
};

module.exports = {
  isAdmin,
  isAdminAPI,
  hasRole
};
