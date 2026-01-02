#!/usr/bin/env node

/**
 * ===========================================
 * AF-Komik Scraper - Latest/Periodic Scrape
 * ===========================================
 * 
 * Periodic scraper for updating the database.
 * Only scrapes latest updates and new chapters.
 * 
 * Usage:
 *   node scrap-latest.js [options]
 * 
 * Options:
 *   --pages <n>         Number of pages to scan (default: 10)
 *   --limit <n>         Maximum comics to process (default: 100)
 *   --skip-images       Only update chapters, skip image scraping
 *   --dry-run           Parse but don't save to database
 *   --help              Show help
 * 
 * Recommended: Run this script every 1-6 hours via cron
 * Example cron: 0 0,6,12,18 * * * cd /path/to/scraper && node scrap-latest.js
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
  pages: config.limits.latestPageLimit,
  limit: config.limits.latestComicLimit,
  skipImages: false,
  dryRun: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--pages' && args[i + 1]) {
    options.pages = parseInt(args[++i]) || 10;
  } else if (arg === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[++i]) || 100;
  } else if (arg === '--skip-images') {
    options.skipImages = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--help') {
    console.log(`
AF-Komik Periodic Scraper

Usage:
  node scrap-latest.js [options]

Options:
  --pages <n>         Number of pages to scan (default: ${config.limits.latestPageLimit})
  --limit <n>         Maximum comics to process (default: ${config.limits.latestComicLimit})
  --skip-images       Only update chapters, skip image scraping
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
    scanned: 0,
    updated: 0,
    newChapters: 0,
    failed: 0
  },
  chapters: {
    new: 0,
    skipped: 0,
    failed: 0
  },
  images: {
    inserted: 0,
    failed: 0
  }
};

// =============================================
// Main Functions
// =============================================

/**
 * Process new chapters for a comic
 */
async function processNewChapters(comicId, chapters, comicParam) {
  if (!comicId) return 0;
  
  // Get existing chapter params
  const existingParams = await ChapterService.getParamsByComicId(comicId);
  
  // Find new chapters (not in database)
  const newChapters = chapters.filter(ch => !existingParams.has(ch.param));
  
  if (newChapters.length === 0) {
    return 0;
  }
  
  logger.info(`Found ${newChapters.length} new chapters for ${comicParam}`);
  
  let insertedCount = 0;
  
  for (const chapter of newChapters) {
    try {
      if (options.dryRun) {
        logger.debug(`[DRY RUN] Would insert chapter: ${chapter.label}`);
        insertedCount++;
        continue;
      }
      
      // Insert chapter
      const result = await ChapterService.insert({
        comicId,
        param: chapter.param,
        label: chapter.label,
        releaseDate: chapter.releaseDate
      });
      
      if (result.insertId) {
        insertedCount++;
        stats.chapters.new++;
        
        // Scrape images for new chapter
        if (!options.skipImages) {
          await processChapterImages(result.insertId, chapter.param);
        }
      }
      
      // Small delay between chapters
      await delayBetweenChapters();
      
    } catch (error) {
      logger.warn(`Failed to insert chapter ${chapter.param}: ${error.message}`);
      stats.chapters.failed++;
    }
  }
  
  return insertedCount;
}

/**
 * Scrape and save images for a chapter
 */
async function processChapterImages(chapterId, chapterParam) {
  if (options.skipImages || options.dryRun) {
    return;
  }
  
  try {
    // Scrape images
    const chapterData = await ChapterScraper.scrape(chapterParam);
    
    if (chapterData.images.length === 0) {
      logger.warn(`No images found for ${chapterParam}`);
      return;
    }
    
    // Save to database
    const result = await ImageService.bulkInsert(chapterId, chapterData.images);
    stats.images.inserted += result.inserted;
    
    logger.debug(`Saved ${result.inserted} images for ${chapterParam}`);
    
  } catch (error) {
    logger.warn(`Failed to process images for ${chapterParam}: ${error.message}`);
    stats.images.failed++;
  }
}

/**
 * Check and update a single comic
 */
