/**
 * ===========================================
 * AF-Komik V2 - Authentication Middleware
 * ===========================================
 * 
 * Middleware functions to protect routes that require authentication.
 * Provides both web (redirect) and API (JSON response) variants.
 * 
 * How Authentication Works:
 * 1. User logs in → session created with userId and userRole
 * 2. User makes request → session cookie sent automatically
 * 3. Middleware checks session → allows or denies access
 * 4. Session expires → user must log in again
 * 
 * Session Structure:
 * req.session = {
 *   userId: ObjectId,      // User's MongoDB ID
 *   userRole: 'user'|'admin',  // User's role
 *   username: string,      // User's username
 *   returnTo: string       // URL to redirect after login (optional)
 * }
 * 
 * Usage Examples:
 * 
 * // Web routes (redirects to login)
 * router.get('/profile', isAuthenticated, profileController.getProfile);
 * 
 * // API routes (returns 401 JSON)
 * router.get('/api/user', isAuthenticatedAPI, userController.getUser);
 * 
 * // Attach user to request (doesn't block if not logged in)
 * router.get('/', attachUser, homeController.getHome);
 */

const logger = require('../utils/smartLogger');
const User = require('../models/mongo/User');
const { unauthorized } = require('../utils/apiResponse');

/**
 * Check if user is authenticated (for Web routes)
 * 
 * Behavior:
 * - If authenticated: calls next() to continue
 * - If not authenticated: redirects to /login
 * 
 * Also stores the original URL so user can be redirected back
 * after successful login (better UX).
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAuthenticated = async (req, res, next) => {
  logger.debug('[AUTH] Checking authentication status...');
  logger.debug(`[AUTH] Session ID: ${req.session?.id || 'none'}`);
  logger.debug(`[AUTH] User ID in session: ${req.session?.userId || 'none'}`);
  
  try {
    // Check if session exists and has user ID
    if (!req.session || !req.session.userId) {
      logger.debug('[AUTH] ✗ No session or user ID found');
      logger.warn(`Unauthenticated access attempt to: ${req.path}`);
      
      // Store original URL for redirect after login
      req.session.returnTo = req.originalUrl;
      
      return res.redirect('/login?error=' + encodeURIComponent('Please log in to continue'));
    }
    
    // Verify user still exists and is active
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      logger.debug('[AUTH] ✗ User not found in database');
      logger.warn(`Session has invalid user ID: ${req.session.userId}`);
      
      // Clear invalid session
      req.session.destroy();
      return res.redirect('/login?error=' + encodeURIComponent('Session expired. Please log in again'));
    }
    
    if (!user.isActive) {
      logger.debug('[AUTH] ✗ User account is deactivated');
      logger.warn(`Deactivated user attempted access: ${user.username}`);
      
      req.session.destroy();
      return res.redirect('/login?error=' + encodeURIComponent('Your account has been deactivated'));
    }
    
    // Attach user to request for use in route handlers
    req.user = user;
    
    logger.debug(`[AUTH] ✓ User authenticated: ${user.username} (${user.role})`);
    next();
    
  } catch (error) {
    logger.error('[AUTH] ✗ Authentication check error:', error.message);
    logger.error('Authentication middleware error:', error);
    return res.redirect('/login?error=' + encodeURIComponent('Authentication error'));
  }
};

/**
 * Check if user is authenticated (for API routes)
 * 
 * Behavior:
 * - If authenticated: calls next() to continue
 * - If not authenticated: returns 401 JSON response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAuthenticatedAPI = async (req, res, next) => {
  logger.debug('[AUTH-API] Checking authentication status...');
  
  try {
    // Check if session exists and has user ID
    if (!req.session || !req.session.userId) {
      logger.debug('[AUTH-API] ✗ No session or user ID found');
      logger.warn(`API: Unauthenticated access attempt to: ${req.path}`);
      return unauthorized(res, 'Authentication required. Please log in.');
    }
    
    // Verify user still exists and is active
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      logger.debug('[AUTH-API] ✗ User not found in database');
      logger.warn(`API: Session has invalid user ID: ${req.session.userId}`);
      req.session.destroy();
      return unauthorized(res, 'Session expired. Please log in again.');
    }
    
    if (!user.isActive) {
      logger.debug('[AUTH-API] ✗ User account is deactivated');
      logger.warn(`API: Deactivated user attempted access: ${user.username}`);
      req.session.destroy();
      return unauthorized(res, 'Your account has been deactivated.');
    }
    
    // Attach user to request
    req.user = user;
    
    logger.debug(`[AUTH-API] ✓ User authenticated: ${user.username}`);
    next();
    
  } catch (error) {
    logger.error('[AUTH-API] ✗ Authentication check error:', error.message);
    logger.error('API Authentication middleware error:', error);
    return unauthorized(res, 'Authentication error. Please try again.');
  }
};

/**
 * Attach user to request without blocking
 * 
 * Use this middleware on public routes where you want to know
 * if a user is logged in but don't want to require login.
 * 
 * Example: Homepage showing different content for logged in users
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const attachUser = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.isActive) {
        req.user = user;
        logger.debug(`[AUTH] User attached to request: ${user.username}`);
      }
    }
  } catch (error) {
    // Don't block on errors, just log
    logger.error('[AUTH] Error attaching user:', error.message);
  }
  
  // Always continue to next middleware
  next();
};

/**
 * Redirect to home if already logged in
 * 
 * Use on login/register pages to prevent logged-in users
 * from accessing these pages.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const redirectIfAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    logger.debug('[AUTH] User already authenticated, redirecting to home');
    return res.redirect('/');
  }
  next();
};

/**
 * Check if user is admin (for Web routes)
 * 
 * Must be used AFTER isAuthenticated middleware.
 * 
 * Behavior:
 * - If admin: calls next() to continue
 * - If not admin: returns 403 Forbidden page
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const isAdmin = (req, res, next) => {
  logger.debug('[AUTH] Checking admin status...');
  logger.debug(`[AUTH] User role: ${req.session?.userRole || req.user?.role || 'none'}`);
  
  const role = req.session?.userRole || req.user?.role;
  
  if (role !== 'admin') {
    logger.debug('[AUTH] ✗ User is not admin');
    logger.warn(`Non-admin access attempt to admin area: ${req.user?.username || 'unknown'}`);
    
    return res.status(403).render('errors/403', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page.'
    });
  }
  
  logger.debug('[AUTH] ✓ Admin access granted');
  next();
};

/**
 * Check if user is admin (for API routes)
 * 
 * Must be used AFTER isAuthenticatedAPI middleware.
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
  logger.debug('[AUTH-API] Checking admin status...');
  
  const role = req.session?.userRole || req.user?.role;
  
  if (role !== 'admin') {
    logger.debug('[AUTH-API] ✗ User is not admin');
    logger.warn(`API: Non-admin access attempt: ${req.user?.username || 'unknown'}`);
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  
  logger.debug('[AUTH-API] ✓ Admin access granted');
  next();
};

module.exports = {
  isAuthenticated,
  isAuthenticatedAPI,
  attachUser,
  redirectIfAuthenticated,
  isAdmin,
  isAdminAPI
};
