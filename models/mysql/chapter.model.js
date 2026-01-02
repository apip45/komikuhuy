/**
 * ===========================================
 * AF-Komik V2 - Chapter Model (MySQL)
 * ===========================================
 * 
 * Data access layer for the 'chapter' table in MySQL.
 * Provides async methods to query chapter data with logging.
 * 
 * Table: chapter
 * - id: Primary key (INT, AUTO_INCREMENT)
 * - komik_id: Foreign key to komik table (INT)
 * - param: URL slug (VARCHAR) - e.g., "chapter-1100"
 * - chapter_label: Display label (VARCHAR) - e.g., "Chapter 1100"
 * - release_date: Chapter release timestamp
 * - created_at: Record creation timestamp
 * 
 * Relationships:
 * - chapter.komik_id -> komik.id (Many-to-One)
 * - chapter.id -> image.chapter_id (One-to-Many)
 * 
 * All methods use prepared statements for security.
 */

const { query } = require('../../config/mysql');
const logger = require('../../config/logger');

/**
 * Chapter model with database operations
 */
const ChapterModel = {
  
  /**
   * Find all chapters for a specific comic
   * 
   * Retrieves chapter list for a comic, ordered by ID descending
   * (newest chapters first). Used for chapter list on comic detail page.
   * 
   * SQL Query:
   * SELECT id, komik_id, param, chapter_label, release_date, created_at
   * FROM chapter
   * WHERE komik_id = ?
   * ORDER BY id DESC
   * 
   * @param {number} comicId - The comic's database ID
   * @returns {Promise<Array>} Array of chapter objects
   */
  async findByComicId(comicId) {
    const startTime = Date.now();
    
    console.log(`[CHAPTER_MODEL] findByComicId() - Fetching chapters for comic ID: ${comicId}`);
    logger.debug(`Chapter.findByComicId: comicId=${comicId}`);
    
    try {
      // SQL: Get all chapters for a comic
      // ORDER BY id DESC assumes higher ID = newer chapter
      const sql = `
        SELECT 
          id, 
          komik_id, 
          param, 
          chapter_label, 
          release_date, 
          created_at
        FROM chapter
        WHERE komik_id = ?
        ORDER BY id DESC
      `;
      
      const results = await query(sql, [comicId]);
      const duration = Date.now() - startTime;
      
      console.log(`[CHAPTER_MODEL] findByComicId() - Found ${results.length} chapters (${duration}ms)`);
      logger.info(`Chapter.findByComicId: ${results.length} chapters in ${duration}ms`);
      
      return results;
      
    } catch (error) {
      console.error(`[CHAPTER_MODEL] findByComicId() - Error: ${error.message}`);
      logger.error(`Chapter.findByComicId error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Find a chapter by comic param and chapter param
   * 
   * Used for chapter reader page. First finds the comic by param,
   * then finds the specific chapter within that comic.
   * 
   * SQL Query:
   * SELECT c.*, k.param as comic_param, k.title as comic_title
   * FROM chapter c
   * INNER JOIN komik k ON c.komik_id = k.id
   * WHERE k.param = ? AND c.param = ?
   * 
   * @param {string} comicParam - Comic URL slug (e.g., "one-piece")
   * @param {string} chapterParam - Chapter URL slug (e.g., "chapter-1100")
   * @returns {Promise<Object|null>} Chapter object with comic info or null
   */
  async findByParams(comicParam, chapterParam) {
    const startTime = Date.now();
    
    console.log(`[CHAPTER_MODEL] findByParams() - Looking for: ${comicParam}/${chapterParam}`);
    logger.debug(`Chapter.findByParams: comic="${comicParam}", chapter="${chapterParam}"`);
    
    try {
      // SQL: Join chapter with komik to validate both exist
      // Include comic info needed for breadcrumbs and navigation
      const sql = `
        SELECT 
          c.id, 
          c.komik_id, 
          c.param, 
          c.chapter_label, 
          c.release_date, 
          c.created_at,
          k.param as comic_param, 
          k.title as comic_title,
          k.thumbnail as comic_thumbnail
        FROM chapter c
        INNER JOIN komik k ON c.komik_id = k.id
        WHERE k.param = ? AND c.param = ?
        LIMIT 1
      `;
      
      const results = await query(sql, [comicParam, chapterParam]);
      const duration = Date.now() - startTime;
      
      if (results.length === 0) {
        console.log(`[CHAPTER_MODEL] findByParams() - Not found: ${comicParam}/${chapterParam} (${duration}ms)`);
        logger.warn(`Chapter.findByParams: not found - ${comicParam}/${chapterParam}`);
        return null;
      }
      
      const chapter = results[0];
      console.log(`[CHAPTER_MODEL] findByParams() - Found: "${chapter.chapter_label}" (${duration}ms)`);
      logger.info(`Chapter.findByParams: found "${chapter.chapter_label}" in ${duration}ms`);
      
      return chapter;
      
    } catch (error) {
      console.error(`[CHAPTER_MODEL] findByParams() - Error: ${error.message}`);
      logger.error(`Chapter.findByParams error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Find a chapter by its ID
   * 
   * Used for navigation (prev/next chapter).
   * 
   * SQL Query:
   * SELECT * FROM chapter WHERE id = ?
   * 
   * @param {number} id - Chapter ID
   * @returns {Promise<Object|null>} Chapter object or null
   */
  async findById(id) {
    const startTime = Date.now();
    
    console.log(`[CHAPTER_MODEL] findById() - Looking for chapter ID: ${id}`);
    logger.debug(`Chapter.findById: id=${id}`);
    
    try {
      const sql = `
        SELECT 
          id, 
          komik_id, 
          param, 
          chapter_label, 
          release_date, 
          created_at
        FROM chapter
        WHERE id = ?
        LIMIT 1
      `;
      
      const results = await query(sql, [id]);
      const duration = Date.now() - startTime;
      
      if (results.length === 0) {
        console.log(`[CHAPTER_MODEL] findById() - Chapter ID ${id} not found (${duration}ms)`);
        logger.warn(`Chapter.findById: not found - id=${id}`);
        return null;
      }
      
      console.log(`[CHAPTER_MODEL] findById() - Found chapter ID ${id} (${duration}ms)`);
      logger.info(`Chapter.findById: found id=${id} in ${duration}ms`);
      
      return results[0];
      
    } catch (error) {
      console.error(`[CHAPTER_MODEL] findById() - Error: ${error.message}`);
      logger.error(`Chapter.findById error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get previous and next chapter for navigation
   * 
   * Finds the adjacent chapters based on ID ordering.
   * Previous = lower ID, Next = higher ID.
   * 
   * SQL Queries:
   * - Previous: SELECT * FROM chapter WHERE komik_id = ? AND id < ? ORDER BY id DESC LIMIT 1
   * - Next: SELECT * FROM chapter WHERE komik_id = ? AND id > ? ORDER BY id ASC LIMIT 1
   * 
   * @param {number} comicId - Comic ID
   * @param {number} currentChapterId - Current chapter ID
   * @returns {Promise<Object>} Object with prev and next chapter (or null)
   */
  async getNavigation(comicId, currentChapterId) {
    const startTime = Date.now();
    
    console.log(`[CHAPTER_MODEL] getNavigation() - Comic: ${comicId}, Current: ${currentChapterId}`);
    logger.debug(`Chapter.getNavigation: comicId=${comicId}, chapterId=${currentChapterId}`);
    
    try {
      // SQL: Get previous chapter (lower ID within same comic)
      const prevSql = `
        SELECT id, param, chapter_label
        FROM chapter
        WHERE komik_id = ? AND id < ?
        ORDER BY id DESC
        LIMIT 1
      `;
      
      // SQL: Get next chapter (higher ID within same comic)
      const nextSql = `
        SELECT id, param, chapter_label
        FROM chapter
        WHERE komik_id = ? AND id > ?
        ORDER BY id ASC
        LIMIT 1
      `;
      
      // Execute both queries in parallel for better performance
      const [prevResults, nextResults] = await Promise.all([
        query(prevSql, [comicId, currentChapterId]),
        query(nextSql, [comicId, currentChapterId])
      ]);
      
      const duration = Date.now() - startTime;
      
      const prev = prevResults.length > 0 ? prevResults[0] : null;
      const next = nextResults.length > 0 ? nextResults[0] : null;
      
      console.log(`[CHAPTER_MODEL] getNavigation() - Prev: ${prev ? prev.param : 'none'}, Next: ${next ? next.param : 'none'} (${duration}ms)`);
      logger.info(`Chapter.getNavigation: prev=${prev?.param || 'none'}, next=${next?.param || 'none'} in ${duration}ms`);
      
      return { prev, next };
      
    } catch (error) {
      console.error(`[CHAPTER_MODEL] getNavigation() - Error: ${error.message}`);
      logger.error(`Chapter.getNavigation error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Count chapters for a specific comic
   * 
   * Used for comic detail page to show chapter count.
   * 
   * SQL Query:
   * SELECT COUNT(*) as total FROM chapter WHERE komik_id = ?
   * 
   * @param {number} comicId - Comic ID
   * @returns {Promise<number>} Chapter count
   */
  async countByComicId(comicId) {
    const startTime = Date.now();
    
    console.log(`[CHAPTER_MODEL] countByComicId() - Counting chapters for comic ID: ${comicId}`);
    logger.debug(`Chapter.countByComicId: comicId=${comicId}`);
    
    try {
      const sql = `SELECT COUNT(*) as total FROM chapter WHERE komik_id = ?`;
      const results = await query(sql, [comicId]);
      const duration = Date.now() - startTime;
      
      const total = results[0].total;
      console.log(`[CHAPTER_MODEL] countByComicId() - Total: ${total} chapters (${duration}ms)`);
      logger.info(`Chapter.countByComicId: ${total} chapters in ${duration}ms`);
      
      return total;
      
    } catch (error) {
      console.error(`[CHAPTER_MODEL] countByComicId() - Error: ${error.message}`);
      logger.error(`Chapter.countByComicId error: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Get first chapter of a comic
   * 
   * Used for "Start Reading" button on comic detail page.
   * 
   * SQL Query:
   * SELECT * FROM chapter WHERE komik_id = ? ORDER BY id ASC LIMIT 1
   * 
   * @param {number} comicId - Comic ID
   * @returns {Promise<Object|null>} First chapter or null
   */
  async getFirstChapter(comicId) {
    const startTime = Date.now();
    
    console.log(`[CHAPTER_MODEL] getFirstChapter() - Getting first chapter for comic ID: ${comicId}`);
    logger.debug(`Chapter.getFirstChapter: comicId=${comicId}`);
    
    try {
      const sql = `
        SELECT id, param, chapter_label
        FROM chapter
        WHERE komik_id = ?
        ORDER BY id ASC
        LIMIT 1
      `;
      
      const results = await query(sql, [comicId]);
      const duration = Date.now() - startTime;
      
      if (results.length === 0) {
        console.log(`[CHAPTER_MODEL] getFirstChapter() - No chapters found (${duration}ms)`);
        logger.warn(`Chapter.getFirstChapter: no chapters for comicId=${comicId}`);
        return null;
      }
      
      console.log(`[CHAPTER_MODEL] getFirstChapter() - Found: ${results[0].param} (${duration}ms)`);
      logger.info(`Chapter.getFirstChapter: ${results[0].param} in ${duration}ms`);
      
      return results[0];
      
    } catch (error) {
      console.error(`[CHAPTER_MODEL] getFirstChapter() - Error: ${error.message}`);
      logger.error(`Chapter.getFirstChapter error: ${error.message}`);
      throw error;
    }
  }
};

module.exports = ChapterModel;
