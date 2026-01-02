/**
 * ===========================================
 * AF-Komik V2 - Image Model (MySQL)
 * ===========================================
 * 
 * Data access layer for the 'image' table in MySQL.
 * Provides async methods to query page images with logging.
 * 
 * Table: image
 * - id: Primary key (INT, AUTO_INCREMENT)
 * - chapter_id: Foreign key to chapter table (INT)
 * - page_number: Sequential page number (INT)
 * - image_url: URL to the page image (VARCHAR)
 * - created_at: Record creation timestamp
 * 
 * Relationships:
 * - image.chapter_id -> chapter.id (Many-to-One)
 * 
 * All methods use prepared statements for security.
 */

const { query } = require('../../config/mysql');
const logger = require('../../config/logger');

/**
 * Image model with database operations
 */
const ImageModel = {
  
  /**
   * Find all images for a specific chapter
   * 
   * Retrieves all page images for a chapter, ordered by page number.
   * Used for chapter reader to display pages in correct order.
   * 
   * SQL Query:
   * SELECT id, chapter_id, page_number, image_url
   * FROM image
   * WHERE chapter_id = ?
   * ORDER BY page_number ASC
   * 
   * @param {number} chapterId - The chapter's database ID
   * @returns {Promise<Array>} Array of image objects ordered by page_number
   */
  async findByChapterId(chapterId) {
    const startTime = Date.now();
    
    console.log(`[IMAGE_MODEL] findByChapterId() - Fetching images for chapter ID: ${chapterId}`);
    logger.debug(`Image.findByChapterId: chapterId=${chapterId}`);
    
    try {
      // SQL: Get all images for a chapter in page order
      // ORDER BY page_number ASC ensures correct reading order
      const sql = `
        SELECT 
          id, 
          chapter_id, 
          page_number, 
          image_url
        FROM image
        WHERE chapter_id = ?
        ORDER BY page_number ASC
      `;
      
      const results = await query(sql, [chapterId]);
      const duration = Date.now() - startTime;
      
      console.log(`[IMAGE_MODEL] findByChapterId() - Found ${results.length} images (${duration}ms)`);
      logger.info(`Image.findByChapterId: ${results.length} images in ${duration}ms`);
      
      // Log warning if no images found (might indicate data issue)
      if (results.length === 0) {
        console.warn(`[IMAGE_MODEL] findByChapterId() - No images found for chapter ${chapterId}`);
        logger.warn(`Image.findByChapterId: no images for chapterId=${chapterId}`);
      }
      
      return results;
      
    } catch (error) {
      console.error(`[IMAGE_MODEL] findByChapterId() - Error: ${error.message}`);
      logger.error(`Image.findByChapterId error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Count images for a specific chapter
   * 
   * Used to show page count without fetching all image data.
   * 
   * SQL Query:
   * SELECT COUNT(*) as total FROM image WHERE chapter_id = ?
   * 
   * @param {number} chapterId - Chapter ID
   * @returns {Promise<number>} Image/page count
   */
  async countByChapterId(chapterId) {
    const startTime = Date.now();
    
    console.log(`[IMAGE_MODEL] countByChapterId() - Counting images for chapter ID: ${chapterId}`);
    logger.debug(`Image.countByChapterId: chapterId=${chapterId}`);
    
    try {
      const sql = `SELECT COUNT(*) as total FROM image WHERE chapter_id = ?`;
      const results = await query(sql, [chapterId]);
      const duration = Date.now() - startTime;
      
      const total = results[0].total;
      console.log(`[IMAGE_MODEL] countByChapterId() - Total: ${total} images (${duration}ms)`);
      logger.info(`Image.countByChapterId: ${total} images in ${duration}ms`);
      
      return total;
      
    } catch (error) {
      console.error(`[IMAGE_MODEL] countByChapterId() - Error: ${error.message}`);
      logger.error(`Image.countByChapterId error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Find a single image by chapter ID and page number
   * 
   * Used for page-by-page navigation (future feature).
   * 
   * SQL Query:
   * SELECT * FROM image WHERE chapter_id = ? AND page_number = ?
   * 
   * @param {number} chapterId - Chapter ID
   * @param {number} pageNumber - Page number
   * @returns {Promise<Object|null>} Image object or null
   */
  async findByChapterAndPage(chapterId, pageNumber) {
    const startTime = Date.now();
    
    console.log(`[IMAGE_MODEL] findByChapterAndPage() - Chapter: ${chapterId}, Page: ${pageNumber}`);
    logger.debug(`Image.findByChapterAndPage: chapterId=${chapterId}, page=${pageNumber}`);
    
    try {
      const sql = `
        SELECT id, chapter_id, page_number, image_url
        FROM image
        WHERE chapter_id = ? AND page_number = ?
        LIMIT 1
      `;
      
      const results = await query(sql, [chapterId, pageNumber]);
      const duration = Date.now() - startTime;
      
      if (results.length === 0) {
        console.log(`[IMAGE_MODEL] findByChapterAndPage() - Not found (${duration}ms)`);
        logger.warn(`Image.findByChapterAndPage: not found - chapter=${chapterId}, page=${pageNumber}`);
        return null;
      }
      
      console.log(`[IMAGE_MODEL] findByChapterAndPage() - Found image (${duration}ms)`);
      logger.info(`Image.findByChapterAndPage: found in ${duration}ms`);
      
      return results[0];
      
    } catch (error) {
      console.error(`[IMAGE_MODEL] findByChapterAndPage() - Error: ${error.message}`);
      logger.error(`Image.findByChapterAndPage error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get first and last page numbers for a chapter
   * 
   * Used for navigation and progress tracking.
   * 
   * SQL Query:
   * SELECT MIN(page_number) as first, MAX(page_number) as last
   * FROM image WHERE chapter_id = ?
   * 
   * @param {number} chapterId - Chapter ID
   * @returns {Promise<Object>} Object with first and last page numbers
   */
  async getPageRange(chapterId) {
    const startTime = Date.now();
    
    console.log(`[IMAGE_MODEL] getPageRange() - Getting page range for chapter ID: ${chapterId}`);
    logger.debug(`Image.getPageRange: chapterId=${chapterId}`);
    
    try {
      const sql = `
        SELECT 
          MIN(page_number) as first_page, 
          MAX(page_number) as last_page
        FROM image
        WHERE chapter_id = ?
      `;
      
      const results = await query(sql, [chapterId]);
      const duration = Date.now() - startTime;
      
      const range = {
        first: results[0].first_page || 0,
        last: results[0].last_page || 0
      };
      
      console.log(`[IMAGE_MODEL] getPageRange() - Pages ${range.first}-${range.last} (${duration}ms)`);
      logger.info(`Image.getPageRange: ${range.first}-${range.last} in ${duration}ms`);
      
      return range;
      
    } catch (error) {
      console.error(`[IMAGE_MODEL] getPageRange() - Error: ${error.message}`);
      logger.error(`Image.getPageRange error: ${error.message}`);
      throw error;
    }
  }
};

module.exports = ImageModel;
