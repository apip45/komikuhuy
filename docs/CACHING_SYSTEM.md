# KomikuHuy Caching System Documentation

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Guide](#implementation-guide)
4. [Configuration](#configuration)
5. [API Documentation](#api-documentation)
6. [Cache Strategy](#cache-strategy)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Performance Optimization](#performance-optimization)

---

## Overview

### Purpose

Sistem caching multi-layer untuk aplikasi KomikuHuy yang dirancang untuk:
- Mengurangi beban database (13M+ records)
- Meningkatkan response time (target < 100ms)
- Optimasi penggunaan RAM (target < 400MB pada VPS 1GB)
- Mendukung 100+ concurrent users

### Key Features

- ✅ **Multi-tier Caching** (HOT/WARM/COLD)
- ✅ **Circuit Breaker Pattern** untuk database protection
- ✅ **Intelligent Prefetching** untuk adjacent chapters
- ✅ **Automatic Cache Invalidation** saat data update
- ✅ **Stale Cache Fallback** untuk reliability
- ✅ **Memory Usage Monitoring** dengan auto-cleanup
- ✅ **Cache Statistics & Analytics**

### Technology Stack

- **Cache Library**: node-cache (in-memory)
- **Circuit Breaker**: opossum
- **Database**: MongoDB with optimized indexes
- **Compression**: compression middleware
- **Rate Limiting**: express-rate-limit

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                        │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────▼──────────┐
         │   Rate Limiter       │  ← 100 req/min per IP
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────┐
         │   HOT Cache Layer    │  ← Trending, Popular (30 min)
         │   TTL: 30 minutes    │     Memory: ~10-20MB
         │   Max Keys: 50       │
         └───────────┬──────────┘
                     │ Cache Miss
         ┌───────────▼──────────┐
         │  WARM Cache Layer    │  ← List, Detail (30 min - 2 hours)
         │   TTL: 2 hours       │     Memory: ~50-100MB
         │   Max Keys: 200      │
         └───────────┬──────────┘
                     │ Cache Miss
         ┌───────────▼──────────┐
         │  COLD Cache Layer    │  ← Chapters, Images (24 hours)
         │   TTL: 24 hours      │     Memory: ~50-100MB
         │   Max Keys: 150      │
         └───────────┬──────────┘
                     │ Cache Miss
         ┌───────────▼──────────┐
         │  Circuit Breaker     │  ← Protect database from overload
         │   Timeout: 5s        │
         │   Error Threshold: 50%│
         └───────────┬──────────┘
                     │
         ┌───────────▼──────────┐
         │   Database Query     │  ← MongoDB with indexes
         │   (+File Storage)    │
         └──────────────────────┘
```

### Cache Tier Details

| Tier | Use Case | TTL | Max Keys | Memory | Priority |
|------|----------|-----|----------|--------|----------|
| **HOT** | Trending/Popular data | 30 min | 50 | ~20MB | Highest |
| **WARM** | List, Detail, Metadata | 30 min - 2 hours | 200 | ~100MB | High |
| **COLD** | Published chapters, Images | 2 - 24 hours | 150 | ~100MB | Medium |

### Data Flow

```
Request Flow:
  1. Client Request → Rate Limiter
  2. Check HOT cache → Hit? Return
  3. Check WARM cache → Hit? Return (promote to HOT if frequent)
  4. Check COLD cache → Hit? Return
  5. Circuit Breaker Check → Open? Return stale cache
  6. Database Query (with timeout: 5s)
  7. Store in appropriate cache tier
  8. Return response

Update Flow:
  1. Data Update (via scraping/admin)
  2. Update Database
  3. Invalidate related caches
  4. Clear cache patterns
  5. Emit cache event
  6. Log invalidation
```

---

## Implementation Guide

### 1. Install Dependencies

```bash
npm install node-cache opossum compression helmet express-rate-limit
```

### 2. Project Structure

```
src/
├── config/
│   ├── productionCache.js      # Multi-tier cache manager
│   ├── database.js             # Database connection & indexes
│   └── redis.js                # Optional: Redis config
├── services/
│   └── production/
│       └── komikCache.service.js  # Main cache service
├── middleware/
│   ├── optimization.js         # Compression, security
│   ├── rateLimiter.js         # Rate limiting
│   └── cacheMonitor.js        # Cache statistics
├── routes/
│   ├── health.routes.js       # Health check endpoints
│   ├── komik.routes.js        # Komik API routes
│   └── reader.routes.js       # Reader endpoints
└── server.js                  # Main server file
```

### 3. Core Implementation

#### A. Cache Manager Setup

```javascript
// config/productionCache.js
const NodeCache = require('node-cache');

class ProductionCacheManager {
    constructor() {
        this.hotCache = new NodeCache({
            stdTTL: 1800,
            maxKeys: 50,
            useClones: false
        });
        
        this.warmCache = new NodeCache({
            stdTTL: 7200,
            maxKeys: 200,
            useClones: false
        });
        
        this.coldCache = new NodeCache({
            stdTTL: 86400,
            maxKeys: 150,
            useClones: false
        });
    }
    
    get(key, tier = 'warm') {
        const cache = this[`${tier}Cache`];
        return cache?.get(key);
    }
    
    set(key, value, tier = 'warm', ttl = null) {
        const cache = this[`${tier}Cache`];
        return ttl ? cache.set(key, value, ttl) : cache.set(key, value);
    }
    
    // ... other methods
}

module.exports = { cacheManager: new ProductionCacheManager() };
```

#### B. Cache Service

```javascript
// services/production/komikCache.service.js
const { cacheManager } = require('../../config/productionCache');
const Circuit = require('opossum');

class ProductionKomikCacheService {
    constructor() {
        this.CHAPTER_LIMIT = 50;
        
        // Circuit breaker for database
        this.dbCircuit = new Circuit(this.loadFromDatabase.bind(this), {
            timeout: 5000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000
        });
    }
    
    async getKomikList(page, limit, filters) {
        const cacheKey = this.generateCacheKey('list', { page, limit, filters });
        
        // Try cache
        let data = cacheManager.get(cacheKey, 'warm');
        if (data) return { ...data, fromCache: true };
        
        // Load from DB with circuit breaker
        data = await this.dbCircuit.fire('komikList', { page, limit, filters });
        
        // Cache result
        cacheManager.set(cacheKey, data, 'warm', 300);
        
        return { ...data, fromCache: false };
    }
    
    // ... other methods
}
```

#### C. Database Optimization

```javascript
// config/database.js
const mongoose = require('mongoose');

async function createIndexes() {
    const Komik = require('../models/komik.model');
    const { Chapter } = require('../models/chapter.model');
    
    await Promise.all([
        // Text search index
        Komik.collection.createIndex({ title: 'text', author: 'text' }),
        
        // Filtering indexes
        Komik.collection.createIndex({ status: 1, createdAt: -1 }),
        Komik.collection.createIndex({ genres: 1 }),
        
        // Sorting indexes
        Komik.collection.createIndex({ views: -1, rating: -1 }),
        
        // Chapter indexes
        Chapter.collection.createIndex({ komikId: 1, chapterNumber: 1 }, { unique: true }),
        Chapter.collection.createIndex({ komikId: 1, createdAt: -1 })
    ]);
}
```

---

## Configuration

### Environment Variables

```env
# Server
NODE_ENV=production
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/komikuhuy

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_HOT=1800           # 30 minutes
CACHE_TTL_WARM=7200          # 2 hours
CACHE_TTL_COLD=86400         # 24 hours
CACHE_MAX_KEYS_HOT=50
CACHE_MAX_KEYS_WARM=200
CACHE_MAX_KEYS_COLD=150

# Circuit Breaker
CIRCUIT_BREAKER_TIMEOUT=5000
CIRCUIT_BREAKER_THRESHOLD=50
CIRCUIT_BREAKER_RESET=30000

# Rate Limiting
RATE_LIMIT_WINDOW=60000      # 1 minute
RATE_LIMIT_MAX=100           # Max requests per window

# Security
ALLOWED_ORIGINS=https://komikuhuy.com
JWT_SECRET=your-jwt-secret-key

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=                  # Optional
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
    apps: [{
        name: 'komikuhuy-api',
        script: './src/server.js',
        instances: 1,
        exec_mode: 'fork',
        max_memory_restart: '512M',
        
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },
        
        node_args: [
            '--max-old-space-size=512',
            '--optimize-for-size'
        ]
    }]
};
```

---

## API Documentation

### Health Check Endpoints

#### GET `/api/health`

Check overall system health.

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2026-02-28T10:00:00.000Z",
    "uptime": 3600,
    "services": {
        "database": {
            "status": "connected"
        },
        "cache": {
            "status": "healthy",
            "circuitBreaker": "CLOSED"
        },
        "memory": {
            "heapUsed": "250MB",
            "heapTotal": "400MB"
        }
    }
}
```

#### GET `/api/health/cache-stats`

Get cache statistics.

**Response:**
```json
{
    "success": true,
    "stats": {
        "hot": {
            "keys": 25,
            "hits": 1500,
            "misses": 200
        },
        "warm": {
            "keys": 150,
            "hits": 5000,
            "misses": 800
        },
        "cold": {
            "keys": 100,
            "hits": 3000,
            "misses": 400
        }
    }
}
```

### Komik Endpoints

#### GET `/api/komik`

Get paginated list of komik with caching.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20, max: 100)
- `status` (string: ongoing, completed, hiatus)
- `genre` (string)
- `search` (string)

**Response:**
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 5000,
        "pages": 250
    },
    "cached": true
}
```

**Cache:** WARM tier, 5 minutes

#### GET `/api/komik/:id`

Get komik detail with limited chapters.

**Query Parameters:**
- `chapterLimit` (number, default: 50)
- `chapterOffset` (number, default: 0)
- `direction` (string: latest, oldest, default: latest)
- `includeChapters` (boolean, default: true)

**Response:**
```json
{
    "success": true,
    "data": {
        "_id": "...",
        "title": "One Piece",
        "author": "Eiichiro Oda",
        "chapters": [...],
        "chapterInfo": {
            "total": 1100,
            "loaded": 50,
            "hasMore": true,
            "nextOffset": 50
        }
    },
    "cached": false
}
```

**Cache:** WARM tier, 30 minutes

#### GET `/api/komik/:id/chapters/range`

Load additional chapters.

**Query Parameters:**
- `start` (number, required)
- `end` (number, required)

**Response:**
```json
{
    "success": true,
    "data": [...],
    "count": 50
}
```

**Cache:** WARM tier, 1 hour

#### GET `/api/komik/:id/chapter/:chapterNumber`

Get single chapter with full images.

**Response:**
```json
{
    "success": true,
    "data": {
        "_id": "...",
        "komikId": "...",
        "chapterNumber": 1,
        "title": "Chapter 1",
        "images": [
            "https://cdn.example.com/image1.jpg",
            "https://cdn.example.com/image2.jpg"
        ],
        "imageCount": 20
    }
}
```

**Cache:** COLD tier, 2-24 hours (depends on isPublished)

**Note:** Automatically prefetches adjacent chapters (chapterNumber ± 1)

#### GET `/api/komik/trending/popular`

Get trending/popular komik.

**Query Parameters:**
- `limit` (number, default: 20)

**Response:**
```json
{
    "success": true,
    "data": [...]
}
```

**Cache:** HOT tier, 30 minutes

### Admin Endpoints

#### DELETE `/api/health/cache/:id`

Invalidate cache for specific komik (admin only).

**Response:**
```json
{
    "success": true,
    "message": "Cache cleared for komik: 123"
}
```

#### POST `/api/health/clear-cache`

Clear cache by pattern or all cache.

**Request Body:**
```json
{
    "pattern": "list"  // Optional
}
```

**Response:**
```json
{
    "success": true,
    "message": "Cleared 25 cache entries",
    "pattern": "list"
}
```

---

## Cache Strategy

### What to Cache

#### 1. List Komik
- **Tier:** WARM
- **TTL:** 5 minutes
- **Size:** ~2KB per komik
- **Reason:** Data sering update, perlu refresh cepat

#### 2. Komik Detail + Metadata
- **Tier:** WARM
- **TTL:** 30 minutes
- **Size:** ~50KB (dengan 50 chapters)
- **Reason:** Data relatif stabil, sering diakses

#### 3. Chapter List (50-100 per window)
- **Tier:** WARM
- **TTL:** 1-2 hours
- **Size:** ~10KB per window
- **Reason:** Sliding window strategy untuk chapter banyak

#### 4. Single Chapter + Images
- **Tier:** COLD
- **TTL:** 2-24 hours
- **Size:** ~20-50KB
- **Reason:** Published chapters tidak berubah, prefetch adjacent

#### 5. Trending/Popular
- **Tier:** HOT
- **TTL:** 30 minutes
- **Size:** ~20KB
- **Reason:** Sangat sering diakses, update berkala

### Cache Invalidation Strategy

```javascript
// On Komik Update (scraping/admin edit)
invalidateKomikCache(komikId) {
    Clear patterns:
    - `detail:*${komikId}*`
    - `chapter:*${komikId}*`
    - `list:*`
    - `trending:*`
}

