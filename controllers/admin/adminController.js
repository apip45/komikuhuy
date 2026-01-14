/**
 * ===========================================
 * AF-Komik V2 - Admin Dashboard Controller
 * ===========================================
 * 
 * Handles admin dashboard functionality including:
 * - System overview and statistics
 * - Database status monitoring
 * - Server health information
 */

const { getMySQLPool } = require('../../config/mysql');
const mongoose = require('mongoose');
const User = require('../../models/mongo/User');
const logger = require('../../config/logger');
const statsService = require('../../services/statsService');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Track server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * Admin Dashboard Controller
 */
const AdminController = {
  
  /**
   * Render admin dashboard page
   * GET /admin
   */
  async dashboard(req, res) {
    try {
      logger.info(`Admin dashboard accessed by user ${req.session.userId}`);
      
      const stats = await this.getSystemStats();
      
      res.render('pages/admin/dashboard', {
        layout: 'layouts/admin',
        title: 'Admin Dashboard - AF-Komik',
        page: 'dashboard',
        user: req.session,
        stats
      });
      
    } catch (error) {
      logger.error(`Admin dashboard error: ${error.message}`);
      res.status(500).render('errors/500', {
        title: 'Server Error',
        message: error.message
      });
    }
  },
  
  /**
   * Get system statistics (API)
   * GET /api/admin/stats
   */
  async getStats(req, res) {
    try {
      logger.info(`Admin stats requested by user ${req.session.userId}`);
      
      const stats = await this.getSystemStats();
      
      res.json({
        success: true,
        data: stats
      });
      
    } catch (error) {
      logger.error(`Admin stats error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Gather all system statistics
   */
  async getSystemStats() {
    const stats = {
      comics: { total: 0, lastUpdated: null },
      chapters: { total: 0 },
      images: { total: 0 },
      users: { total: 0, admins: 0, active: 0 },
      scraper: { lastRun: null, status: 'unknown' },
      system: {
        uptime: 0,
        uptimeFormatted: '',
        memory: {},
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development'
      },
      database: {
        mysql: { status: 'unknown', connected: false },
        mongodb: { status: 'unknown', connected: false }
      }
    };
    
    // Get MySQL stats (optimized with caching and approximate counts)
    try {
      const dbStats = await statsService.getDatabaseStats();
      
      stats.comics = dbStats.comics;
      stats.chapters = dbStats.chapters;
      stats.images = dbStats.images;
      
      stats.database.mysql.status = 'connected';
      stats.database.mysql.connected = true;
      
    } catch (error) {
      logger.error(`MySQL stats error: ${error.message}`);
      stats.database.mysql.status = 'error';
      stats.database.mysql.error = error.message;
    }
    
    // Get MongoDB stats
    try {
      // User statistics
      stats.users.total = await User.countDocuments();
      stats.users.admins = await User.countDocuments({ role: 'admin' });
      stats.users.active = await User.countDocuments({ 
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      stats.database.mongodb.status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      stats.database.mongodb.connected = mongoose.connection.readyState === 1;
      
    } catch (error) {
      logger.error(`MongoDB stats error: ${error.message}`);
      stats.database.mongodb.status = 'error';
      stats.database.mongodb.error = error.message;
    }
    
    // Get scraper status
    try {
      const scraperLogPath = path.join(__dirname, '../../scraper/logs/scraper.log');
      const stateFilePath = path.join(__dirname, '../../scraper/state.json');
      
      // Check state file
      if (fs.existsSync(stateFilePath)) {
        const stateData = JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));
        stats.scraper.lastRun = stateData.lastRun || null;
        stats.scraper.status = stateData.status || 'idle';
      }
      
      // Check if scraper log exists
      if (fs.existsSync(scraperLogPath)) {
        const logStat = fs.statSync(scraperLogPath);
        if (!stats.scraper.lastRun) {
          stats.scraper.lastRun = logStat.mtime;
        }
      }
      
    } catch (error) {
      logger.warn(`Scraper status check error: ${error.message}`);
    }
    
    // System info
    const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
    stats.system.uptime = uptimeSeconds;
    stats.system.uptimeFormatted = this.formatUptime(uptimeSeconds);
    
    const memUsage = process.memoryUsage();
    stats.system.memory = {
      heapUsed: this.formatBytes(memUsage.heapUsed),
      heapTotal: this.formatBytes(memUsage.heapTotal),
      rss: this.formatBytes(memUsage.rss),
      external: this.formatBytes(memUsage.external)
    };
    
    stats.system.cpus = os.cpus().length;
    stats.system.totalMemory = this.formatBytes(os.totalmem());
    stats.system.freeMemory = this.formatBytes(os.freemem());
    stats.system.loadAverage = os.loadavg();
    
    return stats;
  },
  
  /**
   * Format seconds to human readable uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
  },
  
  /**
   * Format bytes to human readable size
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

module.exports = AdminController;
