/**
 * ===========================================
 * AF-Komik V2 - MongoDB Models Export
 * ===========================================
 * 
 * Central export point for all MongoDB models.
 * 
 * MongoDB is used ONLY for:
 * - Users (authentication data)
 * - Sessions (login sessions - managed by connect-mongo)
 * - Bookmarks (user bookmarks)
 * - Reading History (user progress tracking)
 * - Read Chapters (chapter read tracking)
 * 
 * DO NOT add comic-related models here.
 * Comic data belongs in MySQL.
 */

const User = require('./User');
const Bookmark = require('./Bookmark');
const ReadingHistory = require('./ReadingHistory');
const ReadChapter = require('./ReadChapter');

module.exports = {
  User,
  Bookmark,
  ReadingHistory,
  ReadChapter
};