// On New Chapter Added
invalidateChapterCache(komikId, chapterNumber) {
    Clear patterns:
    - `chapter:*${komikId}*${chapterNumber}*`
    - `detail:*${komikId}*`
}

// Scheduled Invalidation
Every 30 minutes:
    - Clear trending cache
    - Warmup popular komik

Every 24 hours:
    - Clear old COLD cache entries
    - Rebuild cache for top 100 komik
```

### Memory Management

```javascript
Memory Distribution (Target for 1GB RAM VPS):

Total Available: 1024 MB
├── Node.js Process: ~512 MB
│   ├── HOT Cache: ~20 MB (50 keys)
│   ├── WARM Cache: ~100 MB (200 keys)
│   ├── COLD Cache: ~100 MB (150 keys)
│   ├── Application Code: ~50 MB
│   └── Buffer/Heap: ~242 MB
├── MongoDB: ~256 MB
├── System: ~256 MB
└── Reserved: ~100 MB (safety buffer)

Auto-cleanup triggers:
- Heap usage > 400 MB → Clear COLD cache
- Heap usage > 450 MB → Clear WARM + COLD cache
- Heap usage > 480 MB → Flush all cache
```

---

## Monitoring & Maintenance

### Health Monitoring

#### Automatic Monitoring

```javascript
// Built-in checks every 5 minutes:
1. Memory Usage
   - Alert if > 400MB
   - Clear COLD cache if > 450MB
   
