/**
 * ===========================================
 * AF-Komik V2 - Index Controller
 * ===========================================
 * 
 * Controller for handling main page routes.
 * Renders homepage and other public pages.
 * 
 * Note: Login/Register are now handled by authController.js
 */

const logger = require('../config/logger');

/**
 * Render the homepage
 * 
 * Shows featured comics, latest updates, and statistics.
 * User data (if logged in) is attached by attachUser middleware.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getHomePage = async (req, res, next) => {
  try {
    console.log('[INDEX] Rendering homepage');
    
    // Get user from request if logged in (attached by attachUser middleware)
    const user = req.user ? req.user.getPublicProfile() : null;
    
    res.render('pages/home', {
      title: 'AF-Komik - Baca Komik Online',
      currentPage: 'home',
      user: user
    });
    
  } catch (error) {
    logger.error(`Error rendering homepage: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getHomePage
};
