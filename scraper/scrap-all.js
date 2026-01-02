#!/usr/bin/env node

/**
 * ===========================================
 * AF-Komik Scraper - Full Scrape
 * ===========================================
 * 
 * Full scraper for initial database population.
 * Scrapes ALL comics, chapters, and image URLs.
 * 
 * Usage:
 *   node scrap-all.js [options]
 * 
 * Options:
 *   --start-page <n>    Start from page n (default: 1)
 *   --end-page <n>      End at page n (default: unlimited)
 *   --skip-chapters     Only scrape comic metadata, skip chapters
 *   --skip-images       Only scrape comics and chapters, skip images
 *   --dry-run           Parse but don't save to database
 *   --help              Show help
 * 
 * This script is designed for one-time initial scraping.
 * For periodic updates, use scrap-latest.js instead.
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const logger = require('./config/logger');
const db = require('./config/db');
const config = require('./config/scraper.config');
const { delayBetweenComics, delayBetweenChapters } = require('./utils/delay');

// Scrapers
const ComicListScraper = require('./scrapers/comicList.scraper');
const ComicDetailScraper = require('./scrapers/comicDetail.scraper');
const ChapterScraper = require('./scrapers/chapter.scraper');

// Services
const ComicService = require('./services/comic.service');
const ChapterService = require('./services/chapter.service');
const ImageService = require('./services/image.service');

// =============================================
// Command Line Arguments
// =============================================

const args = process.argv.slice(2);

const options = {
  startPage: 1,
  endPage: 0, // 0 = unlimited
  skipChapters: false,
  skipImages: false,
  dryRun: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--start-page' && args[i + 1]) {
    options.startPage = parseInt(args[++i]) || 1;
  } else if (arg === '--end-page' && args[i + 1]) {
    options.endPage = parseInt(args[++i]) || 0;
  } else if (arg === '--skip-chapters') {
    options.skipChapters = true;
  } else if (arg === '--skip-images') {
    options.skipImages = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--help') {
    console.log(`
AF-Komik Full Scraper

Usage:
  node scrap-all.js [options]

Options:
  --start-page <n>    Start from page n (default: 1)
  --end-page <n>      End at page n (default: unlimited)
  --skip-chapters     Only scrape comic metadata, skip chapters
  --skip-images       Only scrape comics and chapters, skip images
  --dry-run           Parse but don't save to database
  --help              Show help
    `);
    process.exit(0);
  }
}

// =============================================
// Statistics Tracking
// =============================================

const stats = {
  startTime: null,
  endTime: null,
  comics: {
    scraped: 0,
    inserted: 0,
    updated: 0,
    failed: 0
  },
  chapters: {
    scraped: 0,
    inserted: 0,
    skipped: 0,
    failed: 0
  },
  images: {
    scraped: 0,
    inserted: 0,
    skipped: 0,
    failed: 0
  }
};

// =============================================
// Main Scraping Functions
// =============================================

/**
 * Process a single comic: save to DB and scrape chapters
 */
async function processComic(comicDetail) {
  const { param, title, thumbnail, description, synopsis, genres, latestChapter, chapters } = comicDetail;
  
  if (options.dryRun) {
    logger.info(`[DRY RUN] Would save comic: ${title} (${chapters.length} chapters)`);
    stats.comics.scraped++;
    return { comicId: null, success: true };
  }
  
  try {
    // Upsert comic to database
    const result = await ComicService.upsert({
      param,
      title,
      thumbnail,
      description,
      synopsis,
      genres,
      latestChapter
    });
    
    if (result.action === 'inserted') {
      stats.comics.inserted++;
    } else if (result.action === 'updated') {
      stats.comics.updated++;
    }
    
    stats.comics.scraped++;
    
    return { comicId: result.id, success: true };
    
  } catch (error) {
    logger.error(`Failed to save comic ${param}: ${error.message}`);
    stats.comics.failed++;
    return { comicId: null, success: false, error };
  }
}

/**
 * Process chapters for a comic
 */
async function processChapters(comicId, chapters, comicParam) {
  if (options.skipChapters) {
    return;
  }
  
  if (!comicId) {
    logger.warn(`Cannot process chapters: no comic ID for ${comicParam}`);
    return;
  }
  
  // Get existing chapter params
  const existingParams = await ChapterService.getParamsByComicId(comicId);
  
  for (const chapter of chapters) {
    try {
      // Check if chapter already exists
      if (existingParams.has(chapter.param)) {
        stats.chapters.skipped++;
        continue;
      }
      
      // Insert chapter
      if (!options.dryRun) {
        const result = await ChapterService.insertIfNotExists({
          comicId,
          param: chapter.param,
          label: chapter.label,
          releaseDate: chapter.releaseDate
        });
        
        if (result.isNew) {
          stats.chapters.inserted++;
          
          // Scrape and save images if not skipping
          if (!options.skipImages) {
            await processChapterImages(result.id, chapter.param);
          }
        } else {
          stats.chapters.skipped++;
        }
      } else {
        logger.debug(`[DRY RUN] Would save chapter: ${chapter.label}`);
      }
      
      stats.chapters.scraped++;
      
    } catch (error) {
      logger.warn(`Failed to process chapter ${chapter.param}: ${error.message}`);
      stats.chapters.failed++;
    }
  }
}

