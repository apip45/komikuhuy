/**
 * ===========================================
 * AF-Komik V2 - Admin Web Routes
 * ===========================================
 * 
 * Web routes for admin dashboard functionality.
 * All routes are protected with isAuthenticated + isAdmin.
 * 
 * Routes:
 * - GET  /admin              - Dashboard
 * - GET  /admin/users        - User management
 * - POST /admin/users/:id/role           - Update user role
 * - POST /admin/users/:id/reset-password - Reset user password
 * - POST /admin/users/:id/toggle-status  - Toggle user status
 * - GET  /admin/scraper      - Scraper control
 * - POST /admin/scraper/full - Run full scraper
 * - POST /admin/scraper/latest - Run latest scraper
 * - POST /admin/scraper/:type/stop - Stop running scraper
 * - GET  /admin/logs         - View logs
 */

const express = require('express');
const router = express.Router();

// Middleware
const { isAuthenticated } = require('../middlewares/isAuthenticated');
const { isAdmin } = require('../middlewares/isAdmin');

// Controllers
const { 
  AdminController, 
  UserAdminController, 
  ScraperAdminController 
} = require('../controllers/admin');

// Apply authentication and admin check to all routes
router.use(isAuthenticated);
router.use(isAdmin);

// ===========================================
// Dashboard Routes
// ===========================================

/**
 * GET /admin
 * Admin dashboard overview
 */
router.get('/', AdminController.dashboard.bind(AdminController));

// ===========================================
// User Management Routes
// ===========================================

/**
 * GET /admin/users
 * User list with pagination and search
 */
router.get('/users', UserAdminController.listUsers.bind(UserAdminController));

/**
 * POST /admin/users/:id/role
 * Update user role (user/admin)
 */
router.post('/users/:id/role', UserAdminController.updateUserRole.bind(UserAdminController));

/**
 * POST /admin/users/:id/reset-password
 * Reset user password to temporary password
 */
router.post('/users/:id/reset-password', UserAdminController.resetUserPassword.bind(UserAdminController));

/**
 * POST /admin/users/:id/toggle-status
 * Enable/disable user account
 */
router.post('/users/:id/toggle-status', UserAdminController.toggleUserStatus.bind(UserAdminController));

// ===========================================
// Scraper Control Routes
// ===========================================

/**
 * GET /admin/scraper
 * Scraper control panel
 */
router.get('/scraper', ScraperAdminController.scraperPage.bind(ScraperAdminController));

/**
 * POST /admin/scraper/full
 * Run full scraper
 */
router.post('/scraper/full', ScraperAdminController.runFullScraper.bind(ScraperAdminController));

/**
 * POST /admin/scraper/latest
 * Run latest/periodic scraper
 */
router.post('/scraper/latest', ScraperAdminController.runLatestScraper.bind(ScraperAdminController));

/**
 * POST /admin/scraper/fix-chapters
 * Run fix-chapters script to repair missing chapters
 */
router.post('/scraper/fix-chapters', ScraperAdminController.runFixChapters.bind(ScraperAdminController));

/**
 * POST /admin/scraper/stop
 * Stop any running scraper
 */
router.post('/scraper/stop', ScraperAdminController.stopAnyScraper.bind(ScraperAdminController));

/**
 * POST /admin/scraper/:type/stop
 * Stop running scraper (full or latest)
 */
router.post('/scraper/:type/stop', ScraperAdminController.stopScraper.bind(ScraperAdminController));

/**
 * GET /admin/scraper/console
 * Get scraper output as HTML page (for iframe)
 */
router.get('/scraper/console', ScraperAdminController.getConsoleHtml.bind(ScraperAdminController));

/**
 * GET /admin/scraper/progress
 * Get full scraper progress (API)
 */
router.get('/scraper/progress', ScraperAdminController.getProgress.bind(ScraperAdminController));

/**
 * POST /admin/scraper/reset-progress
 * Reset full scraper progress
 */
router.post('/scraper/reset-progress', ScraperAdminController.resetProgress.bind(ScraperAdminController));

/**
 * POST /admin/stats/refresh
 * Manually refresh statistics cache
 */
router.post('/stats/refresh', async (req, res) => {
  try {
    const statsService = require('../services/statsService');
    statsService.invalidateCache();
    await statsService.warmupCache();
    res.json({ success: true, message: 'Statistics cache refreshed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===========================================
// Logs Routes
// ===========================================

/**
 * GET /admin/logs
 * View scraper and system logs
 */
router.get('/logs', ScraperAdminController.logsPage.bind(ScraperAdminController));

module.exports = router;
