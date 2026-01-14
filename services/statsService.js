/**
 * Statistics Service
 * 
 * Provides optimized database statistics using:
 * - Approximate counts from information_schema (fast for large tables)
 * - Exact counts for smaller tables
 * - Caching to reduce database load
 */

const { getMySQLPool } = require('../config/mysql');
const statsCache = require('../utils/statsCache');
const logger = require('../config/logger');

class StatsService {
  constructor() {
    // Table size thresholds
    this.LARGE_TABLE_THRESHOLD = 1000000; // 1M rows
    
    // Cache TTLs
    this.CACHE_TTL = {
      SMALL_TABLE: 2 * 60 * 1000,    // 2 minutes
      LARGE_TABLE: 10 * 60 * 1000,   // 10 minutes
      DATABASE_INFO: 15 * 60 * 1000  // 15 minutes
    };
  }

  /**
   * Get approximate row count from information_schema
   * Much faster than COUNT(*) for large tables
   */
  async getApproximateCount(tableName) {
    const pool = getMySQLPool();
    const database = process.env.MYSQL_DATABASE || 'af_komik';
    
    const [rows] = await pool.query(
      `SELECT TABLE_ROWS 
       FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [database, tableName]
    );
    
    return rows[0]?.TABLE_ROWS || 0;
  }

  /**
   * Get exact row count (slow for large tables)
   */
  async getExactCount(tableName) {
    const pool = getMySQLPool();
    const [rows] = await pool.query(`SELECT COUNT(*) as total FROM ??`, [tableName]);
    return rows[0]?.total || 0;
  }

  /**
   * Smart count: uses approximate for large tables, exact for small ones
   */
  async getSmartCount(tableName) {
    const cacheKey = `count_${tableName}`;
    
    return await statsCache.get(cacheKey, async () => {
      // First, get approximate count to determine table size
      const approxCount = await this.getApproximateCount(tableName);
      
      // For small tables, get exact count
      if (approxCount < this.LARGE_TABLE_THRESHOLD) {
        logger.debug(`Using exact count for ${tableName} (${approxCount} rows)`);
        return await this.getExactCount(tableName);
      }
      
      // For large tables, use approximate count
      logger.debug(`Using approximate count for ${tableName} (${approxCount} rows)`);
      return approxCount;
      
    }, this.getCacheTTL(tableName));
  }

  /**
   * Get cache TTL based on table name
   */
  getCacheTTL(tableName) {
    if (tableName === 'image') {
      return this.CACHE_TTL.LARGE_TABLE;
    }
    return this.CACHE_TTL.SMALL_TABLE;
  }

  /**
   * Get all database statistics (optimized)
   */
  async getDatabaseStats() {
    try {
      const pool = getMySQLPool();
      
      // Use Promise.all for parallel queries
      const [comics, chapters, images, lastUpdated] = await Promise.all([
        this.getSmartCount('komik'),
        this.getSmartCount('chapter'),
        this.getSmartCount('image'),
        pool.query('SELECT updated_at FROM komik ORDER BY updated_at DESC LIMIT 1')
      ]);
      
      return {
        comics: {
          total: comics,
          lastUpdated: lastUpdated[0][0]?.updated_at || null
        },
        chapters: {
          total: chapters
        },
        images: {
          total: images
        }
      };
      
    } catch (error) {
      logger.error(`getDatabaseStats error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get table size information
   */
  async getTableSizes() {
    const cacheKey = 'table_sizes';
    
    return await statsCache.get(cacheKey, async () => {
      const pool = getMySQLPool();
      const database = process.env.MYSQL_DATABASE || 'af_komik';
      
      const [rows] = await pool.query(
        `SELECT 
          TABLE_NAME as tableName,
          TABLE_ROWS as rowCount,
          ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as sizeMB,
          ROUND((DATA_LENGTH / 1024 / 1024), 2) as dataMB,
          ROUND((INDEX_LENGTH / 1024 / 1024), 2) as indexMB
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC`,
        [database]
      );
      
      return rows;
      
    }, this.CACHE_TTL.DATABASE_INFO);
  }

  /**
   * Get database summary
   */
  async getDatabaseSummary() {
    const cacheKey = 'db_summary';
    
    return await statsCache.get(cacheKey, async () => {
      const tableSizes = await this.getTableSizes();
      
      const totalSize = tableSizes.reduce((sum, table) => sum + parseFloat(table.sizeMB || 0), 0);
      const totalRows = tableSizes.reduce((sum, table) => sum + parseInt(table.rowCount || 0), 0);
      
      return {
        totalSizeMB: totalSize.toFixed(2),
        totalRows,
        tables: tableSizes.length,
        tableSizes
      };
      
    }, this.CACHE_TTL.DATABASE_INFO);
  }

  /**
   * Invalidate stats cache (call after scraper runs)
   */
  invalidateCache() {
    statsCache.invalidate('count_komik');
    statsCache.invalidate('count_chapter');
    statsCache.invalidate('count_image');
    statsCache.invalidate('table_sizes');
    statsCache.invalidate('db_summary');
    logger.info('Statistics cache invalidated');
  }

  /**
   * Pre-warm cache (call on server startup)
   */
  async warmupCache() {
    logger.info('Warming up statistics cache...');
    
    try {
      await Promise.all([
        this.getSmartCount('komik'),
        this.getSmartCount('chapter'),
        this.getSmartCount('image')
      ]);
      logger.info('Statistics cache warmed up successfully');
    } catch (error) {
      logger.error(`Cache warmup failed: ${error.message}`);
    }
  }
}

// Singleton instance
const statsService = new StatsService();

module.exports = statsService;
