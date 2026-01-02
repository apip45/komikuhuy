/**
 * ===========================================
 * AF-Komik V2 - Reading History Model (MongoDB)
 * ===========================================
 * 
 * Reading history model for tracking user reading progress.
 * Stored in MongoDB Atlas.
 * 
 * Data Sync Strategy:
 * - userId: Reference to User in MongoDB
 * - comicParam: URL slug from MySQL 'komik' table
 * - chapterParam: URL slug from MySQL 'chapter' table
 * 
 * Why use params instead of IDs?
 * - URL slugs are stable across database migrations
 * - Easier to debug and maintain
 * - Directly usable in URLs without additional lookups
 * - Consistent with Bookmark model
 * 
 * Usage Pattern:
 * - Automatically saved when user reads a chapter
 * - One record per user per comic (upsert on read)
 * - Used for "Resume Reading" feature
 * 
 * Indexes:
 * - userId + comicParam (unique): One history entry per comic per user
 * - userId + lastReadAt: For sorting by recently read
 */

const mongoose = require('mongoose');

// =============================================
// Reading History Schema Definition
// =============================================

const readingHistorySchema = new mongoose.Schema({
  
  // Reference to the user
  // Links to User collection in MongoDB
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Comic URL slug from MySQL 'komik' table
  // Example: "one-piece", "naruto"
  comicParam: {
    type: String,
    required: [true, 'Comic param is required'],
    trim: true,
    lowercase: true,
    index: true
  },

  // Chapter URL slug from MySQL 'chapter' table
  // Example: "chapter-1100", "chapter-500"
  // This represents the last chapter the user read
  chapterParam: {
    type: String,
    required: [true, 'Chapter param is required'],
    trim: true,
    lowercase: true
  },

  // Cached data for quick display without MySQL queries
  cachedData: {
    // Comic title
    comicTitle: {
      type: String,
      default: null
    },
    // Comic thumbnail
    comicThumbnail: {
      type: String,
      default: null
    },
    // Chapter label (e.g., "Chapter 1100")
    chapterLabel: {
      type: String,
      default: null
    },
    // Total pages in the chapter
    totalPages: {
      type: Number,
      default: 0
    }
  },

  // Last reading timestamp
  // Updated every time the user reads this comic
  lastReadAt: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  // Enable automatic timestamps
  // createdAt: When first read
  // updatedAt: When last modified
  timestamps: true
});

// =============================================
// Indexes for Performance
// =============================================

// Compound unique index: One history entry per user per comic
// When user reads a new chapter, we update the existing record
readingHistorySchema.index(
  { userId: 1, comicParam: 1 }, 
  { unique: true }
);

// Index for sorting by last read date (most recent first)
// Used for "Continue Reading" list
readingHistorySchema.index(
  { userId: 1, lastReadAt: -1 }
);

// =============================================
// Static Methods
// =============================================

/**
 * Save or update reading history
 * Creates new entry or updates existing one (upsert)
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {string} comicParam - Comic URL slug
 * @param {string} chapterParam - Chapter URL slug
 * @param {Object} cachedData - Cached comic/chapter data
 * @returns {Promise<Object>} The history entry
 */
readingHistorySchema.statics.saveProgress = async function(userId, comicParam, chapterParam, cachedData = {}) {
  const history = await this.findOneAndUpdate(
    { userId, comicParam },
    {
      $set: {
        chapterParam,
        lastReadAt: new Date(),
        'cachedData.comicTitle': cachedData.comicTitle || undefined,
        'cachedData.comicThumbnail': cachedData.comicThumbnail || undefined,
        'cachedData.chapterLabel': cachedData.chapterLabel || undefined,
        'cachedData.totalPages': cachedData.totalPages || undefined
      }
    },
    {
      new: true,       // Return updated document
      upsert: true,    // Create if doesn't exist
      runValidators: true
    }
  );
  
  return history;
};

/**
 * Get last read chapter for a comic
 * Used for "Resume Reading" feature
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {string} comicParam - Comic URL slug
 * @returns {Promise<Object|null>} History entry or null
 */
readingHistorySchema.statics.getLastRead = async function(userId, comicParam) {
  return this.findOne({ userId, comicParam }).lean();
};

/**
 * Get reading history for a user with pagination
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results (default: 20)
 * @param {number} options.skip - Results to skip (default: 0)
 * @returns {Promise<Array>} Array of history entries
 */
readingHistorySchema.statics.findByUser = async function(userId, { limit = 20, skip = 0 } = {}) {
  return this.find({ userId })
    .sort({ lastReadAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Count history entries for a user
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @returns {Promise<number>} History count
 */
readingHistorySchema.statics.countByUser = async function(userId) {
  return this.countDocuments({ userId });
};

/**
 * Get last read chapters for multiple comics at once
 * Useful for displaying progress on comic lists
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {Array<string>} comicParams - Array of comic URL slugs
 * @returns {Promise<Object>} Map of comicParam -> { chapterParam, chapterLabel }
 */
readingHistorySchema.statics.getLastReadBatch = async function(userId, comicParams) {
  const histories = await this.find({
    userId,
    comicParam: { $in: comicParams }
  }).select('comicParam chapterParam cachedData.chapterLabel').lean();
  
  const progressMap = {};
  histories.forEach(h => {
    progressMap[h.comicParam] = {
      chapterParam: h.chapterParam,
      chapterLabel: h.cachedData?.chapterLabel || h.chapterParam
    };
  });
  
  return progressMap;
};

/**
 * Delete all history for a user
 * Used for "Clear History" feature
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @returns {Promise<number>} Number of deleted entries
 */
readingHistorySchema.statics.clearUserHistory = async function(userId) {
  const result = await this.deleteMany({ userId });
  return result.deletedCount;
};

/**
 * Delete history for a specific comic
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {string} comicParam - Comic URL slug
 * @returns {Promise<boolean>} True if deleted
 */
readingHistorySchema.statics.removeEntry = async function(userId, comicParam) {
  const result = await this.deleteOne({ userId, comicParam });
  return result.deletedCount > 0;
};

// =============================================
// Pre-save Middleware
// =============================================

/**
 * Update lastReadAt and normalize params before saving
 */
readingHistorySchema.pre('save', function(next) {
  // Always update lastReadAt when saving
  this.lastReadAt = new Date();
  
  // Normalize params to lowercase
  if (this.isModified('comicParam')) {
    this.comicParam = this.comicParam.toLowerCase().trim();
  }
  if (this.isModified('chapterParam')) {
    this.chapterParam = this.chapterParam.toLowerCase().trim();
  }
  
  next();
});

// =============================================
// Export Model
// =============================================

const ReadingHistory = mongoose.model('ReadingHistory', readingHistorySchema);

module.exports = ReadingHistory;
