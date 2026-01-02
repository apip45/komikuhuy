/**
 * ===========================================
 * AF-Komik V2 - MySQL Configuration
 * ===========================================
 * 
 * MySQL connection pool using mysql2/promise.
 * This database is used ONLY for:
 * - Comics (comic metadata and information)
 * - Chapters (chapter data for each comic)
 * - Images/Pages (page images for each chapter)
 * 
 * DO NOT use this database for user/session data.
 */

const mysql = require('mysql2/promise');
const logger = require('./logger');

// MySQL connection pool instance
let pool = null;

/**
 * Create MySQL connection pool
 * Uses connection pooling for better performance and resource management
 */
const createMySQLPool = async () => {
  try {
    // Validate required environment variables
    const requiredVars = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_DATABASE'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        throw new Error(`${varName} is not defined in environment variables`);
      }
    }

    console.log('[MYSQL] Creating connection pool...');
    console.log(`[MYSQL] Host: ${process.env.MYSQL_HOST}`);
    console.log(`[MYSQL] Port: ${process.env.MYSQL_PORT || 3306}`);
    console.log(`[MYSQL] Database: ${process.env.MYSQL_DATABASE}`);
    console.log(`[MYSQL] User: ${process.env.MYSQL_USER}`);

    // Create connection pool
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    console.log('[MYSQL] Pool created. Testing connection...');

    // Test the connection
    const connection = await pool.getConnection();
    console.log('[MYSQL] ✓ Connection test successful');
    console.log('[MYSQL] ✓ MySQL connected successfully');
    console.log(`[MYSQL] Connection pool size: 10`);
    logger.info('MySQL connected successfully');
    connection.release();

    return pool;

  } catch (error) {
    console.error(`[MYSQL] ✗ Failed to connect: ${error.message}`);
    logger.error(`Failed to connect to MySQL: ${error.message}`);
    throw error;
  }
};

/**
 * Get the MySQL connection pool
 * @returns {mysql.Pool} The MySQL connection pool
 */
const getMySQLPool = () => {
  if (!pool) {
    throw new Error('MySQL pool has not been initialized. Call createMySQLPool() first.');
  }
  return pool;
};

/**
 * Execute a query using the connection pool
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters for prepared statement
 * @returns {Promise<Array>} Query results
 */
const query = async (sql, params = []) => {
  try {
    const [results] = await getMySQLPool().execute(sql, params);
    return results;
  } catch (error) {
    logger.error(`MySQL query error: ${error.message}`);
    throw error;
  }
};

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Async function receiving connection object
 * @returns {Promise<any>} Transaction result
 */
const transaction = async (callback) => {
  const connection = await getMySQLPool().getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error(`MySQL transaction error: ${error.message}`);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Close the MySQL connection pool
 * Used for graceful shutdown
 */
const closeMySQLPool = async () => {
  if (pool) {
    await pool.end();
    logger.info('MySQL connection pool closed');
  }
};

module.exports = {
  createMySQLPool,
  getMySQLPool,
  query,
  transaction,
  closeMySQLPool
};
