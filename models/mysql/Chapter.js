/**
 * ===========================================
 * AF-Komik V2 - Chapter Model (MySQL)
 * ===========================================
 * 
 * Chapter data access layer for MySQL database.
 * Provides CRUD operations for chapters table.
 * 
 * Table: chapters
 * Fields:
 * - id: Primary key
 * - comic_id: Foreign key to comics table
 * - chapter_number: Chapter number (can be decimal for .5 chapters)
 * - title: Chapter title (optional)
 * - slug: URL-friendly identifier
 * - page_count: Number of pages
 * - views: Chapter views count
 * - created_at: Creation timestamp
 * - updated_at: Last update timestamp
 * 
 * STRUCTURE ONLY - Implementation pending Phase 2
 */

const { query, transaction } = require('../../config/mysql');

/**
 * SQL for creating the chapters table
 * Run this during database setup
 */
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS chapters (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comic_id INT NOT NULL,
  chapter_number DECIMAL(6,1) NOT NULL,
  title VARCHAR(255),
  slug VARCHAR(255) NOT NULL,
  page_count INT DEFAULT 0,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (comic_id) REFERENCES comics(id) ON DELETE CASCADE,
  UNIQUE KEY unique_comic_chapter (comic_id, chapter_number),
  INDEX idx_comic_id (comic_id),
  INDEX idx_chapter_number (chapter_number),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Chapter model with database operations
 */
const Chapter = {
  /**
   * Find all chapters for a comic
   * @param {number} comicId - Comic ID
   * @returns {Promise<Array>} List of chapters
   */
  async findByComicId(comicId) {
    const sql = 'SELECT * FROM chapters WHERE comic_id = ? ORDER BY chapter_number DESC';
    return await query(sql, [comicId]);
  },

  /**
   * Find chapter by ID
   * @param {number} id - Chapter ID
   * @returns {Promise<Object|null>} Chapter object or null
   */
  async findById(id) {
    const sql = 'SELECT * FROM chapters WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  },

  /**
   * Find chapter by comic ID and chapter number
   * @param {number} comicId - Comic ID
   * @param {number} chapterNumber - Chapter number
   * @returns {Promise<Object|null>} Chapter object or null
   */
  async findByNumber(comicId, chapterNumber) {
    const sql = 'SELECT * FROM chapters WHERE comic_id = ? AND chapter_number = ?';
    const results = await query(sql, [comicId, chapterNumber]);
    return results[0] || null;
  },

  /**
   * Get latest chapters across all comics
   * @param {number} limit - Number of chapters to return
   * @returns {Promise<Array>} List of latest chapters with comic info
   */
  async findLatest(limit = 20) {
    const sql = `
      SELECT c.*, co.title as comic_title, co.slug as comic_slug, co.cover_image
      FROM chapters c
      JOIN comics co ON c.comic_id = co.id
      ORDER BY c.created_at DESC
      LIMIT ?
    `;
    return await query(sql, [limit]);
  },

  /**
   * Get next chapter
   * @param {number} comicId - Comic ID
   * @param {number} currentChapterNumber - Current chapter number
   * @returns {Promise<Object|null>} Next chapter or null
   */
  async findNext(comicId, currentChapterNumber) {
    const sql = `
      SELECT * FROM chapters 
      WHERE comic_id = ? AND chapter_number > ?
      ORDER BY chapter_number ASC
      LIMIT 1
    `;
    const results = await query(sql, [comicId, currentChapterNumber]);
    return results[0] || null;
  },

  /**
   * Get previous chapter
   * @param {number} comicId - Comic ID
   * @param {number} currentChapterNumber - Current chapter number
   * @returns {Promise<Object|null>} Previous chapter or null
   */
  async findPrevious(comicId, currentChapterNumber) {
    const sql = `
      SELECT * FROM chapters 
      WHERE comic_id = ? AND chapter_number < ?
      ORDER BY chapter_number DESC
      LIMIT 1
    `;
    const results = await query(sql, [comicId, currentChapterNumber]);
    return results[0] || null;
  },

  /**
   * Create a new chapter
   * @param {Object} data - Chapter data
   * @returns {Promise<number>} New chapter ID
   */
  async create(data) {
    // TODO: Implement create operation
    throw new Error('Not implemented');
  },

  /**
   * Increment view count
   * @param {number} id - Chapter ID
   * @returns {Promise<void>}
   */
  async incrementViews(id) {
    const sql = 'UPDATE chapters SET views = views + 1 WHERE id = ?';
    await query(sql, [id]);
  },

  /**
   * Get table creation SQL
   * @returns {string} SQL statement
   */
  getCreateTableSQL() {
    return CREATE_TABLE_SQL;
  }
};

module.exports = Chapter;
