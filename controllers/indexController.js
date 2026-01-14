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
const ComicModel = require('../models/mysql/comic.model');
const statsService = require('../services/statsService');
const User = require('../models/mongo/User');

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
    
    // Fetch featured comics (random selection from popular/recent)
    const featuredComics = await ComicModel.findAll({ limit: 12, offset: 0 });
    
    // Fetch latest updates
    const latestUpdates = await ComicModel.findAll({ limit: 10, offset: 0 });
    
    // Get database stats for homepage statistics
    let stats = {
      totalComics: 0,
      totalChapters: 0,
      totalUsers: 0
    };
    
    try {
      const dbStats = await statsService.getDatabaseStats();
      stats.totalComics = dbStats.comics.total;
      stats.totalChapters = dbStats.chapters.total;
      
      // Get user count from MongoDB
      try {
        stats.totalUsers = await User.countDocuments();
      } catch (userError) {
        logger.warn(`Failed to fetch user count: ${userError.message}`);
      }
    } catch (statError) {
      logger.warn(`Failed to fetch stats: ${statError.message}`);
    }
    
    res.render('pages/home', {
      title: 'AF-Komik - Baca Komik Online',
      currentPage: 'home',
      user: user,
      featuredComics: featuredComics,
      latestUpdates: latestUpdates,
      stats: stats
    });
    
  } catch (error) {
    logger.error(`Error rendering homepage: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getHomePage
};
