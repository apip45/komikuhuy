/**
 * ===========================================
 * AF-Komik Scraper - Database Configuration
 * ===========================================
 * 
 * Standalone MySQL connection for the scraper.
 * Does not depend on the main server's database module.
 * 
 * Uses mysql2/promise for async operations.
 */

const mysql = require('mysql2/promise');
const path = require('path');
const logger = require('./logger');

// Load environment variables from server's .env file
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// MySQL connection pool instance
let pool = null;

/**
 * Initialize MySQL connection pool
 * Creates a new pool if one doesn't exist
 * 
 * @returns {Promise<mysql.Pool>} MySQL connection pool
 */
const initializePool = async () => {
  if (pool) {
    return pool;
  }

  // Validate required environment variables
  const requiredVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE'];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  logger.info('Initializing MySQL connection pool...');
  logger.info(`Host: ${process.env.MYSQL_HOST}`);
  logger.info(`Port: ${process.env.MYSQL_PORT || 3306}`);
  logger.info(`Database: ${process.env.MYSQL_DATABASE}`);

  try {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 5, // Lower limit for scraper
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    logger.info('MySQL connection test successful');
    connection.release();

    return pool;

  } catch (error) {
    logger.error(`Failed to initialize MySQL pool: ${error.message}`);
    throw error;
  }
};

/**
 * Get the MySQL connection pool
 * Initializes pool if not already done
 * 
 * @returns {Promise<mysql.Pool>} MySQL connection pool
 */
const getPool = async () => {
  if (!pool) {
    await initializePool();
  }
  return pool;
};

/**
 * Execute a SQL query with parameters
 * 
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
const query = async (sql, params = []) => {
  const dbPool = await getPool();
  const [results] = await dbPool.execute(sql, params);
  return results;
};

/**
 * Execute a SQL query and return insert ID
 * Useful for INSERT operations
 * 
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Result with insertId and affectedRows
 */
const insert = async (sql, params = []) => {
  const dbPool = await getPool();
  const [result] = await dbPool.execute(sql, params);
  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows
  };
};

/**
 * Execute multiple queries in a transaction
 * 
 * @param {Function} callback - Async function receiving connection
 * @returns {Promise<any>} Result of callback
 */
const transaction = async (callback) => {
  const dbPool = await getPool();
  const connection = await dbPool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Close the connection pool
 * Should be called when scraper finishes
 */
const closePool = async () => {
  if (pool) {
    logger.info('Closing MySQL connection pool...');
    await pool.end();
    pool = null;
    logger.info('MySQL connection pool closed');
  }
};

/**
 * Run database migrations to ensure all required columns exist
 * Adds new columns if they don't exist (for backward compatibility)
 */
const runMigrations = async () => {
  logger.info('Checking database schema...');
  
  try {
    // Check if status column exists
    const [columns] = await (await getPool()).query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'komik'
    `, [process.env.MYSQL_DATABASE]);
    
    const columnNames = new Set(columns.map(c => c.COLUMN_NAME));
    
    // Add status column if missing
    if (!columnNames.has('status')) {
      logger.info('Adding status column to komik table...');
      await query(`
        ALTER TABLE komik 
        ADD COLUMN status ENUM('Ongoing', 'Completed', 'Hiatus', 'Dropped') 
        DEFAULT 'Ongoing' 
        AFTER latest_chapter
      `);
      logger.info('status column added');
    }
    
    // Add author column if missing
    if (!columnNames.has('author')) {
      logger.info('Adding author column to komik table...');
      await query(`
        ALTER TABLE komik 
        ADD COLUMN author VARCHAR(255) DEFAULT NULL 
        AFTER status
      `);
      logger.info('author column added');
    }
    
    // Add comic_type column if missing
    if (!columnNames.has('comic_type')) {
      logger.info('Adding comic_type column to komik table...');
      await query(`
        ALTER TABLE komik 
        ADD COLUMN comic_type ENUM('Manga', 'Manhwa', 'Manhua', 'Webtoon', 'Other') 
        DEFAULT 'Manga' 
        AFTER author
      `);
      logger.info('comic_type column added');
    }
    
    // Add last_scraped column if missing
    if (!columnNames.has('last_scraped')) {
      logger.info('Adding last_scraped column to komik table...');
      await query(`
        ALTER TABLE komik 
        ADD COLUMN last_scraped TIMESTAMP DEFAULT NULL 
        AFTER comic_type
      `);
      logger.info('last_scraped column added');
    }
    
    logger.info('Database schema check complete');
    
  } catch (error) {
    logger.warn(`Migration check failed: ${error.message}`);
    // Don't throw - allow scraper to continue with existing schema
  }
};

module.exports = {
  initializePool,
  getPool,
  query,
  insert,
  transaction,
  closePool,
  runMigrations
};
