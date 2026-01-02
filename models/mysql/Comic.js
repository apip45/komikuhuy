/**
 * ===========================================
 * AF-Komik V2 - Comic Model (MySQL)
 * ===========================================
 * 
 * Comic data access layer for MySQL database.
 * Provides CRUD operations for comics table.
 * 
 * Table: comics
 * Fields:
 * - id: Primary key
 * - title: Comic title
 * - slug: URL-friendly identifier
 * - description: Comic description
 * - cover_image: Cover image URL
 * - author: Comic author
 * - artist: Comic artist
 * - status: Publication status (ongoing, completed, hiatus)
 * - type: Comic type (manga, manhwa, manhua)
 * - genres: JSON array of genres
 * - rating: Average rating
 * - views: Total views count
 * - created_at: Creation timestamp
 * - updated_at: Last update timestamp
 * 
 * STRUCTURE ONLY - Implementation pending Phase 2
 */

const { query, transaction } = require('../../config/mysql');

/**
 * SQL for creating the comics table
 * Run this during database setup
 */
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS comics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  cover_image VARCHAR(500),
  author VARCHAR(255),
  artist VARCHAR(255),
  status ENUM('ongoing', 'completed', 'hiatus') DEFAULT 'ongoing',
  type ENUM('manga', 'manhwa', 'manhua') DEFAULT 'manga',
  genres JSON,
  rating DECIMAL(3,2) DEFAULT 0.00,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_rating (rating),
  INDEX idx_views (views),
  INDEX idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

/**
 * Comic model with database operations
 */
const Comic = {
  /**
   * Find all comics with pagination
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of comics
   */
  async findAll(options = {}) {
    // TODO: Implement pagination and filtering
    const sql = 'SELECT * FROM comics ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    return await query(sql, [limit, offset]);
  },

  /**
   * Find comic by ID
   * @param {number} id - Comic ID
   * @returns {Promise<Object|null>} Comic object or null
   */
  async findById(id) {
    const sql = 'SELECT * FROM comics WHERE id = ?';
    const results = await query(sql, [id]);
    return results[0] || null;
  },

  /**
   * Find comic by slug
   * @param {string} slug - Comic slug
   * @returns {Promise<Object|null>} Comic object or null
   */
  async findBySlug(slug) {
    const sql = 'SELECT * FROM comics WHERE slug = ?';
    const results = await query(sql, [slug]);
    return results[0] || null;
  },

  /**
   * Create a new comic
   * @param {Object} data - Comic data
   * @returns {Promise<number>} New comic ID
   */
  async create(data) {
    // TODO: Implement create operation
    throw new Error('Not implemented');
  },

  /**
   * Update an existing comic
   * @param {number} id - Comic ID
   * @param {Object} data - Updated data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, data) {
    // TODO: Implement update operation
    throw new Error('Not implemented');
  },

  /**
   * Delete a comic
   * @param {number} id - Comic ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    // TODO: Implement delete operation
    throw new Error('Not implemented');
  },

  /**
   * Increment view count
   * @param {number} id - Comic ID
   * @returns {Promise<void>}
   */
  async incrementViews(id) {
    const sql = 'UPDATE comics SET views = views + 1 WHERE id = ?';
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

module.exports = Comic;
