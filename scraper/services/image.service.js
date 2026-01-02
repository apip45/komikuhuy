/**
 * ===========================================
 * AF-Komik Scraper - Image Service
 * ===========================================
 * 
 * Database operations for the 'image' table.
 * Handles insert and lookup operations for chapter images.
 * 
 * Table Schema:
 * - id: INT (Primary Key, Auto Increment)
 * - chapter_id: INT (Foreign Key to chapter)
 * - page_number: INT (Sequential page number)
 * - image_url: VARCHAR (URL to image)
 * - created_at: TIMESTAMP
 */

const db = require('../config/db');
const logger = require('../config/logger');

/**
 * Image service with database operations
 */
const ImageService = {
  
  /**
   * Get all images for a chapter
   * 
   * @param {number} chapterId - Chapter database ID
   * @returns {Promise<Array>} List of images ordered by page_number
   */
  async getByChapterId(chapterId) {
    try {
      const sql = `
        SELECT id, chapter_id, page_number, image_url, created_at
        FROM image
        WHERE chapter_id = ?
        ORDER BY page_number ASC
      `;
      return await db.query(sql, [chapterId]);
    } catch (error) {
      logger.error(`ImageService.getByChapterId failed: ${error.message}`, { chapterId });
      throw error;
    }
  },
  
  /**
   * Check if a chapter has images
   * 
   * @param {number} chapterId - Chapter database ID
   * @returns {Promise<boolean>} True if chapter has images
   */
  async hasImages(chapterId) {
    try {
      const sql = 'SELECT id FROM image WHERE chapter_id = ? LIMIT 1';
      const results = await db.query(sql, [chapterId]);
      return results.length > 0;
    } catch (error) {
      logger.error(`ImageService.hasImages failed: ${error.message}`, { chapterId });
      throw error;
    }
  },
  
  /**
   * Get image count for a chapter
   * 
   * @param {number} chapterId - Chapter database ID
   * @returns {Promise<number>} Image count
   */
  async countByChapterId(chapterId) {
    try {
      const sql = 'SELECT COUNT(*) as count FROM image WHERE chapter_id = ?';
      const results = await db.query(sql, [chapterId]);
      return results[0].count;
    } catch (error) {
      logger.error(`ImageService.countByChapterId failed: ${error.message}`, { chapterId });
      throw error;
    }
  },
  
  /**
   * Insert a single image
   * 
   * @param {Object} image - Image data
   * @param {number} image.chapterId - Chapter database ID
   * @param {number} image.pageNumber - Page number (1-based)
   * @param {string} image.imageUrl - Image URL
   * @returns {Promise<Object>} Insert result with insertId
   */
  async insert(image) {
    try {
      const sql = `
        INSERT INTO image (chapter_id, page_number, image_url)
        VALUES (?, ?, ?)
      `;
      
      const result = await db.insert(sql, [
        image.chapterId,
        image.pageNumber,
        image.imageUrl
      ]);
      
      return result;
      
    } catch (error) {
      logger.error(`ImageService.insert failed: ${error.message}`, { 
        chapterId: image.chapterId, 
        pageNumber: image.pageNumber 
      });
      throw error;
    }
  },
  
  /**
   * Bulk insert images for a chapter
   * Uses transaction for atomicity
   * 
   * @param {number} chapterId - Chapter database ID
   * @param {Array<string>} imageUrls - Array of image URLs (ordered)
   * @returns {Promise<Object>} Insert summary
   */
  async bulkInsert(chapterId, imageUrls) {
    if (!imageUrls || imageUrls.length === 0) {
      return { inserted: 0, chapterId };
    }
    
    try {
      // Check if chapter already has images
      const existingCount = await this.countByChapterId(chapterId);
      
      if (existingCount > 0) {
        logger.debug(`Chapter ${chapterId} already has ${existingCount} images, skipping`);
        return { inserted: 0, skipped: existingCount, chapterId };
      }
      
      // Use transaction for bulk insert
      const result = await db.transaction(async (connection) => {
        let inserted = 0;
        
        for (let i = 0; i < imageUrls.length; i++) {
          const sql = `
            INSERT INTO image (chapter_id, page_number, image_url)
            VALUES (?, ?, ?)
          `;
          
          await connection.execute(sql, [
            chapterId,
            i + 1, // 1-based page number
            imageUrls[i]
          ]);
          
          inserted++;
        }
        
        return inserted;
      });
      
      logger.debug(`Inserted ${result} images for chapter ${chapterId}`);
      
      return { inserted: result, chapterId };
      
    } catch (error) {
      logger.error(`ImageService.bulkInsert failed: ${error.message}`, { chapterId });
      throw error;
    }
  },
  
  /**
   * Bulk insert with individual error handling
   * Inserts as many images as possible, logs failures
   * 
   * @param {number} chapterId - Chapter database ID
   * @param {Array<string>} imageUrls - Array of image URLs (ordered)
   * @returns {Promise<Object>} Insert summary
   */
  async bulkInsertSafe(chapterId, imageUrls) {
    if (!imageUrls || imageUrls.length === 0) {
      return { inserted: 0, failed: 0, chapterId };
    }
    
    try {
      // Check if chapter already has images
      const existingCount = await this.countByChapterId(chapterId);
      
      if (existingCount > 0) {
        logger.debug(`Chapter ${chapterId} already has ${existingCount} images, skipping`);
        return { inserted: 0, skipped: existingCount, failed: 0, chapterId };
      }
      
      let inserted = 0;
      let failed = 0;
      
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          await this.insert({
            chapterId,
            pageNumber: i + 1,
            imageUrl: imageUrls[i]
          });
          inserted++;
        } catch (error) {
          logger.warn(`Failed to insert image page ${i + 1} for chapter ${chapterId}: ${error.message}`);
          failed++;
        }
      }
      
      if (inserted > 0) {
        logger.debug(`Inserted ${inserted}/${imageUrls.length} images for chapter ${chapterId}`);
      }
      
      return { inserted, failed, chapterId };
      
    } catch (error) {
      logger.error(`ImageService.bulkInsertSafe failed: ${error.message}`, { chapterId });
      throw error;
    }
  },
  
  /**
   * Delete all images for a chapter
   * Useful for re-scraping
   * 
   * @param {number} chapterId - Chapter database ID
   * @returns {Promise<number>} Number of deleted images
   */
  async deleteByChapterId(chapterId) {
    try {
      const sql = 'DELETE FROM image WHERE chapter_id = ?';
      const result = await db.insert(sql, [chapterId]);
      
      if (result.affectedRows > 0) {
        logger.info(`Deleted ${result.affectedRows} images for chapter ${chapterId}`);
      }
      
      return result.affectedRows;
      
    } catch (error) {
      logger.error(`ImageService.deleteByChapterId failed: ${error.message}`, { chapterId });
      throw error;
    }
  },
  
  /**
   * Get total image count across all chapters
   * 
   * @returns {Promise<number>} Total image count
   */
  async count() {
    try {
      const sql = 'SELECT COUNT(*) as count FROM image';
      const results = await db.query(sql);
      return results[0].count;
    } catch (error) {
      logger.error(`ImageService.count failed: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get chapters that are missing images
   * Useful for identifying incomplete scrapes
   * 
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} List of chapter IDs without images
   */
  async getChaptersWithoutImages(limit = 100) {
    try {
      const sql = `
        SELECT c.id, c.komik_id, c.param, c.chapter_label
        FROM chapter c
        LEFT JOIN image i ON c.id = i.chapter_id
        WHERE i.id IS NULL
        LIMIT ?
      `;
      return await db.query(sql, [limit]);
    } catch (error) {
      logger.error(`ImageService.getChaptersWithoutImages failed: ${error.message}`);
      throw error;
    }
  }
};

module.exports = ImageService;
