/**
 * ===========================================
 * AF-Komik V2 - Chapter Controller
 * ===========================================
 * 
 * Controller for handling chapter reading requests.
 * Provides both web (EJS) and API (JSON) handlers.
 * 
 * Data Flow:
 * 1. Request with comic param and chapter param
 * 2. Validate both parameters exist
 * 3. Fetch chapter with comic info from MySQL
 * 4. Fetch all page images for the chapter
 * 5. Get prev/next chapter navigation
 * 6. Save reading history (if user is logged in)
 * 7. Render reader or return JSON
 * 
 * Error Handling:
 * - Invalid params: 400 Bad Request
 * - Chapter/Comic not found: 404 Not Found
 * - Server error: 500 Internal Server Error
 */

const logger = require('../config/logger');
const ComicModel = require('../models/mysql/comic.model');
const ChapterModel = require('../models/mysql/chapter.model');
const ImageModel = require('../models/mysql/image.model');
const { ReadChapter } = require('../models/mongo');
const HistoryController = require('./historyController');
const { successResponse, errorResponse, badRequest, serverError } = require('../utils/apiResponse');
const { cacheService } = require('../services/cacheService');

/**
 * Chapter controller with web and API handlers
 */
const ChapterController = {
  
  // ===========================================
  // WEB HANDLERS (EJS Rendering)
  // ===========================================
  
  /**
   * Render chapter reader page
   * 
   * GET /comics/:param/:chapterParam
   * 
   * Fetches chapter, images, and navigation from MySQL.
   * Renders long-scroll reader with all page images.
   * 
   * URL Parameters:
   * - param: Comic URL slug (e.g., "one-piece")
   * - chapterParam: Chapter URL slug (e.g., "chapter-1100")
   * 
   * Reader Features:
   * - All images displayed vertically (long scroll)
   * - Previous/Next chapter navigation
   * - Comic title and chapter label displayed
   * - Page count shown
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware
   */
  async readChapterPage(req, res, next) {
    const { param, chapterParam } = req.params;
    
    console.log(`[CHAPTER_CTRL] readChapterPage() - ${param}/${chapterParam}`);
    logger.info(`Chapter reader requested: ${param}/${chapterParam}`);
    
    try {
      // Validate parameters
      if (!param || !chapterParam) {
        console.log('[CHAPTER_CTRL] Missing required parameters');
        return res.status(400).render('errors/404', {
          title: '400 - Bad Request',
          message: 'Missing comic or chapter parameter'
        });
      }
      
      // Try to get from cache first
      const cacheKey = cacheService.chapterKey(param, chapterParam);
      const cachedData = cacheService.get(cacheKey, 'cold');
      
      let chapter, images, navigation;
      
      if (cachedData) {
        // Cache HIT - use cached data
        console.log(`[CHAPTER_CTRL] Cache HIT for ${param}/${chapterParam}`);
        logger.info(`Cache HIT: ${param}/${chapterParam}`);
        
        chapter = cachedData.chapter;
        images = cachedData.images;
        navigation = cachedData.navigation;
      } else {
        // Cache MISS - fetch from database
        console.log(`[CHAPTER_CTRL] Cache MISS for ${param}/${chapterParam}`);
        logger.info(`Cache MISS: ${param}/${chapterParam}`);
        
        // Fetch chapter with comic info using JOIN
        chapter = await ChapterModel.findByParams(param, chapterParam);
      
      // Handle chapter not found
      if (!chapter) {
        console.log(`[CHAPTER_CTRL] Chapter not found: ${param}/${chapterParam}`);
        logger.warn(`Chapter not found: ${param}/${chapterParam}`);
        return res.status(404).render('errors/404', {
          title: '404 - Chapter Tidak Ditemukan',
          message: `Chapter "${chapterParam}" tidak ditemukan untuk komik "${param}".`
        });
      }
      
        // Fetch all images for this chapter
        images = await ImageModel.findByChapterId(chapter.id);
        
        // Fetch navigation (prev/next chapter)
        navigation = await ChapterModel.getNavigation(chapter.komik_id, chapter.id);
        
        console.log(`[CHAPTER_CTRL] Found ${images.length} images for "${chapter.chapter_label}"`);
        logger.info(`Chapter reader: "${chapter.chapter_label}" - ${images.length} pages`);
        
        // Cache the data
        // Use 24 hour TTL for published chapters (immutable)
        // Use 30 min TTL for new chapters (might be updated)
        const ttl = 86400; // 24 hours for all chapters
        cacheService.set(cacheKey, { chapter, images, navigation }, 'cold', ttl);
        console.log(`[CHAPTER_CTRL] Cached chapter data with ${ttl}s TTL`);
        
        // Prefetch adjacent chapters in background (non-blocking)
        ChapterController.prefetchAdjacentChapters(param, navigation);
      }
      
      // Get user from request (if logged in)
      const user = req.user ? req.user.getPublicProfile() : null;
      
      // Save reading history for logged-in users
      // This runs asynchronously - we don't wait for it to complete
      // to avoid slowing down page load
      if (req.user) {
        console.log(`[CHAPTER_CTRL] User "${req.user.username}" reading ${param}/${chapterParam}`);
        logger.info(`User "${req.user.username}" reading: ${param}/${chapterParam}`);
        
        // Save reading progress in background (don't await)
        HistoryController.saveProgress(
          req.user._id,
          { 
            param: chapter.comic_param, 
            title: chapter.comic_title, 
            thumbnail: chapter.comic_thumbnail 
          },
          { 
            param: chapter.param, 
            label: chapter.chapter_label 
          },
          images.length
        ).catch(err => {
          // Log error but don't fail the request
          console.error(`[CHAPTER_CTRL] Failed to save reading history: ${err.message}`);
          logger.error(`Failed to save reading history: ${err.message}`);
        });

        // Mark chapter as read in background (don't await)
        ReadChapter.markAsRead(req.user._id, chapter.id, chapter.komik_id)
          .then(() => {
            console.log(`[CHAPTER_CTRL] Marked chapter ${chapter.id} as read for user ${req.user.username}`);
            logger.info(`Chapter ${chapter.id} marked as read for user ${req.user._id}`);
          })
          .catch(err => {
            // Log error but don't fail the request
            console.error(`[CHAPTER_CTRL] Failed to mark chapter as read: ${err.message}`);
            logger.error(`Failed to mark chapter as read: ${err.message}`);
          });
      }
      
      // Render EJS template with reader layout (no navbar/footer)
      res.render('pages/chapter-reader', {
        layout: 'layouts/reader',
        title: `${chapter.chapter_label} - ${chapter.comic_title} - AF-Komik`,
        currentPage: 'reader',
        user,
        chapter: {
          id: chapter.id,
          param: chapter.param,
          label: chapter.chapter_label,
          releaseDate: chapter.release_date
        },
        comic: {
          param: chapter.comic_param,
          title: chapter.comic_title,
          thumbnail: chapter.comic_thumbnail
        },
        images,
        pageCount: images.length,
        navigation: {
          prev: navigation.prev ? {
            param: navigation.prev.param,
            label: navigation.prev.chapter_label
          } : null,
          next: navigation.next ? {
            param: navigation.next.param,
            label: navigation.next.chapter_label
          } : null
        },
        hasImages: images.length > 0
      });
      
    } catch (error) {
      console.error(`[CHAPTER_CTRL] readChapterPage() - Error: ${error.message}`);
      logger.error(`Chapter reader error: ${error.message}`);
      next(error);
    }
  },
  
  // ===========================================
  // API HANDLERS (JSON Response)
  // ===========================================
  
  /**
   * API: Get chapter content for reading
   * 
   * GET /api/comics/:param/chapters/:chapterParam
   * 
   * Returns chapter details, all images, and navigation.
   * Used by mobile app for chapter reading.
   * 
   * URL Parameters:
   * - param: Comic URL slug (e.g., "one-piece")
   * - chapterParam: Chapter URL slug (e.g., "chapter-1100")
   * 
   * Response:
   * {
   *   status: "success",
   *   message: "Chapter retrieved successfully",
   *   data: {
   *     chapter: {...},
   *     comic: { param, title },
   *     images: [...],
   *     pageCount: number,
   *     navigation: { prev, next }
   *   }
   * }
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async readChapterAPI(req, res) {
    const { param, chapterParam } = req.params;
    
    console.log(`[CHAPTER_CTRL] readChapterAPI() - ${param}/${chapterParam}`);
    logger.info(`API: Chapter requested: ${param}/${chapterParam}`);
    
    try {
      // Validate parameters
      if (!param || !chapterParam) {
        console.log('[CHAPTER_CTRL] API: Missing parameters');
        return badRequest(res, 'Missing comic or chapter parameter');
      }
      
      // Try cache first
      const cacheKey = cacheService.chapterKey(param, chapterParam);
      
      const data = await cacheService.getOrFetch(
        cacheKey,
        async () => {
          // Cache MISS - fetch from database
          console.log(`[CHAPTER_CTRL] API: Cache MISS for ${param}/${chapterParam}`);
          
          const chapter = await ChapterModel.findByParams(param, chapterParam);
      
          // Handle not found
          if (!chapter) {
            return null; // Will be handled after getOrFetch
          }
          
          // Fetch images and navigation in parallel
          const [images, navigation] = await Promise.all([
            ImageModel.findByChapterId(chapter.id),
            ChapterModel.getNavigation(chapter.komik_id, chapter.id)
          ]);
          
          console.log(`[CHAPTER_CTRL] API: Found ${images.length} images`);
          logger.info(`API: Chapter "${chapter.chapter_label}" - ${images.length} pages`);
          
          // Prefetch adjacent chapters
          ChapterController.prefetchAdjacentChapters(param, navigation);
          
          return { chapter, images, navigation };
        },
        'cold',
        86400 // 24 hours
      );
      
      // Handle not found
      if (!data || !data.chapter) {
        console.log(`[CHAPTER_CTRL] API: Chapter not found: ${param}/${chapterParam}`);
        logger.warn(`API: Chapter not found: ${param}/${chapterParam}`);
        return errorResponse(res, 'Chapter not found', null, 404);
      }
      
      const { chapter, images, navigation } = data;
      
      // Return JSON response
      return successResponse(res, 'Chapter retrieved successfully', {
        chapter: {
          id: chapter.id,
          param: chapter.param,
          label: chapter.chapter_label,
          releaseDate: chapter.release_date
        },
        comic: {
          param: chapter.comic_param,
          title: chapter.comic_title,
          thumbnail: chapter.comic_thumbnail
        },
        images: images.map(img => ({
          id: img.id,
          pageNumber: img.page_number,
          url: img.image_url
        })),
        pageCount: images.length,
        navigation: {
          prev: navigation.prev ? {
            param: navigation.prev.param,
            label: navigation.prev.chapter_label
          } : null,
          next: navigation.next ? {
            param: navigation.next.param,
            label: navigation.next.chapter_label
          } : null
        }
      });
      
    } catch (error) {
      console.error(`[CHAPTER_CTRL] readChapterAPI() - Error: ${error.message}`);
      logger.error(`API: Chapter error: ${error.message}`);
      return serverError(res, 'Failed to retrieve chapter');
    }
  },
  
  /**
   * API: Get images for a chapter
   * 
   * GET /api/comics/:param/chapters/:chapterParam/images
   * 
   * Returns only images for a chapter (lighter response).
   * Useful for lazy loading or refreshing images only.
   * 
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getImagesAPI(req, res) {
    const { param, chapterParam } = req.params;
    
    console.log(`[CHAPTER_CTRL] getImagesAPI() - ${param}/${chapterParam}`);
    logger.info(`API: Images requested: ${param}/${chapterParam}`);
    
    try {
      // Validate parameters
      if (!param || !chapterParam) {
        return badRequest(res, 'Missing comic or chapter parameter');
      }
      
      // Use cache for images too
      const cacheKey = cacheService.chapterKey(param, chapterParam);
      const cachedData = cacheService.get(cacheKey, 'cold');
      
      let images, chapter;
      
      if (cachedData && cachedData.images) {
        // Use cached images
        images = cachedData.images;
        chapter = cachedData.chapter;
        console.log(`[CHAPTER_CTRL] API: Using cached images (${images.length})`);
      } else {
        // Fetch chapter to get ID
        chapter = await ChapterModel.findByParams(param, chapterParam);
        
        if (!chapter) {
          return errorResponse(res, 'Chapter not found', null, 404);
        }
        
        // Fetch images
        images = await ImageModel.findByChapterId(chapter.id);
      }
      
      console.log(`[CHAPTER_CTRL] API: Found ${images.length} images`);
      logger.info(`API: Images for ${chapterParam}: ${images.length}`);
      
      return successResponse(res, 'Images retrieved successfully', {
        chapterParam,
        images: images.map(img => ({
          pageNumber: img.page_number,
          url: img.image_url
        })),
        total: images.length
      });
      
    } catch (error) {
      console.error(`[CHAPTER_CTRL] getImagesAPI() - Error: ${error.message}`);
      logger.error(`API: Images error: ${error.message}`);
      return serverError(res, 'Failed to retrieve images');
    }
  },
  
  // ===========================================
  // CACHE HELPERS
  // ===========================================
  
  /**
   * Prefetch adjacent chapters in background
   * 
   * This improves user experience by caching next/prev chapters
   * before user navigates to them.
   * 
   * @param {string} comicParam - Comic URL param
   * @param {Object} navigation - Navigation object with prev/next
   */
  prefetchAdjacentChapters(comicParam, navigation) {
    // Run in background, don't block the response
    setImmediate(async () => {
      try {
        const chaptersToPrefetch = [];
        
        if (navigation.prev) {
          chaptersToPrefetch.push(navigation.prev.param);
        }
        if (navigation.next) {
          chaptersToPrefetch.push(navigation.next.param);
        }
        
        for (const chapterParam of chaptersToPrefetch) {
          const cacheKey = cacheService.chapterKey(comicParam, chapterParam);
          
          // Skip if already cached
          if (cacheService.get(cacheKey, 'cold')) {
            continue;
          }
          
          console.log(`[CHAPTER_CTRL] Prefetching: ${comicParam}/${chapterParam}`);
          
          // Fetch and cache
          const chapter = await ChapterModel.findByParams(comicParam, chapterParam);
          if (!chapter) continue;
          
          const [images, nav] = await Promise.all([
            ImageModel.findByChapterId(chapter.id),
            ChapterModel.getNavigation(chapter.komik_id, chapter.id)
          ]);
          
          cacheService.set(cacheKey, { chapter, images, navigation: nav }, 'cold', 86400);
          console.log(`[CHAPTER_CTRL] Prefetched: ${comicParam}/${chapterParam} (${images.length} images)`);
          logger.info(`Prefetched chapter: ${comicParam}/${chapterParam}`);
        }
      } catch (error) {
        // Silent fail - prefetching is not critical
        console.error(`[CHAPTER_CTRL] Prefetch error: ${error.message}`);
        logger.error(`Prefetch error: ${error.message}`);
      }
    });
  },
  
  /**
   * Invalidate chapter cache
   * 
   * Call this when a chapter is updated (e.g., images changed)
   * 
   * @param {string} comicParam - Comic URL param
   * @param {string} chapterParam - Chapter URL param
   */
  invalidateChapterCache(comicParam, chapterParam) {
    const count = cacheService.invalidateChapter(comicParam, chapterParam);
    console.log(`[CHAPTER_CTRL] Invalidated cache for ${comicParam}/${chapterParam} (${count} entries)`);
    logger.info(`Cache invalidated: ${comicParam}/${chapterParam}`);
    return count;
  }
};

module.exports = ChapterController;
