/**
 * ===========================================
 * AF-Komik V2 - User API Routes
 * ===========================================
 * 
 * REST API routes for user-specific features:
 * - Bookmarks (CRUD operations)
 * - Reading history (list, resume, clear)
 * 
 * All routes require authentication via session.
 * All responses follow standard JSON format.
 * 
 * Base URL: /api
 * 
 * Endpoint Structure:
 * - /api/bookmarks/* - Bookmark operations
 * - /api/history/* - Reading history operations
 * - /api/resume/* - Resume reading feature
 */

const express = require('express');
const router = express.Router();

// Controllers
const BookmarkController = require('../../controllers/bookmarkController');
const HistoryController = require('../../controllers/historyController');

// Authentication middleware
const { isAuthenticatedAPI } = require('../../middlewares/auth.middleware');

console.log('[API_ROUTES] Loading user.api.routes.js...');

// ===========================================
// BOOKMARK API ROUTES
// ===========================================

/**
 * GET /api/bookmarks
 * Get user's bookmark list
 * 
 * Query Params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * 
 * Response:
 * {
 *   "status": "success",
 *   "message": "Bookmarks retrieved successfully",
 *   "data": {
 *     "bookmarks": [...],
 *     "pagination": {...}
 *   }
 * }
 */
router.get(
  '/bookmarks',
  isAuthenticatedAPI,
  BookmarkController.listBookmarksAPI
);
console.log('[API_ROUTES] ✓ GET /api/bookmarks');

/**
 * POST /api/bookmarks/:comicParam
 * Add a comic to bookmarks
 * 
 * Response (201):
 * {
 *   "status": "success",
 *   "message": "Bookmark added successfully",
 *   "data": { "bookmark": {...} }
 * }
 * 
 * Error (404): Comic not found
 * Error (409): Already bookmarked
 */
router.post(
  '/bookmarks/:comicParam',
  isAuthenticatedAPI,
  BookmarkController.addBookmarkAPI
);
console.log('[API_ROUTES] ✓ POST /api/bookmarks/:comicParam');

/**
 * DELETE /api/bookmarks/:comicParam
 * Remove a comic from bookmarks
 * 
 * Response (200):
 * {
 *   "status": "success",
 *   "message": "Bookmark removed successfully",
 *   "data": { "comicParam": "...", "removed": true }
 * }
 * 
 * Error (404): Bookmark not found
 */
router.delete(
  '/bookmarks/:comicParam',
  isAuthenticatedAPI,
  BookmarkController.removeBookmarkAPI
);
console.log('[API_ROUTES] ✓ DELETE /api/bookmarks/:comicParam');

/**
 * GET /api/bookmarks/:comicParam/status
 * Check if a comic is bookmarked
 * 
 * Response:
 * {
 *   "status": "success",
 *   "message": "Bookmark status retrieved",
 *   "data": { "comicParam": "...", "isBookmarked": true/false }
 * }
 */
router.get(
  '/bookmarks/:comicParam/status',
  isAuthenticatedAPI,
  BookmarkController.checkBookmarkStatusAPI
);
console.log('[API_ROUTES] ✓ GET /api/bookmarks/:comicParam/status');

/**
 * POST /api/bookmarks/:comicParam/toggle
 * Toggle bookmark (add if not exists, remove if exists)
 * 
 * Response:
 * {
 *   "status": "success",
 *   "message": "Bookmark added/removed successfully",
 *   "data": { "comicParam": "...", "isBookmarked": true/false, "bookmark": {...} }
 * }
 * 
 * Error (404): Comic not found
 */
router.post(
  '/bookmarks/:comicParam/toggle',
  isAuthenticatedAPI,
  BookmarkController.toggleBookmarkAPI
);
console.log('[API_ROUTES] ✓ POST /api/bookmarks/:comicParam/toggle');

// ===========================================
// HISTORY API ROUTES
// ===========================================

/**
 * GET /api/history
 * Get user's reading history
 * 
 * Query Params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * 
 * Response:
 * {
 *   "status": "success",
 *   "message": "Reading history retrieved successfully",
 *   "data": {
 *     "history": [...],
 *     "pagination": {...}
 *   }
 * }
 */
router.get(
  '/history',
  isAuthenticatedAPI,
  HistoryController.listHistoryAPI
);
console.log('[API_ROUTES] ✓ GET /api/history');

/**
 * DELETE /api/history
 * Clear all reading history
 * 
 * Response:
 * {
 *   "status": "success",
 *   "message": "Reading history cleared",
 *   "data": { "deletedCount": 42 }
 * }
 */
router.delete(
  '/history',
  isAuthenticatedAPI,
  HistoryController.clearHistoryAPI
);
console.log('[API_ROUTES] ✓ DELETE /api/history');

/**
 * DELETE /api/history/:comicParam
 * Remove single history entry
 * 
 * Response:
 * {
 *   "status": "success",
 *   "message": "History entry removed",
 *   "data": { "comicParam": "...", "removed": true }
 * }
 * 
 * Error (404): History entry not found
 */
router.delete(
  '/history/:comicParam',
  isAuthenticatedAPI,
  HistoryController.removeHistoryAPI
);
console.log('[API_ROUTES] ✓ DELETE /api/history/:comicParam');

// ===========================================
// RESUME API ROUTES
// ===========================================

/**
 * GET /api/resume/:comicParam
 * Get resume data for a comic
 * 
 * Returns the last read chapter info for implementing resume feature.
 * 
 * Response (with history):
 * {
 *   "status": "success",
 *   "message": "Resume data retrieved",
 *   "data": {
 *     "hasProgress": true,
 *     "comicParam": "one-piece",
 *     "chapterParam": "chapter-1100",
 *     "chapter": { "param": "...", "label": "..." },
 *     "lastReadAt": "2026-01-02T...",
 *     "resumeUrl": "/comics/one-piece/chapter-1100"
 *   }
 * }
 * 
 * Response (no history):
 * {
 *   "data": {
 *     "hasProgress": false,
 *     "chapterParam": "chapter-1",  // First chapter
 *     ...
 *   }
 * }
 */
router.get(
  '/resume/:comicParam',
  isAuthenticatedAPI,
  HistoryController.getResumeAPI
);
console.log('[API_ROUTES] ✓ GET /api/resume/:comicParam');

console.log('[API_ROUTES] User API routes loaded successfully');

module.exports = router;