2. Cache Statistics
   - Hit rate calculation
   - Miss rate tracking
   - Log performance metrics
   
3. Circuit Breaker State
   - Track OPEN/CLOSED state
   - Alert if frequently OPEN
   
4. Database Connection
   - Check connection status
   - Monitor query times
```

#### Manual Monitoring Commands

```bash
# Check health
curl http://localhost:3000/api/health

# Get cache statistics
curl http://localhost:3000/api/health/cache-stats

# PM2 monitoring
pm2 monit

# Memory usage
pm2 info komikuhuy-api

# Logs
pm2 logs komikuhuy-api --lines 100
```

### Maintenance Tasks

#### Daily Tasks

```bash
# Check error logs
tail -f logs/error.log

# Monitor memory
pm2 list

# Check cache hit rate (target > 80%)
curl http://localhost:3000/api/health/cache-stats
```

#### Weekly Tasks

```bash
# Clear old logs
pm2 flush

# Restart application
pm2 restart komikuhuy-api

# Database index analysis
mongo komikuhuy --eval "db.komiks.getIndexes()"

# Backup database
mongodump --db komikuhuy --out /backup/$(date +%Y%m%d)
```

#### Monthly Tasks

```bash
# Rebuild database indexes
node scripts/maintenance.js --rebuild-indexes

