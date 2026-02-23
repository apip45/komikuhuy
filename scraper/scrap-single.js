#!/usr/bin/env node

/**
 * ===========================================
 * AF-Komik Scraper - Single Comic Scraper
 * ===========================================
 * 
 * Scraper for a single comic by parameter.
 * Useful for scraping specific comics that were missed
 * or for updating specific comic data.
 * 
 * Usage:
 *   node scrap-single.js <comic-param> [options]
 * 
 * Arguments:
 *   comic-param         Comic URL parameter (e.g., "one-piece")
 * 
 * Options:
 *   --skip-chapters     Only scrape comic metadata, skip chapters
 *   --skip-images       Only scrape comics and chapters, skip images
 *   --dry-run           Parse but don't save to database
 *   --help              Show help
 * 
 * Example:
 *   node scrap-single.js one-piece
 *   node scrap-single.js naruto --skip-images
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const logger = require('./config/logger');
const db = require('./config/db');
const config = require('./config/scraper.config');

const { delayBetweenChapters } = require('./utils/delay');

// Scrapers
const ComicDetailScraper = require('./scrapers/comicDetail.scraper');
const ChapterScraper = require('./scrapers/chapter.scraper');

// Services
const ComicService = require('./services/comic.service');
const ChapterService = require('./services/chapter.service');
const ImageService = require('./services/image.service');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  // Show help
  if (args.includes('--help') || args.length === 0) {
    console.log(`
AF-Komik Single Comic Scraper
==============================

Usage: node scrap-single.js <comic-param> [options]

Arguments:
  comic-param         Comic URL parameter (e.g., "one-piece")

Options:
  --skip-chapters     Only scrape comic metadata, skip chapters
  --skip-images       Only scrape comics and chapters, skip images
  --dry-run           Parse but don't save to database
  --help              Show this help

Example:
  node scrap-single.js one-piece
  node scrap-single.js naruto --skip-images
    `);
    process.exit(0);
  }
  
  // Get comic param (first non-flag argument)
  const comicParam = args.find(arg => !arg.startsWith('--'));
  
  if (!comicParam) {
    console.error('Error: Comic parameter is required');
    console.error('Usage: node scrap-single.js <comic-param>');
    process.exit(1);
  }
  
  return {
    comicParam,
    skipChapters: args.includes('--skip-chapters'),
    skipImages: args.includes('--skip-images'),
    dryRun: args.includes('--dry-run')
  };
}

/**
 * Scrape a single comic
 */
