/**
 * ===========================================
 * AF-Komik Scraper - Comic Service
 * ===========================================
 * 
 * Database operations for the 'komik' table.
 * Handles insert, update, and lookup operations.
 * 
 * Table Schema:
 * - id: INT (Primary Key, Auto Increment)
 * - param: VARCHAR (Unique URL slug)
 * - title: VARCHAR
 * - thumbnail: VARCHAR (Image URL)
 * - description: TEXT
 * - synopsis: TEXT
 * - genres: JSON
 * - latest_chapter: VARCHAR
 * - created_at: TIMESTAMP
 * - updated_at: TIMESTAMP
 */

const db = require('../config/db');
const logger = require('../config/logger');

/**
 * Comic service with database operations
 */
const ComicService = {
  
  /**
   * Get a comic by its URL param (slug)
   * 
   * @param {string} param - Comic URL slug
   * @returns {Promise<Object|null>} Comic data or null
   */
  async getByParam(param) {
    try {
      const sql = `
        SELECT id, param, title, thumbnail, description, synopsis, 
               genres, latest_chapter, status, author, comic_type, 
               last_scraped, created_at, updated_at
        FROM komik 
        WHERE param = ?
      `;
      const results = await db.query(sql, [param]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`ComicService.getByParam failed: ${error.message}`, { param });
      throw error;
    }
  },
  
  /**
   * Get a comic by its ID
   * 
   * @param {number} id - Comic ID
   * @returns {Promise<Object|null>} Comic data or null
   */
  async getById(id) {
    try {
      const sql = `
        SELECT id, param, title, thumbnail, description, synopsis, 
               genres, latest_chapter, status, author, comic_type,
               last_scraped, created_at, updated_at
        FROM komik 
        WHERE id = ?
      `;
      const results = await db.query(sql, [id]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`ComicService.getById failed: ${error.message}`, { id });
      throw error;
    }
  },
  
  /**
   * Check if a comic exists by param
   * 
   * @param {string} param - Comic URL slug
   * @returns {Promise<boolean>} True if exists
   */
  async exists(param) {
    try {
      const sql = 'SELECT id FROM komik WHERE param = ?';
      const results = await db.query(sql, [param]);
      return results.length > 0;
    } catch (error) {
      logger.error(`ComicService.exists failed: ${error.message}`, { param });
      throw error;
    }
  },
  
  /**
   * Insert a new comic
   * 
   * @param {Object} comic - Comic data
   * @param {string} comic.param - URL slug
   * @param {string} comic.title - Comic title
   * @param {string} comic.thumbnail - Cover image URL
   * @param {string} comic.description - Short description
   * @param {string} comic.synopsis - Full synopsis
   * @param {string|Array} comic.genres - Genres (string or array)
   * @param {string} comic.latestChapter - Latest chapter label
   * @returns {Promise<Object>} Insert result with insertId
   */
  async insert(comic) {
    try {
      // Convert genres array to JSON string if needed
      const genresJson = Array.isArray(comic.genres) 
        ? JSON.stringify(comic.genres) 
        : comic.genres || '[]';
      
      const sql = `
        INSERT INTO komik (param, title, thumbnail, description, synopsis, genres, 
                           latest_chapter, status, author, comic_type, last_scraped)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const result = await db.insert(sql, [
        comic.param,
        comic.title,
        comic.thumbnail || null,
        comic.description || null,
        comic.synopsis || null,
        genresJson,
        comic.latestChapter || null,
        comic.status || 'Ongoing',
        comic.author || null,
        comic.comicType || 'Manga'
      ]);
      
      logger.info(`Comic inserted: ${comic.param} (ID: ${result.insertId})`);
      return result;
      
    } catch (error) {
      // Handle duplicate entry error
      if (error.code === 'ER_DUP_ENTRY') {
        logger.warn(`Comic already exists: ${comic.param}`);
        return { insertId: null, duplicate: true };
      }
      logger.error(`ComicService.insert failed: ${error.message}`, { param: comic.param });
      throw error;
    }
  },
  
  /**
   * Update an existing comic
   * 
   * @param {string} param - Comic URL slug
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async update(param, updates) {
    try {
      const fields = [];
      const values = [];
      
      // Build dynamic update query
      if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      if (updates.thumbnail !== undefined) {
        fields.push('thumbnail = ?');
        values.push(updates.thumbnail);
      }
      if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
      }
      if (updates.synopsis !== undefined) {
        fields.push('synopsis = ?');
        values.push(updates.synopsis);
      }
      if (updates.genres !== undefined) {
        fields.push('genres = ?');
        const genresJson = Array.isArray(updates.genres) 
          ? JSON.stringify(updates.genres) 
          : updates.genres;
        values.push(genresJson);
      }
      if (updates.latestChapter !== undefined) {
        fields.push('latest_chapter = ?');
        values.push(updates.latestChapter);
      }
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.author !== undefined) {
        fields.push('author = ?');
        values.push(updates.author);
      }
      if (updates.comicType !== undefined) {
        fields.push('comic_type = ?');
        values.push(updates.comicType);
      }
      if (updates.markScraped) {
        fields.push('last_scraped = NOW()');
      }
      
      // Always update updated_at
      fields.push('updated_at = NOW()');
      
      if (fields.length === 1) {
        // Only updated_at, nothing to update
        return { affectedRows: 0 };
      }
      
      values.push(param);
      
      const sql = `UPDATE komik SET ${fields.join(', ')} WHERE param = ?`;
      const result = await db.insert(sql, values);
      
      if (result.affectedRows > 0) {
        logger.info(`Comic updated: ${param}`);
      }
      
      return result;
      
    } catch (error) {
      logger.error(`ComicService.update failed: ${error.message}`, { param });
      throw error;
    }
  },
  
  /**
   * Insert or update a comic (upsert)
   * Inserts if not exists, updates if exists
   * 
   * @param {Object} comic - Comic data
   * @returns {Promise<Object>} Result with action taken
   */
  async upsert(comic) {
    try {
      const existing = await this.getByParam(comic.param);
      
      if (existing) {
        // Check if update is needed - compare all relevant fields
        const existingGenres = typeof existing.genres === 'string' 
          ? JSON.parse(existing.genres || '[]') 
          : existing.genres || [];
        const comicGenres = comic.genres || [];
        const genresChanged = JSON.stringify(existingGenres.sort()) !== JSON.stringify(comicGenres.sort());
        
        const needsUpdate = 
          (comic.title && comic.title !== existing.title) ||
          (comic.thumbnail && comic.thumbnail !== existing.thumbnail) ||
          (comic.description && comic.description !== existing.description) ||
          (comic.synopsis && comic.synopsis !== existing.synopsis) ||
          (comic.latestChapter && comic.latestChapter !== existing.latest_chapter) ||
          (comic.status && comic.status !== existing.status) ||
          (comic.author && comic.author !== existing.author) ||
          (comic.comicType && comic.comicType !== existing.comic_type) ||
          genresChanged;
        
        if (needsUpdate) {
          await this.update(comic.param, { ...comic, markScraped: true });
          return { action: 'updated', id: existing.id };
        }
        
        // Just mark as scraped even if no changes
        await this.update(comic.param, { markScraped: true });
        return { action: 'unchanged', id: existing.id };
      } else {
        const result = await this.insert(comic);
        return { action: 'inserted', id: result.insertId };
      }
      
    } catch (error) {
      logger.error(`ComicService.upsert failed: ${error.message}`, { param: comic.param });
      throw error;
    }
  },
  
  /**
   * Get all comic params (for checking existing comics)
   * 
   * @returns {Promise<Set<string>>} Set of all comic params
   */
  async getAllParams() {
    try {
      const sql = 'SELECT param FROM komik';
      const results = await db.query(sql);
      return new Set(results.map(r => r.param));
    } catch (error) {
      logger.error(`ComicService.getAllParams failed: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get total comic count
   * 
   * @returns {Promise<number>} Total count
   */
  async count() {
    try {
      const sql = 'SELECT COUNT(*) as count FROM komik';
      const results = await db.query(sql);
      return results[0].count;
    } catch (error) {
      logger.error(`ComicService.count failed: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get comics updated within a time range
   * 
   * @param {Date} since - Start date
   * @returns {Promise<Array>} List of recently updated comics
   */
  async getRecentlyUpdated(since) {
    try {
      const sql = `
        SELECT id, param, title, latest_chapter, updated_at
        FROM komik
        WHERE updated_at >= ?
        ORDER BY updated_at DESC
      `;
      return await db.query(sql, [since]);
    } catch (error) {
      logger.error(`ComicService.getRecentlyUpdated failed: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get ongoing comics that need to be checked for updates
   * Prioritizes comics that haven't been scraped recently
   * 
   * @param {number} limit - Maximum number to return
   * @param {number} hoursOld - Consider comics not scraped in this many hours
   * @returns {Promise<Array>} List of comics needing update
   */
  async getOngoingNeedingUpdate(limit = 50, hoursOld = 24) {
    try {
      const sql = `
        SELECT id, param, title, latest_chapter, status, last_scraped, updated_at
        FROM komik
        WHERE status = 'Ongoing' OR status IS NULL
          AND (last_scraped IS NULL OR last_scraped < NOW() - INTERVAL ? HOUR)
        ORDER BY 
          CASE WHEN last_scraped IS NULL THEN 0 ELSE 1 END,
          last_scraped ASC
        LIMIT ?
      `;
      return await db.query(sql, [hoursOld, limit]);
    } catch (error) {
      logger.error(`ComicService.getOngoingNeedingUpdate failed: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Smart update - compares and only updates changed fields
   * Returns which fields were actually updated
   * 
   * @param {Object} existing - Existing comic from database
   * @param {Object} scraped - Freshly scraped comic data
   * @returns {Promise<Object>} Result with changed fields
   */
  async smartUpdate(existing, scraped) {
    try {
      const changes = {};
      let hasChanges = false;
      
      // Compare each field and collect changes
      if (scraped.title && scraped.title !== existing.title) {
        changes.title = scraped.title;
        hasChanges = true;
      }
      if (scraped.thumbnail && scraped.thumbnail !== existing.thumbnail) {
        changes.thumbnail = scraped.thumbnail;
        hasChanges = true;
      }
      if (scraped.description && scraped.description !== existing.description) {
        changes.description = scraped.description;
        hasChanges = true;
      }
      if (scraped.synopsis && scraped.synopsis !== existing.synopsis) {
        changes.synopsis = scraped.synopsis;
        hasChanges = true;
      }
      if (scraped.latestChapter && scraped.latestChapter !== existing.latest_chapter) {
        changes.latestChapter = scraped.latestChapter;
        hasChanges = true;
      }
      if (scraped.status && scraped.status !== existing.status) {
        changes.status = scraped.status;
        hasChanges = true;
      }
      if (scraped.author && scraped.author !== existing.author) {
        changes.author = scraped.author;
        hasChanges = true;
      }
      if (scraped.comicType && scraped.comicType !== existing.comic_type) {
        changes.comicType = scraped.comicType;
        hasChanges = true;
      }
      
      // Compare genres (JSON comparison)
      const existingGenres = typeof existing.genres === 'string' 
        ? JSON.parse(existing.genres || '[]') 
        : existing.genres || [];
      const scrapedGenres = scraped.genres || [];
      
      if (JSON.stringify(existingGenres.sort()) !== JSON.stringify(scrapedGenres.sort())) {
        changes.genres = scrapedGenres;
        hasChanges = true;
      }
      
      // Always mark as scraped
      changes.markScraped = true;
      
      if (hasChanges) {
        await this.update(existing.param, changes);
        logger.info(`Smart update for ${existing.param}: ${Object.keys(changes).filter(k => k !== 'markScraped').join(', ')}`);
        return { updated: true, changes: Object.keys(changes).filter(k => k !== 'markScraped') };
      } else {
        // Just update last_scraped
        await this.update(existing.param, { markScraped: true });
        return { updated: false, changes: [] };
      }
      
    } catch (error) {
      logger.error(`ComicService.smartUpdate failed: ${error.message}`, { param: existing.param });
      throw error;
    }
  }
};

module.exports = ComicService;
