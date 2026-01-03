/**
 * ===========================================
 * AF-Komik Scraper - Chapter Scraper
 * ===========================================
 * 
 * Scrapes chapter images from chapter pages.
 * Extracts all image URLs in reading order.
 * 
 * Target URL: https://komiku.org/{chapter-param}/
 */

const cheerio = require('cheerio');
const config = require('../config/scraper.config');
const logger = require('../config/logger');
const { fetchHtml } = require('../utils/http');
const { withRetry } = require('../utils/retry');
const { delayBetweenChapters } = require('../utils/delay');

/**
 * Chapter Scraper
 */
const ChapterScraper = {
  
  /**
   * Check if URL is a valid image URL
   * 
   * @param {string} url - URL to check
   * @returns {boolean} True if valid image URL
   */
  isValidImageUrl(url) {
    if (!url) return false;
    
    // Must be absolute URL or start with //
    if (!url.startsWith('http') && !url.startsWith('//')) return false;
    
    // Must have image extension or be from known image CDN
    const imagePattern = /\.(jpg|jpeg|png|gif|webp)($|\?)/i;
    const imageCDNPattern = /(img\.komiku|cdn|upload|image)/i;
    
    return imagePattern.test(url) || imageCDNPattern.test(url);
  },
  
  /**
   * Normalize image URL
   * Replace img.komiku.id with cdn.komiku.co.id (matches reference implementation)
   * 
   * @param {string} url - Image URL
   * @returns {string} Normalized URL
   */
  normalizeImageUrl(url) {
    if (!url) return null;
    
    // Add protocol if starts with //
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }
    
    // Replace img.komiku.id with cdn.komiku.co.id (reference: img.replace('img.komiku.id', 'cdn.komiku.co.id'))
    url = url.replace('img.komiku.id', 'cdn.komiku.co.id');
    
    return url;
  },
  
  /**
   * Scrape chapter images
   * 
   * @param {string} chapterParam - Chapter URL param
   * @returns {Promise<Object>} Chapter data with images
   */
  async scrape(chapterParam) {
    // Build URL - chapter pages are at root level
    const url = `${config.baseUrl}/${chapterParam}/`;
    
    logger.debug(`Scraping chapter: ${chapterParam}`);
    
    try {
      const html = await withRetry(
        () => fetchHtml(url),
        { operation: `chapter-${chapterParam}`, throwOnFail: true }
      );
      
      const $ = cheerio.load(html);
      const images = [];
      
      // ========================================
      // Method 1: Reader container images
      // ========================================
      
      // Primary selector: #Baca_Komik img
      $('#Baca_Komik img').each((i, el) => {
        const $img = $(el);
        const src = $img.attr('src') || $img.attr('data-src');
        const normalized = this.normalizeImageUrl(src);
        
        if (this.isValidImageUrl(normalized)) {
          images.push(normalized);
        }
      });
      
      // ========================================
      // Method 2: Alternative container .bc
      // ========================================
      
      if (images.length === 0) {
        $('.bc img, .chapter-content img, .reader-area img').each((i, el) => {
          const $img = $(el);
          const src = $img.attr('src') || $img.attr('data-src');
          const normalized = this.normalizeImageUrl(src);
          
          if (this.isValidImageUrl(normalized)) {
            images.push(normalized);
          }
        });
      }
      
      // ========================================
      // Method 3: Any image with komiku CDN
      // ========================================
      
      if (images.length === 0) {
        $('img').each((i, el) => {
          const $img = $(el);
          const src = $img.attr('src') || $img.attr('data-src');
          
          // Only include images from komiku CDN
          if (src && src.includes('komiku.org')) {
            const normalized = this.normalizeImageUrl(src);
            if (this.isValidImageUrl(normalized)) {
              images.push(normalized);
            }
          }
        });
      }
      
      // ========================================
      // Extract navigation info
      // ========================================
      
      let prevChapter = null;
      let nextChapter = null;
      let comicParam = null;
      
      // Previous chapter link
      $('a[href*="-chapter-"]').each((i, el) => {
        const $link = $(el);
        const href = $link.attr('href');
        const text = $link.text().toLowerCase();
        
        if (text.includes('prev') || text.includes('sebelumnya')) {
          const match = href.match(/\/([^/]+)\/?$/);
          if (match) prevChapter = match[1];
        }
        if (text.includes('next') || text.includes('selanjutnya') || text.includes('berikutnya')) {
          const match = href.match(/\/([^/]+)\/?$/);
          if (match) nextChapter = match[1];
        }
      });
      
      // Comic param from "List" link
      $('a[href*="/manga/"]').each((i, el) => {
        const href = $(el).attr('href');
        const match = href.match(/\/manga\/([^/]+)/);
        if (match && !comicParam) {
          comicParam = match[1];
        }
      });
      
      // ========================================
      // Build result
      // ========================================
      
      const result = {
        param: chapterParam,
        comicParam,
        images,
        imageCount: images.length,
        prevChapter,
        nextChapter,
        url
      };
      
      logger.debug(`Chapter scraped: ${chapterParam} (${images.length} images)`);
      
      return result;
      
    } catch (error) {
      logger.error(`Failed to scrape chapter ${chapterParam}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Scrape multiple chapters with progress tracking
   * 
   * @param {Array} chapters - Array of chapter objects with param
   * @param {Object} options - Options
   * @param {Function} options.onProgress - Progress callback
   * @param {Function} options.onError - Error callback
   * @param {boolean} options.skipExisting - Skip chapters that already have images
   * @returns {Promise<Array>} Array of scraped chapter data
   */
  async scrapeMultiple(chapters, { onProgress = null, onError = null, skipExisting = false } = {}) {
    const results = [];
    const total = chapters.length;
    
    for (let i = 0; i < total; i++) {
      const chapter = chapters[i];
      
      try {
        // Check if should skip
        if (skipExisting && chapter.hasImages) {
          logger.debug(`Skipping chapter ${chapter.param} (already has images)`);
          continue;
        }
        
        const data = await this.scrape(chapter.param);
        results.push(data);
        
        if (onProgress) {
          await onProgress(i + 1, total, data);
        }
        
        // Delay between chapters
        if (i < total - 1) {
          await delayBetweenChapters();
        }
        
      } catch (error) {
        logger.warn(`Failed to scrape chapter ${chapter.param}: ${error.message}`);
        
        if (onError) {
          await onError(chapter, error);
        }
        
        // Add error result
        results.push({
          param: chapter.param,
          images: [],
          imageCount: 0,
          error: error.message
        });
      }
    }
    
    return results;
  },
  
  /**
   * Scrape images for a single chapter and return just the URLs
   * 
   * @param {string} chapterParam - Chapter URL param
   * @returns {Promise<Array>} Array of image URLs
   */
  async scrapeImages(chapterParam) {
    const result = await this.scrape(chapterParam);
    return result.images;
  },
  
  /**
   * Validate that images are accessible
   * (Optional - can be used to verify scraped URLs)
   * 
   * @param {Array} imageUrls - Array of image URLs
   * @returns {Promise<Object>} Validation result
   */
  async validateImages(imageUrls) {
    const results = {
      total: imageUrls.length,
      valid: 0,
      invalid: 0,
      errors: []
    };
    
    // We don't actually fetch images to validate
    // Just check URL format
    for (const url of imageUrls) {
      if (this.isValidImageUrl(url)) {
        results.valid++;
      } else {
        results.invalid++;
        results.errors.push(url);
      }
    }
    
    return results;
  }
};

module.exports = ChapterScraper;
