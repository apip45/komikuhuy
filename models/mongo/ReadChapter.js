/**
 * ===========================================
 * AF-Komik V2 - Read Chapter Model (MongoDB)
 * ===========================================
 * 
 * Tracks which chapters users have read.
 * Used to display read status in chapter lists.
 * 
 * Schema:
 * - userId: ObjectId (reference to User)
 * - chapterId: Number (MySQL chapter ID)
 * - comicId: Number (MySQL comic ID)
 * - readAt: Date
 * 
 * Indexes:
 * - userId + chapterId (compound unique index)
 * - userId + comicId (for fetching read chapters per comic)
 */

const mongoose = require('mongoose');

const readChapterSchema = new mongoose.Schema({
  // MongoDB User ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // MySQL Chapter ID
  chapterId: {
    type: Number,
    required: true,
    index: true
  },
  
  // MySQL Comic ID (for efficient querying)
  comicId: {
    type: Number,
    required: true,
    index: true
  },
  
  // When the chapter was marked as read
  readAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'read_chapters'
});

// Compound unique index - one read record per user per chapter
readChapterSchema.index({ userId: 1, chapterId: 1 }, { unique: true });

// Compound index for fetching all read chapters of a comic for a user
readChapterSchema.index({ userId: 1, comicId: 1 });

/**
 * Mark a chapter as read
 * Uses upsert to prevent duplicates and update readAt timestamp
 * 
 * @param {ObjectId} userId - MongoDB User ID
 * @param {Number} chapterId - MySQL Chapter ID
 * @param {Number} comicId - MySQL Comic ID
 * @returns {Promise<Object>} Read chapter document
 */
readChapterSchema.statics.markAsRead = async function(userId, chapterId, comicId) {
  return await this.findOneAndUpdate(
    { userId, chapterId },
    { 
      userId, 
      chapterId, 
      comicId,
      readAt: new Date() 
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
};

/**
 * Get all read chapter IDs for a user and comic
 * Returns array of chapter IDs for quick lookup
 * 
 * @param {ObjectId} userId - MongoDB User ID
 * @param {Number} comicId - MySQL Comic ID
 * @returns {Promise<Array>} Array of chapter IDs
 */
readChapterSchema.statics.getReadChapterIds = async function(userId, comicId) {
  const readChapters = await this.find(
    { userId, comicId },
    { chapterId: 1, _id: 0 }
  ).lean();
  
  return readChapters.map(rc => rc.chapterId);
};

/**
 * Check if a specific chapter is read by user
 * 
 * @param {ObjectId} userId - MongoDB User ID
 * @param {Number} chapterId - MySQL Chapter ID
 * @returns {Promise<Boolean>} True if chapter is read
 */
readChapterSchema.statics.isRead = async function(userId, chapterId) {
  const count = await this.countDocuments({ userId, chapterId });
  return count > 0;
};

/**
 * Unmark a chapter as read (for testing or undo)
 * 
 * @param {ObjectId} userId - MongoDB User ID
 * @param {Number} chapterId - MySQL Chapter ID
 * @returns {Promise<Object>} Delete result
 */
readChapterSchema.statics.unmarkAsRead = async function(userId, chapterId) {
  return await this.deleteOne({ userId, chapterId });
};

/**
 * Get read statistics for a user
 * 
 * @param {ObjectId} userId - MongoDB User ID
 * @returns {Promise<Object>} Statistics
 */
readChapterSchema.statics.getUserStats = async function(userId) {
  const totalRead = await this.countDocuments({ userId });
  const comicsRead = await this.distinct('comicId', { userId });
  
  return {
    totalChaptersRead: totalRead,
    totalComicsRead: comicsRead.length
  };
};

const ReadChapter = mongoose.model('ReadChapter', readChapterSchema);

module.exports = ReadChapter;
