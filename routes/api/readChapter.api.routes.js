/**
 * ===========================================
 * AF-Komik V2 - Read Chapter API Routes
 * ===========================================
 * 
 * API endpoints for managing read chapter status.
 * All routes require authentication.
 * 
 * Routes:
 * - POST   /api/read-chapters/mark          - Mark chapter as read
 * - DELETE /api/read-chapters/unmark        - Unmark chapter as read
 * - GET    /api/read-chapters/status/:id    - Get read status
 * - GET    /api/read-chapters/comic/:id     - Get read chapters for comic
 * - GET    /api/read-chapters/stats         - Get user statistics
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/smartLogger');

// Import controller
const ReadChapterController = require('../../controllers/readChapterController');

// Import middleware
const { isAuthenticatedAPI } = require('../../middlewares');

logger.debug('[ROUTES] Registering read chapter API routes...');

// ===========================================
// Mark/Unmark Chapter Routes
// ===========================================

/**
 * POST /api/read-chapters/mark
 * 
 * Mark a chapter as read.
 * Requires authentication.
 * 
 * Request Body:
 * {
 *   chapterId: number,
 *   comicId: number
 * }
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Chapter marked as read",
 *   data: {
 *     readChapter: {
 *       chapterId: number,
 *       comicId: number,
 *       readAt: Date
 *     }
 *   }
 * }
 */
router.post('/mark', isAuthenticatedAPI, ReadChapterController.markAsRead);
logger.debug('[ROUTES] Registered: POST /api/read-chapters/mark');

/**
 * DELETE /api/read-chapters/unmark
 * 
 * Unmark a chapter as read.
 * Requires authentication.
 * 
 * Request Body:
 * {
 *   chapterId: number
 * }
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Chapter unmarked as read",
 *   data: {
 *     chapterId: number
 *   }
 * }
 */
router.delete('/unmark', isAuthenticatedAPI, ReadChapterController.unmarkAsRead);
logger.debug('[ROUTES] Registered: DELETE /api/read-chapters/unmark');

// ===========================================
// Read Status Query Routes
// ===========================================

/**
 * GET /api/read-chapters/status/:chapterId
 * 
 * Get read status for a specific chapter.
 * Optional authentication (returns false if not authenticated).
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Read status retrieved",
 *   data: {
 *     chapterId: number,
 *     isRead: boolean
 *   }
 * }
 */
router.get('/status/:chapterId', ReadChapterController.getReadStatus);
logger.debug('[ROUTES] Registered: GET /api/read-chapters/status/:chapterId');

/**
 * GET /api/read-chapters/comic/:comicId
 * 
 * Get all read chapter IDs for a comic.
 * Optional authentication (returns empty array if not authenticated).
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Read chapters retrieved",
 *   data: {
 *     comicId: number,
 *     readChapterIds: [number, ...],
 *     total: number
 *   }
 * }
 */
router.get('/comic/:comicId', ReadChapterController.getReadChaptersByComic);
logger.debug('[ROUTES] Registered: GET /api/read-chapters/comic/:comicId');

// ===========================================
// User Statistics Route
// ===========================================

/**
 * GET /api/read-chapters/stats
 * 
 * Get user's read chapter statistics.
 * Requires authentication.
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "User statistics retrieved",
 *   data: {
 *     totalChaptersRead: number,
 *     totalComicsRead: number
 *   }
 * }
 */
router.get('/stats', isAuthenticatedAPI, ReadChapterController.getUserStats);
logger.debug('[ROUTES] Registered: GET /api/read-chapters/stats');

logger.debug('[ROUTES] Read chapter API routes registration complete');

module.exports = router;
