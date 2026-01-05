#!/usr/bin/env node

/**
 * ===========================================
 * AF-Komik Scraper - Fix Missing Chapters
 * ===========================================
 * 
 * Scans all comics in database and fixes missing chapters.
 * Compares website chapter list with database and syncs differences.
 * 
 * Usage:
 *   node fix-chapters.js [options]
 * 
 * Options:
 *   --limit <n>         Maximum comics to check (default: all)
 *   --comic <param>     Fix specific comic by param
 *   --skip-images       Don't scrape images for new chapters
 *   --dry-run           Show what would be fixed without making changes
 *   --help              Show help
 * 
 * This script is designed to fix incomplete chapter data
 * caused by previous scraping issues.
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const logger = require('./config/logger');
const db = require('./config/db');
const { delayBetweenComics, delayBetweenChapters } = require('./utils/delay');

// Scrapers
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
  limit: 0, // 0 = all
  comicParam: null,
  skipImages: false,
  dryRun: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--limit' && args[i + 1]) {
    options.limit = parseInt(args[++i]) || 0;
  } else if (arg === '--comic' && args[i + 1]) {
    options.comicParam = args[++i];
  } else if (arg === '--skip-images') {
    options.skipImages = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--help') {
    console.log(`
AF-Komik Fix Missing Chapters

Usage:
  node fix-chapters.js [options]

Options:
  --limit <n>         Maximum comics to check (default: all)
  --comic <param>     Fix specific comic by param
  --skip-images       Don't scrape images for new chapters
  --dry-run           Show what would be fixed without making changes
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
  comicsChecked: 0,
  comicsWithMissing: 0,
  chaptersFound: 0,
  chaptersInserted: 0,
  chaptersFailed: 0,
  imagesInserted: 0
};

// =============================================
// Processing Functions
// =============================================

/**
 * Fix chapters for a single comic
 */
async function fixComicChapters(comic) {
  const { id, param, title } = comic;
  
  try {
    // Scrape comic detail to get full chapter list
    const detail = await ComicDetailScraper.scrape(param);
    
    if (!detail || !detail.chapters || detail.chapters.length === 0) {
      logger.warn(`No chapters found on website for ${param}`);
      return { missing: 0, inserted: 0 };
    }
    
    // Get existing chapters from database
    const existingParams = await ChapterService.getParamsByComicId(id);
    const existingCount = existingParams.size;
    const scrapedCount = detail.chapters.length;
    
    // Find missing chapters
    const missingChapters = detail.chapters.filter(ch => !existingParams.has(ch.param));
    
    if (missingChapters.length === 0) {
      logger.debug(`[${param}] Complete: ${existingCount}/${scrapedCount} chapters`);
      return { missing: 0, inserted: 0 };
    }
    
    stats.comicsWithMissing++;
    stats.chaptersFound += missingChapters.length;
    
    logger.info(`[${param}] Found ${missingChapters.length} missing chapters (DB: ${existingCount}, Web: ${scrapedCount})`);
    
    // Log which chapters are missing
    const missingLabels = missingChapters.map(ch => ch.label).slice(0, 10);
    logger.info(`  Missing: ${missingLabels.join(', ')}${missingChapters.length > 10 ? '...' : ''}`);
    
    if (options.dryRun) {
      return { missing: missingChapters.length, inserted: 0 };
    }
    
    // Insert missing chapters
    let insertedCount = 0;
    
    for (const chapter of missingChapters) {
      try {
        const result = await ChapterService.insert({
          comicId: id,
          param: chapter.param,
          label: chapter.label,
          releaseDate: chapter.releaseDate
        });
        
        if (result.insertId) {
          insertedCount++;
          stats.chaptersInserted++;
          
          // Scrape images for new chapter
          if (!options.skipImages) {
            try {
              const chapterData = await ChapterScraper.scrape(chapter.param);
              if (chapterData.images && chapterData.images.length > 0) {
                const imgResult = await ImageService.bulkInsert(result.insertId, chapterData.images);
                stats.imagesInserted += imgResult.inserted;
              }
              await delayBetweenChapters();
            } catch (imgErr) {
              logger.warn(`Failed to scrape images for ${chapter.param}: ${imgErr.message}`);
            }
          }
        }
      } catch (err) {
        logger.warn(`Failed to insert chapter ${chapter.param}: ${err.message}`);
        stats.chaptersFailed++;
      }
    }
    
    logger.info(`  Inserted: ${insertedCount}/${missingChapters.length} chapters`);
    
    return { missing: missingChapters.length, inserted: insertedCount };
    
  } catch (error) {
    logger.error(`Failed to fix chapters for ${param}: ${error.message}`);
    return { missing: 0, inserted: 0, error };
  }
}

// =============================================
// Main Execution
// =============================================

async function main() {
  logger.separator('AF-KOMIK FIX MISSING CHAPTERS');
  logger.info('Scanning for missing chapters...');
  logger.info(`Options: ${JSON.stringify(options)}`);
  
  stats.startTime = new Date();
  
  try {
    // Initialize database connection
    await db.initializePool();
    logger.info('Database connection established');
    
    let comics = [];
    
    if (options.comicParam) {
      // Fix specific comic
      const comic = await ComicService.getByParam(options.comicParam);
      if (!comic) {
        logger.error(`Comic not found: ${options.comicParam}`);
        return;
      }
      comics = [comic];
    } else {
      // Get all comics (or limited)
      const sql = options.limit > 0
        ? 'SELECT id, param, title, status FROM komik ORDER BY id ASC LIMIT ?'
        : 'SELECT id, param, title, status FROM komik ORDER BY id ASC';
      
      comics = options.limit > 0
        ? await db.query(sql, [options.limit])
        : await db.query(sql);
    }
    
    logger.info(`Checking ${comics.length} comics for missing chapters...`);
    logger.separator('Processing');
    
    for (let i = 0; i < comics.length; i++) {
      const comic = comics[i];
      
      logger.progress('Comics', i + 1, comics.length, comic.param);
      stats.comicsChecked++;
      
      await fixComicChapters(comic);
      
      // Delay between comics
      await delayBetweenComics();
    }
    
    // ========================================
    // Summary
    // ========================================
    
    stats.endTime = new Date();
    const duration = (stats.endTime - stats.startTime) / 1000;
    
    logger.separator('FIX COMPLETE');
    logger.info(`Duration: ${Math.round(duration / 60)} minutes`);
    logger.info('');
    logger.info('Summary:');
    logger.info(`  Comics Checked:      ${stats.comicsChecked}`);
    logger.info(`  Comics with Missing: ${stats.comicsWithMissing}`);
    logger.info(`  Chapters Found:      ${stats.chaptersFound}`);
    logger.info(`  Chapters Inserted:   ${stats.chaptersInserted}`);
    logger.info(`  Chapters Failed:     ${stats.chaptersFailed}`);
    logger.info(`  Images Inserted:     ${stats.imagesInserted}`);
    
    if (options.dryRun) {
      logger.info('');
      logger.info('[DRY RUN] No changes were made to the database');
    }
    
  } catch (error) {
    logger.error(`Fix failed: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await db.closePool();
    logger.close();
  }
}

// Run the fixer
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