# Warmup cache with popular data
node scripts/maintenance.js --warmup-cache

# Performance audit
npm run audit
```

### Alert Configuration

Recommended alerts:

1. **Memory Alert** (>80% usage)
2. **Database Down** (connection lost)
3. **High Error Rate** (>5% error rate)
4. **Slow Response** (>1s average)
5. **Circuit Breaker Open** (database overload)
6. **Low Cache Hit Rate** (<60%)

---

## Deployment

### Production Deployment Steps

#### 1. Server Setup (VPS 1GB RAM)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Install PM2
sudo npm install -g pm2

# Setup firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

#### 2. Application Deployment

```bash
# Clone repository
git clone https://github.com/yourusername/komikuhuy.git
cd komikuhuy

# Install dependencies
npm ci --only=production

# Setup environment
cp .env.example .env
nano .env  # Edit configuration

# Build indexes
node scripts/setup-database.js

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

#### 3. Nginx Configuration

```nginx
server {
    listen 80;
    server_name komikuhuy.com www.komikuhuy.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }

    # Static files
    location / {
        root /var/www/komikuhuy;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 4. SSL Setup (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d komikuhuy.com -d www.komikuhuy.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Docker Deployment (Alternative)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p logs

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/komikuhuy
    depends_on:
      - mongo
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  mongo:
    image: mongo:6
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M

volumes:
  mongo-data:
```

