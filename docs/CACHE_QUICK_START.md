# Cache System - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install Dependencies

```bash
npm install node-cache opossum compression helmet express-rate-limit
```

### 2. Create Cache Configuration

```javascript
// config/productionCache.js
const NodeCache = require('node-cache');
const EventEmitter = require('events');

class ProductionCacheManager extends EventEmitter {
    constructor() {
        super();
        
        this.hotCache = new NodeCache({
            stdTTL: 1800,      // 30 min
            maxKeys: 50,
            useClones: false
        });

        this.warmCache = new NodeCache({
            stdTTL: 7200,      // 2 hours
            maxKeys: 200,
            useClones: false
        });

        this.coldCache = new NodeCache({
            stdTTL: 86400,     // 24 hours
            maxKeys: 150,
            useClones: false
        });

        this.startHealthMonitoring();
    }

    get(key, tier = 'warm') {
        const cache = this[`${tier}Cache`];
        return cache?.get(key);
    }

    set(key, value, tier = 'warm', ttl = null) {
        const cache = this[`${tier}Cache`];
        if (!cache) return false;
        return ttl ? cache.set(key, value, ttl) : cache.set(key, value);
    }

    delete(key) {
        [this.hotCache, this.warmCache, this.coldCache].forEach(cache => {
            cache.del(key);
        });
    }

    clearByPattern(pattern) {
        let cleared = 0;
        [this.hotCache, this.warmCache, this.coldCache].forEach(cache => {
            const keys = cache.keys();
            keys.forEach(key => {
                if (key.includes(pattern)) {
                    cache.del(key);
                    cleared++;
                }
            });
        });
        return cleared;
    }

    getStats() {
        return {
            hot: this.hotCache.getStats(),
            warm: this.warmCache.getStats(),
            cold: this.coldCache.getStats()
        };
    }

    startHealthMonitoring() {
        setInterval(() => {
            const used = process.memoryUsage();
            const heapUsed = Math.round(used.heapUsed / 1024 / 1024);

            if (heapUsed > 400) {
                console.warn('⚠️ High memory! Clearing cold cache...');
                this.coldCache.flushAll();
            }
        }, 300000); // Every 5 minutes
    }

    flushAll() {
        this.hotCache.flushAll();
        this.warmCache.flushAll();
        this.coldCache.flushAll();
    }
}

const cacheManager = new ProductionCacheManager();
module.exports = { cacheManager };
```

### 3. Create Cache Service

```javascript
// services/komikCache.service.js
const { cacheManager } = require('../config/productionCache');
const Circuit = require('opossum');

class KomikCacheService {
    constructor() {
        this.dbCircuit = new Circuit(this.loadFromDB.bind(this), {
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
        });
    }

    async getKomikList(page = 1, limit = 20) {
        const cacheKey = `list:${page}:${limit}`;
        
        // Try cache
        let data = cacheManager.get(cacheKey, 'warm');
        if (data) return { ...data, fromCache: true };

        // Load from DB
        data = await this.dbCircuit.fire('list', { page, limit });
        
        // Cache 5 minutes
        cacheManager.set(cacheKey, data, 'warm', 300);
        
        return { ...data, fromCache: false };
    }

    async getKomikDetail(komikId) {
        const cacheKey = `detail:${komikId}`;
        
        let data = cacheManager.get(cacheKey, 'warm');
        if (data) return { ...data, fromCache: true };

        data = await this.dbCircuit.fire('detail', { komikId });
        
        // Cache 30 minutes
        cacheManager.set(cacheKey, data, 'warm', 1800);
        
        return { ...data, fromCache: false };
    }

    async getChapter(komikId, chapterNumber) {
        const cacheKey = `chapter:${komikId}:${chapterNumber}`;
        
        let data = cacheManager.get(cacheKey, 'cold');
        if (data) return { ...data, fromCache: true };

        data = await this.dbCircuit.fire('chapter', { komikId, chapterNumber });
        
        // Cache 2 hours for published chapters
        const ttl = data.isPublished ? 7200 : 1800;
        cacheManager.set(cacheKey, data, 'cold', ttl);
        
        return { ...data, fromCache: false };
    }

    async loadFromDB(type, params) {
        const Komik = require('../models/komik.model');
        const { Chapter } = require('../models/chapter.model');

        switch (type) {
            case 'list':
                const { page, limit } = params;
                const skip = (page - 1) * limit;
                
                const [data, total] = await Promise.all([
                    Komik.find()
                        .select('title thumbnail author rating status')
                        .skip(skip)
                        .limit(limit)
                        .lean(),
                    Komik.countDocuments()
                ]);

                return { data, pagination: { page, limit, total } };

            case 'detail':
                const komik = await Komik.findById(params.komikId).lean();
                const chapters = await Chapter.find({ komikId: params.komikId })
                    .select('chapterNumber title')
                    .limit(50)
                    .lean();
                
                return { ...komik, chapters };

            case 'chapter':
                return await Chapter.findOne({
                    komikId: params.komikId,
                    chapterNumber: params.chapterNumber
                }).lean();

            default:
                throw new Error('Invalid type');
        }
    }

    invalidateKomik(komikId) {
        cacheManager.clearByPattern(`detail:${komikId}`);
        cacheManager.clearByPattern(`chapter:${komikId}`);
        cacheManager.clearByPattern('list:');
    }
}

module.exports = new KomikCacheService();
```

