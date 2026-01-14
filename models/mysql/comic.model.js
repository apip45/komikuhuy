/**
 * ===========================================
 * AF-Komik V2 - Comic Model (MySQL)
 * ===========================================
 * 
 * Data access layer for the 'komik' table in MySQL.
 * Provides async methods to query comic data with logging.
 * 
 * Table: komik
 * - id: Primary key (INT, AUTO_INCREMENT)
 * - param: URL slug (VARCHAR, UNIQUE) - e.g., "one-piece"
 * - title: Comic title (VARCHAR)
 * - thumbnail: Cover image URL (VARCHAR)
 * - description: Short description (TEXT)
 * - synopsis: Full story synopsis (TEXT)
 * - genres: JSON array of genre strings
 * - latest_chapter: Latest chapter label (VARCHAR)
 * - created_at: Timestamp
 * - updated_at: Timestamp
 * 
 * All methods use prepared statements for security.
 */

const { query } = require('../../config/mysql');
const logger = require('../../config/logger');

/**
 * Comic model with database operations
 */
const ComicModel = {
  
  /**
   * Find all comics with optional pagination
   * 
   * Retrieves a list of comics ordered by update date (newest first).
   * Use limit and offset for pagination.
   * 
   * SQL Query:
   * SELECT id, param, title, thumbnail, description, genres, latest_chapter, updated_at
   * FROM komik
   * ORDER BY updated_at DESC
   * LIMIT ? OFFSET ?
   * 
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum number of results (default: 20)
   * @param {number} options.offset - Number of results to skip (default: 0)
   * @returns {Promise<Array>} Array of comic objects
   */
  async findAll({ limit = 20, offset = 0 } = {}) {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] findAll() - Fetching comics (limit: ${limit}, offset: ${offset})`);
    logger.debug(`Comic.findAll: limit=${limit}, offset=${offset}`);
    
    try {
      // SQL: Select comics with essential fields for listing
      // ORDER BY updated_at DESC to show recently updated first
      const sql = `
        SELECT 
          id, 
          param, 
          title, 
          thumbnail, 
          description, 
          genres, 
          latest_chapter, 
          updated_at
        FROM komik
        ORDER BY updated_at DESC
        LIMIT ? OFFSET ?
      `;
      
      const results = await query(sql, [limit, offset]);
      const duration = Date.now() - startTime;
      
      console.log(`[COMIC_MODEL] findAll() - Found ${results.length} comics in ${duration}ms`);
      logger.info(`Comic.findAll: ${results.length} results in ${duration}ms`);
      
      // Parse genres JSON for each comic (stored as JSON string in DB)
      return results.map(comic => ({
        ...comic,
        genres: ComicModel._parseGenres(comic.genres)
      }));
      
    } catch (error) {
      console.error(`[COMIC_MODEL] findAll() - Error: ${error.message}`);
      logger.error(`Comic.findAll error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Find a single comic by its URL param (slug)
   * 
   * Retrieves complete comic details including synopsis.
   * Used for comic detail page.
   * 
   * SQL Query:
   * SELECT * FROM komik WHERE param = ?
   * 
   * @param {string} param - Comic URL slug (e.g., "one-piece")
   * @returns {Promise<Object|null>} Comic object or null if not found
   */
  async findByParam(param) {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] findByParam() - Looking for comic: "${param}"`);
    logger.debug(`Comic.findByParam: param=${param}`);
    
    try {
      // SQL: Select all fields for detail page
      // Using param (slug) as the unique identifier from URL
      const sql = `
        SELECT 
          id, 
          param, 
          title, 
          thumbnail, 
          description, 
          synopsis, 
          genres, 
          latest_chapter, 
          created_at, 
          updated_at
        FROM komik
        WHERE param = ?
        LIMIT 1
      `;
      
      const results = await query(sql, [param]);
      const duration = Date.now() - startTime;
      
      if (results.length === 0) {
        console.log(`[COMIC_MODEL] findByParam() - Comic not found: "${param}" (${duration}ms)`);
        logger.warn(`Comic.findByParam: not found - ${param}`);
        return null;
      }
      
      const comic = results[0];
      console.log(`[COMIC_MODEL] findByParam() - Found: "${comic.title}" (${duration}ms)`);
      logger.info(`Comic.findByParam: found "${comic.title}" in ${duration}ms`);
      
      // Parse genres JSON
      return {
        ...comic,
        genres: ComicModel._parseGenres(comic.genres)
      };
      
    } catch (error) {
      console.error(`[COMIC_MODEL] findByParam() - Error: ${error.message}`);
      logger.error(`Comic.findByParam error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Find a comic by its ID
   * 
   * Used internally for validation and relations.
   * 
   * SQL Query:
   * SELECT * FROM komik WHERE id = ?
   * 
   * @param {number} id - Comic ID
   * @returns {Promise<Object|null>} Comic object or null if not found
   */
  async findById(id) {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] findById() - Looking for comic ID: ${id}`);
    logger.debug(`Comic.findById: id=${id}`);
    
    try {
      const sql = `
        SELECT 
          id, 
          param, 
          title, 
          thumbnail, 
          description, 
          synopsis, 
          genres, 
          latest_chapter, 
          created_at, 
          updated_at
        FROM komik
        WHERE id = ?
        LIMIT 1
      `;
      
      const results = await query(sql, [id]);
      const duration = Date.now() - startTime;
      
      if (results.length === 0) {
        console.log(`[COMIC_MODEL] findById() - Comic ID ${id} not found (${duration}ms)`);
        logger.warn(`Comic.findById: not found - id=${id}`);
        return null;
      }
      
      const comic = results[0];
      console.log(`[COMIC_MODEL] findById() - Found: "${comic.title}" (${duration}ms)`);
      logger.info(`Comic.findById: found "${comic.title}" in ${duration}ms`);
      
      return {
        ...comic,
        genres: ComicModel._parseGenres(comic.genres)
      };
      
    } catch (error) {
      console.error(`[COMIC_MODEL] findById() - Error: ${error.message}`);
      logger.error(`Comic.findById error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Count total number of comics
   * 
   * Used for pagination metadata.
   * 
   * SQL Query:
   * SELECT COUNT(*) as total FROM komik
   * 
   * @returns {Promise<number>} Total comic count
   */
  async count() {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] count() - Counting total comics`);
    logger.debug(`Comic.count: counting`);
    
    try {
      const sql = `SELECT COUNT(*) as total FROM komik`;
      const results = await query(sql);
      const duration = Date.now() - startTime;
      
      const total = results[0].total;
      console.log(`[COMIC_MODEL] count() - Total: ${total} comics (${duration}ms)`);
      logger.info(`Comic.count: ${total} total in ${duration}ms`);
      
      return total;
      
    } catch (error) {
      console.error(`[COMIC_MODEL] count() - Error: ${error.message}`);
      logger.error(`Comic.count error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Search comics by title
   * 
   * Performs case-insensitive search on title field.
   * 
   * SQL Query:
   * SELECT * FROM komik WHERE title LIKE ? ORDER BY updated_at DESC LIMIT ?
   * 
   * @param {string} keyword - Search keyword
   * @param {number} limit - Maximum results (default: 20)
   * @returns {Promise<Array>} Array of matching comics
   */
  async search(keyword, limit = 20) {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] search() - Searching for: "${keyword}"`);
    logger.debug(`Comic.search: keyword="${keyword}", limit=${limit}`);
    
    try {
      // SQL: Search with LIKE for partial matching
      // Using % wildcards for contains search
      const sql = `
        SELECT 
          id, 
          param, 
          title, 
          thumbnail, 
          description, 
          genres, 
          latest_chapter, 
          updated_at
        FROM komik
        WHERE title LIKE ?
        ORDER BY updated_at DESC
        LIMIT ?
      `;
      
      const results = await query(sql, [`%${keyword}%`, limit]);
      const duration = Date.now() - startTime;
      
      console.log(`[COMIC_MODEL] search() - Found ${results.length} results for "${keyword}" (${duration}ms)`);
      logger.info(`Comic.search: ${results.length} results for "${keyword}" in ${duration}ms`);
      
      return results.map(comic => ({
        ...comic,
        genres: ComicModel._parseGenres(comic.genres)
      }));
      
    } catch (error) {
      console.error(`[COMIC_MODEL] search() - Error: ${error.message}`);
      logger.error(`Comic.search error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Search and filter comics with pagination
   * 
   * Advanced search supporting:
   * - Title search (fuzzy/partial matching)
   * - Genre filtering
   * - Pagination
   * 
   * @param {Object} options - Search options
   * @param {string} options.keyword - Search keyword (optional)
   * @param {string} options.genre - Genre filter (optional)
   * @param {number} options.limit - Results per page (default: 20)
   * @param {number} options.offset - Results to skip (default: 0)
   * @returns {Promise<Array>} Array of matching comics
   */
  async searchAndFilter({ keyword = '', genre = '', limit = 20, offset = 0 } = {}) {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] searchAndFilter() - keyword: "${keyword}", genre: "${genre}"`);
    logger.debug(`Comic.searchAndFilter: keyword="${keyword}", genre="${genre}", limit=${limit}`);
    
    try {
      // Build dynamic SQL query
      let sql = `
        SELECT 
          id, 
          param, 
          title, 
          thumbnail, 
          description, 
          genres, 
          latest_chapter, 
          updated_at
        FROM komik
        WHERE 1=1
      `;
      
      const params = [];
      
      // Add title search condition
      if (keyword && keyword.trim()) {
        sql += ` AND title LIKE ?`;
        params.push(`%${keyword.trim()}%`);
      }
      
      // Add genre filter condition
      // Using JSON_CONTAINS for MySQL JSON field
      if (genre && genre.trim()) {
        sql += ` AND JSON_CONTAINS(genres, ?)`;
        params.push(JSON.stringify(genre.trim()));
      }
      
      sql += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const results = await query(sql, params);
      const duration = Date.now() - startTime;
      
      console.log(`[COMIC_MODEL] searchAndFilter() - Found ${results.length} results (${duration}ms)`);
      logger.info(`Comic.searchAndFilter: ${results.length} results in ${duration}ms`);
      
      return results.map(comic => ({
        ...comic,
        genres: ComicModel._parseGenres(comic.genres)
      }));
      
    } catch (error) {
      console.error(`[COMIC_MODEL] searchAndFilter() - Error: ${error.message}`);
      logger.error(`Comic.searchAndFilter error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Count comics matching search/filter criteria
   * 
   * Used for pagination with search and filters.
   * 
   * @param {Object} options - Search options
   * @param {string} options.keyword - Search keyword (optional)
   * @param {string} options.genre - Genre filter (optional)
   * @returns {Promise<number>} Total matching comics count
   */
  async countSearchResults({ keyword = '', genre = '' } = {}) {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] countSearchResults() - keyword: "${keyword}", genre: "${genre}"`);
    logger.debug(`Comic.countSearchResults: keyword="${keyword}", genre="${genre}"`);
    
    try {
      let sql = `SELECT COUNT(*) as total FROM komik WHERE 1=1`;
      const params = [];
      
      // Add title search condition
      if (keyword && keyword.trim()) {
        sql += ` AND title LIKE ?`;
        params.push(`%${keyword.trim()}%`);
      }
      
      // Add genre filter condition
      if (genre && genre.trim()) {
        sql += ` AND JSON_CONTAINS(genres, ?)`;
        params.push(JSON.stringify(genre.trim()));
      }
      
      const results = await query(sql, params);
      const duration = Date.now() - startTime;
      
      const total = results[0].total;
      console.log(`[COMIC_MODEL] countSearchResults() - Total: ${total} (${duration}ms)`);
      logger.info(`Comic.countSearchResults: ${total} results in ${duration}ms`);
      
      return total;
      
    } catch (error) {
      console.error(`[COMIC_MODEL] countSearchResults() - Error: ${error.message}`);
      logger.error(`Comic.countSearchResults error: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get all unique genres from database
   * 
   * Extracts and returns a list of all unique genres
   * across all comics for filter dropdown.
   * 
   * @returns {Promise<Array<string>>} Array of unique genre names
   */
  async getAllGenres() {
    const startTime = Date.now();
    
    console.log(`[COMIC_MODEL] getAllGenres() - Fetching unique genres`);
    logger.debug(`Comic.getAllGenres: fetching`);
    
    try {
      // Get all genres (JSON field)
      const sql = `SELECT DISTINCT genres FROM komik WHERE genres IS NOT NULL`;
      const results = await query(sql);
      const duration = Date.now() - startTime;
      
      // Extract and flatten all genres
      const genreSet = new Set();
      results.forEach(row => {
        const genres = ComicModel._parseGenres(row.genres);
        genres.forEach(genre => genreSet.add(genre));
      });
      
      const uniqueGenres = Array.from(genreSet).sort();
      
      console.log(`[COMIC_MODEL] getAllGenres() - Found ${uniqueGenres.length} unique genres (${duration}ms)`);
      logger.info(`Comic.getAllGenres: ${uniqueGenres.length} genres in ${duration}ms`);
      
      return uniqueGenres;
      
    } catch (error) {
      console.error(`[COMIC_MODEL] getAllGenres() - Error: ${error.message}`);
      logger.error(`Comic.getAllGenres error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Parse genres from JSON string to array
   * 
   * Handles various formats:
   * - JSON string: '["Action", "Adventure"]' -> ["Action", "Adventure"]
   * - Already array: returns as-is
   * - Null/undefined: returns empty array
   * 
   * @private
   * @param {any} genres - Genres data from database
   * @returns {Array<string>} Array of genre strings
   */
  _parseGenres(genres) {
    if (!genres) return [];
    
    // If already an array, return as-is (MySQL JSON type might auto-parse)
    if (Array.isArray(genres)) return genres;
    
    // If string, try to parse as JSON
    if (typeof genres === 'string') {
      try {
        return JSON.parse(genres);
      } catch (e) {
        // If parsing fails, return empty array
        console.warn(`[COMIC_MODEL] Failed to parse genres: ${genres}`);
        return [];
      }
    }
    
    return [];
  }
};

module.exports = ComicModel;
