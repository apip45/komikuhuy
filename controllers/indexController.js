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
const { cacheService } = require('../services/cacheService');

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
    
    // Try to get homepage data from cache
    const cacheKey = 'homepage:data';
    
    const homepageData = await cacheService.getOrFetch(
      cacheKey,
      async () => {
        console.log('[INDEX] Cache MISS: Fetching homepage data from database');
        logger.info('Homepage cache MISS - fetching from database');
        
        // Fetch featured comics and latest updates in parallel
        const [featuredComics, latestUpdates] = await Promise.all([
          ComicModel.findAll({ limit: 12, offset: 0 }),
          ComicModel.findAll({ limit: 10, offset: 0 })
        ]);
        
        // Get database stats for homepage statistics
        const stats = {
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
        
        console.log(`[INDEX] Fetched: ${featuredComics.length} featured, ${latestUpdates.length} latest, stats: ${JSON.stringify(stats)}`);
        
        return {
          featuredComics,
          latestUpdates,
          stats
        };
      },
      'warm',
      300 // 5 minutes TTL - balance between freshness and performance
    );
    
    // Check if we got data from cache
    if (cacheService.get(cacheKey, 'warm')) {
      console.log('[INDEX] Cache HIT: Using cached homepage data');
      logger.info('Homepage cache HIT');
    }
    
    const { featuredComics, latestUpdates, stats } = homepageData;
    
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

/**
 * Invalidate homepage cache
 * 
 * Call this when homepage data changes (new comics, stats update, etc.)
 * Typically called after scraper runs or when featured comics are updated.
 * 
 * @returns {boolean} True if cache was invalidated
 */
const invalidateHomepageCache = () => {
  const count = cacheService.invalidateHomepage();
  console.log(`[INDEX] Homepage cache invalidated (${count} entries)`);
  logger.info('Homepage cache invalidated');
  return count > 0;
};

module.exports = {
  getHomePage,
  invalidateHomepageCache
};