### 4. Update Routes

```javascript
// routes/komik.routes.js
const express = require('express');
const router = express.Router();
const KomikCacheService = require('../services/komikCache.service');

router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const result = await KomikCacheService.getKomikList(page, limit);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await KomikCacheService.getKomikDetail(req.params.id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/:id/chapter/:chapterNumber', async (req, res) => {
    try {
        const { id, chapterNumber } = req.params;
        const result = await KomikCacheService.getChapter(id, parseInt(chapterNumber));
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

### 5. Add Health Check

```javascript
// routes/health.routes.js
const express = require('express');
const router = express.Router();
const { cacheManager } = require('../config/productionCache');

router.get('/health', (req, res) => {
    const stats = cacheManager.getStats();
    const memory = process.memoryUsage();
    
    res.json({
        status: 'healthy',
        cache: {
            hot: { keys: stats.hot.keys, hits: stats.hot.hits },
            warm: { keys: stats.warm.keys, hits: stats.warm.hits },
            cold: { keys: stats.cold.keys, hits: stats.cold.hits }
        },
        memory: {
            heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB'
        }
    });
});

router.post('/clear-cache', (req, res) => {
    cacheManager.flushAll();
    res.json({ success: true, message: 'Cache cleared' });
});

module.exports = router;
```

### 6. Update Server

```javascript
// server.js
const express = require('express');
const compression = require('compression');
const app = express();

app.use(compression());
app.use(express.json());

app.use('/api/health', require('./routes/health.routes'));
app.use('/api/komik', require('./routes/komik.routes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
```

### 7. Environment Variables

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/komikuhuy
```

## 📊 Usage Examples

### Check Health

```bash
curl http://localhost:3000/api/health
```

### Get Komik List (Cached)

```bash
curl http://localhost:3000/api/komik?page=1&limit=20
```

### Get Komik Detail (Cached)

```bash
curl http://localhost:3000/api/komik/123
```

### Clear Cache

```bash
curl -X POST http://localhost:3000/api/health/clear-cache
```

## 🎯 Cache Strategy Cheat Sheet

| Endpoint | Cache Tier | TTL | When to Invalidate |
|----------|-----------|-----|-------------------|
| `/api/komik` (list) | WARM | 5 min | On any komik update |
| `/api/komik/:id` (detail) | WARM | 30 min | On specific komik update |
| `/api/komik/:id/chapter/:num` | COLD | 2-24 hours | On chapter update |
| `/api/trending` | HOT | 30 min | Scheduled (every 30 min) |

## ⚡ Quick Commands

```bash
# Start server
npm start

# Check cache stats
curl http://localhost:3000/api/health

# Clear all cache
curl -X POST http://localhost:3000/api/health/clear-cache

# Monitor memory
node -e "console.log(process.memoryUsage())"

# Production with PM2
pm2 start server.js --name komikuhuy --max-memory-restart 512M
pm2 monit
```

## 🔍 Troubleshooting

**High Memory?**
```bash
# Clear cache manually
curl -X POST http://localhost:3000/api/health/clear-cache

# Restart with PM2
pm2 restart komikuhuy
```

**Low Cache Hit Rate?**
```javascript
// Check stats
const stats = cacheManager.getStats();
console.log('Hit Rate:', stats.warm.hits / (stats.warm.hits + stats.warm.misses));

// Increase TTL if needed
cacheManager.set(key, data, 'warm', 3600); // 1 hour
```

**Circuit Breaker Open?**
```bash
# Check database connection
mongo komikuhuy --eval "db.serverStatus()"

# The circuit will auto-reset after 30 seconds
```

## 📖 Full Documentation

See [CACHING_SYSTEM.md](./CACHING_SYSTEM.md) for complete documentation.

---

**Setup Time:** ~5 minutes  
**Expected Performance:** 80%+ cache hit rate, <100ms response time  
**Memory Usage:** <400MB on 1GB RAM VPS
