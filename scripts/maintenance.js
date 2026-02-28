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
                    console.log(`\n🔧 Running: ${taskName}...`);
                    await task();
                } else {
                    console.error(`❌ Unknown task: ${taskName}`);
                }
            }

            console.log('\n✅ All tasks completed!');
            process.exit(0);
        } catch (error) {
            console.error('\n❌ Error:', error.message);
            process.exit(1);
        }
    }

    async connectDatabase() {
        if (mongoose.connection.readyState === 0) {
            console.log('📡 Connecting to database...');
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/komikuhuy', {
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 5000
            });
            console.log('✅ Database connected');
        }
    }

    async warmupCache() {
        console.log('🔥 Warming up cache with popular data...');
        
        const KomikCacheService = require('../services/komikCache.service');
        
        try {
            // Warmup trending komik
            console.log('  → Loading trending komik...');
            await KomikCacheService.getTrendingKomik(20);
            
            // Warmup first page of komik list
            console.log('  → Loading first page...');
            await KomikCacheService.getKomikList(1, 20);
            
            // Warmup popular komik details
            const Komik = require('../models/komik.model');
            const popularKomiks = await Komik.find()
                .sort({ views: -1 })
                .limit(10)
                .select('_id')
                .lean();

            console.log(`  → Loading ${popularKomiks.length} popular komik details...`);
            for (const komik of popularKomiks) {
                await KomikCacheService.getKomikDetail(komik._id);
            }

            console.log('✅ Cache warmup completed!');
            
            // Display stats
            const stats = cacheManager.getStats();
            console.log('\n📊 Cache Status:');
            console.log(`  HOT:  ${stats.hot.keys} keys`);
            console.log(`  WARM: ${stats.warm.keys} keys`);
            console.log(`  COLD: ${stats.cold.keys} keys`);
        } catch (error) {
            console.error('❌ Warmup failed:', error.message);
        }
    }

    async rebuildIndexes() {
        console.log('🔨 Rebuilding database indexes...');
        
        try {
            const Komik = require('../models/komik.model');
            const { Chapter } = require('../models/chapter.model');

            // Drop existing indexes (except _id)
            console.log('  → Dropping old indexes...');
            await Komik.collection.dropIndexes();
            await Chapter.collection.dropIndexes();

            // Create new indexes
            console.log('  → Creating Komik indexes...');
            await Promise.all([
                Komik.collection.createIndex({ title: 'text', author: 'text' }),
                Komik.collection.createIndex({ status: 1, createdAt: -1 }),
                Komik.collection.createIndex({ genres: 1 }),
                Komik.collection.createIndex({ views: -1, rating: -1 }),
                Komik.collection.createIndex({ createdAt: -1 })
            ]);

            console.log('  → Creating Chapter indexes...');
            await Promise.all([
                Chapter.collection.createIndex({ komikId: 1, chapterNumber: 1 }, { unique: true }),
                Chapter.collection.createIndex({ komikId: 1, createdAt: -1 }),
                Chapter.collection.createIndex({ isPublished: 1 })
            ]);

            console.log('✅ Indexes rebuilt successfully!');

            // Show indexes
            console.log('\n📋 Current Indexes:');
            const komikIndexes = await Komik.collection.getIndexes();
            console.log('  Komik:', Object.keys(komikIndexes).join(', '));
            
            const chapterIndexes = await Chapter.collection.getIndexes();
            console.log('  Chapter:', Object.keys(chapterIndexes).join(', '));
        } catch (error) {
            console.error('❌ Index rebuild failed:', error.message);
        }
    }

    async clearOldCache() {
        console.log('🗑️  Clearing old cache entries...');
        
        try {
            const statsBefore = cacheManager.getStats();
            
            console.log('  Before:');
            console.log(`    HOT:  ${statsBefore.hot.keys} keys`);
            console.log(`    WARM: ${statsBefore.warm.keys} keys`);
            console.log(`    COLD: ${statsBefore.cold.keys} keys`);

            // Clear all cache
            cacheManager.flushAll();

            const statsAfter = cacheManager.getStats();
            
            console.log('  After:');
            console.log(`    HOT:  ${statsAfter.hot.keys} keys`);
            console.log(`    WARM: ${statsAfter.warm.keys} keys`);
            console.log(`    COLD: ${statsAfter.cold.keys} keys`);

            console.log('✅ Cache cleared!');
        } catch (error) {
            console.error('❌ Cache clear failed:', error.message);
        }
    }

    async checkHealth() {
        console.log('🏥 Performing health check...');
        
        try {
            // Check database
            const dbStatus = mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected';
            console.log(`  Database: ${dbStatus}`);

            // Check cache
            const stats = cacheManager.getStats();
            console.log('  Cache:');
            console.log(`    HOT:  ${stats.hot.keys} keys, ${stats.hot.hits} hits, ${stats.hot.misses} misses`);
            console.log(`    WARM: ${stats.warm.keys} keys, ${stats.warm.hits} hits, ${stats.warm.misses} misses`);
            console.log(`    COLD: ${stats.cold.keys} keys, ${stats.cold.hits} hits, ${stats.cold.misses} misses`);

            // Calculate hit rate
            const totalHits = stats.hot.hits + stats.warm.hits + stats.cold.hits;
            const totalMisses = stats.hot.misses + stats.warm.misses + stats.cold.misses;
            const hitRate = totalHits + totalMisses > 0 
                ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
                : 0;
            
            console.log(`    Overall Hit Rate: ${hitRate}%`);

            // Check memory
            const memory = process.memoryUsage();
            console.log('  Memory:');
            console.log(`    RSS: ${Math.round(memory.rss / 1024 / 1024)}MB`);
            console.log(`    Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
            console.log(`    Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);

            // Check collections
            const Komik = require('../models/komik.model');
            const { Chapter } = require('../models/chapter.model');
            
            const komikCount = await Komik.countDocuments();
            const chapterCount = await Chapter.countDocuments();
            
            console.log('  Collections:');
            console.log(`    Komik: ${komikCount.toLocaleString()} documents`);
            console.log(`    Chapters: ${chapterCount.toLocaleString()} documents`);

            console.log('\n✅ Health check completed!');

            // Warnings
            if (hitRate < 60) {
                console.warn('\n⚠️  WARNING: Cache hit rate is below 60%! Consider:');
                console.warn('    - Increasing TTL values');
                console.warn('    - Warming up cache more frequently');
                console.warn('    - Checking query patterns');
            }

            if (Math.round(memory.heapUsed / 1024 / 1024) > 400) {
                console.warn('\n⚠️  WARNING: High memory usage! Consider:');
                console.warn('    - Reducing max keys per cache tier');
                console.warn('    - Clearing old cache entries');
                console.warn('    - Restarting the application');
            }
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
        }
    }

    async displayCacheStats() {
        console.log('📊 Cache Statistics\n');
        
        try {
            const stats = cacheManager.getStats();
            
            // HOT Cache
            console.log('🔥 HOT Cache (30 min TTL):');
            console.log(`   Keys: ${stats.hot.keys}`);
            console.log(`   Hits: ${stats.hot.hits}`);
            console.log(`   Misses: ${stats.hot.misses}`);
            const hotRate = stats.hot.hits + stats.hot.misses > 0
                ? ((stats.hot.hits / (stats.hot.hits + stats.hot.misses)) * 100).toFixed(2)
                : 0;
            console.log(`   Hit Rate: ${hotRate}%\n`);

            // WARM Cache
            console.log('🌡️  WARM Cache (2 hour TTL):');
            console.log(`   Keys: ${stats.warm.keys}`);
            console.log(`   Hits: ${stats.warm.hits}`);
            console.log(`   Misses: ${stats.warm.misses}`);
            const warmRate = stats.warm.hits + stats.warm.misses > 0
                ? ((stats.warm.hits / (stats.warm.hits + stats.warm.misses)) * 100).toFixed(2)
                : 0;
            console.log(`   Hit Rate: ${warmRate}%\n`);

            // COLD Cache
            console.log('❄️  COLD Cache (24 hour TTL):');
            console.log(`   Keys: ${stats.cold.keys}`);
            console.log(`   Hits: ${stats.cold.hits}`);
            console.log(`   Misses: ${stats.cold.misses}`);
            const coldRate = stats.cold.hits + stats.cold.misses > 0
                ? ((stats.cold.hits / (stats.cold.hits + stats.cold.misses)) * 100).toFixed(2)
                : 0;
            console.log(`   Hit Rate: ${coldRate}%\n`);

            // Overall
            const totalHits = stats.hot.hits + stats.warm.hits + stats.cold.hits;
            const totalMisses = stats.hot.misses + stats.warm.misses + stats.cold.misses;
            const totalKeys = stats.hot.keys + stats.warm.keys + stats.cold.keys;
            const overallRate = totalHits + totalMisses > 0
                ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(2)
                : 0;

            console.log('📈 Overall Statistics:');
            console.log(`   Total Keys: ${totalKeys}`);
            console.log(`   Total Hits: ${totalHits}`);
            console.log(`   Total Misses: ${totalMisses}`);
            console.log(`   Overall Hit Rate: ${overallRate}%`);

            // Memory
            const memory = process.memoryUsage();
            console.log(`\n💾 Memory Usage:`);
            console.log(`   Heap Used: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`);
            console.log(`   Heap Total: ${Math.round(memory.heapTotal / 1024 / 1024)}MB`);
            
            console.log('\n✅ Stats displayed!');
        } catch (error) {
            console.error('❌ Failed to get stats:', error.message);
        }
    }

    showUsage() {
        console.log(`
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
