/**
 * ===========================================
 * AF-Komik V2 - Index Routes
 * ===========================================
 * 
 * Main application routes for the web platform.
 * Handles homepage and basic navigation routes.
 * 
 * Note: Login/Register routes are in auth.routes.js
 */

const express = require('express');
const router = express.Router();

// Import controllers
const indexController = require('../controllers/indexController');

// Import middleware
const { attachUser } = require('../middlewares');

console.log('[ROUTES] Registering index routes...');

// ===========================================
// Route Definitions
// ===========================================

/**
 * GET /
 * Homepage - Display main landing page with featured comics
 * Uses attachUser to optionally get user data for display
 */
router.get('/', attachUser, indexController.getHomePage);
console.log('[ROUTES] Registered: GET /');

console.log('[ROUTES] Index routes registration complete');

module.exports = router;