async function scrapeSingleComic(comicParam, options = {}) {
  const { skipChapters, skipImages, dryRun } = options;
  
  logger.info('============================================');
  logger.info('Single Comic Scraper Started');
  logger.info(`Comic: ${comicParam}`);
  logger.info(`Options: skipChapters=${skipChapters}, skipImages=${skipImages}, dryRun=${dryRun}`);
  logger.info('============================================');
  
  const stats = {
    comic: { updated: 0, inserted: 0, skipped: 0, failed: 0 },
    chapters: { updated: 0, inserted: 0, skipped: 0, failed: 0 },
    images: { inserted: 0, skipped: 0, failed: 0 }
  };
  
  try {
    // ========================================
    // STEP 1: Scrape Comic Detail
    // ========================================
    
    logger.info(`\n[1/3] Scraping comic detail: ${comicParam}`);
    
    let comicData;
    try {
      comicData = await ComicDetailScraper.scrape(comicParam);
      
      if (!comicData || !comicData.title) {
        logger.error(`Failed to scrape comic: ${comicParam} - No data returned`);
        stats.comic.failed++;
        return stats;
      }
      
      logger.info(`✓ Scraped: ${comicData.title}`);
      logger.info(`  Chapters found: ${comicData.chapters ? comicData.chapters.length : 0}`);
      
    } catch (error) {
      logger.error(`Failed to scrape comic ${comicParam}: ${error.message}`);
      stats.comic.failed++;
      return stats;
    }
    
    // ========================================
    // STEP 2: Save Comic to Database
    // ========================================
    
    let comicId;
    
    if (!dryRun) {
      try {
        const existingComic = await ComicService.getByParam(comicParam);
        
        if (existingComic) {
          // Update existing comic
          await ComicService.update(comicParam, {
            title: comicData.title,
            thumbnail: comicData.thumbnail,
            description: comicData.description,
            synopsis: comicData.synopsis,
            genres: comicData.genres,
            latest_chapter: comicData.latestChapter,
            status: comicData.status,
            author: comicData.author,
            comic_type: comicData.type,
            last_scraped: new Date()
          });
          
          comicId = existingComic.id;
          stats.comic.updated++;
          logger.info(`✓ Updated comic in database (ID: ${comicId})`);
          
        } else {
          // Insert new comic
          comicId = await ComicService.insert({
            param: comicParam,
            title: comicData.title,
            thumbnail: comicData.thumbnail,
            description: comicData.description,
            synopsis: comicData.synopsis,
            genres: comicData.genres,
            latest_chapter: comicData.latestChapter,
            status: comicData.status,
            author: comicData.author,
            comic_type: comicData.type,
            last_scraped: new Date()
          });
          
          stats.comic.inserted++;
          logger.info(`✓ Inserted new comic to database (ID: ${comicId})`);
        }
        
      } catch (error) {
        logger.error(`Failed to save comic to database: ${error.message}`);
        stats.comic.failed++;
        return stats;
      }
    } else {
      logger.info('[DRY RUN] Would save comic to database');
      comicId = 1; // Dummy ID for dry run
    }
    
    // ========================================
    // STEP 3: Scrape Chapters (if not skipped)
    // ========================================
    
    if (skipChapters) {
      logger.info('\n[2/3] Skipping chapters (--skip-chapters)');
    } else if (!comicData.chapters || comicData.chapters.length === 0) {
      logger.info('\n[2/3] No chapters found for this comic');
    } else {
      logger.info(`\n[2/3] Processing ${comicData.chapters.length} chapters`);
      
      for (let i = 0; i < comicData.chapters.length; i++) {
        const chapterInfo = comicData.chapters[i];
        const chapterNum = i + 1;
        
        logger.info(`\n  [${chapterNum}/${comicData.chapters.length}] ${chapterInfo.label} (${chapterInfo.param})`);
        
        try {
          // Check if chapter already exists
          if (!dryRun) {
            const existingChapter = await ChapterService.getByParam(comicId, chapterInfo.param);
            
            if (existingChapter) {
              stats.chapters.skipped++;
              logger.info(`    ↷ Chapter already exists, skipping`);
              
              // If skip-images is enabled, we still skip chapter scraping completely
              if (skipImages) {
                continue;
              }
              
              // Check if images exist for this chapter
              const existingImages = await ImageService.getByChapterId(existingChapter.id);
              if (existingImages && existingImages.length > 0) {
                stats.images.skipped += existingImages.length;
                logger.info(`    ↷ Chapter has ${existingImages.length} images, skipping`);
                continue;
              }
              
              // If no images, continue to scrape them
              logger.info(`    ⚠ Chapter exists but has no images, scraping...`);
            }
          }
          
          // Scrape chapter images
          let chapterData;
          try {
            chapterData = await ChapterScraper.scrape(chapterInfo.param);
            
            if (!chapterData || !chapterData.images || chapterData.images.length === 0) {
              logger.warn(`    ⚠ No images found for chapter ${chapterInfo.param}`);
              stats.chapters.failed++;
              continue;
            }
            
            logger.info(`    ✓ Scraped ${chapterData.images.length} images`);
            
          } catch (error) {
            logger.error(`    ✗ Failed to scrape chapter: ${error.message}`);
            stats.chapters.failed++;
            continue;
          }
          
          // Save chapter to database
          let chapterId;
          
          if (!dryRun) {
            try {
              const existingChapter = await ChapterService.getByParam(comicId, chapterInfo.param);
              
              if (existingChapter) {
                chapterId = existingChapter.id;
                logger.info(`    ↷ Using existing chapter (ID: ${chapterId})`);
              } else {
                chapterId = await ChapterService.insert({
                  komik_id: comicId,
                  param: chapterInfo.param,
                  chapter_label: chapterInfo.label,
                  release_date: chapterInfo.releaseDate || new Date()
                });
                
                stats.chapters.inserted++;
                logger.info(`    ✓ Inserted chapter (ID: ${chapterId})`);
              }
              
            } catch (error) {
              logger.error(`    ✗ Failed to save chapter: ${error.message}`);
              stats.chapters.failed++;
              continue;
            }
          } else {
            logger.info(`    [DRY RUN] Would save chapter and ${chapterData.images.length} images`);
            stats.chapters.inserted++;
            stats.images.inserted += chapterData.images.length;
            continue;
          }
          
          // Save images (if not skipped)
          if (!skipImages && chapterData.images && chapterData.images.length > 0) {
            try {
              // Check if images already exist
              const existingImages = await ImageService.getByChapterId(chapterId);
              
              if (existingImages && existingImages.length > 0) {
                stats.images.skipped += existingImages.length;
                logger.info(`    ↷ Chapter already has ${existingImages.length} images, skipping`);
              } else {
                // Insert all images
                await ImageService.bulkInsert(chapterId, chapterData.images);
                stats.images.inserted += chapterData.images.length;
                logger.info(`    ✓ Inserted ${chapterData.images.length} images`);
              }
              
            } catch (error) {
              logger.error(`    ✗ Failed to save images: ${error.message}`);
              stats.images.failed += chapterData.images.length;
            }
          }
          
          // Delay between chapters to avoid rate limiting
          if (chapterNum < comicData.chapters.length) {
            await delayBetweenChapters();
          }
          
        } catch (error) {
          logger.error(`    ✗ Error processing chapter: ${error.message}`);
          stats.chapters.failed++;
        }
      }
    }
    
    // ========================================
    // Final Summary
    // ========================================
    
    logger.info('\n============================================');
    logger.info('Single Comic Scraper Completed');
    logger.info('============================================');
    logger.info(`Comic: ${comicData.title} (${comicParam})`);
    logger.info(`\nStatistics:`);
    logger.info(`  Comics:   inserted=${stats.comic.inserted}, updated=${stats.comic.updated}, failed=${stats.comic.failed}`);
    logger.info(`  Chapters: inserted=${stats.chapters.inserted}, skipped=${stats.chapters.skipped}, failed=${stats.chapters.failed}`);
    logger.info(`  Images:   inserted=${stats.images.inserted}, skipped=${stats.images.skipped}, failed=${stats.images.failed}`);
    logger.info('============================================');
    
    return stats;
    
  } catch (error) {
    logger.error(`Fatal error in single comic scraper: ${error.message}`);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  
  try {
    await scrapeSingleComic(options.comicParam, options);
    process.exit(0);
  } catch (error) {
    logger.error(`Scraper failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use as module
module.exports = { scrapeSingleComic };
