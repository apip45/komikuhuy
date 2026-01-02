/**
 * ===========================================
 * AF-Komik V2 - Reading History Model (MongoDB)
 * ===========================================
 * 
 * Reading history model for tracking user reading progress.
 * Stored in MongoDB Atlas.
 * 
 * Fields:
 * - userId: Reference to User
 * - comicId: Reference to comic in MySQL
 * - chapterId: Reference to chapter in MySQL
 * - lastReadAt: Last reading timestamp
 * - progress: Reading progress percentage
 * 
 * STRUCTURE ONLY - Implementation pending Phase 2
 */

const mongoose = require('mongoose');

// Reading History schema definition
const readingHistorySchema = new mongoose.Schema({
  // Reference to the user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Reference to the comic in MySQL database
  comicId: {
    type: Number,
    required: [true, 'Comic ID is required'],
    index: true
  },

  // Reference to the chapter in MySQL database
  chapterId: {
    type: Number,
    required: [true, 'Chapter ID is required']
  },

  // Chapter number for quick reference
  chapterNumber: {
    type: Number,
    required: true
  },

  // Last page read in the chapter
  lastPage: {
    type: Number,
    default: 1
  },

  // Total pages in the chapter (for progress calculation)
  totalPages: {
    type: Number,
    default: 1
  },

  // Reading progress percentage (0-100)
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Cached comic data for quick display
  cachedData: {
    comicTitle: String,
    coverImage: String,
    chapterTitle: String
  },

  // Last reading timestamp
  lastReadAt: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true
});

// Compound index for unique user-comic combinations
readingHistorySchema.index({ userId: 1, comicId: 1 }, { unique: true });

// Index for sorting by last read date
readingHistorySchema.index({ userId: 1, lastReadAt: -1 });

// Update lastReadAt before saving
readingHistorySchema.pre('save', function(next) {
  this.lastReadAt = new Date();
  next();
});

// Create and export the model
const ReadingHistory = mongoose.model('ReadingHistory', readingHistorySchema);

module.exports = ReadingHistory;