```bash
# Deploy with Docker
docker-compose up -d

# View logs
docker-compose logs -f

# Restart
docker-compose restart app
```

---

## Troubleshooting

### Common Issues

#### 1. High Memory Usage

**Symptoms:**
- Memory usage > 600MB
- Frequent cache clearing
- Application restart

**Solutions:**
```bash
# Check memory
pm2 info komikuhuy-api

# Clear cache manually
curl -X POST http://localhost:3000/api/health/clear-cache

# Reduce cache sizes in .env
CACHE_MAX_KEYS_WARM=100
CACHE_MAX_KEYS_COLD=50

# Restart application
pm2 restart komikuhuy-api
```

#### 2. Low Cache Hit Rate

**Symptoms:**
- Hit rate < 60%
- Slow response times
- High database load

**Solutions:**
```bash
# Check cache stats
curl http://localhost:3000/api/health/cache-stats

# Increase TTL
CACHE_TTL_WARM=7200
CACHE_TTL_COLD=86400

# Warmup cache
node scripts/maintenance.js --warmup-cache
```

#### 3. Circuit Breaker Open

**Symptoms:**
- Database queries failing
- "Circuit breaker OPEN" in logs
- Stale cache being served

**Solutions:**
```bash
# Check database connection
mongo komikuhuy --eval "db.serverStatus()"

# Check slow queries
mongo komikuhuy --eval "db.currentOp({'secs_running': {$gte: 1}})"

# Rebuild indexes
node scripts/maintenance.js --rebuild-indexes

# Increase circuit breaker timeout
CIRCUIT_BREAKER_TIMEOUT=10000
```

#### 4. Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- Circuit breaker frequently open
- Application crashes

**Solutions:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection pool
# In config/database.js, increase maxPoolSize

# Check connection string
echo $MONGODB_URI
```

#### 5. Memory Leaks

**Symptoms:**
- Memory gradually increasing
- Never decreases
- Eventual crash

**Solutions:**
```bash
# Enable heap profiling
node --inspect src/server.js

# Use Chrome DevTools to connect
chrome://inspect

# Check for unclosed connections
# Review code for:
# - Unclosed database connections
# - Event listeners not removed
# - Large objects in cache

# Add heap snapshot in code
const v8 = require('v8');
v8.writeHeapSnapshot();
```

### Debug Mode

Enable verbose logging:

```env
# .env
LOG_LEVEL=debug
DEBUG=cache:*,db:*
```

Run with debug output:

```bash
DEBUG=* node src/server.js
```

---

## Performance Optimization

### Expected Performance Metrics

| Metric | Target | Acceptable | Current |
|--------|--------|------------|---------|
| Response Time (cached) | < 50ms | < 100ms | ✓ |
| Response Time (uncached) | < 200ms | < 500ms | ✓ |
| Cache Hit Rate | > 80% | > 60% | Check stats |
| Memory Usage | < 400MB | < 600MB | Monitor |
| Concurrent Users | 100+ | 50+ | Test |
| Database Queries | < 100/min | < 500/min | Monitor |

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Linux

# Run load test
k6 run scripts/load-test.js

# Sample load test
```

```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '3m', target: 100 },  // Stay at 100 users
        { duration: '1m', target: 0 },    // Ramp down
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% requests < 500ms
        http_req_failed: ['rate<0.05'],   // Error rate < 5%
    },
};

export default function() {
    // Test list endpoint
    let res1 = http.get('http://localhost:3000/api/komik?page=1&limit=20');
    check(res1, {
        'list status 200': (r) => r.status === 200,
        'list response time < 200ms': (r) => r.timings.duration < 200,
    });

    sleep(1);

    // Test detail endpoint
    let res2 = http.get('http://localhost:3000/api/komik/123');
    check(res2, {
        'detail status 200': (r) => r.status === 200,
        'detail response time < 500ms': (r) => r.timings.duration < 500,
    });

    sleep(2);
}
```

