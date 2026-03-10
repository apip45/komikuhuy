/**
 * ===========================================
 * AF-Komik V2 - Health Check Routes
 * ===========================================
 * 
 * Routes for monitoring system health and cache statistics.
 * 
 * Routes:
 * - GET /api/health           - System health check
 * - GET /api/health/cache     - Cache statistics
 * - POST /api/health/cache/clear - Clear cache (admin only)
 */

const express = require('express');
const router = express.Router();
const { cacheService } = require('../../services/cacheService');
const { isAdmin } = require('../../middlewares');
const logger = require('../../config/logger');

logger.debug('[ROUTES] Registering health check routes...');

/**
 * GET /api/health
 * 
 * System health check endpoint
 * Returns overall system status including cache health
 */
router.get('/', async (req, res) => {
    try {
        const cacheHealth = cacheService.healthCheck();
        const memoryUsage = process.memoryUsage();

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            services: {
                cache: cacheHealth,
                memory: {
                    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
                }
            }
        };

        // Determine overall status
        if (cacheHealth.status === 'critical') {
            health.status = 'degraded';
        }

        const statusCode = health.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

logger.debug('[ROUTES] Registered: GET /api/health');

/**
 * GET /api/health/cache
 * 
 * Cache statistics endpoint
 * Returns detailed cache statistics
 */
router.get('/cache', (req, res) => {
    try {
        const stats = cacheService.getStats();
        
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Cache stats error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

logger.debug('[ROUTES] Registered: GET /api/health/cache');

/**
 * POST /api/health/cache/clear
 * 
 * Clear cache endpoint (admin only)
 * Optionally clear by pattern
 * 
 * Body:
 * - pattern (optional): Pattern to match for selective clearing
 */
router.post('/cache/clear', isAdmin, (req, res) => {
    try {
        const { pattern } = req.body;

        let result;
        if (pattern) {
            const cleared = cacheService.clearPattern(pattern);
            result = {
                success: true,
                message: `Cleared ${cleared} cache entries matching pattern: ${pattern}`,
                pattern,
                cleared
            };
        } else {
            cacheService.flushAll();
            result = {
                success: true,
                message: 'All cache cleared'
            };
        }

        logger.info(`Cache cleared by admin: ${req.user?.username || 'unknown'}`, result);
        res.json(result);
    } catch (error) {
        logger.error('Cache clear error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

logger.debug('[ROUTES] Registered: POST /api/health/cache/clear');

logger.debug('[ROUTES] Health check routes registration complete');

module.exports = router;
