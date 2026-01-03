/**
 * ===========================================
 * AF-Komik Scraper - Comic Detail Scraper
 * ===========================================
 * 
 * Scrapes detailed information for a single comic.
 * Includes: title, synopsis, genres, chapter list
 * 
 * Target URL: https://komiku.org/manga/{param}/
 */

const cheerio = require('cheerio');
const config = require('../config/scraper.config');
const logger = require('../config/logger');
const { fetchHtml } = require('../utils/http');
const { withRetry } = require('../utils/retry');

/**
 * Comic Detail Scraper
 */
const ComicDetailScraper = {
  
  /**
   * Extract chapter param from URL
   * Example: /one-piece-chapter-1100/ -> one-piece-chapter-1100
   * 
   * @param {string} url - Chapter URL
   * @returns {string|null} Chapter param
   */
  extractChapterParam(url) {
    if (!url) return null;
    
    // Match /{chapter-param}/ at the end
    const match = url.match(/\/([^/]+)\/?$/);
    return match ? match[1] : null;
  },
  
  /**
   * Parse chapter label to extract chapter number
   * 
   * @param {string} label - Chapter label text
   * @returns {Object} Parsed info { label, number }
   */
  parseChapterLabel(label) {
    if (!label) return { label: 'Unknown', number: 0 };
    
    // Clean up the label
    const cleanLabel = label.trim();
    
    // Try to extract chapter number
    const numberMatch = cleanLabel.match(/(?:chapter|ch\.?|episode|ep\.?)\s*(\d+(?:\.\d+)?)/i);
    const number = numberMatch ? parseFloat(numberMatch[1]) : 0;
    
    return {
      label: cleanLabel,
      number
    };
  },
  
  /**
   * Parse release date from text
   * 
   * @param {string} dateText - Date text (e.g., "2 hari lalu", "Jan 1, 2024")
   * @returns {Date|null} Parsed date or null
   */
  parseReleaseDate(dateText) {
    if (!dateText) return null;
    
    const text = dateText.trim().toLowerCase();
    const now = new Date();
    
    // Relative time patterns (Indonesian)
    if (text.includes('detik')) {
      const seconds = parseInt(text) || 0;
      return new Date(now.getTime() - seconds * 1000);
    }
    if (text.includes('menit')) {
      const minutes = parseInt(text) || 0;
      return new Date(now.getTime() - minutes * 60 * 1000);
    }
    if (text.includes('jam')) {
      const hours = parseInt(text) || 0;
      return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }
    if (text.includes('hari')) {
      const days = parseInt(text) || 0;
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    if (text.includes('minggu')) {
      const weeks = parseInt(text) || 0;
      return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    }
    if (text.includes('bulan')) {
      const months = parseInt(text) || 0;
      return new Date(now.setMonth(now.getMonth() - months));
    }
    if (text.includes('tahun')) {
      const years = parseInt(text) || 0;
      return new Date(now.setFullYear(now.getFullYear() - years));
    }
    
    // Try to parse as date string
    try {
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      // Ignore parse errors
    }
    
    return null;
  },
  
  /**
   * Parse date string in DD/MM/YYYY format (used by komiku.org)
   * 
   * @param {string} dateStr - Date string like "01/01/2024"
   * @returns {Date|null} Parsed date or null
   */
  parseDateString(dateStr) {
    if (!dateStr) return null;
    
    // Try DD/MM/YYYY format first
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year) {
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    
    // Fallback to parseReleaseDate for relative dates
    return this.parseReleaseDate(dateStr);
  },
  
  /**
   * Scrape comic detail page
   * 
   * @param {string} param - Comic URL param
   * @returns {Promise<Object>} Comic detail object
   */
  async scrape(param) {
    const url = `${config.baseUrl}/manga/${param}/`;
    
    logger.debug(`Scraping comic detail: ${param}`);
    
    try {
      const html = await withRetry(
        () => fetchHtml(url),
        { operation: `comic-detail-${param}`, throwOnFail: true }
      );
      
      const $ = cheerio.load(html);
      
      // ========================================
      // Extract basic info
      // ========================================
      
      // Title - try multiple selectors
      let title = $('#Judul h1').text().trim() ||
                  $('h1.entry-title').text().trim() ||
                  $('h1').first().text().trim() ||
                  '';
      
      // Clean up title
      title = title.replace(/^Komik\s+/i, '').trim();
      
      // Thumbnail
      const $thumbnail = $('.ims img');
      const thumbnail = $thumbnail.attr('src') || 
                        $thumbnail.attr('data-src') || 
                        null;
      
      // ========================================
      // Extract description and synopsis
      // ========================================
      
      // Synopsis from #Judul .desc (matches reference: $('#Judul .desc').text().trim())
      let synopsis = $('#Judul .desc').text().trim();
      
      // Fallback to other selectors if not found
      if (!synopsis) {
        const $synopsis = $('#Sinopsis p, .desc p, .sinopsis p');
        $synopsis.each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 20) {
            synopsis += (synopsis ? '\n\n' : '') + text;
          }
        });
      }
      
      // Short description (first paragraph or meta description)
      let description = $('meta[name="description"]').attr('content') || '';
      if (!description && synopsis) {
        description = synopsis.split('\n')[0].substring(0, 500);
      }
      
      // ========================================
      // Extract genres (matches reference: $(".genre li a"))
      // ========================================
      
      const genres = [];
      $('.genre li a').each((i, el) => {
        const genreName = $(el).text().trim();
        if (genreName && !genres.includes(genreName)) {
          genres.push(genreName);
        }
      });
      
      // ========================================
      // Extract metadata from info table
      // ========================================
      
      let comicType = 'Manga';
      let status = 'Ongoing';
      let author = '';
      
      $('table tr, .info-content .spe span').each((i, el) => {
        const $row = $(el);
        const label = $row.find('td:first-child, b').text().toLowerCase().trim();
        const value = $row.find('td:last-child').text().trim() || $row.text().trim();
        
        if (label.includes('jenis') || label.includes('type')) {
          const typeMatch = value.match(/(manga|manhwa|manhua)/i);
          if (typeMatch) comicType = typeMatch[1];
        }
        if (label.includes('status')) {
          status = value.toLowerCase().includes('completed') ? 'Completed' : 'Ongoing';
        }
        if (label.includes('pengarang') || label.includes('author')) {
          author = value;
        }
      });
      
      // ========================================
      // Extract chapter list (matches reference: #Daftar_Chapter tbody tr)
      // ========================================
      
      const chapters = [];
      
      // Method 1: Table-based chapter list (skip header row with i === 0)
      $('#Daftar_Chapter tbody tr').each((i, el) => {
        if (i === 0) return; // Skip header row
        
        const $row = $(el);
        const $link = $row.find('a').first();
        const href = $link.attr('href');
        
        if (!href) return;
        
        // Extract param: href.includes('ch/') ? href.split('ch/')[1] : href.split('/')[1]
        const chapterParam = href.includes('ch/') 
          ? href.split('ch/')[1]?.replace(/\/$/, '')
          : href.split('/')[1]?.replace(/\/$/, '');
        
        if (!chapterParam) return;
        
        // Get chapter label from .judulseries (reference selector)
        const labelText = $row.find('.judulseries').text().trim() || $link.text().trim();
        const { label, number } = this.parseChapterLabel(labelText);
        
        // Get release date from .tanggalseries (reference selector)
        const dateText = $row.find('.tanggalseries').text().trim();
        const releaseDate = this.parseDateString(dateText);
        
        chapters.push({
          param: chapterParam,
          label,
          number,
          releaseDate,
          url: href
        });
      });
      
      // Method 2: Link-based chapter list (fallback)
      if (chapters.length === 0) {
        $('a[href*="-chapter-"]').each((i, el) => {
          const $link = $(el);
          const chapterUrl = $link.attr('href');
          const chapterParam = this.extractChapterParam(chapterUrl);
          
          if (!chapterParam) return;
          
          // Skip if already added
          if (chapters.some(ch => ch.param === chapterParam)) return;
          
          const labelText = $link.text().trim();
          const { label, number } = this.parseChapterLabel(labelText);
          
          chapters.push({
            param: chapterParam,
            label: label || `Chapter ${number || chapters.length + 1}`,
            number,
            releaseDate: null,
            url: chapterUrl
          });
        });
      }
      
      // Sort chapters by number (descending - newest first)
      chapters.sort((a, b) => b.number - a.number);
      
      // Get latest chapter label
      const latestChapter = chapters.length > 0 ? chapters[0].label : null;
      
      // ========================================
      // Build result object
      // ========================================
      
      const result = {
        param,
        title,
        thumbnail,
        description,
        synopsis,
        genres,
        comicType,
        status,
        author,
        latestChapter,
        chapterCount: chapters.length,
        chapters,
        url
      };
      
      logger.debug(`Comic detail scraped: ${title} (${chapters.length} chapters)`);
      
      return result;
      
    } catch (error) {
      logger.error(`Failed to scrape comic detail ${param}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Scrape only chapter list for a comic (faster)
   * 
   * @param {string} param - Comic URL param
   * @returns {Promise<Array>} Array of chapter objects
   */
  async scrapeChaptersOnly(param) {
    const result = await this.scrape(param);
    return result.chapters;
  },
  
  /**
   * Scrape multiple comics with progress tracking
   * 
   * @param {Array} comics - Array of comic objects with param
   * @param {Object} options - Options
   * @param {Function} options.onProgress - Progress callback
   * @param {Function} options.onError - Error callback
   * @returns {Promise<Array>} Array of scraped comic details
   */
  async scrapeMultiple(comics, { onProgress = null, onError = null } = {}) {
    const results = [];
    const total = comics.length;
    
    for (let i = 0; i < total; i++) {
      const comic = comics[i];
      
      try {
        const detail = await this.scrape(comic.param);
        results.push(detail);
        
        if (onProgress) {
          await onProgress(i + 1, total, detail);
        }
        
      } catch (error) {
        logger.warn(`Failed to scrape ${comic.param}: ${error.message}`);
        
        if (onError) {
          await onError(comic, error);
        }
        
        // Add partial result
        results.push({
          param: comic.param,
          title: comic.title || comic.param,
          error: error.message
        });
      }
    }
    
    return results;
  }
};

module.exports = ComicDetailScraper;
