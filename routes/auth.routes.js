/**
 * ===========================================
 * AF-Komik V2 - Authentication Routes (Web)
 * ===========================================
 * 
 * Web routes for authentication using EJS views.
 * All routes render EJS templates or redirect.
 * 
 * Routes:
 * - GET  /login     - Render login page
 * - POST /login     - Process login form
 * - GET  /register  - Render registration page
 * - POST /register  - Process registration form
 * - POST /logout    - Logout user
 * - GET  /profile   - User profile page (requires auth)
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/smartLogger');

// Import controller
const authController = require('../controllers/authController');

// Import middleware
const { 
  isAuthenticated, 
  redirectIfAuthenticated 
} = require('../middlewares');

logger.debug('[ROUTES] Registering auth web routes...');

// ===========================================
// Public Routes (no authentication required)
// ===========================================

/**
 * GET /login
 * 
 * Render login page.
 * Redirects to home if already logged in.
 */
router.get('/login', redirectIfAuthenticated, authController.getLoginPage);
logger.debug('[ROUTES] Registered: GET /login');

/**
 * POST /login
 * 
 * Process login form submission.
 * Creates session on successful login.
 * Redirects to home or original destination.
 */
router.post('/login', authController.loginWeb);
logger.debug('[ROUTES] Registered: POST /login');

/**
 * GET /register
 * 
 * Render registration page.
 * Redirects to home if already logged in.
 */
router.get('/register', redirectIfAuthenticated, authController.getRegisterPage);
logger.debug('[ROUTES] Registered: GET /register');

/**
 * POST /register
 * 
 * Process registration form submission.
 * Creates new user and auto-logs them in.
 * Redirects to home on success.
 */
router.post('/register', authController.registerWeb);
logger.debug('[ROUTES] Registered: POST /register');

// ===========================================
// Protected Routes (authentication required)
// ===========================================

/**
 * POST /logout
 * 
 * Log out the current user.
 * Destroys session and clears cookie.
 * Redirects to login page.
 */
router.post('/logout', authController.logoutWeb);
logger.debug('[ROUTES] Registered: POST /logout');

/**
 * GET /profile
 * 
 * Render user profile page.
 * Requires authentication.
 */
router.get('/profile', isAuthenticated, authController.getProfilePage);
logger.debug('[ROUTES] Registered: GET /profile');

logger.debug('[ROUTES] Auth web routes registration complete');

module.exports = router;
