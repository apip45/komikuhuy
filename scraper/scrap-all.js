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
 *   --start-page <n>    Start from page n (default: 1 or resume)
 *   --end-page <n>      End at page n (default: unlimited)
 *   --resume            Resume from last saved progress
 *   --reset             Reset progress and start from page 1
 *   --skip-chapters     Only scrape comic metadata, skip chapters
 *   --skip-images       Only scrape comics and chapters, skip images
 *   --dry-run           Parse but don't save to database
 *   --help              Show help
 * 
 * Progress is automatically saved after each page.
 * Use --resume to continue from where you left off.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const logger = require('./config/logger');
const db = require('./config/db');
const config = require('./config/scraper.config');

// Progress file path
const PROGRESS_FILE = path.join(__dirname, 'progress-full.json');
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
  resume: false,
  reset: false,
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
  } else if (arg === '--resume') {
    options.resume = true;
  } else if (arg === '--reset') {
    options.reset = true;
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
  --start-page <n>    Start from page n (default: 1 or resume)
  --end-page <n>      End at page n (default: unlimited)
  --resume            Resume from last saved progress
  --reset             Reset progress and start from page 1
  --skip-chapters     Only scrape comic metadata, skip chapters
  --skip-images       Only scrape comics and chapters, skip images
  --dry-run           Parse but don't save to database
  --help              Show help
    `);
    process.exit(0);
  }
}

// =============================================
// Progress Management
// =============================================

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      return data;
    }
  } catch (e) {
    logger.warn(`Failed to load progress: ${e.message}`);
  }
  return null;
}

function saveProgress(page, status = 'in_progress') {
  try {
    const data = {
      lastPage: page,
      status,
      lastUpdated: new Date().toISOString(),
      options: {
        skipChapters: options.skipChapters,
        skipImages: options.skipImages
      }
    };
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.warn(`Failed to save progress: ${e.message}`);
  }
}

function resetProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
      logger.info('Progress reset successfully');
    }
  } catch (e) {
    logger.warn(`Failed to reset progress: ${e.message}`);
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
  const { param, title, thumbnail, description, synopsis, genres, latestChapter, chapters, status, author, comicType } = comicDetail;
  
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
      latestChapter,
      status: status || 'Ongoing',
      author: author || null,
      comicType: comicType || 'Manga'
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
 * Process chapters for a comic - sync all chapters from website
 * This ensures no missing chapters by comparing with database
 */
async function processChapters(comicId, chapters, comicParam) {
  if (options.skipChapters) {
    return { synced: 0, missing: 0 };
  }
  
  if (!comicId) {
    logger.warn(`Cannot process chapters: no comic ID for ${comicParam}`);
    return { synced: 0, missing: 0 };
  }
  
  try {
    // Use syncChapters to find and insert ALL missing chapters
    const syncResult = await ChapterService.syncChapters(comicId, chapters);
    
    stats.chapters.scraped += chapters.length;
    stats.chapters.inserted += syncResult.insertedCount;
    stats.chapters.skipped += syncResult.existingCount;
    
    if (syncResult.missingCount > 0) {
      logger.info(`[${comicParam}] Synced ${syncResult.insertedCount}/${syncResult.missingCount} missing chapters (total: ${syncResult.scrapedCount})`);
    }
    
    // Process images for newly inserted chapters if not skipping
    if (!options.skipImages && syncResult.insertedCount > 0) {
      // Get the newly inserted chapters (they won't have images yet)
      const existingParams = await ChapterService.getParamsByComicId(comicId);
      
      for (const chapter of chapters) {
        if (existingParams.has(chapter.param)) {
          // Get chapter ID and check if it has images
          const chapterData = await ChapterService.getByParam(comicId, chapter.param);
          if (chapterData) {
            const hasImages = await ImageService.hasImages(chapterData.id);
            if (!hasImages) {
              await processChapterImages(chapterData.id, chapter.param);
            }
          }
        }
      }
    }
    
    return syncResult;
    
  } catch (error) {
    logger.error(`Failed to sync chapters for ${comicParam}: ${error.message}`);
    stats.chapters.failed++;
    return { synced: 0, missing: 0, error };
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
  
  // Handle reset option
  if (options.reset) {
    resetProgress();
  }
  
  // Handle resume option - load saved progress
  if (options.resume) {
    const savedProgress = loadProgress();
    if (savedProgress && savedProgress.lastPage) {
      // Resume from NEXT page after last completed
      options.startPage = savedProgress.lastPage + 1;
      logger.info(`Resuming from page ${options.startPage} (last completed: ${savedProgress.lastPage})`);
      logger.info(`Last run: ${savedProgress.lastUpdated}`);
    } else {
      logger.info('No previous progress found, starting from page 1');
    }
  }
  
  logger.info(`Options: ${JSON.stringify(options)}`);
  
  stats.startTime = new Date();
  
  try {
    // Initialize database connection
    if (!options.dryRun) {
      await db.initializePool();
      logger.info('Database connection established');
      
      // Run migrations to ensure schema is up to date
      await db.runMigrations();
    }
    
    // ========================================
    // Phase 1: Scrape Comic List (Page by Page)
    // ========================================
    
    logger.separator('Phase 1: Scrape Comics Page by Page');
    
    let currentPage = options.startPage;
    let hasMorePages = true;
    let totalComicsProcessed = 0;
    
    while (hasMorePages) {
      // Check end page limit
      if (options.endPage > 0 && currentPage > options.endPage) {
        logger.info(`Reached end page limit: ${options.endPage}`);
        break;
      }
      
      logger.separator(`Page ${currentPage}`);
      
      try {
        // Scrape single page
        const pageComics = await ComicListScraper.scrapePage(currentPage);
        
        if (!pageComics || pageComics.length === 0) {
          logger.info(`No comics found on page ${currentPage}, assuming end of list`);
          hasMorePages = false;
          break;
        }
        
        logger.info(`Found ${pageComics.length} comics on page ${currentPage}`);
        
        // Process each comic on this page
        for (let i = 0; i < pageComics.length; i++) {
          const comic = pageComics[i];
          
          try {
            logger.progress('Comics', i + 1, pageComics.length, comic.param);
            
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
            
            totalComicsProcessed++;
            
          } catch (error) {
            logger.error(`Failed to process comic ${comic.param}: ${error.message}`);
            stats.comics.failed++;
          }
        }
        
        // Save progress after successfully completing this page
        if (!options.dryRun) {
          saveProgress(currentPage, 'in_progress');
          logger.info(`Progress saved: completed page ${currentPage}`);
        }
        
        currentPage++;
        
      } catch (pageError) {
        logger.error(`Failed to scrape page ${currentPage}: ${pageError.message}`);
        // Save progress so we can resume from this page
        if (!options.dryRun) {
          saveProgress(currentPage - 1, 'error');
        }
        throw pageError;
      }
    }
    
    // Mark as completed
    if (!options.dryRun) {
      saveProgress(currentPage - 1, 'completed');
    }
    
    // ========================================
    // Summary
    // ========================================
    
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    logger.separator('SCRAPING COMPLETE');
    logger.info(`Total pages processed: ${currentPage - options.startPage}`);
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
