/**
 * ===========================================
 * AF-Komik V2 - Read Chapter Controller
 * ===========================================
 * 
 * Controller for managing read chapter status.
 * Handles marking chapters as read/unread.
 * 
 * Features:
 * - Mark chapter as read
 * - Unmark chapter as read
 * - Get read status for a chapter
 * - Get all read chapters for a comic
 * - Get user read statistics
 */

const logger = require('../utils/smartLogger');
const { ReadChapter } = require('../models/mongo');
const ChapterModel = require('../models/mysql/chapter.model');
const { successResponse, errorResponse, badRequest, unauthorized, serverError } = require('../utils/apiResponse');

/**
 * Read Chapter Controller
 */
const ReadChapterController = {
  
  /**
   * Mark a chapter as read
   * 
   * POST /api/read-chapters/mark
   * 
   * Request Body:
   * {
   *   chapterId: number,
   *   comicId: number
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markAsRead(req, res) {
    try {
      // Check authentication
      if (!req.user) {
        return unauthorized(res, 'You must be logged in to mark chapters as read');
      }
      
      const { chapterId, comicId } = req.body;
      
      // Validate input
      if (!chapterId || !comicId) {
        return badRequest(res, 'chapterId and comicId are required');
      }
      
      // Mark chapter as read
      const readChapter = await ReadChapter.markAsRead(req.user._id, chapterId, comicId);
      
      logger.info(`Chapter ${chapterId} marked as read by user ${req.user._id}`);
      
      return successResponse(res, 'Chapter marked as read', {
        readChapter: {
          chapterId: readChapter.chapterId,
          comicId: readChapter.comicId,
          readAt: readChapter.readAt
        }
      });
      
    } catch (error) {
      logger.error(`[READ_CHAPTER_CTRL] markAsRead() - Error: ${error.message}`);
      logger.error(`Mark as read error: ${error.message}`);
      return serverError(res, 'Failed to mark chapter as read');
    }
  },
  
  /**
   * Unmark a chapter as read
   * 
   * DELETE /api/read-chapters/unmark
   * 
   * Request Body:
   * {
   *   chapterId: number
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async unmarkAsRead(req, res) {
    try {
      // Check authentication
      if (!req.user) {
        return unauthorized(res, 'You must be logged in to unmark chapters');
      }
      
      const { chapterId } = req.body;
      
      // Validate input
      if (!chapterId) {
        return badRequest(res, 'chapterId is required');
      }
      
      // Unmark chapter as read
      await ReadChapter.unmarkAsRead(req.user._id, chapterId);
      
      logger.info(`Chapter ${chapterId} unmarked as read by user ${req.user._id}`);
      
      return successResponse(res, 'Chapter unmarked as read', {
        chapterId
      });
      
    } catch (error) {
      logger.error(`[READ_CHAPTER_CTRL] unmarkAsRead() - Error: ${error.message}`);
      logger.error(`Unmark as read error: ${error.message}`);
      return serverError(res, 'Failed to unmark chapter as read');
    }
  },
  
  /**
   * Get read status for a chapter
   * 
   * GET /api/read-chapters/status/:chapterId
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getReadStatus(req, res) {
    try {
      // Check authentication
      if (!req.user) {
        return successResponse(res, 'Read status retrieved', {
          isRead: false
        });
      }
      
      const { chapterId } = req.params;
      
      // Validate input
      if (!chapterId) {
        return badRequest(res, 'chapterId is required');
      }
      
      // Check if chapter is read
      const isRead = await ReadChapter.isRead(req.user._id, parseInt(chapterId));
      
      return successResponse(res, 'Read status retrieved', {
        chapterId: parseInt(chapterId),
        isRead
      });
      
    } catch (error) {
      logger.error(`[READ_CHAPTER_CTRL] getReadStatus() - Error: ${error.message}`);
      logger.error(`Get read status error: ${error.message}`);
      return serverError(res, 'Failed to get read status');
    }
  },
  
  /**
   * Get all read chapters for a comic
   * 
   * GET /api/read-chapters/comic/:comicId
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getReadChaptersByComic(req, res) {
    try {
      // Check authentication
      if (!req.user) {
        return successResponse(res, 'Read chapters retrieved', {
          readChapterIds: []
        });
      }
      
      const { comicId } = req.params;
      
      // Validate input
      if (!comicId) {
        return badRequest(res, 'comicId is required');
      }
      
      // Get read chapter IDs
      const readChapterIds = await ReadChapter.getReadChapterIds(req.user._id, parseInt(comicId));
      
      return successResponse(res, 'Read chapters retrieved', {
        comicId: parseInt(comicId),
        readChapterIds,
        total: readChapterIds.length
      });
      
    } catch (error) {
      logger.error(`[READ_CHAPTER_CTRL] getReadChaptersByComic() - Error: ${error.message}`);
      logger.error(`Get read chapters error: ${error.message}`);
      return serverError(res, 'Failed to get read chapters');
    }
  },
  
  /**
   * Get user read statistics
   * 
   * GET /api/read-chapters/stats
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getUserStats(req, res) {
    try {
      // Check authentication
      if (!req.user) {
        return unauthorized(res, 'You must be logged in to view statistics');
      }
      
      // Get user stats
      const stats = await ReadChapter.getUserStats(req.user._id);
      
      return successResponse(res, 'User statistics retrieved', stats);
      
    } catch (error) {
      logger.error(`[READ_CHAPTER_CTRL] getUserStats() - Error: ${error.message}`);
      logger.error(`Get user stats error: ${error.message}`);
      return serverError(res, 'Failed to get user statistics');
    }
  }
};

module.exports = ReadChapterController;
