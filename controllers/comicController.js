/**
 * ===========================================
 * AF-Komik V2 - Comic Controller
 * ===========================================
 * 
 * Controller for handling comic-related requests.
 * Provides both web (EJS) and API (JSON) handlers.
 * 
 * Data Flow:
 * 1. Request comes in (web or API)
 * 2. Controller validates parameters
 * 3. Controller calls MySQL models to fetch data
 * 4. Controller renders EJS view or returns JSON
 * 
 * Error Handling:
 * - Invalid params: 400 Bad Request
 * - Not found: 404 Not Found
 * - Server error: 500 Internal Server Error
 */

const logger = require('../config/logger');
const ComicModel = require('../models/mysql/comic.model');
const ChapterModel = require('../models/mysql/chapter.model');
const { ReadChapter, Bookmark } = require('../models/mongo');
const { successResponse, errorResponse, badRequest, serverError } = require('../utils/apiResponse');
const { cacheService } = require('../services/cacheService');

/**
 * Comic controller with web and API handlers
 */
const ComicController = {
  
  // ===========================================
  // WEB HANDLERS (EJS Rendering)
  // ===========================================
  
  /**
   * Render comic list page
   * 
   * GET /comics
   * 
   * Fetches list of comics from MySQL and renders EJS template.
   * Supports pagination via query params.
   * 
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20)
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   */
  async listComicsPage(req, res, next) {
    console.log('[COMIC_CTRL] listComicsPage() - Rendering comic list');
    logger.info(`Comic list page requested`);
    
    try {
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      
      // Parse search and filter parameters
      const keyword = req.query.search || req.query.q || '';
      const genre = req.query.genre || '';
      
      console.log(`[COMIC_CTRL] Params: page=${page}, keyword="${keyword}", genre="${genre}"`);
      
      // Fetch genres from cache (HOT tier, rarely changes)
      const allGenres = await cacheService.getOrFetch(
        cacheService.genresKey(),
        async () => {
          console.log('[COMIC_CTRL] Cache MISS: Fetching genres from database');
          return await ComicModel.getAllGenres();
        },
        'hot',
        86400 // 24 hours - genres rarely change
      );
      
      // Fetch comics with search and filter
      const [comics, total] = await Promise.all([
        ComicModel.searchAndFilter({ keyword, genre, limit, offset }),
        ComicModel.countSearchResults({ keyword, genre })
      ]);
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      
      console.log(`[COMIC_CTRL] Found ${comics.length} comics (total: ${total})`);
      logger.info(`Comic list: ${comics.length} of ${total} comics`);
      
      // Get user from request (if logged in)
      const user = req.user ? req.user.getPublicProfile() : null;
      
      // Render EJS template
      res.render('pages/comics', {
        title: keyword ? `Search: ${keyword} - AF-Komik` : 'Daftar Komik - AF-Komik',
        currentPage: 'comics',
        user,
        comics,
        allGenres,
        search: {
          keyword,
          genre
        },
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      console.error(`[COMIC_CTRL] listComicsPage() - Error: ${error.message}`);
      logger.error(`Comic list page error: ${error.message}`);
      next(error);
    }
  },
  
  /**
   * Render comic detail page
   * 
   * GET /comics/:param
   * 
   * Fetches comic details and chapter list from MySQL.
   * Renders 404 page if comic not found.
   * 
   * URL Parameters:
   * - param: Comic URL slug (e.g., "one-piece")
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   */
  async getComicDetailPage(req, res, next) {
    const { param } = req.params;
    const { sort = 'desc' } = req.query; // Get sort parameter from query string, default to 'desc'
    
    console.log(`[COMIC_CTRL] getComicDetailPage() - Comic: ${param}, sort: ${sort}`);
    logger.info(`Comic detail page requested: ${param}, sort: ${sort}`);
    
    try {
      // Validate param
      if (!param || typeof param !== 'string') {
        console.log('[COMIC_CTRL] Invalid param provided');
        return res.status(400).render('errors/404', {
          title: '404 - Not Found',
          message: 'Invalid comic parameter'
        });
      }
      
      // Try to get comic and chapters from cache
      const comicCacheKey = cacheService.comicKey(param);
      const chaptersCacheKey = `comic:chapters:${param}`;
      
      let comic = cacheService.get(comicCacheKey, 'warm');
      let chapters = cacheService.get(chaptersCacheKey, 'warm');
      
      if (!comic) {
        // Cache MISS - fetch comic from database
        console.log(`[COMIC_CTRL] Cache MISS: ${comicCacheKey}`);
        comic = await ComicModel.findByParam(param);
        
        // Handle not found
        if (!comic) {
          console.log(`[COMIC_CTRL] Comic not found: ${param}`);
          logger.warn(`Comic not found: ${param}`);
          return res.status(404).render('errors/404', {
            title: '404 - Komik Tidak Ditemukan',
            message: `Komik dengan param "${param}" tidak ditemukan.`
          });
        }
        
        // Cache comic data (30 min)
        cacheService.set(comicCacheKey, comic, 'warm', 1800);
        console.log(`[COMIC_CTRL] Cached comic: ${comicCacheKey}`);
      } else {
        console.log(`[COMIC_CTRL] Cache HIT: ${comicCacheKey}`);
      }
      
      if (!chapters) {
        // Cache MISS - fetch chapters from database  
        console.log(`[COMIC_CTRL] Cache MISS: ${chaptersCacheKey}`);
        chapters = await ChapterModel.findByComicId(comic.id, 'asc');
        
        // Cache chapters list (30 min)
        cacheService.set(chaptersCacheKey, chapters, 'warm', 1800);
        console.log(`[COMIC_CTRL] Cached chapters: ${chaptersCacheKey} (${chapters.length} items)`);
      } else {
        console.log(`[COMIC_CTRL] Cache HIT: ${chaptersCacheKey} (${chapters.length} items)`);
      }
      
      // Extract chapter number from label for proper sorting
      // Supports formats like: "Chapter 1", "Chapter 1.1", "Chapter 1.5", etc.
      const extractChapterNumber = (chapterLabel) => {
        if (!chapterLabel) return 0;
        // Match numbers including decimals (e.g., "Chapter 1.5" -> 1.5)
        const match = chapterLabel.match(/(\d+(?:\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
      };
      
      // Sort chapters by chapter number
      chapters.sort((a, b) => {
        const numA = extractChapterNumber(a.chapter_label);
        const numB = extractChapterNumber(b.chapter_label);
        
        // Apply user's sort preference
        if (sort === 'asc') {
          return numA - numB; // Ascending: 1, 1.1, 1.2, 2, ...
        } else {
          return numB - numA; // Descending: 100, 99, 2, 1.2, 1.1, 1
        }
      });
      
      // First chapter should always be the one with lowest chapter number
      const firstChapter = chapters.length > 0 ? chapters.reduce((min, ch) => {
        const minNum = extractChapterNumber(min.chapter_label);
        const chNum = extractChapterNumber(ch.chapter_label);
        return chNum < minNum ? ch : min;
      }, chapters[0]) : null;
      
      console.log(`[COMIC_CTRL] Found comic "${comic.title}" with ${chapters.length} chapters`);
      logger.info(`Comic detail: "${comic.title}" - ${chapters.length} chapters`);
      
      // Get user from request (if logged in)
      const user = req.user ? req.user.getPublicProfile() : null;
      
      // Fetch read chapters and bookmark status for logged-in users
      let readChapterIds = [];
      let isBookmarked = false;
      
      if (req.user) {
        try {
          [readChapterIds, isBookmarked] = await Promise.all([
            ReadChapter.getReadChapterIds(req.user._id, comic.id),
            Bookmark.isBookmarked(req.user._id, param)
          ]);
          console.log(`[COMIC_CTRL] User has read ${readChapterIds.length} chapters, bookmarked: ${isBookmarked}`);
        } catch (error) {
          console.error(`[COMIC_CTRL] Failed to fetch read chapters or bookmark status: ${error.message}`);
          logger.error(`Failed to fetch read chapters or bookmark status: ${error.message}`);
          // Continue without read status (defaults remain: [], false)
        }
      }
      
      // Render EJS template
      res.render('pages/comic-detail', {
        title: `${comic.title} - AF-Komik`,
        currentPage: 'comics',
        user,
        comic,
        chapters,
        firstChapter,
        chapterCount: chapters.length,
        readChapterIds,
        currentSort: sort,
        isBookmarked,
        query: req.query
      });
      
    } catch (error) {
      console.error(`[COMIC_CTRL] getComicDetailPage() - Error: ${error.message}`);
      logger.error(`Comic detail page error: ${error.message}`);
      next(error);
    }
  },
  
  // ===========================================
  // API HANDLERS (JSON Response)
  // ===========================================
  
  /**
   * API: Get list of comics
   * 
   * GET /api/comics
   * 
   * Returns paginated list of comics in JSON format.
   * 
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 50)
   * 
   * Response:
   * {
   *   status: "success",
   *   message: "Comics retrieved successfully",
   *   data: {
   *     comics: [...],
   *     pagination: { current, total, limit, totalItems }
   *   }
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async listComicsAPI(req, res) {
    console.log('[COMIC_CTRL] listComicsAPI() - API request for comic list');
    logger.info(`API: Comic list requested`);
    
    try {
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      
      console.log(`[COMIC_CTRL] API Pagination: page=${page}, limit=${limit}`);
      
      // Fetch comics from database
      const [comics, total] = await Promise.all([
        ComicModel.findAll({ limit, offset }),
        ComicModel.count()
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      console.log(`[COMIC_CTRL] API: Found ${comics.length} comics`);
      logger.info(`API: Comic list - ${comics.length} of ${total} comics`);
      
      // Return JSON response
      return successResponse(res, 'Comics retrieved successfully', {
        comics,
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      console.error(`[COMIC_CTRL] listComicsAPI() - Error: ${error.message}`);
      logger.error(`API: Comic list error: ${error.message}`);
      return serverError(res, 'Failed to retrieve comics');
    }
  },
  
  /**
   * API: Get comic detail
   * 
   * GET /api/comics/:param
   * 
   * Returns comic details with chapter count in JSON format.
   * 
   * URL Parameters:
   * - param: Comic URL slug (e.g., "one-piece")
   * 
   * Response:
   * {
   *   status: "success",
   *   message: "Comic retrieved successfully",
   *   data: {
   *     comic: {...},
   *     chapterCount: number
   *   }
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getComicDetailAPI(req, res) {
    const { param } = req.params;
    
    console.log(`[COMIC_CTRL] getComicDetailAPI() - Comic: ${param}`);
    logger.info(`API: Comic detail requested: ${param}`);
    
    try {
      // Validate param
      if (!param || typeof param !== 'string') {
        console.log('[COMIC_CTRL] API: Invalid param');
        return badRequest(res, 'Invalid comic parameter');
      }
      
      // Use cache for comic detail API
      const cacheKey = `comic:detail:${param}`;
      
      const data = await cacheService.getOrFetch(
        cacheKey,
        async () => {
          console.log(`[COMIC_CTRL] API: Cache MISS: ${cacheKey}`);
          
          // Fetch comic from database
          const comic = await ComicModel.findByParam(param);
          
          if (!comic) {
            return null; // Will be handled after getOrFetch
          }
          
          // Get chapter count
          const chapterCount = await ChapterModel.countByComicId(comic.id);
          
          return { comic, chapterCount };
        },
        'warm',
        1800 // 30 minutes
      );
      
      // Handle not found
      if (!data || !data.comic) {
        console.log(`[COMIC_CTRL] API: Comic not found: ${param}`);
        logger.warn(`API: Comic not found: ${param}`);
        return errorResponse(res, 'Comic not found', null, 404);
      }
      
      const { comic, chapterCount } = data;
      
      console.log(`[COMIC_CTRL] API: Found comic "${comic.title}"`);
      logger.info(`API: Comic detail: "${comic.title}"`);
      
      // Return JSON response
      return successResponse(res, 'Comic retrieved successfully', {
        comic,
        chapterCount
      });
      
    } catch (error) {
      console.error(`[COMIC_CTRL] getComicDetailAPI() - Error: ${error.message}`);
      logger.error(`API: Comic detail error: ${error.message}`);
      return serverError(res, 'Failed to retrieve comic');
    }
  },
  
  /**
   * API: Get chapters for a comic
   * 
   * GET /api/comics/:param/chapters
   * 
   * Returns all chapters for a specific comic.
   * 
   * URL Parameters:
   * - param: Comic URL slug (e.g., "one-piece")
   * 
   * Response:
   * {
   *   status: "success",
   *   message: "Chapters retrieved successfully",
   *   data: {
   *     comic: { param, title },
   *     chapters: [...],
   *     total: number
   *   }
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getChaptersAPI(req, res) {
    const { param } = req.params;
    
    console.log(`[COMIC_CTRL] getChaptersAPI() - Comic: ${param}`);
    logger.info(`API: Chapters requested for: ${param}`);
    
    try {
      // Validate param
      if (!param || typeof param !== 'string') {
        console.log('[COMIC_CTRL] API: Invalid param');
        return badRequest(res, 'Invalid comic parameter');
      }
      
      // Use cache for chapters API
      const cacheKey = `comic:chapters:${param}`;
      
      const data = await cacheService.getOrFetch(
        cacheKey,
        async () => {
          console.log(`[COMIC_CTRL] API: Cache MISS: ${cacheKey}`);
          
          // Fetch comic first to validate it exists
          const comic = await ComicModel.findByParam(param);
          
          if (!comic) {
            return null; // Will be handled after getOrFetch
          }
          
          // Fetch chapters
          const chapters = await ChapterModel.findByComicId(comic.id);
          
          return { 
            comic: { param: comic.param, title: comic.title },
            chapters 
          };
        },
        'warm',
        1800 // 30 minutes
      );
      
      // Handle not found
      if (!data || !data.comic) {
        console.log(`[COMIC_CTRL] API: Comic not found: ${param}`);
        logger.warn(`API: Comic not found: ${param}`);
        return errorResponse(res, 'Comic not found', null, 404);
      }
      
      const { comic, chapters } = data;
      
      console.log(`[COMIC_CTRL] API: Found ${chapters.length} chapters`);
      logger.info(`API: Chapters for "${comic.title}": ${chapters.length}`);
      
      // Return JSON response
      return successResponse(res, 'Chapters retrieved successfully', {
        comic: {
          param: comic.param,
          title: comic.title
        },
        chapters,
        total: chapters.length
      });
      
    } catch (error) {
      console.error(`[COMIC_CTRL] getChaptersAPI() - Error: ${error.message}`);
      logger.error(`API: Chapters error: ${error.message}`);
      return serverError(res, 'Failed to retrieve chapters');
    }
  },

  /**
   * API: Search and filter comics
   * 
   * GET /api/comics/search
   * 
   * Search comics by title and filter by genre with pagination.
   * 
   * Query Parameters:
   * - q or search: Search keyword
   * - genre: Genre filter
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 50)
   * 
   * Response:
   * {
   *   status: "success",
   *   message: "Search results retrieved",
   *   data: {
   *     comics: [...],
   *     search: { keyword, genre },
   *     pagination: {...}
   *   }
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async searchComicsAPI(req, res) {
    console.log('[COMIC_CTRL] searchComicsAPI() - API search request');
    logger.info(`API: Comic search requested`);
    
    try {
      // Parse parameters
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      
      const keyword = req.query.search || req.query.q || '';
      const genre = req.query.genre || '';
      
      console.log(`[COMIC_CTRL] API Search: keyword="${keyword}", genre="${genre}", page=${page}`);
      
      // Search and filter
      const [comics, total] = await Promise.all([
        ComicModel.searchAndFilter({ keyword, genre, limit, offset }),
        ComicModel.countSearchResults({ keyword, genre })
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      console.log(`[COMIC_CTRL] API Search: Found ${comics.length} of ${total} results`);
      logger.info(`API: Search results - ${comics.length} of ${total} comics`);
      
      // Return JSON response
      return successResponse(res, 'Search results retrieved', {
        comics,
        search: {
          keyword,
          genre
        },
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalItems: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
      
    } catch (error) {
      console.error(`[COMIC_CTRL] searchComicsAPI() - Error: ${error.message}`);
      logger.error(`API: Search error: ${error.message}`);
      return serverError(res, 'Failed to search comics');
    }
  },

  /**
   * API: Get all genres
   * 
   * GET /api/comics/genres
   * 
   * Returns list of all unique genres.
   * 
   * Response:
   * {
   *   status: "success",
   *   message: "Genres retrieved",
   *   data: {
   *     genres: ["Action", "Adventure", ...],
   *     total: number
   *   }
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getGenresAPI(req, res) {
    console.log('[COMIC_CTRL] getGenresAPI() - API genres request');
    logger.info(`API: Genres list requested`);
    
    try {
      // Get genres from cache (HOT tier, 24h TTL)
      const genres = await cacheService.getOrFetch(
        cacheService.genresKey(),
        async () => {
          console.log('[COMIC_CTRL] API: Cache MISS - Fetching genres from database');
          logger.info('Genres cache MISS - fetching from database');
          return await ComicModel.getAllGenres();
        },
        'hot',
        86400 // 24 hours - genres are almost static
      );
      
      console.log(`[COMIC_CTRL] API: Found ${genres.length} unique genres`);
      logger.info(`API: ${genres.length} genres retrieved`);
      
      return successResponse(res, 'Genres retrieved', {
        genres,
        total: genres.length
      });
      
    } catch (error) {
      console.error(`[COMIC_CTRL] getGenresAPI() - Error: ${error.message}`);
      logger.error(`API: Genres error: ${error.message}`);
      return serverError(res, 'Failed to retrieve genres');
    }
  },
  
  // ===========================================
  // CACHE HELPERS
  // ===========================================
  
  /**
   * Invalidate comic cache
   * 
   * Call this when a comic is updated (metadata or chapters changed).
   * Clears all cached data for a specific comic.
   * 
   * @param {string} comicParam - Comic URL param
   * @returns {number} Number of cache entries cleared
   */
  invalidateComicCache(comicParam) {
    const count = cacheService.invalidateComic(comicParam);
    console.log(`[COMIC_CTRL] Invalidated cache for comic: ${comicParam} (${count} entries)`);
    logger.info(`Cache invalidated: comic ${comicParam}`);
    return count;
  },
  
  /**
   * Invalidate all comic caches
   * 
   * Use when multiple comics are updated (e.g., after scraper run).
   * 
   * @returns {number} Number of cache entries cleared
   */
  invalidateAllComicCaches() {
    const count = cacheService.clearByPattern('comic:*');
    console.log(`[COMIC_CTRL] Invalidated ALL comic caches (${count} entries)`);
    logger.info(`All comic caches invalidated: ${count} entries`);
    return count;
  },
  
  /**
   * Invalidate genres cache
   * 
   * Call this when genres are updated (new genre added, genre removed, etc.).
   * Since genres are cached for 24 hours, call this after genre changes.
   * 
   * @returns {number} Number of cache entries cleared
   */
  invalidateGenresCache() {
    const deleted = cacheService.delete(cacheService.genresKey());
    console.log(`[COMIC_CTRL] Invalidated genres cache (${deleted} entries)`);
    logger.info('Genres cache invalidated');
    return deleted;
  }
};

module.exports = ComicController;
