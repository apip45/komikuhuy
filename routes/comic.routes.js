/**
 * ===========================================
 * AF-Komik V2 - Comic Web Routes
 * ===========================================
 * 
 * Web routes for comic browsing and reading.
 * All routes render EJS templates.
 * These routes are PUBLIC - accessible by guests and users.
 * 
 * Routes:
 * - GET /comics              - Comic list page
 * - GET /comics/:param       - Comic detail page
 * - GET /comics/:param/:chapterParam - Chapter reader page
 * 
 * URL Structure:
 * - /comics                  → List all comics
 * - /comics/one-piece        → One Piece detail page
 * - /comics/one-piece/chapter-1100 → Read Chapter 1100
 */

const express = require('express');
const router = express.Router();

// Import controllers
const ComicController = require('../controllers/comicController');
const ChapterController = require('../controllers/chapterController');

// Import middleware (for optional user attachment)
const { attachUser } = require('../middlewares');

console.log('[ROUTES] Registering comic web routes...');

// ===========================================
// Comic List Route
// ===========================================

/**
 * GET /comics
 * 
 * Display paginated list of all comics.
 * Accessible by guests (no auth required).
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * 
 * Renders: pages/comics.ejs
 */
router.get('/', attachUser, ComicController.listComicsPage);
console.log('[ROUTES] Registered: GET /comics');

// ===========================================
// Comic Detail Route
// ===========================================

/**
 * GET /comics/:param
 * 
 * Display comic details with chapter list.
 * Accessible by guests (no auth required).
 * 
 * URL Parameters:
 * - param: Comic URL slug (e.g., "one-piece")
 * 
 * Renders: pages/comic-detail.ejs
 * Error: 404 if comic not found
 */
router.get('/:param', attachUser, ComicController.getComicDetailPage);
console.log('[ROUTES] Registered: GET /comics/:param');

// ===========================================
// Chapter Reader Route
// ===========================================

/**
 * GET /comics/:param/:chapterParam
 * 
 * Display chapter reader with all page images.
 * Accessible by guests (no auth required).
 * 
 * URL Parameters:
 * - param: Comic URL slug (e.g., "one-piece")
 * - chapterParam: Chapter URL slug (e.g., "chapter-1100")
 * 
 * Renders: pages/chapter-reader.ejs
 * Error: 404 if comic or chapter not found
 */
router.get('/:param/:chapterParam', attachUser, ChapterController.readChapterPage);
console.log('[ROUTES] Registered: GET /comics/:param/:chapterParam');

console.log('[ROUTES] Comic web routes registration complete');

module.exports = router;
