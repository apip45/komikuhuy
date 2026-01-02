/**
 * ===========================================
 * AF-Komik V2 - Bookmark Controller
 * ===========================================
 * 
 * Controller for handling bookmark operations.
 * Provides both web (EJS redirect) and API (JSON) handlers.
 * 
 * Features:
 * - Add/remove comic bookmarks
 * - Toggle bookmark status
 * - List user's bookmarks with pagination
 * - Check bookmark status for a comic
 * 
 * Data Flow:
 * 1. User clicks "Bookmark" on a comic page
 * 2. Controller validates comic exists in MySQL
 * 3. Bookmark is saved to MongoDB with cached comic data
 * 4. User can view all bookmarks in /my/bookmarks
 * 
 * Security:
 * - All operations require authentication
 * - Users can only access their own bookmarks
 * - Comic existence validated against MySQL
 */

const logger = require('../config/logger');
const Bookmark = require('../models/mongo/Bookmark');
const ComicModel = require('../models/mysql/comic.model');
const { 
  successResponse, 
  created, 
  ok, 
  notFound, 
  conflict,
  serverError 
} = require('../utils/apiResponse');

/**
 * Bookmark controller with web and API handlers
 */
const BookmarkController = {
  
  // ===========================================
  // WEB HANDLERS (EJS + Redirects)
  // ===========================================
  
  /**
   * Add bookmark (Web)
   * 
   * POST /bookmarks/:comicParam
   * 
   * Adds a comic to user's bookmarks and redirects back.
   * If already bookmarked, still redirects (no error).
   */
  addBookmarkWeb: async (req, res) => {
    const { comicParam } = req.params;
    const userId = req.user._id;
    const referer = req.get('Referer') || `/comics/${comicParam}`;
    
    try {
      // Check if comic exists in MySQL
      const comic = await ComicModel.getByParam(comicParam);
      if (!comic) {
        logger.warn(`[Bookmark] Comic not found: ${comicParam}`);
        req.flash('error', 'Komik tidak ditemukan');
        return res.redirect(referer);
      }
      
      // Check if already bookmarked
      const isBookmarked = await Bookmark.isBookmarked(userId, comicParam);
      if (isBookmarked) {
        logger.info(`[Bookmark] Already bookmarked: ${comicParam} by user ${userId}`);
        req.flash('info', 'Komik sudah ada di bookmark');
        return res.redirect(referer);
      }
      
      // Create bookmark with cached data
      await Bookmark.create({
        userId,
        comicParam: comicParam.toLowerCase(),
        cachedComic: {
          title: comic.title,
          thumbnail: comic.thumbnail,
          latestChapter: comic.latest_chapter || null,
          genres: comic.genres ? comic.genres.split(',').map(g => g.trim()) : []
        }
      });
      
      logger.info(`[Bookmark] Added: ${comicParam} by user ${userId}`);
      req.flash('success', 'Berhasil ditambahkan ke bookmark');
      return res.redirect(referer);
      
    } catch (error) {
      logger.error(`[Bookmark] Error adding bookmark: ${error.message}`);
      req.flash('error', 'Gagal menambahkan bookmark');
      return res.redirect(referer);
    }
  },
  
  /**
   * Remove bookmark (Web)
   * 
   * POST /bookmarks/:comicParam/remove
   * 
   * Removes a comic from user's bookmarks and redirects back.
   */
  removeBookmarkWeb: async (req, res) => {
    const { comicParam } = req.params;
    const userId = req.user._id;
    const referer = req.get('Referer') || '/my/bookmarks';
    
    try {
      const result = await Bookmark.deleteOne({ 
        userId, 
        comicParam: comicParam.toLowerCase() 
      });
      
      if (result.deletedCount > 0) {
        logger.info(`[Bookmark] Removed: ${comicParam} by user ${userId}`);
        req.flash('success', 'Bookmark dihapus');
      } else {
        logger.warn(`[Bookmark] Not found for removal: ${comicParam}`);
        req.flash('info', 'Bookmark tidak ditemukan');
      }
      
      return res.redirect(referer);
      
    } catch (error) {
      logger.error(`[Bookmark] Error removing bookmark: ${error.message}`);
      req.flash('error', 'Gagal menghapus bookmark');
      return res.redirect(referer);
    }
  },
  
  /**
   * List bookmarks page (Web)
   * 
   * GET /my/bookmarks
   * 
   * Renders the bookmarks page with paginated results.
   */
  listBookmarksPage: async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;
    
    try {
      // Get bookmarks and total count
      const [bookmarks, totalItems] = await Promise.all([
        Bookmark.findByUser(userId, { limit, skip }),
        Bookmark.countByUser(userId)
      ]);
      
      const totalPages = Math.ceil(totalItems / limit);
      
      // Format bookmarks for display
      const formattedBookmarks = bookmarks.map(bookmark => ({
        id: bookmark._id,
        comicParam: bookmark.comicParam,
        title: bookmark.cachedComic?.title || bookmark.comicParam,
        thumbnail: bookmark.cachedComic?.thumbnail || '/images/no-cover.png',
        latestChapter: bookmark.cachedComic?.latestChapter || null,
        genres: bookmark.cachedComic?.genres || [],
        createdAt: bookmark.createdAt
      }));
      
      logger.info(`[Bookmark] List page: user ${userId}, page ${page}, count ${bookmarks.length}`);
      
      return res.render('pages/bookmarks', {
        title: 'Bookmark Saya',
        bookmarks: formattedBookmarks,
        pagination: {
          current: page,
          total: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          totalItems
        }
      });
      
    } catch (error) {
      logger.error(`[Bookmark] Error listing bookmarks: ${error.message}`);
      return res.status(500).render('errors/500', {
        title: 'Server Error',
        message: 'Gagal memuat bookmark'
      });
    }
  },
  
  // ===========================================
  // API HANDLERS (JSON Response)
  // ===========================================
  
  /**
   * Add bookmark (API)
   * 
   * POST /api/bookmarks/:comicParam
   * 
   * @returns {Object} Created bookmark data
   */
  addBookmarkAPI: async (req, res) => {
    const { comicParam } = req.params;
    const userId = req.user._id;
    
    try {
      // Check if comic exists in MySQL
      const comic = await ComicModel.getByParam(comicParam);
      if (!comic) {
        logger.warn(`[Bookmark API] Comic not found: ${comicParam}`);
        return notFound(res, 'Comic not found');
      }
      
      // Check if already bookmarked
      const isBookmarked = await Bookmark.isBookmarked(userId, comicParam);
      if (isBookmarked) {
        logger.info(`[Bookmark API] Already bookmarked: ${comicParam}`);
        return conflict(res, 'Already bookmarked');
      }
      
      // Create bookmark
      const bookmark = await Bookmark.create({
        userId,
        comicParam: comicParam.toLowerCase(),
        cachedComic: {
          title: comic.title,
          thumbnail: comic.thumbnail,
          latestChapter: comic.latest_chapter || null,
          genres: comic.genres ? comic.genres.split(',').map(g => g.trim()) : []
        }
      });
      
      logger.info(`[Bookmark API] Added: ${comicParam} by user ${userId}`);
      
      return created(res, 'Bookmark added successfully', {
        bookmark: {
          id: bookmark._id,
          comicParam: bookmark.comicParam,
          comic: {
            title: bookmark.cachedComic.title,
            thumbnail: bookmark.cachedComic.thumbnail
          },
          createdAt: bookmark.createdAt
        }
      });
      
    } catch (error) {
      logger.error(`[Bookmark API] Error adding: ${error.message}`);
      return serverError(res, 'Failed to add bookmark');
    }
  },
  
  /**
   * Remove bookmark (API)
   * 
   * DELETE /api/bookmarks/:comicParam
   * 
   * @returns {Object} Success confirmation
   */
  removeBookmarkAPI: async (req, res) => {
    const { comicParam } = req.params;
    const userId = req.user._id;
    
    try {
      const result = await Bookmark.deleteOne({ 
        userId, 
        comicParam: comicParam.toLowerCase() 
      });
      
      if (result.deletedCount === 0) {
        logger.warn(`[Bookmark API] Not found: ${comicParam}`);
        return notFound(res, 'Bookmark not found');
      }
      
      logger.info(`[Bookmark API] Removed: ${comicParam} by user ${userId}`);
      
      return ok(res, 'Bookmark removed successfully');
      
    } catch (error) {
      logger.error(`[Bookmark API] Error removing: ${error.message}`);
      return serverError(res, 'Failed to remove bookmark');
    }
  },
  
  /**
   * List bookmarks (API)
   * 
   * GET /api/bookmarks
   * 
   * @returns {Object} Paginated bookmark list
   */
  listBookmarksAPI: async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    
    try {
      const [bookmarks, totalItems] = await Promise.all([
        Bookmark.findByUser(userId, { limit, skip }),
        Bookmark.countByUser(userId)
      ]);
      
      const totalPages = Math.ceil(totalItems / limit);
      
      const formattedBookmarks = bookmarks.map(bookmark => ({
        id: bookmark._id,
        comicParam: bookmark.comicParam,
        comic: {
          title: bookmark.cachedComic?.title || bookmark.comicParam,
          thumbnail: bookmark.cachedComic?.thumbnail || null,
          latestChapter: bookmark.cachedComic?.latestChapter || null,
          genres: bookmark.cachedComic?.genres || []
        },
        createdAt: bookmark.createdAt
      }));
      
      logger.info(`[Bookmark API] List: user ${userId}, page ${page}`);
      
      return successResponse(res, 'Bookmarks retrieved successfully', {
        bookmarks: formattedBookmarks,
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      logger.error(`[Bookmark API] Error listing: ${error.message}`);
      return serverError(res, 'Failed to retrieve bookmarks');
    }
  },
  
  /**
   * Check bookmark status (API)
   * 
   * GET /api/bookmarks/:comicParam/status
   * 
   * @returns {Object} Bookmark status
   */
  checkBookmarkStatusAPI: async (req, res) => {
    const { comicParam } = req.params;
    const userId = req.user._id;
    
    try {
      const isBookmarked = await Bookmark.isBookmarked(userId, comicParam);
      
      return successResponse(res, 'Bookmark status retrieved', {
        comicParam,
        isBookmarked
      });
      
    } catch (error) {
      logger.error(`[Bookmark API] Error checking status: ${error.message}`);
      return serverError(res, 'Failed to check bookmark status');
    }
  },
  
  /**
   * Toggle bookmark (API)
   * 
   * POST /api/bookmarks/:comicParam/toggle
   * 
   * Adds if not bookmarked, removes if bookmarked.
   * @returns {Object} New bookmark status
   */
  toggleBookmarkAPI: async (req, res) => {
    const { comicParam } = req.params;
    const userId = req.user._id;
    
    try {
      // Check if comic exists in MySQL
      const comic = await ComicModel.getByParam(comicParam);
      if (!comic) {
        logger.warn(`[Bookmark API] Comic not found: ${comicParam}`);
        return notFound(res, 'Comic not found');
      }
      
      // Prepare cached data
      const cachedComic = {
        title: comic.title,
        thumbnail: comic.thumbnail,
        latestChapter: comic.latest_chapter || null,
        genres: comic.genres ? comic.genres.split(',').map(g => g.trim()) : []
      };
      
      // Toggle
      const { added, bookmark } = await Bookmark.toggle(
        userId, 
        comicParam.toLowerCase(), 
        cachedComic
      );
      
      logger.info(`[Bookmark API] Toggled: ${comicParam}, added: ${added}`);
      
      return successResponse(res, added ? 'Bookmark added' : 'Bookmark removed', {
        comicParam,
        isBookmarked: added,
        bookmark: added ? {
          id: bookmark._id,
          createdAt: bookmark.createdAt
        } : null
      });
      
    } catch (error) {
      logger.error(`[Bookmark API] Error toggling: ${error.message}`);
      return serverError(res, 'Failed to toggle bookmark');
    }
  },
  
  /**
   * Check multiple bookmark statuses (API)
   * 
   * POST /api/bookmarks/batch-status
   * 
   * @body {string[]} comicParams - Array of comic params
   * @returns {Object} Map of comicParam -> isBookmarked
   */
  batchCheckStatusAPI: async (req, res) => {
    const userId = req.user._id;
    const { comicParams } = req.body;
    
    try {
      if (!Array.isArray(comicParams) || comicParams.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'comicParams array is required'
        });
      }
      
      // Limit to 100 items
      const limitedParams = comicParams.slice(0, 100);
      
      const statuses = await Bookmark.getBookmarkStatuses(userId, limitedParams);
      
      return successResponse(res, 'Bookmark statuses retrieved', {
        statuses
      });
      
    } catch (error) {
      logger.error(`[Bookmark API] Error batch check: ${error.message}`);
      return serverError(res, 'Failed to check bookmark statuses');
    }
  }
};

module.exports = BookmarkController;
