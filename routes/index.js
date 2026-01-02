/**
 * ===========================================
 * AF-Komik V2 - Index Routes
 * ===========================================
 * 
 * Main application routes for the web platform.
 * Handles homepage and basic navigation routes.
 * 
 * Route naming convention:
 * - GET routes for displaying pages
 * - POST routes for form submissions (auth)
 * - All routes log their registration in console
 */

const express = require('express');
const router = express.Router();

// Import controllers
const indexController = require('../controllers/indexController');

console.log('[ROUTES] Registering index routes...');

// ===========================================
// Route Definitions
// ===========================================

/**
 * GET /
 * Homepage - Display main landing page with featured comics
 */
router.get('/', indexController.getHomePage);
console.log('[ROUTES] Registered: GET /');

/**
 * GET /login
 * Login page - Display user login form
 */
router.get('/login', indexController.getLoginPage);
console.log('[ROUTES] Registered: GET /login');

/**
 * GET /register
 * Register page - Display user registration form
 */
router.get('/register', indexController.getRegisterPage);
console.log('[ROUTES] Registered: GET /register');

console.log('[ROUTES] Index routes registration complete');

module.exports = router;
