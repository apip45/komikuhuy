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
const HistoryController = require('./historyController');
const { successResponse, errorResponse, badRequest, serverError } = require('../utils/apiResponse');

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
      
      // Fetch chapter with comic info using JOIN
      const chapter = await ChapterModel.findByParams(param, chapterParam);
      
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
      const images = await ImageModel.findByChapterId(chapter.id);
      
      // Fetch navigation (prev/next chapter)
      const navigation = await ChapterModel.getNavigation(chapter.komik_id, chapter.id);
      
      console.log(`[CHAPTER_CTRL] Found ${images.length} images for "${chapter.chapter_label}"`);
      logger.info(`Chapter reader: "${chapter.chapter_label}" - ${images.length} pages`);
      
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
      }
      
      // Render EJS template
      res.render('pages/chapter-reader', {
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
      
      // Fetch chapter with comic info
      const chapter = await ChapterModel.findByParams(param, chapterParam);
      
      // Handle not found
      if (!chapter) {
        console.log(`[CHAPTER_CTRL] API: Chapter not found: ${param}/${chapterParam}`);
        logger.warn(`API: Chapter not found: ${param}/${chapterParam}`);
        return errorResponse(res, 'Chapter not found', null, 404);
      }
      
      // Fetch images and navigation in parallel
      const [images, navigation] = await Promise.all([
        ImageModel.findByChapterId(chapter.id),
        ChapterModel.getNavigation(chapter.komik_id, chapter.id)
      ]);
      
      console.log(`[CHAPTER_CTRL] API: Found ${images.length} images`);
      logger.info(`API: Chapter "${chapter.chapter_label}" - ${images.length} pages`);
      
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
      
      // Fetch chapter to get ID
      const chapter = await ChapterModel.findByParams(param, chapterParam);
      
      if (!chapter) {
        return errorResponse(res, 'Chapter not found', null, 404);
      }
      
      // Fetch images
      const images = await ImageModel.findByChapterId(chapter.id);
      
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
  }
};

module.exports = ChapterController;
