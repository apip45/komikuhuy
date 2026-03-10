/**
 * ===========================================
 * AF-Komik V2 - History Controller
 * ===========================================
 * 
 * Controller for handling reading history operations.
 * Provides both web (EJS redirect) and API (JSON) handlers.
 * 
 * Features:
 * - Auto-save reading progress when user reads a chapter
 * - List user's reading history with pagination
 * - Resume reading (get last read chapter for a comic)
 * - Clear history
 * 
 * Data Flow:
 * 1. User opens a chapter
 * 2. If logged in, reading progress is saved/updated in MongoDB
 * 3. MongoDB stores: userId, comicParam, chapterParam, lastReadAt
 * 4. When user visits "Resume", redirect to last read chapter
 * 
 * Security:
 * - All operations require authentication
 * - Users can only access their own history
 * - Comic/chapter existence validated against MySQL
 */

const logger = require('../utils/smartLogger');
const ReadingHistory = require('../models/mongo/ReadingHistory');
const { ReadChapter } = require('../models/mongo');
const ComicModel = require('../models/mysql/comic.model');
const ChapterModel = require('../models/mysql/chapter.model');
const { 
  successResponse, 
  ok, 
  notFound, 
  serverError 
} = require('../utils/apiResponse');

/**
 * History controller with web and API handlers
 */
