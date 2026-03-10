/**
 * ===========================================
 * AF-Komik V2 - User Routes (Web)
 * ===========================================
 * 
 * Web routes for user-specific features:
 * - Bookmarks (add, remove, list)
 * - Reading history (view, clear, remove)
 * - Resume reading
 * 
 * All routes require authentication.
 * Uses EJS for rendering and redirects for form submissions.
 * 
 * Route Prefixes:
 * - /bookmarks/* - Bookmark operations
 * - /my/* - User's personal pages
 * - /resume/* - Resume reading feature
 */

const express = require('express');
const logger = require('../utils/smartLogger');
const router = express.Router();

// Controllers
const BookmarkController = require('../controllers/bookmarkController');
const HistoryController = require('../controllers/historyController');

// Authentication middleware
const { isAuthenticated } = require('../middlewares/auth.middleware');

logger.debug('[ROUTES] Loading user.routes.js...');

// ===========================================
// BOOKMARK ROUTES
// ===========================================

/**
 * POST /bookmarks/:comicParam
 * Add a comic to bookmarks
 * 
 * Requires: Authentication
 * Redirects: Back to comic page with message
 */
router.post(
  '/bookmarks/:comicParam',
  isAuthenticated,
  BookmarkController.addBookmarkWeb
);
logger.debug('[ROUTES] ✓ POST /bookmarks/:comicParam');

/**
 * POST /bookmarks/:comicParam/remove
 * Remove a comic from bookmarks
 * 
 * Uses POST because HTML forms don't support DELETE.
 * 
 * Requires: Authentication
 * Redirects: Back to previous page with message
 */
router.post(
  '/bookmarks/:comicParam/remove',
  isAuthenticated,
  BookmarkController.removeBookmarkWeb
);
logger.debug('[ROUTES] ✓ POST /bookmarks/:comicParam/remove');

// ===========================================
// USER PAGES ROUTES (/my/*)
// ===========================================

/**
 * GET /my/bookmarks
 * Display user's bookmark list
 * 
 * Query Params:
 * - page: Page number (default: 1)
 * 
 * Requires: Authentication
 * Renders: pages/bookmarks.ejs
 */
router.get(
  '/my/bookmarks',
  isAuthenticated,
  BookmarkController.listBookmarksPage
);
logger.debug('[ROUTES] ✓ GET /my/bookmarks');

/**
 * GET /my/history
 * Display user's reading history
 * 
 * Query Params:
 * - page: Page number (default: 1)
 * 
 * Requires: Authentication
 * Renders: pages/history.ejs
 */
router.get(
  '/my/history',
  isAuthenticated,
  HistoryController.listHistoryPage
);
logger.debug('[ROUTES] ✓ GET /my/history');

/**
 * POST /my/history/clear
 * Clear all reading history
 * 
 * Requires: Authentication
 * Redirects: /my/history with message
 */
router.post(
  '/my/history/clear',
  isAuthenticated,
  HistoryController.clearHistoryWeb
);
logger.debug('[ROUTES] ✓ POST /my/history/clear');

/**
 * POST /my/history/:comicParam/remove
 * Remove single history entry
 * 
 * Requires: Authentication
 * Redirects: /my/history with message
 */
router.post(
  '/my/history/:comicParam/remove',
  isAuthenticated,
  HistoryController.removeHistoryWeb
);
logger.debug('[ROUTES] ✓ POST /my/history/:comicParam/remove');

// ===========================================
// RESUME READING ROUTE
// ===========================================

/**
 * GET /resume/:comicParam
 * Resume reading a comic from last read chapter
 * 
 * Behavior:
 * - If history exists: redirect to last read chapter
 * - If no history: redirect to first chapter
 * - If no chapters: redirect to comic detail page
 * 
 * Requires: Authentication
 * Redirects: To appropriate chapter or page
 */
router.get(
  '/resume/:comicParam',
  isAuthenticated,
  HistoryController.resumeReadingWeb
);
logger.debug('[ROUTES] ✓ GET /resume/:comicParam');

logger.debug('[ROUTES] User routes loaded successfully');

module.exports = router;
