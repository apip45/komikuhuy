/**
 * ===========================================
 * AF-Komik V2 - Bookmark Model (MongoDB)
 * ===========================================
 * 
 * Bookmark model for user comic bookmarks.
 * Stored in MongoDB Atlas.
 * 
 * Data Sync Strategy:
 * - userId: Reference to User in MongoDB
 * - comicParam: URL slug from MySQL 'komik' table (NOT numeric ID)
 * 
 * Why comicParam instead of comicId?
 * - URL slugs are stable across database migrations
 * - Easier to debug and maintain
 * - Directly usable in URLs without additional lookups
 * - MySQL comic data is fetched on-demand for display
 * 
 * Indexes:
 * - userId + comicParam (unique): Prevent duplicate bookmarks
 * - userId + createdAt: Efficient sorting for bookmark list
 * 
 * Usage:
 * const Bookmark = require('../models/mongo/Bookmark');
 * await Bookmark.create({ userId, comicParam: 'one-piece' });
 */

const mongoose = require('mongoose');

// =============================================
// Bookmark Schema Definition
// =============================================

const bookmarkSchema = new mongoose.Schema({
  
  // Reference to the user who created the bookmark
  // Links to User collection in MongoDB
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Comic URL slug from MySQL 'komik' table
  // Example: "one-piece", "naruto", "demon-slayer"
  // This is the 'param' column in MySQL, NOT the numeric ID
  comicParam: {
    type: String,
    required: [true, 'Comic param is required'],
    trim: true,
    lowercase: true,
    index: true
  },

  // Cached comic data for quick display without MySQL query
  // Updated when bookmark is created
  // Reduces database calls for bookmark listing
  cachedComic: {
    // Comic title for display
    title: {
      type: String,
      default: null
    },
    // Cover image URL
    thumbnail: {
      type: String,
      default: null
    },
    // Latest chapter label (e.g., "Chapter 1100")
    latestChapter: {
      type: String,
      default: null
    },
    // Genres array
    genres: [{
      type: String
    }]
  },

  // Optional user notes for the bookmark
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: null
  }

}, {
  // Enable automatic timestamps
  // createdAt: When bookmark was created
  // updatedAt: When bookmark was last modified
  timestamps: true
});

// =============================================
// Indexes for Performance
// =============================================

// Compound unique index: One bookmark per user per comic
// Prevents duplicate bookmarks for the same comic
bookmarkSchema.index(
  { userId: 1, comicParam: 1 }, 
  { unique: true }
);

// Index for sorting bookmarks by creation date (newest first)
// Used when displaying user's bookmark list
bookmarkSchema.index(
  { userId: 1, createdAt: -1 }
);

// =============================================
// Static Methods
// =============================================

/**
 * Check if a comic is bookmarked by a user
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {string} comicParam - Comic URL slug
 * @returns {Promise<boolean>} True if bookmarked
 */
bookmarkSchema.statics.isBookmarked = async function(userId, comicParam) {
  const bookmark = await this.findOne({ userId, comicParam });
  return bookmark !== null;
};

/**
 * Toggle bookmark (add if not exists, remove if exists)
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {string} comicParam - Comic URL slug
 * @param {Object} cachedComic - Cached comic data
 * @returns {Promise<Object>} { added: boolean, bookmark: Object|null }
 */
bookmarkSchema.statics.toggle = async function(userId, comicParam, cachedComic = {}) {
  const existing = await this.findOne({ userId, comicParam });
  
  if (existing) {
    // Remove bookmark
    await this.deleteOne({ _id: existing._id });
    return { added: false, bookmark: null };
  } else {
    // Add bookmark
    const bookmark = await this.create({
      userId,
      comicParam,
      cachedComic
    });
    return { added: true, bookmark };
  }
};

/**
 * Get all bookmarks for a user with pagination
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Max results (default: 20)
 * @param {number} options.skip - Results to skip (default: 0)
 * @returns {Promise<Array>} Array of bookmarks
 */
bookmarkSchema.statics.findByUser = async function(userId, { limit = 20, skip = 0 } = {}) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

/**
 * Count bookmarks for a user
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @returns {Promise<number>} Bookmark count
 */
bookmarkSchema.statics.countByUser = async function(userId) {
  return this.countDocuments({ userId });
};

/**
 * Get multiple bookmark statuses at once
 * Useful for checking bookmark status of multiple comics in a list
 * 
 * @param {ObjectId} userId - User's MongoDB ID
 * @param {Array<string>} comicParams - Array of comic URL slugs
 * @returns {Promise<Object>} Map of comicParam -> boolean
 */
bookmarkSchema.statics.getBookmarkStatuses = async function(userId, comicParams) {
  const bookmarks = await this.find({
    userId,
    comicParam: { $in: comicParams }
  }).select('comicParam').lean();
  
  const bookmarkedSet = new Set(bookmarks.map(b => b.comicParam));
  
  const statusMap = {};
  comicParams.forEach(param => {
    statusMap[param] = bookmarkedSet.has(param);
  });
  
  return statusMap;
};

// =============================================
// Instance Methods
// =============================================

/**
 * Update cached comic data
 * Call this when comic data changes in MySQL
 * 
 * @param {Object} comicData - Updated comic data
 */
bookmarkSchema.methods.updateCache = async function(comicData) {
  this.cachedComic = {
    title: comicData.title || this.cachedComic.title,
    thumbnail: comicData.thumbnail || this.cachedComic.thumbnail,
    latestChapter: comicData.latest_chapter || this.cachedComic.latestChapter,
    genres: comicData.genres || this.cachedComic.genres
  };
  await this.save();
};

// =============================================
// Pre-save Middleware
// =============================================

/**
 * Normalize comicParam before saving
 * Ensures consistent lowercase format
 */
bookmarkSchema.pre('save', function(next) {
  if (this.isModified('comicParam')) {
    this.comicParam = this.comicParam.toLowerCase().trim();
  }
  next();
});

// =============================================
// Export Model
// =============================================

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

module.exports = Bookmark;
