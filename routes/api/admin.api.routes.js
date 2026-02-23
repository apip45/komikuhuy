/**
 * ===========================================
 * AF-Komik V2 - Admin API Routes
 * ===========================================
 * 
 * REST API routes for admin functionality.
 * All routes are protected with isAuthenticated + isAdminAPI.
 * 
 * Routes:
 * - GET  /api/admin/stats            - Get system statistics
 * - GET  /api/admin/users            - Get user list
 * - POST /api/admin/users/:id/role   - Update user role
 * - POST /api/admin/users/:id/reset-password - Reset password
 * - POST /api/admin/users/:id/toggle-status  - Toggle status
 * - GET  /api/admin/scraper/status   - Get scraper status
 * - POST /api/admin/scraper/full     - Run full scraper
 * - POST /api/admin/scraper/latest   - Run latest scraper
 * - POST /api/admin/scraper/:type/stop - Stop scraper
 * - GET  /api/admin/scraper/:type/output - Get live output
 * - GET  /api/admin/logs             - Get logs
 */

const express = require('express');
const router = express.Router();

// Middleware
const { isAuthenticatedAPI } = require('../../middlewares/isAuthenticated');
const { isAdminAPI } = require('../../middlewares/isAdmin');

// Controllers
const { 
  AdminController, 
  UserAdminController, 
  ScraperAdminController 
} = require('../../controllers/admin');

// Apply authentication and admin check to all routes
router.use(isAuthenticatedAPI);
router.use(isAdminAPI);

// ===========================================
// Statistics Routes
// ===========================================

/**
 * GET /api/admin/stats
 * Get comprehensive system statistics
 */
router.get('/stats', AdminController.getStats.bind(AdminController));

// ===========================================
// User Management Routes
// ===========================================

/**
 * GET /api/admin/users
 * Get paginated user list
 */
router.get('/users', UserAdminController.getUsers.bind(UserAdminController));

/**
 * POST /api/admin/users/:id/role
 * Update user role
 */
router.post('/users/:id/role', UserAdminController.updateUserRole.bind(UserAdminController));

/**
 * POST /api/admin/users/:id/reset-password
 * Reset user password
 */
router.post('/users/:id/reset-password', UserAdminController.resetUserPassword.bind(UserAdminController));

/**
 * POST /api/admin/users/:id/toggle-status
 * Toggle user active status
 */
router.post('/users/:id/toggle-status', UserAdminController.toggleUserStatus.bind(UserAdminController));

// ===========================================
// Scraper Routes
// ===========================================

/**
 * GET /api/admin/scraper/status
 * Get current scraper status
 */
router.get('/scraper/status', ScraperAdminController.getStatus);

/**
 * POST /api/admin/scraper/full
 * Trigger full scraper
 */
router.post('/scraper/full', ScraperAdminController.runFullScraper.bind(ScraperAdminController));

/**
 * POST /api/admin/scraper/latest
 * Trigger latest/periodic scraper
 */
router.post('/scraper/latest', ScraperAdminController.runLatestScraper.bind(ScraperAdminController));

/**
 * POST /api/admin/scraper/single
 * Trigger single comic scraper by parameter
 */
router.post('/scraper/single', ScraperAdminController.runSingleScraper.bind(ScraperAdminController));

/**
 * POST /api/admin/scraper/:type/stop
 * Stop running scraper
 */
router.post('/scraper/:type/stop', ScraperAdminController.stopScraper.bind(ScraperAdminController));

/**
 * POST /api/admin/scraper/stop
 * Stop any running scraper
 */
router.post('/scraper/stop', ScraperAdminController.stopAnyScraper.bind(ScraperAdminController));

/**
 * GET /api/admin/scraper/output
 * Get output from any running scraper
 */
router.get('/scraper/output', ScraperAdminController.getAnyOutput.bind(ScraperAdminController));

/**
 * GET /api/admin/scraper/:type/output
 * Get live scraper output
 */
router.get('/scraper/:type/output', ScraperAdminController.getOutput);

// ===========================================
// Logs Routes
// ===========================================

/**
 * GET /api/admin/logs
 * Get scraper logs
 */
router.get('/logs', ScraperAdminController.getLogs);

module.exports = router;
