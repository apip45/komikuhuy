/**
 * ===========================================
 * AF-Komik V2 - MongoDB Models Index
 * ===========================================
 * 
 * Central export point for all MongoDB models.
 * 
 * MongoDB is used ONLY for:
 * - Users (authentication data)
 * - Sessions (login sessions - managed by connect-mongo)
 * - Bookmarks (user bookmarks)
 * - Reading History (user progress tracking)
 * 
 * DO NOT add comic-related models here.
 * Comic data belongs in MySQL.
 */

// TODO: Import and export models as they are created
// const User = require('./User');
// const Bookmark = require('./Bookmark');
// const ReadingHistory = require('./ReadingHistory');

module.exports = {
  // User,
  // Bookmark,
  // ReadingHistory
};
