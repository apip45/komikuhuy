/**
 * ===========================================
 * AF-Komik Scraper - Comic List Scraper
 * ===========================================
 * 
 * Scrapes the comic list pages from komiku.org
 * Extracts basic comic info: param, title, URL
 * 
 * Target URLs:
 * - https://komiku.org/daftar-komik/page/{n}/ (uses .manga-grid with article.manga-card)
 * - https://api.komiku.org/manga/ (for latest updates, uses .bge)
 */

const cheerio = require('cheerio');
const config = require('../config/scraper.config');
const logger = require('../config/logger');
const { fetchHtml } = require('../utils/http');
const { withRetry } = require('../utils/retry');
const { delayBetweenPages } = require('../utils/delay');

// API endpoint for latest updates (used by pustaka via HTMX)
const LATEST_API_URL = 'https://api.komiku.org/manga/';

/**
 * Comic List Scraper
 */
const ComicListScraper = {
  
  /**
   * Extract comic param from URL
   * Example: /manga/one-piece/ -> one-piece
   * 
   * @param {string} url - Comic URL
   * @returns {string|null} Comic param
   */
  extractParam(url) {
    if (!url) return null;
    
    // Match /manga/{param}/ pattern
    const match = url.match(/\/manga\/([^/]+)\/?$/);
    return match ? match[1] : null;
  },
  
  /**
   * Scrape a single comic list page (daftar-komik)
   * Uses .manga-grid > article.manga-card structure
   * 
   * @param {number} pageNum - Page number (1-based)
   * @returns {Promise<Array>} Array of comic info objects
   */
  async scrapePage(pageNum) {
    const url = pageNum === 1 
      ? `${config.baseUrl}/daftar-komik/`
      : `${config.baseUrl}/daftar-komik/page/${pageNum}/`;
    
    logger.info(`Scraping comic list page ${pageNum}: ${url}`);
    
    try {
      const html = await withRetry(
        () => fetchHtml(url),
        { operation: `comic-list-page-${pageNum}`, throwOnFail: true }
      );
      
      const $ = cheerio.load(html);
      const comics = [];
      
      // Primary selector: article.manga-card inside .manga-grid
      $('article.manga-card, .manga-grid article').each((index, element) => {
        try {
          const $el = $(element);
          
          // Get the first link (to manga page)
          const $link = $el.find('a[href*="/manga/"]').first();
          const comicUrl = $link.attr('href');
          const param = this.extractParam(comicUrl);
          
          if (!param) {
            return; // Skip if can't extract param
          }
          
          // Get title from h4 inside the card
          const title = $el.find('h4 a').text().trim() ||
                       $el.find('h4').text().trim() ||
                       $el.find('img').attr('alt')?.trim() || '';
          
          // Get thumbnail (lazy loaded with data-src)
          const $img = $el.find('img').first();
          const thumbnail = $img.attr('data-src') || $img.attr('src') || null;
          
          // Get type/genre from .meta
          const metaText = $el.find('.meta').text().trim();
          const typeMatch = metaText.match(/^(Manga|Manhwa|Manhua)/i);
          const comicType = typeMatch ? typeMatch[1] : 'Unknown';
          
          comics.push({
            param,
            title,
            thumbnail,
            comicType,
            url: comicUrl || `${config.baseUrl}/manga/${param}/`
          });
          
        } catch (error) {
          logger.warn(`Failed to parse comic entry: ${error.message}`);
        }
      });
      
      // Fallback: try .bge selector (old structure)
      if (comics.length === 0) {
        $('div.bge').each((index, element) => {
          try {
            const $el = $(element);
            const $link = $el.find('a').first();
            const comicUrl = $link.attr('href');
            const param = this.extractParam(comicUrl);
            
            if (!param) return;
            
            const title = $el.find('.kan h3').text().trim() || 
                         $el.find('h3').text().trim() ||
                         $link.attr('title') || '';
            
            const $img = $el.find('.bgei img, img').first();
            const thumbnail = $img.attr('src') || $img.attr('data-src') || null;
            
            const genreText = $el.find('.tpe1_inf b').text().trim() || '';
            const typeMatch = genreText.match(/^(Manga|Manhwa|Manhua)/i);
            const comicType = typeMatch ? typeMatch[1] : 'Unknown';
            
            comics.push({
              param,
              title,
              thumbnail,
              comicType,
              url: comicUrl || `${config.baseUrl}/manga/${param}/`
            });
            
          } catch (error) {
            logger.warn(`Failed to parse comic entry (bge): ${error.message}`);
          }
        });
      }
      
      logger.info(`Found ${comics.length} comics on page ${pageNum}`);
      return comics;
      
    } catch (error) {
      logger.error(`Failed to scrape comic list page ${pageNum}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Scrape the latest updates page (via API)
   * Uses https://api.komiku.org/manga/ which returns HTML with .bge structure
   * 
   * @param {number} pageNum - Page number (1-based)
   * @returns {Promise<Array>} Array of comic info objects
   */
  async scrapeLatestPage(pageNum = 1) {
    // The API uses offset pagination (10 items per page)
    const url = pageNum === 1 
      ? LATEST_API_URL
      : `${LATEST_API_URL}?page=${pageNum}`;
    
    logger.info(`Scraping latest updates page ${pageNum}: ${url}`);
    
    try {
      const html = await withRetry(
        () => fetchHtml(url, {
          'Referer': 'https://komiku.org/pustaka/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }),
        { operation: `latest-page-${pageNum}`, throwOnFail: true }
      );
      
      const $ = cheerio.load(html);
      const comics = [];
      
      // Parse .bge entries from the API response
      $('div.bge').each((index, element) => {
        try {
          const $el = $(element);
          
          // Get link to manga detail page
          const $link = $el.find('a[href*="/manga/"]').first();
          const comicUrl = $link.attr('href');
          const param = this.extractParam(comicUrl);
          
          if (!param) return;
          
          // Get title from h3
          const title = $el.find('h3').text().trim() ||
                       $el.find('.kan h3').text().trim() ||
                       $link.attr('title') || '';
          
          // Get thumbnail
          const $img = $el.find('.bgei img, img').first();
          const thumbnail = $img.attr('src') || $img.attr('data-src') || null;
          
          // Get type from .tpe1_inf
          const typeText = $el.find('.tpe1_inf b').text().trim();
          const comicType = typeText || 'Unknown';
          
          // Get latest chapter info
          const latestChapterLink = $el.find('.new1 a[href*="-chapter-"]').last().attr('href');
          const latestChapterMatch = latestChapterLink?.match(/-chapter-(\d+)/);
          const latestChapter = latestChapterMatch ? parseInt(latestChapterMatch[1], 10) : null;
          
          comics.push({
            param,
            title,
            thumbnail,
            comicType,
            latestChapter,
            url: comicUrl || `${config.baseUrl}/manga/${param}/`
          });
          
        } catch (error) {
          logger.warn(`Failed to parse latest comic entry: ${error.message}`);
        }
      });
      
      logger.info(`Found ${comics.length} comics on latest page ${pageNum}`);
      return comics;
      
    } catch (error) {
      logger.error(`Failed to scrape latest page ${pageNum}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Check if there's a next page
   * 
   * @param {number} pageNum - Current page number
   * @returns {Promise<boolean>} True if next page exists
   */
  async hasNextPage(pageNum) {
    const nextPage = pageNum + 1;
    const url = `${config.baseUrl}/daftar-komik/page/${nextPage}/`;
    
    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      
      // Check if page has comic entries (either new or old structure)
      const hasComics = $('article.manga-card').length > 0 || $('div.bge').length > 0;
      return hasComics;
      
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Scrape multiple pages of comic list
   * 
   * @param {Object} options - Scrape options
   * @param {number} options.startPage - Starting page (default: 1)
   * @param {number} options.endPage - Ending page (default: 0 = unlimited)
   * @param {Function} options.onPageComplete - Callback after each page
   * @returns {Promise<Array>} All comics from all pages
   */
  async scrapeMultiplePages({ startPage = 1, endPage = 0, onPageComplete = null } = {}) {
    const allComics = [];
    let currentPage = startPage;
    let hasMore = true;
    
    logger.separator('Comic List Scraping');
    
    while (hasMore) {
      // Check page limit
      if (endPage > 0 && currentPage > endPage) {
        logger.info(`Reached page limit (${endPage}), stopping`);
        break;
      }
      
      try {
        const comics = await this.scrapePage(currentPage);
        
        if (comics.length === 0) {
          logger.info(`No comics found on page ${currentPage}, stopping`);
          break;
        }
        
        allComics.push(...comics);
        
        // Callback for progress tracking
        if (onPageComplete) {
          await onPageComplete(currentPage, comics, allComics.length);
        }
        
        logger.progress('Comic List', currentPage, endPage || '∞', `${allComics.length} comics total`);
        
        // Check for next page
        hasMore = await this.hasNextPage(currentPage);
        
        if (hasMore) {
          await delayBetweenPages();
        }
        
        currentPage++;
        
      } catch (error) {
        logger.error(`Error on page ${currentPage}: ${error.message}`);
        
        // Continue to next page on error
        currentPage++;
        await delayBetweenPages();
      }
    }
    
    logger.info(`Comic list scraping complete: ${allComics.length} comics from ${currentPage - startPage} pages`);
    
    return allComics;
  },
  
  /**
   * Scrape latest comics (for periodic updates)
   * 
   * @param {number} pageLimit - Maximum pages to scrape
   * @returns {Promise<Array>} Latest comics
   */
  async scrapeLatest(pageLimit = 10) {
    const allComics = [];
    
    logger.separator('Latest Comics Scraping');
    
    for (let page = 1; page <= pageLimit; page++) {
      try {
        const comics = await this.scrapeLatestPage(page);
        
        if (comics.length === 0) {
          logger.info(`No more comics on latest page ${page}`);
          break;
        }
        
        allComics.push(...comics);
        logger.progress('Latest Comics', page, pageLimit, `${allComics.length} comics`);
        
        if (page < pageLimit) {
          await delayBetweenPages();
        }
        
      } catch (error) {
        logger.warn(`Error on latest page ${page}: ${error.message}`);
        // Continue to next page
      }
    }
    
    // Remove duplicates based on param
    const uniqueComics = [];
    const seenParams = new Set();
    
    for (const comic of allComics) {
      if (!seenParams.has(comic.param)) {
        seenParams.add(comic.param);
        uniqueComics.push(comic);
      }
    }
    
    logger.info(`Latest scraping complete: ${uniqueComics.length} unique comics`);
    
    return uniqueComics;
  }
};

module.exports = ComicListScraper;