async function updateComic(comic) {
  try {
    // Get existing comic from database
    const existing = await ComicService.getByParam(comic.param);
    
    // Scrape fresh details
    const detail = await ComicDetailScraper.scrape(comic.param);
    
    if (existing) {
      // Comic exists - check for new chapters
      const newChapterCount = await processNewChapters(
        existing.id, 
        detail.chapters, 
        comic.param
      );
      
      // Update comic metadata if latest chapter changed
      if (detail.latestChapter && detail.latestChapter !== existing.latest_chapter) {
        if (!options.dryRun) {
          await ComicService.update(comic.param, {
            latestChapter: detail.latestChapter,
            thumbnail: detail.thumbnail
          });
        }
        stats.comics.updated++;
      }
      
      if (newChapterCount > 0) {
        stats.comics.newChapters++;
      }
      
    } else {
      // New comic - insert everything
      logger.info(`New comic found: ${detail.title}`);
      
      if (!options.dryRun) {
        const result = await ComicService.insert({
          param: detail.param,
          title: detail.title,
          thumbnail: detail.thumbnail,
          description: detail.description,
          synopsis: detail.synopsis,
          genres: detail.genres,
          latestChapter: detail.latestChapter
        });
        
        if (result.insertId) {
          // Insert all chapters for new comic
          for (const chapter of detail.chapters) {
            try {
              const chResult = await ChapterService.insert({
                comicId: result.insertId,
                param: chapter.param,
                label: chapter.label,
                releaseDate: chapter.releaseDate
              });
              
              if (chResult.insertId && !options.skipImages) {
                await processChapterImages(chResult.insertId, chapter.param);
              }
              
              stats.chapters.new++;
              await delayBetweenChapters();
              
            } catch (error) {
              stats.chapters.failed++;
            }
          }
          
          stats.comics.updated++;
          stats.comics.newChapters++;
        }
      }
    }
    
    stats.comics.scanned++;
    
  } catch (error) {
    logger.warn(`Failed to update comic ${comic.param}: ${error.message}`);
    stats.comics.failed++;
  }
}

// =============================================
// Main Execution
// =============================================

async function main() {
  logger.separator('AF-KOMIK PERIODIC SCRAPER');
  logger.info('Starting periodic update...');
  logger.info(`Options: pages=${options.pages}, limit=${options.limit}, dryRun=${options.dryRun}`);
  
  stats.startTime = new Date();
  
  try {
    // Initialize database connection
    if (!options.dryRun) {
      await db.initializePool();
      logger.info('Database connection established');
    }
    
    // ========================================
    // Phase 1: Get Latest Comics
    // ========================================
    
    logger.separator('Phase 1: Scanning Latest Updates');
    
    const latestComics = await ComicListScraper.scrapeLatest(options.pages);
    
    // Apply limit
    const comicsToProcess = latestComics.slice(0, options.limit);
    
    logger.info(`Found ${latestComics.length} comics, processing ${comicsToProcess.length}`);
    
    // ========================================
    // Phase 2: Update Comics
    // ========================================
    
    logger.separator('Phase 2: Updating Comics');
    
    const total = comicsToProcess.length;
    
    for (let i = 0; i < total; i++) {
      const comic = comicsToProcess[i];
      
      logger.progress('Update', i + 1, total, comic.param);
      
      await updateComic(comic);
      
      // Delay between comics
      if (i < total - 1) {
        await delayBetweenComics();
      }
    }
    
    // ========================================
    // Phase 3: Summary
    // ========================================
    
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    logger.separator('UPDATE COMPLETE');
    logger.info(`Duration: ${Math.round(duration)} seconds`);
    logger.info('');
    logger.info('Comics:');
    logger.info(`  Scanned:      ${stats.comics.scanned}`);
    logger.info(`  Updated:      ${stats.comics.updated}`);
    logger.info(`  With New Ch:  ${stats.comics.newChapters}`);
    logger.info(`  Failed:       ${stats.comics.failed}`);
    logger.info('');
    logger.info('Chapters:');
    logger.info(`  New:          ${stats.chapters.new}`);
    logger.info(`  Skipped:      ${stats.chapters.skipped}`);
    logger.info(`  Failed:       ${stats.chapters.failed}`);
    logger.info('');
    logger.info('Images:');
    logger.info(`  Inserted:     ${stats.images.inserted}`);
    logger.info(`  Failed:       ${stats.images.failed}`);
    
    // Exit with error if too many failures
    const totalFailures = stats.comics.failed + stats.chapters.failed + stats.images.failed;
    if (totalFailures > total * 0.5) {
      logger.warn('High failure rate detected - check website accessibility');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error(`Scraper failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
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