const HistoryController = {
  
  // ===========================================
  // CORE FUNCTION - Save Reading Progress
  // ===========================================
  
  /**
   * Save or update reading history
   * 
   * Called automatically when user reads a chapter.
   * This is not a route handler - it's called from chapterController.
   * 
   * @param {ObjectId} userId - User's MongoDB ID
   * @param {Object} comicData - Comic info from MySQL
   * @param {Object} chapterData - Chapter info from MySQL
   * @param {number} totalPages - Total pages in the chapter
   * @returns {Promise<Object>} The history entry
   */
  async saveProgress(userId, comicData, chapterData, totalPages = 0) {
    const comicParam = comicData.param;
    const chapterParam = chapterData.param;
    
    logger.debug(`[HISTORY_CTRL] saveProgress() - User: ${userId}, Comic: ${comicParam}, Chapter: ${chapterParam}`);
    
    try {
      // Save or update history using upsert
      const history = await ReadingHistory.saveProgress(
        userId,
        comicParam,
        chapterParam,
        {
          comicTitle: comicData.title,
          comicThumbnail: comicData.thumbnail,
          chapterLabel: chapterData.label || chapterData.chapter_label,
          totalPages
        }
      );
      
      logger.info(`Reading progress saved: ${comicParam}/${chapterParam}`);
      
      return history;
      
    } catch (error) {
      // Log error but don't throw - history saving should not break reading experience
      logger.error(`Reading progress save error: ${error.message}`, { userId, comicParam, chapterParam, error: error.message });
      return null;
    }
  },
  
  // ===========================================
  // WEB HANDLERS (EJS Rendering)
  // ===========================================
  
  /**
   * Display user's reading history (Web)
   * 
   * GET /my/history
   * 
   * Shows paginated list of recently read comics.
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async listHistoryPage(req, res) {
    const userId = req.user._id;
    const username = req.user.username;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    logger.debug(`[HISTORY_CTRL] listHistoryPage() - User: ${username}, Page: ${page}`);
    
    try {
      // Fetch history and count in parallel
      const [history, totalHistory] = await Promise.all([
        ReadingHistory.findByUser(userId, { limit, skip }),
        ReadingHistory.countByUser(userId)
      ]);
      
      // Calculate pagination
      const totalPages = Math.ceil(totalHistory / limit);
      
      logger.info(`History list view: ${username}, page ${page}, found ${history.length}/${totalHistory}`);
      
      // Render history page
      res.render('pages/history', {
        title: 'Riwayat Bacaan - AF-Komik',
        currentPage: 'history',
        user: req.user.getPublicProfile(),
        history,
        pagination: {
          current: page,
          total: totalPages,
          totalItems: totalHistory,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        query: req.query
      });
      
    } catch (error) {
      logger.error(`History list error: ${error.message}`, { username, page, error: error.message });
      res.status(500).render('errors/500', {
        title: 'Server Error',
        message: 'Gagal memuat riwayat bacaan'
      });
    }
  },
  
  /**
   * Resume reading - redirect to last read chapter (Web)
   * 
   * GET /resume/:comicParam
   * 
   * Redirects user to their last read chapter of a comic.
   * If no history exists, redirects to first chapter.
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async resumeReadingWeb(req, res) {
    const { comicParam } = req.params;
    const userId = req.user._id;
    const username = req.user.username;
    
    logger.debug(`[HISTORY_CTRL] resumeReadingWeb() - User: ${username}, Comic: ${comicParam}`);
    
    try {
      // Get last read chapter from history
      const history = await ReadingHistory.getLastRead(userId, comicParam);
      
      if (history && history.chapterParam) {
        // Verify chapter still exists in MySQL
        const chapter = await ChapterModel.findByParams(comicParam, history.chapterParam);
        
        if (chapter) {
          logger.info(`Resume successful: ${username} -> ${comicParam}/${history.chapterParam}`);
          return res.redirect(`/comics/${comicParam}/${history.chapterParam}`);
        } else {
          logger.warn(`Resume chapter missing: ${comicParam}/${history.chapterParam}`);
        }
      }
      
      // No history or chapter missing - try first chapter
      logger.debug(`[HISTORY_CTRL] No history found, looking for first chapter`);
      
      // Get comic first to validate it exists
      const comic = await ComicModel.findByParam(comicParam);
      
      if (!comic) {
        logger.warn(`Comic not found: ${comicParam}`);
        return res.redirect('/comics?error=' + encodeURIComponent('Komik tidak ditemukan'));
      }
      
      // Get first chapter
      const firstChapter = await ChapterModel.getFirstChapter(comic.id);
      
      if (firstChapter) {
        logger.info(`Redirecting to first chapter: ${comicParam}/${firstChapter.param}`);
        return res.redirect(`/comics/${comicParam}/${firstChapter.param}`);
      }
      
      // No chapters available
      logger.info(`No chapters available for: ${comicParam}`);
      return res.redirect(`/comics/${comicParam}?info=${encodeURIComponent('Belum ada chapter tersedia')}`);
      
    } catch (error) {
      logger.error(`Resume error: ${error.message}`, { username, comicParam, error: error.message });
      return res.redirect(`/comics/${comicParam}?error=${encodeURIComponent('Gagal melanjutkan bacaan')}`);
    }
  },
  
  /**
   * Clear all reading history (Web)
   * 
   * POST /my/history/clear
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async clearHistoryWeb(req, res) {
    const userId = req.user._id;
    const username = req.user.username;
    
    logger.debug(`[HISTORY_CTRL] clearHistoryWeb() - User: ${username}`);
    
    try {
      // Clear history
      const deletedCount = await ReadingHistory.clearUserHistory(userId);
      
      // Also clear all read chapters for this user to maintain consistency
      const readChaptersDeleted = await ReadChapter.deleteMany({ userId });
      
      logger.info(`History cleared: ${username}, ${deletedCount} history entries, ${readChaptersDeleted.deletedCount} read chapters`);
      
      return res.redirect('/my/history?success=' + encodeURIComponent(`${deletedCount} riwayat berhasil dihapus`));
      
    } catch (error) {
      logger.error(`History clear error: ${error.message}`, { username, error: error.message });
      return res.redirect('/my/history?error=' + encodeURIComponent('Gagal menghapus riwayat'));
    }
  },
  
  /**
   * Remove single history entry (Web)
   * 
   * POST /my/history/:comicParam/remove
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async removeHistoryWeb(req, res) {
    const { comicParam } = req.params;
    const userId = req.user._id;
    const username = req.user.username;
    
    logger.debug(`[HISTORY_CTRL] removeHistoryWeb() - User: ${username}, Comic: ${comicParam}`);
    
    try {
      // Get comic ID from param
      const comic = await ComicModel.findByParam(comicParam);
      
      // Remove history
      const removed = await ReadingHistory.removeEntry(userId, comicParam);
      
      if (removed) {
        // Also remove all read chapters for this comic to maintain consistency
        if (comic) {
          const readChaptersDeleted = await ReadChapter.deleteMany({ userId, comicId: comic.id });
          logger.info(`History removed: ${username} -> ${comicParam}, ${readChaptersDeleted.deletedCount} read chapters`);
        } else {
          logger.info(`History removed: ${username} -> ${comicParam}`);
        }
        
        return res.redirect('/my/history?success=' + encodeURIComponent('Riwayat berhasil dihapus'));
      } else {
        logger.warn(`History not found: ${comicParam}`);
        return res.redirect('/my/history?info=' + encodeURIComponent('Riwayat tidak ditemukan'));
      }
      
    } catch (error) {
      logger.error(`History remove error: ${error.message}`, { username, comicParam, error: error.message });
      return res.redirect('/my/history?error=' + encodeURIComponent('Gagal menghapus riwayat'));
    }
  },
  
  // ===========================================
  // API HANDLERS (JSON Response)
  // ===========================================
  
  /**
   * List user's reading history (API)
   * 
   * GET /api/history
   * 
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 50)
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async listHistoryAPI(req, res) {
    const userId = req.user._id;
    const username = req.user.username;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;
    
    logger.debug(`[HISTORY_API] listHistory() - User: ${username}, Page: ${page}`);
    
    try {
      const [history, totalHistory] = await Promise.all([
        ReadingHistory.findByUser(userId, { limit, skip }),
        ReadingHistory.countByUser(userId)
      ]);
      
      const totalPages = Math.ceil(totalHistory / limit);
      
      logger.info(`API History list: ${username}, page ${page}, found ${history.length}/${totalHistory}`);
      
      return ok(res, 'Reading history retrieved successfully', {
        history: history.map(h => ({
          id: h._id,
          comicParam: h.comicParam,
          chapterParam: h.chapterParam,
          comic: {
            title: h.cachedData?.comicTitle,
            thumbnail: h.cachedData?.comicThumbnail
          },
          chapter: {
            param: h.chapterParam,
            label: h.cachedData?.chapterLabel,
            totalPages: h.cachedData?.totalPages
          },
          lastReadAt: h.lastReadAt
        })),
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalItems: totalHistory,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      logger.error(`API History list error: ${error.message}`, { username, page, limit, error: error.message });
      return serverError(res, 'Failed to retrieve reading history');
    }
  },
  
  /**
   * Get last read chapter for resume (API)
   * 
   * GET /api/resume/:comicParam
   * 
   * Returns the last read chapter info for a comic.
   * Used by mobile apps to implement resume feature.
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getResumeAPI(req, res) {
    const { comicParam } = req.params;
    const userId = req.user._id;
    const username = req.user.username;
    
    logger.debug(`[HISTORY_API] getResume() - User: ${username}, Comic: ${comicParam}`);
    
    try {
      // Get last read from history
      const history = await ReadingHistory.getLastRead(userId, comicParam);
      
      if (history) {
        // Verify chapter still exists
        const chapter = await ChapterModel.findByParams(comicParam, history.chapterParam);
        
        if (chapter) {
          logger.info(`API Resume data found: ${username} -> ${comicParam}/${history.chapterParam}`);
          
          return ok(res, 'Resume data retrieved', {
            hasProgress: true,
            comicParam,
            chapterParam: history.chapterParam,
            chapter: {
              param: history.chapterParam,
              label: history.cachedData?.chapterLabel || chapter.chapter_label,
              totalPages: history.cachedData?.totalPages
            },
            lastReadAt: history.lastReadAt,
            resumeUrl: `/comics/${comicParam}/${history.chapterParam}`
          });
        }
      }
      
      // No valid history - try to get first chapter
      logger.debug(`[HISTORY_API] No history, checking first chapter`);
      
      const comic = await ComicModel.findByParam(comicParam);
      
      if (!comic) {
        return notFound(res, 'Comic not found');
      }
      
      const firstChapter = await ChapterModel.getFirstChapter(comic.id);
      
      if (firstChapter) {
        return ok(res, 'No reading history, starting from first chapter', {
          hasProgress: false,
          comicParam,
          chapterParam: firstChapter.param,
          chapter: {
            param: firstChapter.param,
            label: firstChapter.chapter_label
          },
          lastReadAt: null,
          resumeUrl: `/comics/${comicParam}/${firstChapter.param}`
        });
      }
      
      return ok(res, 'No chapters available', {
        hasProgress: false,
        comicParam,
        chapterParam: null,
        chapter: null,
        lastReadAt: null,
        resumeUrl: `/comics/${comicParam}`
      });
      
    } catch (error) {
      logger.error(`API Resume error: ${error.message}`, { username, comicParam, error: error.message });
      return serverError(res, 'Failed to get resume data');
    }
  },
  
  /**
   * Clear all reading history (API)
   * 
   * DELETE /api/history
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async clearHistoryAPI(req, res) {
    const userId = req.user._id;
    const username = req.user.username;
    
    logger.debug(`[HISTORY_API] clearHistory() - User: ${username}`);
    
    try {
      // Clear history
      const deletedCount = await ReadingHistory.clearUserHistory(userId);
      
      // Also clear all read chapters for this user to maintain consistency
      const readChaptersDeleted = await ReadChapter.deleteMany({ userId });
      
      logger.info(`API History cleared: ${username}, ${deletedCount} history, ${readChaptersDeleted.deletedCount} read chapters`);
      
      return ok(res, 'Reading history cleared', {
        deletedCount,
        readChaptersCleared: readChaptersDeleted.deletedCount
      });
      
    } catch (error) {
      logger.error(`API History clear error: ${error.message}`, { username, error: error.message });
      return serverError(res, 'Failed to clear reading history');
    }
  },
  
  /**
   * Remove single history entry (API)
   * 
   * DELETE /api/history/:comicParam
   * 
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async removeHistoryAPI(req, res) {
    const { comicParam } = req.params;
    const userId = req.user._id;
    const username = req.user.username;
    
    logger.debug(`[HISTORY_API] removeHistory() - User: ${username}, Comic: ${comicParam}`);
    
    try {
      // Get comic ID from param
      const comic = await ComicModel.findByParam(comicParam);
      
      // Remove history
      const removed = await ReadingHistory.removeEntry(userId, comicParam);
      
      if (removed) {
        // Also remove all read chapters for this comic to maintain consistency
        let readChaptersCleared = 0;
        if (comic) {
          const readChaptersDeleted = await ReadChapter.deleteMany({ userId, comicId: comic.id });
          readChaptersCleared = readChaptersDeleted.deletedCount;
          logger.info(`API History removed: ${username} -> ${comicParam}, ${readChaptersCleared} read chapters`);
        } else {
          logger.info(`API History removed: ${username} -> ${comicParam}`);
        }
        
        return ok(res, 'History entry removed', {
          comicParam,
          removed: true,
          readChaptersCleared
        });
      } else {
        return notFound(res, 'History entry not found');
      }
      
    } catch (error) {
      logger.error(`API History remove error: ${error.message}`, { username, comicParam, error: error.message });
      return serverError(res, 'Failed to remove history entry');
    }
  }
};

module.exports = HistoryController;
