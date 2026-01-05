/**
 * ===========================================
 * AF-Komik Scraper - Chapter Service
 * ===========================================
 * 
 * Database operations for the 'chapter' table.
 * Handles insert, update, and lookup operations.
 * 
 * Table Schema:
 * - id: INT (Primary Key, Auto Increment)
 * - komik_id: INT (Foreign Key to komik)
 * - param: VARCHAR (URL slug)
 * - chapter_label: VARCHAR (Display label)
 * - release_date: TIMESTAMP
 * - created_at: TIMESTAMP
 */

const db = require('../config/db');
const logger = require('../config/logger');

/**
 * Chapter service with database operations
 */
const ChapterService = {
  
  /**
   * Get a chapter by comic ID and chapter param
   * 
   * @param {number} comicId - Comic database ID
   * @param {string} param - Chapter URL slug
   * @returns {Promise<Object|null>} Chapter data or null
   */
  async getByParam(comicId, param) {
    try {
      const sql = `
        SELECT id, komik_id, param, chapter_label, release_date, created_at
        FROM chapter
        WHERE komik_id = ? AND param = ?
      `;
      const results = await db.query(sql, [comicId, param]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`ChapterService.getByParam failed: ${error.message}`, { comicId, param });
      throw error;
    }
  },
  
  /**
   * Get a chapter by its ID
   * 
   * @param {number} id - Chapter ID
   * @returns {Promise<Object|null>} Chapter data or null
   */
  async getById(id) {
    try {
      const sql = `
        SELECT id, komik_id, param, chapter_label, release_date, created_at
        FROM chapter
        WHERE id = ?
      `;
      const results = await db.query(sql, [id]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`ChapterService.getById failed: ${error.message}`, { id });
      throw error;
    }
  },
  
  /**
   * Check if a chapter exists
   * 
   * @param {number} comicId - Comic database ID
   * @param {string} param - Chapter URL slug
   * @returns {Promise<boolean>} True if exists
   */
  async exists(comicId, param) {
    try {
      const sql = 'SELECT id FROM chapter WHERE komik_id = ? AND param = ?';
      const results = await db.query(sql, [comicId, param]);
      return results.length > 0;
    } catch (error) {
      logger.error(`ChapterService.exists failed: ${error.message}`, { comicId, param });
      throw error;
    }
  },
  
  /**
   * Get all chapters for a comic
   * 
   * @param {number} comicId - Comic database ID
   * @returns {Promise<Array>} List of chapters
   */
  async getByComicId(comicId) {
    try {
      const sql = `
        SELECT id, komik_id, param, chapter_label, release_date, created_at
        FROM chapter
        WHERE komik_id = ?
        ORDER BY id DESC
      `;
      return await db.query(sql, [comicId]);
    } catch (error) {
      logger.error(`ChapterService.getByComicId failed: ${error.message}`, { comicId });
      throw error;
    }
  },
  
  /**
   * Get all chapter params for a comic (for quick existence check)
   * 
   * @param {number} comicId - Comic database ID
   * @returns {Promise<Set<string>>} Set of chapter params
   */
  async getParamsByComicId(comicId) {
    try {
      const sql = 'SELECT param FROM chapter WHERE komik_id = ?';
      const results = await db.query(sql, [comicId]);
      return new Set(results.map(r => r.param));
    } catch (error) {
      logger.error(`ChapterService.getParamsByComicId failed: ${error.message}`, { comicId });
      throw error;
    }
  },
  
  /**
   * Insert a new chapter
   * 
   * @param {Object} chapter - Chapter data
   * @param {number} chapter.comicId - Comic database ID
   * @param {string} chapter.param - URL slug
   * @param {string} chapter.label - Display label
   * @param {Date|string} chapter.releaseDate - Release date
   * @returns {Promise<Object>} Insert result with insertId
   */
  async insert(chapter) {
    try {
      const sql = `
        INSERT INTO chapter (komik_id, param, chapter_label, release_date)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await db.insert(sql, [
        chapter.comicId,
        chapter.param,
        chapter.label,
        chapter.releaseDate || null
      ]);
      
      logger.debug(`Chapter inserted: ${chapter.param} for comic ID ${chapter.comicId}`);
      return result;
      
    } catch (error) {
      // Handle duplicate entry
      if (error.code === 'ER_DUP_ENTRY') {
        logger.debug(`Chapter already exists: ${chapter.param}`);
        return { insertId: null, duplicate: true };
      }
      logger.error(`ChapterService.insert failed: ${error.message}`, { param: chapter.param });
      throw error;
    }
  },
  
  /**
   * Insert chapter only if it doesn't exist
   * Returns existing chapter ID if already exists
   * 
   * @param {Object} chapter - Chapter data
   * @returns {Promise<Object>} Result with id and action
   */
  async insertIfNotExists(chapter) {
    try {
      // Check if exists first
      const existing = await this.getByParam(chapter.comicId, chapter.param);
      
      if (existing) {
        return { 
          id: existing.id, 
          action: 'exists',
          isNew: false
        };
      }
      
      // Insert new chapter
      const result = await this.insert(chapter);
      
      if (result.duplicate) {
        // Race condition - another process inserted it
        const created = await this.getByParam(chapter.comicId, chapter.param);
        return { 
          id: created ? created.id : null, 
          action: 'exists',
          isNew: false
        };
      }
      
      return { 
        id: result.insertId, 
        action: 'inserted',
        isNew: true
      };
      
    } catch (error) {
      logger.error(`ChapterService.insertIfNotExists failed: ${error.message}`, { 
        comicId: chapter.comicId, 
        param: chapter.param 
      });
      throw error;
    }
  },
  
  /**
   * Bulk insert chapters (skip existing)
   * 
   * @param {number} comicId - Comic database ID
   * @param {Array} chapters - Array of chapter data
   * @returns {Promise<Object>} Summary of insertions
   */
  async bulkInsert(comicId, chapters) {
    try {
      // Get existing params
      const existingParams = await this.getParamsByComicId(comicId);
      
      // Filter new chapters
      const newChapters = chapters.filter(ch => !existingParams.has(ch.param));
      
      if (newChapters.length === 0) {
        return { inserted: 0, skipped: chapters.length, total: chapters.length };
      }
      
      // Insert new chapters one by one (to handle individual errors)
      let inserted = 0;
      for (const chapter of newChapters) {
        try {
          await this.insert({
            comicId,
            param: chapter.param,
            label: chapter.label,
            releaseDate: chapter.releaseDate
          });
          inserted++;
        } catch (error) {
          logger.warn(`Failed to insert chapter ${chapter.param}: ${error.message}`);
        }
      }
      
      logger.info(`Bulk insert: ${inserted}/${newChapters.length} chapters for comic ID ${comicId}`);
      
      return { 
        inserted, 
        skipped: chapters.length - newChapters.length,
        failed: newChapters.length - inserted,
        total: chapters.length 
      };
      
    } catch (error) {
      logger.error(`ChapterService.bulkInsert failed: ${error.message}`, { comicId });
      throw error;
    }
  },
  
  /**
   * Get chapter count for a comic
   * 
   * @param {number} comicId - Comic database ID
   * @returns {Promise<number>} Chapter count
   */
  async countByComicId(comicId) {
    try {
      const sql = 'SELECT COUNT(*) as count FROM chapter WHERE komik_id = ?';
      const results = await db.query(sql, [comicId]);
      return results[0].count;
    } catch (error) {
      logger.error(`ChapterService.countByComicId failed: ${error.message}`, { comicId });
      throw error;
    }
  },
  
  /**
   * Get total chapter count across all comics
   * 
   * @returns {Promise<number>} Total chapter count
   */
  async count() {
    try {
      const sql = 'SELECT COUNT(*) as count FROM chapter';
      const results = await db.query(sql);
      return results[0].count;
    } catch (error) {
      logger.error(`ChapterService.count failed: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get the latest chapter for a comic
   * 
   * @param {number} comicId - Comic database ID
   * @returns {Promise<Object|null>} Latest chapter or null
   */
  async getLatest(comicId) {
    try {
      const sql = `
        SELECT id, komik_id, param, chapter_label, release_date, created_at
        FROM chapter
        WHERE komik_id = ?
        ORDER BY id DESC
        LIMIT 1
      `;
      const results = await db.query(sql, [comicId]);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error(`ChapterService.getLatest failed: ${error.message}`, { comicId });
      throw error;
    }
  },
  
  /**
   * Find missing chapters by comparing scraped chapters with database
   * Returns chapters that exist on website but not in database
   * 
   * @param {number} comicId - Comic database ID
   * @param {Array} scrapedChapters - Chapters from website
   * @returns {Promise<Array>} Missing chapters
   */
  async findMissingChapters(comicId, scrapedChapters) {
    try {
      const existingParams = await this.getParamsByComicId(comicId);
      const missing = scrapedChapters.filter(ch => !existingParams.has(ch.param));
      
      logger.debug(`Found ${missing.length} missing chapters for comic ID ${comicId}`);
      return missing;
    } catch (error) {
      logger.error(`ChapterService.findMissingChapters failed: ${error.message}`, { comicId });
      throw error;
    }
  },
  
  /**
   * Get comics with incomplete chapter data
   * Compares database chapter count with expected count from latest scrape
   * 
   * @param {number} limit - Maximum comics to return
   * @returns {Promise<Array>} Comics with potentially missing chapters
   */
  async getComicsWithIncompleteChapters(limit = 100) {
    try {
      // Get comics where scraped chapter count doesn't match DB count
      // Or comics that haven't been fully verified
      const sql = `
        SELECT 
          k.id,
          k.param,
          k.title,
          k.status,
          COUNT(c.id) as db_chapter_count,
          k.last_scraped
        FROM komik k
        LEFT JOIN chapter c ON c.komik_id = k.id
        GROUP BY k.id
        ORDER BY k.last_scraped ASC
        LIMIT ?
      `;
      return await db.query(sql, [limit]);
    } catch (error) {
      logger.error(`ChapterService.getComicsWithIncompleteChapters failed: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Sync chapters - insert all missing chapters from scraped data
   * 
   * @param {number} comicId - Comic database ID
   * @param {Array} scrapedChapters - All chapters from website
   * @returns {Promise<Object>} Sync result summary
   */
  async syncChapters(comicId, scrapedChapters) {
    try {
      const existingParams = await this.getParamsByComicId(comicId);
      const existingCount = existingParams.size;
      const scrapedCount = scrapedChapters.length;
      
      // Find missing chapters
      const missingChapters = scrapedChapters.filter(ch => !existingParams.has(ch.param));
      
      if (missingChapters.length === 0) {
        return {
          existingCount,
          scrapedCount,
          missingCount: 0,
          insertedCount: 0,
          status: 'complete'
        };
      }
      
      // Insert missing chapters
      let insertedCount = 0;
      for (const chapter of missingChapters) {
        try {
          const result = await this.insert({
            comicId,
            param: chapter.param,
            label: chapter.label,
            releaseDate: chapter.releaseDate
          });
          if (result.insertId) {
            insertedCount++;
          }
        } catch (err) {
          logger.warn(`Failed to insert missing chapter ${chapter.param}: ${err.message}`);
        }
      }
      
      logger.info(`Synced chapters for comic ${comicId}: ${insertedCount}/${missingChapters.length} missing chapters inserted`);
      
      return {
        existingCount,
        scrapedCount,
        missingCount: missingChapters.length,
        insertedCount,
        status: insertedCount === missingChapters.length ? 'synced' : 'partial'
      };
    } catch (error) {
      logger.error(`ChapterService.syncChapters failed: ${error.message}`, { comicId });
      throw error;
    }
  }
};

module.exports = ChapterService;
