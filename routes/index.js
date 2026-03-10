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
const logger = require('../utils/smartLogger');

// Import controllers
const indexController = require('../controllers/indexController');

// Import middleware
const { attachUser } = require('../middlewares');

logger.debug('[ROUTES] Registering index routes...');

// ===========================================
// Route Definitions
// ===========================================

/**
 * GET /
 * Homepage - Display main landing page with featured comics
 * Uses attachUser to optionally get user data for display
 */
router.get('/', attachUser, indexController.getHomePage);
logger.debug('[ROUTES] Registered: GET /');

logger.debug('[ROUTES] Index routes registration complete');

module.exports = router;
