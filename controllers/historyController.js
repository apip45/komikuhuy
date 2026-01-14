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

const logger = require('../config/logger');
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
    
    console.log(`[HISTORY_CTRL] saveProgress() - User: ${userId}, Comic: ${comicParam}, Chapter: ${chapterParam}`);
    
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
      
      console.log(`[HISTORY_CTRL] ✓ Progress saved: ${comicParam}/${chapterParam}`);
      logger.info(`Reading progress saved: ${comicParam}/${chapterParam}`);
      
      return history;
      
    } catch (error) {
      // Log error but don't throw - history saving should not break reading experience
      console.error(`[HISTORY_CTRL] saveProgress() - Error: ${error.message}`);
      logger.error(`Reading progress save error: ${error.message}`);
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
    
    console.log(`[HISTORY_CTRL] listHistoryPage() - User: ${username}, Page: ${page}`);
    logger.info(`History list view: ${username}, page ${page}`);
    
    try {
      // Fetch history and count in parallel
      const [history, totalHistory] = await Promise.all([
        ReadingHistory.findByUser(userId, { limit, skip }),
        ReadingHistory.countByUser(userId)
      ]);
      
      // Calculate pagination
      const totalPages = Math.ceil(totalHistory / limit);
      
      console.log(`[HISTORY_CTRL] Found ${history.length} history entries (total: ${totalHistory})`);
      
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
        }
      });
      
    } catch (error) {
      console.error(`[HISTORY_CTRL] listHistoryPage() - Error: ${error.message}`);
      logger.error(`History list error: ${error.message}`);
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
    
    console.log(`[HISTORY_CTRL] resumeReadingWeb() - User: ${username}, Comic: ${comicParam}`);
    logger.info(`Resume request: ${username} -> ${comicParam}`);
    
    try {
      // Get last read chapter from history
      const history = await ReadingHistory.getLastRead(userId, comicParam);
      
      if (history && history.chapterParam) {
        // Verify chapter still exists in MySQL
        const chapter = await ChapterModel.findByParams(comicParam, history.chapterParam);
        
        if (chapter) {
          console.log(`[HISTORY_CTRL] ✓ Resuming: ${comicParam}/${history.chapterParam}`);
          logger.info(`Resume successful: ${username} -> ${comicParam}/${history.chapterParam}`);
          return res.redirect(`/comics/${comicParam}/${history.chapterParam}`);
        } else {
          console.log(`[HISTORY_CTRL] Chapter no longer exists: ${history.chapterParam}`);
          logger.warn(`Resume chapter missing: ${comicParam}/${history.chapterParam}`);
        }
      }
      
      // No history or chapter missing - try first chapter
      console.log(`[HISTORY_CTRL] No history found, looking for first chapter`);
      
      // Get comic first to validate it exists
      const comic = await ComicModel.findByParam(comicParam);
      
      if (!comic) {
        console.log(`[HISTORY_CTRL] Comic not found: ${comicParam}`);
        return res.redirect('/comics?error=' + encodeURIComponent('Komik tidak ditemukan'));
      }
      
      // Get first chapter
      const firstChapter = await ChapterModel.getFirstChapter(comic.id);
      
      if (firstChapter) {
        console.log(`[HISTORY_CTRL] Redirecting to first chapter: ${firstChapter.param}`);
        return res.redirect(`/comics/${comicParam}/${firstChapter.param}`);
      }
      
      // No chapters available
      console.log(`[HISTORY_CTRL] No chapters available for: ${comicParam}`);
      return res.redirect(`/comics/${comicParam}?info=${encodeURIComponent('Belum ada chapter tersedia')}`);
      
    } catch (error) {
      console.error(`[HISTORY_CTRL] resumeReadingWeb() - Error: ${error.message}`);
      logger.error(`Resume error: ${error.message}`);
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
    
    console.log(`[HISTORY_CTRL] clearHistoryWeb() - User: ${username}`);
    logger.info(`History clear request: ${username}`);
    
    try {
      // Clear history
      const deletedCount = await ReadingHistory.clearUserHistory(userId);
      
      // Also clear all read chapters for this user to maintain consistency
      const readChaptersDeleted = await ReadChapter.deleteMany({ userId });
      
      console.log(`[HISTORY_CTRL] ✓ Cleared ${deletedCount} history entries and ${readChaptersDeleted.deletedCount} read chapters`);
      logger.info(`History cleared: ${username}, ${deletedCount} history entries, ${readChaptersDeleted.deletedCount} read chapters`);
      
      return res.redirect('/my/history?success=' + encodeURIComponent(`${deletedCount} riwayat berhasil dihapus`));
      
    } catch (error) {
      console.error(`[HISTORY_CTRL] clearHistoryWeb() - Error: ${error.message}`);
      logger.error(`History clear error: ${error.message}`);
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
    
    console.log(`[HISTORY_CTRL] removeHistoryWeb() - User: ${username}, Comic: ${comicParam}`);
    logger.info(`History remove request: ${username} -> ${comicParam}`);
    
    try {
      // Get comic ID from param
      const comic = await ComicModel.findByParam(comicParam);
      
      // Remove history
      const removed = await ReadingHistory.removeEntry(userId, comicParam);
      
      if (removed) {
        // Also remove all read chapters for this comic to maintain consistency
        if (comic) {
          const readChaptersDeleted = await ReadChapter.deleteMany({ userId, comicId: comic.id });
          console.log(`[HISTORY_CTRL] ✓ History removed: ${comicParam}, ${readChaptersDeleted.deletedCount} read chapters cleared`);
          logger.info(`History removed: ${username} -> ${comicParam}, ${readChaptersDeleted.deletedCount} read chapters`);
        } else {
          console.log(`[HISTORY_CTRL] ✓ History removed: ${comicParam}`);
          logger.info(`History removed: ${username} -> ${comicParam}`);
        }
        
        return res.redirect('/my/history?success=' + encodeURIComponent('Riwayat berhasil dihapus'));
      } else {
        console.log(`[HISTORY_CTRL] History not found: ${comicParam}`);
        return res.redirect('/my/history?info=' + encodeURIComponent('Riwayat tidak ditemukan'));
      }
      
    } catch (error) {
      console.error(`[HISTORY_CTRL] removeHistoryWeb() - Error: ${error.message}`);
      logger.error(`History remove error: ${error.message}`);
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
    
    console.log(`[HISTORY_API] listHistory() - User: ${username}, Page: ${page}`);
    logger.info(`API History list: ${username}, page ${page}`);
    
    try {
      const [history, totalHistory] = await Promise.all([
        ReadingHistory.findByUser(userId, { limit, skip }),
        ReadingHistory.countByUser(userId)
      ]);
      
      const totalPages = Math.ceil(totalHistory / limit);
      
      console.log(`[HISTORY_API] Found ${history.length} history entries`);
      
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
      console.error(`[HISTORY_API] listHistory() - Error: ${error.message}`);
      logger.error(`API History list error: ${error.message}`);
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
    
    console.log(`[HISTORY_API] getResume() - User: ${username}, Comic: ${comicParam}`);
    logger.info(`API Resume request: ${username} -> ${comicParam}`);
    
    try {
      // Get last read from history
      const history = await ReadingHistory.getLastRead(userId, comicParam);
      
      if (history) {
        // Verify chapter still exists
        const chapter = await ChapterModel.findByParams(comicParam, history.chapterParam);
        
        if (chapter) {
          console.log(`[HISTORY_API] ✓ Resume data found: ${history.chapterParam}`);
          
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
      console.log(`[HISTORY_API] No history, checking first chapter`);
      
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
      console.error(`[HISTORY_API] getResume() - Error: ${error.message}`);
      logger.error(`API Resume error: ${error.message}`);
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
    
    console.log(`[HISTORY_API] clearHistory() - User: ${username}`);
    logger.info(`API History clear: ${username}`);
    
    try {
      // Clear history
      const deletedCount = await ReadingHistory.clearUserHistory(userId);
      
      // Also clear all read chapters for this user to maintain consistency
      const readChaptersDeleted = await ReadChapter.deleteMany({ userId });
      
      console.log(`[HISTORY_API] ✓ Cleared ${deletedCount} history entries and ${readChaptersDeleted.deletedCount} read chapters`);
      logger.info(`API History cleared: ${username}, ${deletedCount} history, ${readChaptersDeleted.deletedCount} read chapters`);
      
      return ok(res, 'Reading history cleared', {
        deletedCount,
        readChaptersCleared: readChaptersDeleted.deletedCount
      });
      
    } catch (error) {
      console.error(`[HISTORY_API] clearHistory() - Error: ${error.message}`);
      logger.error(`API History clear error: ${error.message}`);
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
    
    console.log(`[HISTORY_API] removeHistory() - User: ${username}, Comic: ${comicParam}`);
    logger.info(`API History remove: ${username} -> ${comicParam}`);
    
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
          console.log(`[HISTORY_API] ✓ History removed: ${comicParam}, ${readChaptersCleared} read chapters cleared`);
          logger.info(`API History removed: ${username} -> ${comicParam}, ${readChaptersCleared} read chapters`);
        } else {
          console.log(`[HISTORY_API] ✓ History removed: ${comicParam}`);
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
      console.error(`[HISTORY_API] removeHistory() - Error: ${error.message}`);
      logger.error(`API History remove error: ${error.message}`);
      return serverError(res, 'Failed to remove history entry');
    }
  }
};

module.exports = HistoryController;