### Optimization Checklist

- [x] Enable compression (gzip)
- [x] Database indexes created
- [x] Connection pooling configured
- [x] Circuit breaker implemented
- [x] Rate limiting enabled
- [x] Cache headers set
- [x] Response size optimized (projection)
- [x] Pagination implemented
- [x] Lazy loading for images
- [x] CDN for static assets
- [x] Graceful shutdown
- [x] Health checks
- [x] Monitoring setup
- [x] Error tracking
- [x] Log rotation

---

## Best Practices

### Do's ✅

1. **Always use cache tiers appropriately**
   - HOT for frequently accessed, volatile data
   - WARM for moderately accessed, semi-stable data
   - COLD for rarely changed, published data

2. **Implement proper error handling**
   - Always have fallback to stale cache
   - Use circuit breakers for external dependencies
   - Log errors for debugging

3. **Monitor performance metrics**
   - Track cache hit rates
   - Monitor memory usage
   - Measure response times

4. **Invalidate cache on updates**
   - Clear related caches when data changes
   - Use pattern matching for bulk invalidation

5. **Use database indexes**
   - Create indexes for frequently queried fields
   - Analyze slow queries regularly

6. **Implement rate limiting**
   - Protect against abuse
   - Different limits for different endpoints

7. **Enable compression**
   - Reduce bandwidth usage
   - Faster response times

8. **Prefetch intelligently**
   - Prefetch adjacent chapters
   - Warmup cache for popular content

9. **Set appropriate TTLs**
   - Shorter TTL for volatile data
   - Longer TTL for stable data

10. **Use graceful shutdown**
    - Allow ongoing requests to complete
    - Close connections properly

### Don'ts ❌

1. **Don't cache everything**
   - User-specific data should not be cached globally
   - Real-time data should have short TTL
   - Don't cache error responses

2. **Don't ignore memory limits**
   - Monitor memory usage continuously
   - Implement auto-cleanup
   - Set max keys per tier

3. **Don't skip database optimization**
   - Always create necessary indexes
   - Use projection to limit fields
   - Implement pagination

4. **Don't forget error handling**
   - Never let cache failures crash the app
   - Always have database fallback

5. **Don't use cluster mode on 1GB RAM**
   - Single process is more efficient
   - Clustering requires more memory

6. **Don't cache without TTL**
   - All cache should expire eventually
   - Prevents stale data issues

7. **Don't skip testing**
   - Load test before production
   - Test cache invalidation
   - Verify memory usage

8. **Don't hardcode configuration**
   - Use environment variables
   - Allow runtime configuration

9. **Don't ignore logs**
   - Monitor error logs daily
   - Set up alerts for critical issues

10. **Don't deploy without backups**
    - Regular database backups
    - Have rollback plan

---

## Support & Resources

### Internal Documentation

- [Production Ready Checklist](../PRODUCTION_READY_CHECKLIST.md)
- [Optimization Summary](../docs/OPTIMIZATION_SUMMARY.md)
- [Stats Optimization](../docs/STATS_OPTIMIZATION.md)

### External Resources

- [Node-cache Documentation](https://www.npmjs.com/package/node-cache)
- [Opossum Circuit Breaker](https://nodeshift.dev/opossum/)
- [MongoDB Performance Best Practices](https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

### Contact

For issues or questions:
- GitHub Issues: [Create an issue]
- Email: support@komikuhuy.com
- Documentation: https://docs.komikuhuy.com

---

## Changelog

### Version 1.0.0 (2026-02-28)

- ✅ Initial implementation of multi-tier caching system
- ✅ Circuit breaker pattern for database protection
- ✅ Automatic memory management and cleanup
- ✅ Health check and monitoring endpoints
- ✅ Cache invalidation strategies
- ✅ Production-ready configuration
- ✅ Complete documentation

---

**Last Updated:** February 28, 2026  
**Version:** 1.0.0  
**Status:** Production Ready
