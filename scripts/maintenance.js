/**
 * Maintenance Scripts for KomikuHuy Caching System
 * 
 * Usage:
 *   node scripts/maintenance.js --warmup-cache
 *   node scripts/maintenance.js --rebuild-indexes
 *   node scripts/maintenance.js --clear-old-cache
 *   node scripts/maintenance.js --check-health
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { cacheManager } = require('../config/productionCache');
const logger = require('../utils/smartLogger');

class MaintenanceScript {
    constructor() {
        this.tasks = {
            'warmup-cache': this.warmupCache.bind(this),
            'rebuild-indexes': this.rebuildIndexes.bind(this),
            'clear-old-cache': this.clearOldCache.bind(this),
            'check-health': this.checkHealth.bind(this),
            'cache-stats': this.displayCacheStats.bind(this)
        };
    }

    async run() {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            this.showUsage();
            return;
        }

        try {
            // Connect to database
            await this.connectDatabase();

            // Run tasks
            for (const arg of args) {
                const taskName = arg.replace(/^--/, '');
                const task = this.tasks[taskName];

                if (task) {
                    logger.info(`\n🔧 Running: ${taskName}...`);
                    await task();
                } else {
                    logger.error(`❌ Unknown task: ${taskName}`);
                }
            }

            logger.info('\n✅ All tasks completed!');
            process.exit(0);
        } catch (error) {
            logger.error('\n❌ Error:', error.message);
            process.exit(1);
        }
    }

    async connectDatabase() {
        if (mongoose.connection.readyState === 0) {
            logger.info('📡 Connecting to database...');
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/komikuhuy', {
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 5000
            });
            logger.info('✅ Database connected');
        }
    }

    async warmupCache() {
        logger.info('🔥 Warming up cache with popular data...');
        
        const KomikCacheService = require('../services/komikCache.service');
        
        try {
            // Warmup trending komik
            logger.info('  → Loading trending komik...');
            await KomikCacheService.getTrendingKomik(20);
            
            // Warmup first page of komik list
            logger.info('  → Loading first page...');
            await KomikCacheService.getKomikList(1, 20);
            
            // Warmup popular komik details
            const Komik = require('../models/komik.model');
            const popularKomiks = await Komik.find()
                .sort({ views: -1 })
                .limit(10)
                .select('_id')
                .lean();

            logger.info(`  → Loading ${popularKomiks.length} popular komik details...`);
            for (const komik of popularKomiks) {
                await KomikCacheService.getKomikDetail(komik._id);
            }

            logger.info('✅ Cache warmup completed!');
            
            // Display stats
            const stats = cacheManager.getStats();
            logger.info('\n📊 Cache Status:');
            logger.info(`  HOT:  ${stats.hot.keys} keys`);
            logger.info(`  WARM: ${stats.warm.keys} keys`);
            logger.info(`  COLD: ${stats.cold.keys} keys`);
        } catch (error) {
            logger.error('❌ Warmup failed:', error.message);
        }
    }

    async rebuildIndexes() {
        logger.info('🔨 Rebuilding database indexes...');
        
        try {
            const Komik = require('../models/komik.model');
            const { Chapter } = require('../models/chapter.model');

            // Drop existing indexes (except _id)
            logger.info('  → Dropping old indexes...');
            await Komik.collection.dropIndexes();
            await Chapter.collection.dropIndexes();

            // Create new indexes
            logger.info('  → Creating Komik indexes...');
            await Promise.all([
                Komik.collection.createIndex({ title: 'text', author: 'text' }),
                Komik.collection.createIndex({ status: 1, createdAt: -1 }),
                Komik.collection.createIndex({ genres: 1 }),
                Komik.collection.createIndex({ views: -1, rating: -1 }),
                Komik.collection.createIndex({ createdAt: -1 })
            ]);

            logger.info('  → Creating Chapter indexes...');
            await Promise.all([
                Chapter.collection.createIndex({ komikId: 1, chapterNumber: 1 }, { unique: true }),
                Chapter.collection.createIndex({ komikId: 1, createdAt: -1 }),
                Chapter.collection.createIndex({ isPublished: 1 })
            ]);

            logger.info('✅ Indexes rebuilt successfully!');

            // Show indexes
            logger.info('\n📋 Current Indexes:');
            const komikIndexes = await Komik.collection.getIndexes();
            logger.info('  Komik:', Object.keys(komikIndexes).join(', '));
            
            const chapterIndexes = await Chapter.collection.getIndexes();
            logger.info('  Chapter:', Object.keys(chapterIndexes).join(', '));
        } catch (error) {
            logger.error('❌ Index rebuild failed:', error.message);
        }
    }

    async clearOldCache() {
        logger.info('🗑️  Clearing old cache entries...');
        
        try {
            const statsBefore = cacheManager.getStats();
            
            logger.info('  Before:');
            logger.info(`    HOT:  ${statsBefore.hot.keys} keys`);
            logger.info(`    WARM: ${statsBefore.warm.keys} keys`);
            logger.info(`    COLD: ${statsBefore.cold.keys} keys`);

            // Clear all cache
            cacheManager.flushAll();

            const statsAfter = cacheManager.getStats();
            
            logger.info('  After:');
            logger.info(`    HOT:  ${statsAfter.hot.keys} keys`);
            logger.info(`    WARM: ${statsAfter.warm.keys} keys`);
            logger.info(`    COLD: ${statsAfter.cold.keys} keys`);

            logger.info('✅ Cache cleared!');
        } catch (error) {
            logger.error('❌ Cache clear failed:', error.message);
        }
    }

    async checkHealth() {
        logger.info('🏥 Performing health check...');
        
        try {
            // Check database
            const dbStatus = mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected';
            logger.info(`  Database: ${dbStatus}`);

            // Check cache
            const stats = cacheManager.getStats();
            logger.info('  Cache:');
            logger.info(`    HOT:  ${stats.hot.keys} keys, ${stats.hot.hits} hits, ${stats.hot.misses} misses`);
            logger.info(`    WARM: ${stats.warm.keys} keys, ${stats.warm.hits} hits, ${stats.warm.misses} misses`);
            logger.info(`    COLD: ${stats.cold.keys} keys, ${stats.cold.hits} hits, ${stats.cold.misses} misses`);

            // Calculate hit rate
            const totalHits = stats.hot.hits + stats.warm.hits + stats.cold.hits;
            const totalMisses = stats.hot.misses + stats.warm.misses + stats.cold.misses;
            const hitRate = totalHits + totalMisses > 0 
                ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
                : 0;
            
            logger.info(`    Overall Hit Rate: ${hitRate}%`);

            // Check memory
            const memory = process.memoryUsage();
            logger.info('  Memory:');
            logger.info(`    RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
            logger.info(`    Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
            logger.info(`    Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);

            // Check collections
            const Komik = require('../models/komik.model');
            const { Chapter } = require('../models/chapter.model');
            
            const komikCount = await Komik.countDocuments();
            const chapterCount = await Chapter.countDocuments();
            
            logger.info('  Collections:');
            logger.info(`    Komik: ${komikCount.toLocaleString()} documents`);
            logger.info(`    Chapters: ${chapterCount.toLocaleString()} documents`);

            logger.info('\n✅ Health check completed!');

            // Warnings
            if (hitRate < 60) {
                logger.warn('\n⚠️  WARNING: Cache hit rate is below 60%! Consider:');
                logger.warn('    - Increasing TTL values');
                logger.warn('    - Warming up cache more frequently');
                logger.warn('    - Checking query patterns');
            }

            if (Math.round(memory.heapUsed / 1024 / 1024) > 400) {
                logger.warn('\n⚠️  WARNING: High memory usage! Consider:');
                logger.warn('    - Reducing max keys per cache tier');
                logger.warn('    - Clearing old cache entries');
                logger.warn('    - Restarting the application');
            }
        } catch (error) {
            logger.error('❌ Health check failed:', error.message);
        }
    }

    async displayCacheStats() {
        logger.info('📊 Cache Statistics\n');
        
        try {
            const stats = cacheManager.getStats();
            
            // HOT Cache
            logger.info('🔥 HOT Cache (30 min TTL):');
            logger.info(`   Keys: ${stats.hot.keys}`);
            logger.info(`   Hits: ${stats.hot.hits}`);
            logger.info(`   Misses: ${stats.hot.misses}`);
            const hotRate = stats.hot.hits + stats.hot.misses > 0
                ? ((stats.hot.hits / (stats.hot.hits + stats.hot.misses)) * 100).toFixed(2)
                : 0;
            logger.info(`   Hit Rate: ${hotRate}%\n`);

            // WARM Cache
            logger.info('🌡️  WARM Cache (2 hour TTL):');
            logger.info(`   Keys: ${stats.warm.keys}`);
            logger.info(`   Hits: ${stats.warm.hits}`);
            logger.info(`   Misses: ${stats.warm.misses}`);
            const warmRate = stats.warm.hits + stats.warm.misses > 0
                ? ((stats.warm.hits / (stats.warm.hits + stats.warm.misses)) * 100).toFixed(2)
                : 0;
            logger.info(`   Hit Rate: ${warmRate}%\n`);

            // COLD Cache
            logger.info('❄️  COLD Cache (24 hour TTL):');
            logger.info(`   Keys: ${stats.cold.keys}`);
            logger.info(`   Hits: ${stats.cold.hits}`);
            logger.info(`   Misses: ${stats.cold.misses}`);
            const coldRate = stats.cold.hits + stats.cold.misses > 0
                ? ((stats.cold.hits / (stats.cold.hits + stats.cold.misses)) * 100).toFixed(2)
                : 0;
            logger.info(`   Hit Rate: ${coldRate}%\n`);

            // Overall
            const totalHits = stats.hot.hits + stats.warm.hits + stats.cold.hits;
            const totalMisses = stats.hot.misses + stats.warm.misses + stats.cold.misses;
            const totalKeys = stats.hot.keys + stats.warm.keys + stats.cold.keys;
            const overallRate = totalHits + totalMisses > 0
                ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
                : 0;

            logger.info('📈 Overall Statistics:');
            logger.info(`   Total Keys: ${totalKeys}`);
            logger.info(`   Total Hits: ${totalHits}`);
            logger.info(`   Total Misses: ${totalMisses}`);
            logger.info(`   Overall Hit Rate: ${overallRate}%`);

            // Memory
            const memory = process.memoryUsage();
            logger.info(`\n💾 Memory Usage:`);
            logger.info(`   Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
            logger.info(`   Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
            
            logger.info('\n✅ Stats displayed!');
        } catch (error) {
            logger.error('❌ Failed to get stats:', error.message);
        }
    }

    showUsage() {
        logger.info(`
╔════════════════════════════════════════════════════════════╗
║         KomikuHuy Cache Maintenance Scripts                ║
╚════════════════════════════════════════════════════════════╝

Usage:
  node scripts/maintenance.js [options]

Options:
  --warmup-cache      Warmup cache with popular data
  --rebuild-indexes   Rebuild all database indexes
  --clear-old-cache   Clear all cache entries
  --check-health      Perform system health check
  --cache-stats       Display cache statistics

Examples:
  node scripts/maintenance.js --warmup-cache
  node scripts/maintenance.js --check-health --cache-stats
  node scripts/maintenance.js --clear-old-cache --warmup-cache

Recommended Schedule:
  Daily:    --check-health
  Weekly:   --clear-old-cache --warmup-cache
  Monthly:  --rebuild-indexes
        `);
    }
}

// Run if called directly
if (require.main === module) {
    const maintenance = new MaintenanceScript();
    maintenance.run();
}

module.exports = MaintenanceScript;