/**
 * Process images for a chapter
 */
async function processChapterImages(chapterId, chapterParam) {
  if (options.skipImages) {
    return;
  }
  
  if (!chapterId) {
    return;
  }
  
  try {
    // Check if chapter already has images
    const hasImages = await ImageService.hasImages(chapterId);
    if (hasImages) {
      stats.images.skipped++;
      return;
    }
    
    // Scrape chapter images
    const chapterData = await ChapterScraper.scrape(chapterParam);
    stats.images.scraped += chapterData.images.length;
    
    if (chapterData.images.length === 0) {
      logger.warn(`No images found for chapter ${chapterParam}`);
      return;
    }
    
    // Save images to database
    if (!options.dryRun) {
      const result = await ImageService.bulkInsert(chapterId, chapterData.images);
      stats.images.inserted += result.inserted;
    } else {
      logger.debug(`[DRY RUN] Would save ${chapterData.images.length} images for ${chapterParam}`);
    }
    
    // Delay to avoid rate limiting
    await delayBetweenChapters();
    
  } catch (error) {
    logger.warn(`Failed to process images for ${chapterParam}: ${error.message}`);
    stats.images.failed++;
  }
}

// =============================================
// Main Execution
// =============================================

async function main() {
  logger.separator('AF-KOMIK FULL SCRAPER');
  logger.info('Starting full scrape...');
  logger.info(`Options: ${JSON.stringify(options)}`);
  
  stats.startTime = new Date();
  
  try {
    // Initialize database connection
    if (!options.dryRun) {
      await db.initializePool();
      logger.info('Database connection established');
    }
    
    // ========================================
    // Phase 1: Scrape Comic List
    // ========================================
    
    logger.separator('Phase 1: Comic List');
    
    const comicList = await ComicListScraper.scrapeMultiplePages({
      startPage: options.startPage,
      endPage: options.endPage,
      onPageComplete: (page, comics, total) => {
        logger.progress('Comic List', page, options.endPage || '∞', `${total} comics`);
      }
    });
    
    logger.info(`Found ${comicList.length} comics to process`);
    
    // ========================================
    // Phase 2: Scrape Comic Details
    // ========================================
    
    logger.separator('Phase 2: Comic Details');
    
    const totalComics = comicList.length;
    
    for (let i = 0; i < totalComics; i++) {
      const comic = comicList[i];
      
      try {
        logger.progress('Comics', i + 1, totalComics, comic.param);
        
        // Scrape comic detail
        const detail = await ComicDetailScraper.scrape(comic.param);
        
        // Save to database
        const { comicId, success } = await processComic(detail);
        
        // Process chapters if comic was saved successfully
        if (success && detail.chapters.length > 0) {
          await processChapters(comicId, detail.chapters, comic.param);
        }
        
        // Delay between comics
        await delayBetweenComics();
        
      } catch (error) {
        logger.error(`Failed to process comic ${comic.param}: ${error.message}`);
        stats.comics.failed++;
      }
    }
    
    // ========================================
    // Phase 3: Summary
    // ========================================
    
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    logger.separator('SCRAPING COMPLETE');
    logger.info(`Duration: ${Math.round(duration / 60)} minutes`);
    logger.info('');
    logger.info('Comics:');
    logger.info(`  Scraped:  ${stats.comics.scraped}`);
    logger.info(`  Inserted: ${stats.comics.inserted}`);
    logger.info(`  Updated:  ${stats.comics.updated}`);
    logger.info(`  Failed:   ${stats.comics.failed}`);
    logger.info('');
    logger.info('Chapters:');
    logger.info(`  Scraped:  ${stats.chapters.scraped}`);
    logger.info(`  Inserted: ${stats.chapters.inserted}`);
    logger.info(`  Skipped:  ${stats.chapters.skipped}`);
    logger.info(`  Failed:   ${stats.chapters.failed}`);
    logger.info('');
    logger.info('Images:');
    logger.info(`  Scraped:  ${stats.images.scraped}`);
    logger.info(`  Inserted: ${stats.images.inserted}`);
    logger.info(`  Skipped:  ${stats.images.skipped}`);
    logger.info(`  Failed:   ${stats.images.failed}`);
    
  } catch (error) {
    logger.error(`Scraper failed: ${error.message}`);
    logger.error(error.stack);
  } finally {
    // Close database connection
    if (!options.dryRun) {
      await db.closePool();
    }
    logger.close();
  }
}

// Run the scraper
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
