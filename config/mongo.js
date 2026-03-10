/**
 * ===========================================
 * AF-Komik V2 - MongoDB Configuration
 * ===========================================
 * 
 * MongoDB Atlas connection using Mongoose.
 * This database is used ONLY for:
 * - Users (authentication data)
 * - Sessions (login sessions)
 * - Bookmarks (user bookmarks)
 * - Reading History (user progress tracking)
 * 
 * DO NOT use this database for comic content data.
 */

const mongoose = require('mongoose');
const logger = require('../utils/smartLogger');

/**
 * Connect to MongoDB Atlas
 * Uses connection string from environment variables
 * Includes retry logic and proper error handling
 */
const connectMongoDB = async () => {
  try {
    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    logger.debug('[MONGODB] Attempting to connect to MongoDB Atlas...');

    // Mongoose connection options
    const options = {
      // Use new URL parser and unified topology
      dbName: process.env.MONGODB_DBNAME || 'af-komik-v2',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    // Attempt connection
    await mongoose.connect(mongoUri, options);

    logger.debug('[MONGODB] ✓ MongoDB Atlas connected successfully');
    logger.debug(`[MONGODB] Database: ${options.dbName}`);
    logger.debug(`[MONGODB] Connection pool size: ${options.maxPoolSize}`);
    logger.info('MongoDB Atlas connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`[MONGODB] ✗ Connection error: ${err.message}`);
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('[MONGODB] ⚠ Disconnected. Attempting to reconnect...');
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.debug('[MONGODB] ✓ Reconnected successfully');
      logger.info('MongoDB reconnected successfully');
    });

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.debug('[MONGODB] Connection closed due to application termination');
      logger.info('MongoDB connection closed due to application termination');
      process.exit(0);
    });

    return mongoose.connection;

  } catch (error) {
    logger.error(`[MONGODB] ✗ Failed to connect: ${error.message}`);
    logger.error(`Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Get the current MongoDB connection
 * @returns {mongoose.Connection} The active MongoDB connection
 */
const getMongoConnection = () => {
  return mongoose.connection;
};

/**
 * Check if MongoDB is connected
 * @returns {boolean} Connection status
 */
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = {
  connectMongoDB,
  getMongoConnection,
  isMongoConnected,
  mongoose
};
