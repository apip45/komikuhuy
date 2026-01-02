/**
 * ===========================================
 * AF-Komik V2 - Bookmark Model (MongoDB)
 * ===========================================
 * 
 * Bookmark model for user comic bookmarks.
 * Stored in MongoDB Atlas.
 * 
 * Fields:
 * - userId: Reference to User
 * - comicId: Reference to comic in MySQL
 * - createdAt: Bookmark creation date
 * 
 * STRUCTURE ONLY - Implementation pending Phase 2
 */

const mongoose = require('mongoose');

// Bookmark schema definition
const bookmarkSchema = new mongoose.Schema({
  // Reference to the user who created the bookmark
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },

  // Reference to the comic in MySQL database
  // Note: This is a cross-database reference (MySQL comic ID)
  comicId: {
    type: Number,
    required: [true, 'Comic ID is required'],
    index: true
  },

  // Comic metadata cached for quick display
  // This reduces MySQL queries for bookmark lists
  cachedData: {
    title: String,
    coverImage: String,
    latestChapter: Number
  },

  // Optional user notes for the bookmark
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }

}, {
  timestamps: true
});

// Compound index for unique user-comic combinations
bookmarkSchema.index({ userId: 1, comicId: 1 }, { unique: true });

// Index for sorting by creation date
bookmarkSchema.index({ userId: 1, createdAt: -1 });

// Create and export the model
const Bookmark = mongoose.model('Bookmark', bookmarkSchema);

module.exports = Bookmark;
