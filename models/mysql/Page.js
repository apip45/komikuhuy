/**
 * ===========================================
 * AF-Komik V2 - Page Model (MySQL)
 * ===========================================
 * 
 * Page/Image data access layer for MySQL database.
 * Provides CRUD operations for pages table.
 * 
 * Table: pages
 * Fields:
 * - id: Primary key
 * - chapter_id: Foreign key to chapters table
 * - page_number: Page number in chapter
 * - image_url: URL to the page image
 * - width: Image width (optional)
 * - height: Image height (optional)
 * - created_at: Creation timestamp
 * 
 * STRUCTURE ONLY - Implementation pending Phase 2
 */

const { query, transaction } = require('../../config/mysql');

/**
 * SQL for creating the pages table
 * Run this during database setup
 */
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS pages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  chapter_id INT NOT NULL,
  page_number INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  width INT,
  height INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  UNIQUE KEY unique_chapter_page (chapter_id, page_number),
  INDEX idx_chapter_id (chapter_id),
  INDEX idx_page_number (page_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Page model with database operations
 */
const Page = {
  /**
   * Find all pages for a chapter
   * @param {number} chapterId - Chapter ID
   * @returns {Promise<Array>} List of pages ordered by page number
   */
  async findByChapterId(chapterId) {
    const sql = 'SELECT * FROM pages WHERE chapter_id = ? ORDER BY page_number ASC';
    return await query(sql, [chapterId]);
  },

  /**
   * Find page by ID
   * @param {number} id - Page ID
   * @returns {Promise<Object|null>} Page object or null
   */
  async findById(id) {
    const sql = 'SELECT * FROM pages WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  },

  /**
   * Find specific page in chapter
   * @param {number} chapterId - Chapter ID
   * @param {number} pageNumber - Page number
   * @returns {Promise<Object|null>} Page object or null
   */
  async findByNumber(chapterId, pageNumber) {
    const sql = 'SELECT * FROM pages WHERE chapter_id = ? AND page_number = ?';
    const results = await query(sql, [chapterId, pageNumber]);
    return results[0] || null;
  },

  /**
   * Get total page count for a chapter
   * @param {number} chapterId - Chapter ID
   * @returns {Promise<number>} Page count
   */
  async getPageCount(chapterId) {
    const sql = 'SELECT COUNT(*) as count FROM pages WHERE chapter_id = ?';
    const results = await query(sql, [chapterId]);
    return results[0]?.count || 0;
  },

  /**
   * Create multiple pages at once (bulk insert)
   * @param {number} chapterId - Chapter ID
   * @param {Array} pages - Array of page objects with page_number and image_url
   * @returns {Promise<boolean>} Success status
   */
  async bulkCreate(chapterId, pages) {
    // TODO: Implement bulk create operation
    throw new Error('Not implemented');
  },

  /**
   * Delete all pages for a chapter
   * @param {number} chapterId - Chapter ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteByChapterId(chapterId) {
    const sql = 'DELETE FROM pages WHERE chapter_id = ?';
    await query(sql, [chapterId]);
    return true;
  },

  /**
   * Get table creation SQL
   * @returns {string} SQL statement
   */
  getCreateTableSQL() {
    return CREATE_TABLE_SQL;
  }
};

module.exports = Page;
