/**
 * ===========================================
 * AF-Komik V2 - Scraper Admin Controller
 * ===========================================
 * 
 * Handles scraper control functionality:
 * - Trigger full scrape
 * - Trigger periodic scrape
 * - View scraper logs
 * - Monitor scraper status
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger');

// Track running scraper processes to prevent concurrent runs
const runningProcesses = {
  full: null,
  latest: null
};

// Store scraper output for real-time viewing
const scraperOutput = {
  full: { stdout: [], stderr: [], startTime: null, endTime: null, status: 'idle' },
  latest: { stdout: [], stderr: [], startTime: null, endTime: null, status: 'idle' }
};

// State file path
const STATE_FILE = path.join(__dirname, '../../scraper/state.json');

/**
 * Scraper Admin Controller
 */
const ScraperAdminController = {
  
  /**
   * Render scraper control page
   * GET /admin/scraper
   */
  async scraperPage(req, res) {
    try {
      logger.info(`Scraper page accessed by admin ${req.session.userId}`);
      
      const status = this.getScraperStatus();
      
      res.render('pages/admin/scraper', {
        layout: 'layouts/admin',
        title: 'Scraper Control - Admin',
        page: 'scraper',
        user: req.session,
        status,
        query: req.query
      });
      
    } catch (error) {
      logger.error(`Scraper page error: ${error.message}`);
      res.status(500).render('errors/500', {
        title: 'Server Error',
        message: error.message
      });
    }
  },
  
  /**
   * Get scraper status (API)
   * GET /api/admin/scraper/status
   */
  getStatus(req, res) {
    try {
      const status = ScraperAdminController.getScraperStatus();
      
      // Determine which scraper is running and simplify response
      const isFullRunning = !!runningProcesses.full;
      const isLatestRunning = !!runningProcesses.latest;
      const running = isFullRunning || isLatestRunning;
      const type = isFullRunning ? 'full' : (isLatestRunning ? 'latest' : null);
      
      res.json({
        success: true,
        data: {
          running,
          type,
          startTime: isFullRunning ? scraperOutput.full.startTime : 
                     isLatestRunning ? scraperOutput.latest.startTime : null,
          lastRun: status.full.lastRun || status.latest.lastRun,
          full: status.full,
          latest: status.latest
        }
      });
      
    } catch (error) {
      logger.error(`Scraper status error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Run full scraper
   * POST /admin/scraper/full or POST /api/admin/scraper/full
   */
  async runFullScraper(req, res) {
    console.log('[SCRAPER_CTRL] =========================================');
    console.log('[SCRAPER_CTRL] runFullScraper() CALLED');
    console.log('[SCRAPER_CTRL] Request method:', req.method);
    console.log('[SCRAPER_CTRL] Request URL:', req.originalUrl);
    console.log('[SCRAPER_CTRL] Session userId:', req.session?.userId);
    console.log('[SCRAPER_CTRL] =========================================');
    
    try {
      const adminId = req.session.userId;
      logger.info(`Full scraper triggered by admin ${adminId}`);
      
      // Check if already running
      if (runningProcesses.full) {
        const message = 'Full scraper is already running';
        logger.warn(message);
        
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(409).json({
            success: false,
            error: message
          });
        }
        return res.redirect('/admin/scraper?error=already_running');
      }
      
      // Get options from request
      const options = {
        startPage: parseInt(req.body.startPage) || 1,
        endPage: parseInt(req.body.endPage) || 0,
        skipChapters: req.body.skipChapters === 'true' || req.body.skipChapters === true,
        skipImages: req.body.skipImages === 'true' || req.body.skipImages === true
      };
      
      // Build command arguments
      const args = ['scrap-all.js'];
      if (options.startPage > 1) args.push('--start-page', options.startPage.toString());
      if (options.endPage > 0) args.push('--end-page', options.endPage.toString());
      if (options.skipChapters) args.push('--skip-chapters');
      if (options.skipImages) args.push('--skip-images');
      
      // Start the scraper process
      const scraperPath = path.join(__dirname, '../../scraper');
      
      scraperOutput.full = {
        stdout: [],
        stderr: [],
        startTime: new Date(),
        endTime: null,
        status: 'running',
        options,
        triggeredBy: adminId
      };
      
      runningProcesses.full = spawn('node', args, {
        cwd: scraperPath,
        env: { ...process.env }
      });
      
      // Capture stdout
      runningProcesses.full.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        scraperOutput.full.stdout.push(...lines);
        // Keep only last 500 lines
        if (scraperOutput.full.stdout.length > 500) {
          scraperOutput.full.stdout = scraperOutput.full.stdout.slice(-500);
        }
      });
      
      // Capture stderr
      runningProcesses.full.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        scraperOutput.full.stderr.push(...lines);
      });
      
      // Handle process exit
      runningProcesses.full.on('close', (code) => {
        scraperOutput.full.endTime = new Date();
        scraperOutput.full.status = code === 0 ? 'completed' : 'failed';
        scraperOutput.full.exitCode = code;
        runningProcesses.full = null;
        
        // Save state
        ScraperAdminController.saveState('full', scraperOutput.full);
        
        logger.info(`Full scraper finished with exit code ${code}`);
      });
      
      // Handle process error
      runningProcesses.full.on('error', (error) => {
        scraperOutput.full.status = 'error';
        scraperOutput.full.error = error.message;
        runningProcesses.full = null;
        logger.error(`Full scraper error: ${error.message}`);
      });
      
      const response = {
        success: true,
        message: 'Full scraper started',
        data: {
          status: 'running',
          startTime: scraperOutput.full.startTime,
          options
        }
      };
      
      // Only return JSON if explicitly requested via XHR
      if (req.xhr) {
        return res.json(response);
      }
      
      // Form submission - redirect back
      res.redirect('/admin/scraper?success=full_started');
      
    } catch (error) {
      logger.error(`Run full scraper error: ${error.message}`);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.redirect('/admin/scraper?error=start_failed');
    }
  },
  
  /**
   * Run latest/periodic scraper
   * POST /admin/scraper/latest or POST /api/admin/scraper/latest
   */
  async runLatestScraper(req, res) {
    console.log('[SCRAPER_CTRL] =========================================');
    console.log('[SCRAPER_CTRL] runLatestScraper() CALLED');
    console.log('[SCRAPER_CTRL] Request method:', req.method);
    console.log('[SCRAPER_CTRL] Request URL:', req.originalUrl);
    console.log('[SCRAPER_CTRL] Session userId:', req.session?.userId);
    console.log('[SCRAPER_CTRL] =========================================');
    
    try {
      const adminId = req.session.userId;
      logger.info(`Latest scraper triggered by admin ${adminId}`);
      
      // Check if already running
      if (runningProcesses.latest) {
        const message = 'Latest scraper is already running';
        logger.warn(message);
        
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          return res.status(409).json({
            success: false,
            error: message
          });
        }
        return res.redirect('/admin/scraper?error=already_running');
      }
      
      // Get options from request
      const options = {
        pages: parseInt(req.body.pages) || 5,
        limit: parseInt(req.body.limit) || 100,
        skipImages: req.body.skipImages === 'true' || req.body.skipImages === true
      };
      
      // Build command arguments
      const args = ['scrap-latest.js'];
      args.push('--pages', options.pages.toString());
      args.push('--limit', options.limit.toString());
      if (options.skipImages) args.push('--skip-images');
      
      // Start the scraper process
      const scraperPath = path.join(__dirname, '../../scraper');
      
      scraperOutput.latest = {
        stdout: [],
        stderr: [],
        startTime: new Date(),
        endTime: null,
        status: 'running',
        options,
        triggeredBy: adminId
      };
      
      runningProcesses.latest = spawn('node', args, {
        cwd: scraperPath,
        env: { ...process.env }
      });
      
      // Capture stdout
      runningProcesses.latest.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        scraperOutput.latest.stdout.push(...lines);
        if (scraperOutput.latest.stdout.length > 500) {
          scraperOutput.latest.stdout = scraperOutput.latest.stdout.slice(-500);
        }
      });
      
      // Capture stderr
      runningProcesses.latest.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(l => l.trim());
        scraperOutput.latest.stderr.push(...lines);
      });
      
      // Handle process exit
      runningProcesses.latest.on('close', (code) => {
        scraperOutput.latest.endTime = new Date();
        scraperOutput.latest.status = code === 0 ? 'completed' : 'failed';
        scraperOutput.latest.exitCode = code;
        runningProcesses.latest = null;
        
        // Save state
        ScraperAdminController.saveState('latest', scraperOutput.latest);
        
        logger.info(`Latest scraper finished with exit code ${code}`);
      });
      
      // Handle process error
      runningProcesses.latest.on('error', (error) => {
        scraperOutput.latest.status = 'error';
        scraperOutput.latest.error = error.message;
        runningProcesses.latest = null;
        logger.error(`Latest scraper error: ${error.message}`);
      });
      
      const response = {
        success: true,
        message: 'Latest scraper started',
        data: {
          status: 'running',
          startTime: scraperOutput.latest.startTime,
          options
        }
      };
      
      if (req.xhr) {
        return res.json(response);
      }
      
      res.redirect('/admin/scraper?success=latest_started');
      
    } catch (error) {
      logger.error(`Run latest scraper error: ${error.message}`);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.redirect('/admin/scraper?error=start_failed');
    }
  },
  
  /**
   * Stop running scraper
   * POST /admin/scraper/:type/stop
   */
  async stopScraper(req, res) {
    console.log('[SCRAPER_CTRL] =========================================');
    console.log('[SCRAPER_CTRL] stopScraper() CALLED');
    console.log('[SCRAPER_CTRL] Request method:', req.method);
    console.log('[SCRAPER_CTRL] Request URL:', req.originalUrl);
    console.log('[SCRAPER_CTRL] Type param:', req.params?.type);
    console.log('[SCRAPER_CTRL] =========================================');
    
    try {
      const { type } = req.params;
      const adminId = req.session.userId;
      
      if (!['full', 'latest'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid scraper type'
        });
      }
      
      if (!runningProcesses[type]) {
        return res.status(404).json({
          success: false,
          error: `${type} scraper is not running`
        });
      }
      
      // Kill the process
      runningProcesses[type].kill('SIGTERM');
      logger.info(`${type} scraper stopped by admin ${adminId}`);
      
      scraperOutput[type].status = 'stopped';
      scraperOutput[type].endTime = new Date();
      scraperOutput[type].stoppedBy = adminId;
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          message: `${type} scraper stopped`
        });
      }
      
      res.redirect('/admin/scraper?success=stopped');
      
    } catch (error) {
      logger.error(`Stop scraper error: ${error.message}`);
      
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.redirect('/admin/scraper?error=stop_failed');
    }
  },
  
  /**
   * Stop any running scraper
   * POST /admin/scraper/stop
   */
  async stopAnyScraper(req, res) {
    console.log('[SCRAPER_CTRL] =========================================');
    console.log('[SCRAPER_CTRL] stopAnyScraper() CALLED');
    console.log('[SCRAPER_CTRL] Request method:', req.method);
    console.log('[SCRAPER_CTRL] Request URL:', req.originalUrl);
    console.log('[SCRAPER_CTRL] =========================================');
    
    try {
      const adminId = req.session.userId;
      let stoppedType = null;
      
      // Check and stop full scraper
      if (runningProcesses.full) {
        runningProcesses.full.kill('SIGTERM');
        scraperOutput.full.status = 'stopped';
        scraperOutput.full.endTime = new Date();
        scraperOutput.full.stoppedBy = adminId;
        stoppedType = 'full';
        runningProcesses.full = null;
        logger.info(`Full scraper stopped by admin ${adminId}`);
      }
      
      // Check and stop latest scraper
      if (runningProcesses.latest) {
        runningProcesses.latest.kill('SIGTERM');
        scraperOutput.latest.status = 'stopped';
        scraperOutput.latest.endTime = new Date();
        scraperOutput.latest.stoppedBy = adminId;
        stoppedType = stoppedType ? 'both' : 'latest';
        runningProcesses.latest = null;
        logger.info(`Latest scraper stopped by admin ${adminId}`);
      }
      
      if (!stoppedType) {
        if (req.xhr) {
          return res.status(404).json({
            success: false,
            message: 'No scraper is currently running'
          });
        }
        return res.redirect('/admin/scraper?error=no_scraper_running');
      }
      
      if (req.xhr) {
        return res.json({
          success: true,
          message: `Scraper stopped (${stoppedType})`
        });
      }
      
      res.redirect('/admin/scraper?success=stopped');
      
    } catch (error) {
      logger.error(`Stop any scraper error: ${error.message}`);
      
      if (req.xhr) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
      
      res.redirect('/admin/scraper?error=stop_failed');
    }
  },
  
  /**
   * Get scraper output (for live viewing)
   * GET /api/admin/scraper/:type/output
   */
  getOutput(req, res) {
    try {
      const { type } = req.params;
      
      if (!['full', 'latest'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid scraper type'
        });
      }
      
      res.json({
        success: true,
        data: {
          ...scraperOutput[type],
          isRunning: !!runningProcesses[type]
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get output from any running scraper
   * GET /api/admin/scraper/output
   */
  getAnyOutput(req, res) {
    try {
      // Get output from whichever scraper is running or most recent
      let output = [];
      let type = null;
      
      if (runningProcesses.full) {
        output = [...scraperOutput.full.stdout, ...scraperOutput.full.stderr];
        type = 'full';
      } else if (runningProcesses.latest) {
        output = [...scraperOutput.latest.stdout, ...scraperOutput.latest.stderr];
        type = 'latest';
      } else {
        // Return most recent output if available
        const fullOutput = scraperOutput.full.stdout.length + scraperOutput.full.stderr.length;
        const latestOutput = scraperOutput.latest.stdout.length + scraperOutput.latest.stderr.length;
        
        if (fullOutput > latestOutput) {
          output = [...scraperOutput.full.stdout, ...scraperOutput.full.stderr];
          type = 'full';
        } else if (latestOutput > 0) {
          output = [...scraperOutput.latest.stdout, ...scraperOutput.latest.stderr];
          type = 'latest';
        }
      }
      
      res.json({
        success: true,
        output: output,
        type: type,
        running: !!(runningProcesses.full || runningProcesses.latest)
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Render logs page
   * GET /admin/logs
   */
  async logsPage(req, res) {
    try {
      logger.info(`Logs page accessed by admin ${req.session.userId}`);
      
      const logs = await ScraperAdminController.readLogs(req.query);
      
      res.render('pages/admin/logs', {
        layout: 'layouts/admin',
        title: 'Scraper Logs - Admin',
        page: 'logs',
        user: req.session,
        logs
      });
      
    } catch (error) {
      logger.error(`Logs page error: ${error.message}`);
      res.status(500).render('errors/500', {
        title: 'Server Error',
        message: error.message
      });
    }
  },
  
  /**
   * Get logs (API)
   * GET /api/admin/logs
   */
  async getLogs(req, res) {
    try {
      const logs = await ScraperAdminController.readLogs(req.query);
      
      res.json({
        success: true,
        data: logs
      });
      
    } catch (error) {
      logger.error(`API logs error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Read scraper logs from file
   */
  async readLogs(options = {}) {
    const limit = parseInt(options.limit) || 200;
    const level = options.level || 'all';
    const logPath = path.join(__dirname, '../../logs/scraper.log');
    
    const result = {
      lines: [],
      total: 0,
      file: logPath,
      exists: false
    };
    
    try {
      if (!fs.existsSync(logPath)) {
        // Try alternative path
        const altPath = path.join(__dirname, '../../scraper/logs/scraper.log');
        if (fs.existsSync(altPath)) {
          result.file = altPath;
          result.exists = true;
        } else {
          return result;
        }
      } else {
        result.exists = true;
      }
      
      const content = fs.readFileSync(result.file, 'utf-8');
      let lines = content.split('\n').filter(line => line.trim());
      
      result.total = lines.length;
      
      // Filter by level
      if (level !== 'all') {
        const levelUpper = level.toUpperCase();
        lines = lines.filter(line => line.includes(`[${levelUpper}]`));
      }
      
      // Get last N lines
      result.lines = lines.slice(-limit).reverse();
      
    } catch (error) {
      logger.error(`Read logs error: ${error.message}`);
      result.error = error.message;
    }
    
    return result;
  },
  
  /**
   * Get current scraper status
   */
  getScraperStatus() {
    // Load saved state
    let savedState = {};
    try {
      if (fs.existsSync(STATE_FILE)) {
        savedState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      }
    } catch (e) {
      // Ignore
    }
    
    return {
      full: {
        isRunning: !!runningProcesses.full,
        ...scraperOutput.full,
        lastRun: savedState.full?.endTime || scraperOutput.full.endTime
      },
      latest: {
        isRunning: !!runningProcesses.latest,
        ...scraperOutput.latest,
        lastRun: savedState.latest?.endTime || scraperOutput.latest.endTime
      }
    };
  },
  
  /**
   * Save scraper state to file
   */
  saveState(type, data) {
    try {
      let state = {};
      if (fs.existsSync(STATE_FILE)) {
        state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      }
      
      state[type] = {
        status: data.status,
        startTime: data.startTime,
        endTime: data.endTime,
        exitCode: data.exitCode,
        options: data.options
      };
      state.lastUpdated = new Date();
      
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
      
    } catch (error) {
      logger.error(`Save scraper state error: ${error.message}`);
    }
  }
};

module.exports = ScraperAdminController;
