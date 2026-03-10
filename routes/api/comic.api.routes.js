/**
 * ===========================================
 * AF-Komik V2 - Comic API Routes
 * ===========================================
 * 
 * REST API routes for comic content.
 * All routes return JSON responses.
 * These routes are PUBLIC - accessible without authentication.
 * 
 * Base Path: /api/comics
 * 
 * Routes:
 * - GET /api/comics                         - List comics
 * - GET /api/comics/:param                  - Comic detail
 * - GET /api/comics/:param/chapters         - List chapters
 * - GET /api/comics/:param/chapters/:chapterParam - Read chapter
 * 
 * Response Format:
 * {
 *   "status": "success" | "error",
 *   "message": "Human readable message",
 *   "data": object | array | null
 * }
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/smartLogger');

// Import controllers
const ComicController = require('../../controllers/comicController');
const ChapterController = require('../../controllers/chapterController');

logger.debug('[ROUTES] Registering comic API routes...');

// ===========================================
// Comic List API
// ===========================================

/**
 * GET /api/comics/search
 * 
 * Search and filter comics.
 * 
 * Query Parameters:
 * - q or search: Search keyword
 * - genre: Genre filter
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Search results retrieved",
 *   data: {
 *     comics: [...],
 *     search: { keyword, genre },
 *     pagination: {...}
 *   }
 * }
 */
router.get('/search', ComicController.searchComicsAPI);
logger.debug('[ROUTES] Registered: GET /api/comics/search');

/**
 * GET /api/comics/genres
 * 
 * Get all unique genres.
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Genres retrieved",
 *   data: {
 *     genres: ["Action", ...],
 *     total: number
 *   }
 * }
 */
router.get('/genres', ComicController.getGenresAPI);
logger.debug('[ROUTES] Registered: GET /api/comics/genres');

/**
 * GET /api/comics
 * 
 * Get paginated list of all comics.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 50)
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Comics retrieved successfully",
 *   data: {
 *     comics: [...],
 *     pagination: { current, total, limit, totalItems, hasNext, hasPrev }
 *   }
 * }
 */
router.get('/', ComicController.listComicsAPI);
logger.debug('[ROUTES] Registered: GET /api/comics');

// ===========================================
// Comic Detail API
// ===========================================

/**
 * GET /api/comics/:param
 * 
 * Get comic details by URL slug.
 * 
 * URL Parameters:
 * - param: Comic URL slug (e.g., "one-piece")
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Comic retrieved successfully",
 *   data: {
 *     comic: {...},
 *     chapterCount: number
 *   }
 * }
 * 
 * Error (404):
 * {
 *   status: "error",
 *   message: "Comic not found",
 *   data: null
 * }
 */
router.get('/:param', ComicController.getComicDetailAPI);
logger.debug('[ROUTES] Registered: GET /api/comics/:param');

// ===========================================
// Chapter List API
// ===========================================

/**
 * GET /api/comics/:param/chapters
 * 
 * Get all chapters for a comic.
 * 
 * URL Parameters:
 * - param: Comic URL slug (e.g., "one-piece")
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Chapters retrieved successfully",
 *   data: {
 *     comic: { param, title },
 *     chapters: [...],
 *     total: number
 *   }
 * }
 */
router.get('/:param/chapters', ComicController.getChaptersAPI);
logger.debug('[ROUTES] Registered: GET /api/comics/:param/chapters');

// ===========================================
// Chapter Reader API
// ===========================================

/**
 * GET /api/comics/:param/chapters/:chapterParam
 * 
 * Get chapter content with all images for reading.
 * 
 * URL Parameters:
 * - param: Comic URL slug (e.g., "one-piece")
 * - chapterParam: Chapter URL slug (e.g., "chapter-1100")
 * 
 * Response:
 * {
 *   status: "success",
 *   message: "Chapter retrieved successfully",
 *   data: {
 *     chapter: { id, param, label, releaseDate },
 *     comic: { param, title, thumbnail },
 *     images: [{ id, pageNumber, url }, ...],
 *     pageCount: number,
 *     navigation: {
 *       prev: { param, label } | null,
 *       next: { param, label } | null
 *     }
 *   }
 * }
 */
router.get('/:param/chapters/:chapterParam', ChapterController.readChapterAPI);
logger.debug('[ROUTES] Registered: GET /api/comics/:param/chapters/:chapterParam');

logger.debug('[ROUTES] Comic API routes registration complete');

module.exports = router;
