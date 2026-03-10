/**
 * ===========================================
 * AF-Komik V2 - Cache Admin Controller
 * ===========================================
 * 
 * Handles cache monitoring and management from admin panel:
 * - Cache statistics page
 * - Real-time stats API (for polling)
 * - Clear cache by tier or pattern
 * - Flush all caches
 */

const { cacheService } = require('../../services/cacheService');
const { cacheManager } = require('../../config/cache');
const logger = require('../../utils/smartLogger');

const CacheAdminController = {

  /**
   * Render cache monitoring page
   * GET /admin/cache
   */
  async cachePage(req, res) {
    try {
      logger.info(`Admin cache page accessed by user ${req.session.userId}`);

      const cacheStats = cacheService.getStats();
      const healthInfo = cacheService.healthCheck();

      res.render('pages/admin/cache', {
        layout: 'layouts/admin',
        title: 'Cache Monitor - AF-Komik Admin',
        page: 'cache',
        pageScript: '/js/cache-admin.js',
        user: req.session,
        cacheStats,
        healthInfo
      });

    } catch (error) {
      logger.error(`Admin cache page error: ${error.message}`);
      res.status(500).render('errors/500', {
        title: 'Server Error',
        message: error.message
      });
    }
  },

  /**
   * Get live cache statistics (JSON API)
   * GET /admin/cache/stats
   */
  async getStatsApi(req, res) {
    try {
      const cacheStats = cacheService.getStats();
      const healthInfo = cacheService.healthCheck();

      // Get all keys per tier for display
      let tierKeys = { hot: [], warm: [], cold: [] };
      try {
        tierKeys.hot  = cacheManager.hotCache.keys()  || [];
        tierKeys.warm = cacheManager.warmCache.keys() || [];
        tierKeys.cold = cacheManager.coldCache.keys() || [];
      } catch (_) { /* ignore */ }

      res.json({
        success: true,
        data: {
          ...cacheStats,
          health: healthInfo.status,
          warnings: healthInfo.warnings || [],
          tierKeys
        }
      });

    } catch (error) {
      logger.error(`Admin cache stats API error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Clear a specific cache tier
   * POST /admin/cache/clear-tier
   * Body: { tier: 'hot' | 'warm' | 'cold' }
   */
  async clearTier(req, res) {
    try {
      const { tier } = req.body;

      if (!['hot', 'warm', 'cold'].includes(tier)) {
        return res.status(400).json({ success: false, error: 'Invalid tier. Use: hot, warm, cold' });
      }

      const cacheRef = {
        hot:  cacheManager.hotCache,
        warm: cacheManager.warmCache,
        cold: cacheManager.coldCache
      }[tier];

      const keysBefore = cacheRef.keys().length;
      cacheRef.flushAll();

      logger.info(`Admin cleared cache tier [${tier.toUpperCase()}] (${keysBefore} entries) by user ${req.session.userId}`);

      res.json({
        success: true,
        message: `Cleared ${keysBefore} entries from ${tier.toUpperCase()} cache tier`,
        tier,
        cleared: keysBefore
      });

    } catch (error) {
      logger.error(`Admin clear tier error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Clear cache entries matching a pattern
   * POST /admin/cache/clear-pattern
   * Body: { pattern: 'comic:123' }
   */
  async clearPattern(req, res) {
    try {
      const { pattern } = req.body;

      if (!pattern || typeof pattern !== 'string' || pattern.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Pattern is required' });
      }

      const cleared = cacheService.clearByPattern(pattern.trim());

      logger.info(`Admin cleared cache pattern [${pattern}] (${cleared} entries) by user ${req.session.userId}`);

      res.json({
        success: true,
        message: `Cleared ${cleared} entries matching pattern "${pattern}"`,
        pattern,
        cleared
      });

    } catch (error) {
      logger.error(`Admin clear pattern error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * Flush all cache tiers
   * POST /admin/cache/flush-all
   */
  async flushAll(req, res) {
    try {
      const statsBefore = cacheService.getStats();
      const totalBefore = statsBefore.overall ? statsBefore.overall.totalKeys : 0;

      cacheService.flushAll();

      logger.warn(`Admin flushed ALL caches (${totalBefore} total entries) by user ${req.session.userId}`);

      res.json({
        success: true,
        message: `All caches flushed successfully (${totalBefore} entries removed)`,
        cleared: totalBefore
      });

    } catch (error) {
      logger.error(`Admin flush all error: ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = CacheAdminController;
