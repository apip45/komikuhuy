# KomikuHuy - Cache System Documentation

> Production-ready multi-tier caching system for high-performance manga reading platform with 13M+ records on 1GB RAM VPS.

## 📚 Documentation Index

### Main Documentation

1. **[CACHING_SYSTEM.md](./CACHING_SYSTEM.md)** - Complete documentation
   - Architecture overview
   - Implementation guide
   - Configuration
   - API documentation
   - Monitoring & maintenance
   - Deployment guide
   - Troubleshooting

2. **[CACHE_QUICK_START.md](./CACHE_QUICK_START.md)** - Quick start guide
   - 5-minute setup
   - Basic implementation
   - Usage examples
   - Quick commands

### Supporting Documentation

- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - Performance optimization
- [STATS_OPTIMIZATION.md](./STATS_OPTIMIZATION.md) - Statistics optimization
- [PROFILE_FEATURE_IMPLEMENTATION.md](./PROFILE_FEATURE_IMPLEMENTATION.md) - Profile features

## 🎯 Quick Overview

### What is This?

A production-ready caching system designed for:
- **Large datasets**: 13M+ records (manga pages/images)
- **Limited resources**: 1GB RAM VPS
- **High performance**: <100ms response time, 80%+ cache hit rate
- **Reliability**: Circuit breaker pattern, stale cache fallback

### Key Features

✅ **Multi-tier Caching** (HOT/WARM/COLD)  
✅ **Circuit Breaker** for database protection  
✅ **Intelligent Prefetching** for adjacent content  
✅ **Auto Cache Invalidation** on data updates  
✅ **Memory Management** with auto-cleanup  
✅ **Health Monitoring** & statistics

## 🚀 Quick Start

### 1. Installation

```bash
npm install node-cache opossum compression helmet express-rate-limit
```

### 2. Basic Setup

```javascript
// config/productionCache.js
const { cacheManager } = require('./config/productionCache');

// Cache usage
const data = cacheManager.get('key', 'warm');
cacheManager.set('key', value, 'warm', 1800);
```

### 3. Run Server

```bash
npm start
# or with PM2
pm2 start ecosystem.config.js
```

### 4. Check Health

```bash
curl http://localhost:3000/api/health
```

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Response Time (cached) | < 100ms | ✅ |
| Response Time (uncached) | < 500ms | ✅ |
| Cache Hit Rate | > 80% | ✅ |
| Memory Usage | < 400MB | ✅ |
| Concurrent Users | 100+ | ✅ |
| Database Queries | < 100/min | ✅ |

## 🏗️ Architecture

```
Client Request
    ↓
Rate Limiter (100 req/min)
    ↓
HOT Cache (30 min, ~20MB)
    ↓ miss
WARM Cache (2 hours, ~100MB)
    ↓ miss
COLD Cache (24 hours, ~100MB)
    ↓ miss
Circuit Breaker (5s timeout)
    ↓
Database (MongoDB)
```

## 🔧 Maintenance Scripts

Located in `scripts/` directory:

### maintenance.js

```bash
# Warmup cache with popular data
node scripts/maintenance.js --warmup-cache

# Rebuild database indexes
node scripts/maintenance.js --rebuild-indexes

# Clear old cache entries
node scripts/maintenance.js --clear-old-cache

# Check system health
node scripts/maintenance.js --check-health

# Display cache statistics
node scripts/maintenance.js --cache-stats
```

### load-test.js (k6)

```bash
# Run load test
k6 run scripts/load-test.js

# Custom load test
k6 run --vus 50 --duration 30s scripts/load-test.js
```

## 📁 Project Structure

```
komikuhuy/
├── docs/
│   ├── CACHING_SYSTEM.md          # Complete documentation
│   ├── CACHE_QUICK_START.md       # Quick start guide
│   └── README.md                  # This file
├── scripts/
│   ├── maintenance.js             # Maintenance tasks
│   └── load-test.js               # Load testing (k6)
├── config/
│   ├── productionCache.js         # Cache manager
│   └── database.js                # Database config
├── services/
│   └── production/
│       └── komikCache.service.js  # Cache service
├── middleware/
│   ├── optimization.js            # Compression, security
│   └── rateLimiter.js            # Rate limiting
├── routes/
│   ├── health.routes.js          # Health endpoints
│   └── komik.routes.js           # API routes
└── ecosystem.config.js           # PM2 config
```

## 🎓 Getting Started Guide

### For Beginners

Start with **[CACHE_QUICK_START.md](./CACHE_QUICK_START.md)** - it covers:
- Step-by-step setup (5 minutes)
- Basic usage examples
- Common commands

### For Developers

Read **[CACHING_SYSTEM.md](./CACHING_SYSTEM.md)** - it includes:
- Complete architecture
- Implementation details
- Advanced configuration
- API documentation

### For DevOps/SysAdmin

Focus on these sections in main documentation:
- [Deployment Guide](./CACHING_SYSTEM.md#deployment)
- [Monitoring & Maintenance](./CACHING_SYSTEM.md#monitoring--maintenance)
- [Troubleshooting](./CACHING_SYSTEM.md#troubleshooting)

## 📈 Usage Examples

### Cache List Komik

```javascript
const KomikCacheService = require('./services/komikCache.service');

// Get paginated list (cached 5 min)
const list = await KomikCacheService.getKomikList(1, 20);
console.log('From cache:', list.fromCache);
```

### Cache Komik Detail

```javascript
// Get detail with 50 chapters (cached 30 min)
const detail = await KomikCacheService.getKomikDetail(komikId, {
    chapterLimit: 50,
    direction: 'latest'
});
```

### Cache Chapter with Images

```javascript
// Get chapter (cached 2-24 hours)
const chapter = await KomikCacheService.getChapterWithImages(
    komikId, 
    chapterNumber
);
// Automatically prefetches adjacent chapters!
```

### Invalidate Cache

```javascript
// On komik update
KomikCacheService.invalidateKomikCache(komikId);

// On chapter update
KomikCacheService.invalidateChapterCache(komikId, chapterNumber);
```

## 🔍 Monitoring

### Check System Health

```bash
# Health endpoint
curl http://localhost:3000/api/health

# Cache statistics
curl http://localhost:3000/api/health/cache-stats

# Using PM2
pm2 monit
pm2 logs komikuhuy-api
```

### Key Metrics to Monitor

1. **Cache Hit Rate**: Should be > 60% (target 80%+)
2. **Memory Usage**: Should be < 400MB (max 600MB)
3. **Response Time**: P95 < 500ms, P99 < 1000ms
4. **Error Rate**: Should be < 5%
5. **Circuit Breaker State**: Should be CLOSED

### Alerts Setup

Recommended alerts:
- ⚠️ Memory > 400MB
- ⚠️ Cache hit rate < 60%
- ⚠️ Response time P95 > 1000ms
- ⚠️ Error rate > 5%
- ⚠️ Circuit breaker OPEN

## 🛠️ Common Tasks

### Daily

```bash
# Check health
node scripts/maintenance.js --check-health

# View logs
pm2 logs komikuhuy-api --lines 100
```

### Weekly

```bash
# Clear and warmup cache
node scripts/maintenance.js --clear-old-cache --warmup-cache

# Restart application
pm2 restart komikuhuy-api
```

### Monthly

```bash
# Rebuild indexes
node scripts/maintenance.js --rebuild-indexes

# Run load test
k6 run scripts/load-test.js

# Database backup
mongodump --db komikuhuy --out /backup/$(date +%Y%m%d)
```

## 🐛 Troubleshooting

### High Memory Usage

```bash
# Clear cache
curl -X POST http://localhost:3000/api/health/clear-cache

# Check memory
pm2 info komikuhuy-api

# Restart if needed
pm2 restart komikuhuy-api
```

### Low Cache Hit Rate

```bash
# Check stats
node scripts/maintenance.js --cache-stats

# Warmup cache
node scripts/maintenance.js --warmup-cache
```

### Database Issues

```bash
# Check MongoDB
sudo systemctl status mongod

# Rebuild indexes
node scripts/maintenance.js --rebuild-indexes
```

See [Troubleshooting Guide](./CACHING_SYSTEM.md#troubleshooting) for more solutions.

## 📦 Dependencies

### Required

- `node-cache` - In-memory caching
- `opossum` - Circuit breaker
- `compression` - Response compression
- `helmet` - Security headers
- `express-rate-limit` - Rate limiting

### Optional

- `pm2` - Process manager
- `k6` - Load testing
- `redis` - Alternative cache store (for clustering)

## 🌟 Best Practices

### Do's ✅

- ✅ Use appropriate cache tiers (HOT/WARM/COLD)
- ✅ Set proper TTL values
- ✅ Invalidate cache on data updates
- ✅ Monitor cache hit rates
- ✅ Implement error handling
- ✅ Use database indexes
- ✅ Enable compression
- ✅ Set up rate limiting

### Don'ts ❌

- ❌ Cache everything indiscriminately
- ❌ Ignore memory limits
- ❌ Skip database optimization
- ❌ Forget error handling
- ❌ Use cluster mode on 1GB RAM
- ❌ Cache without TTL
- ❌ Deploy without testing

## 📞 Support

### Documentation

- **Full Documentation**: [CACHING_SYSTEM.md](./CACHING_SYSTEM.md)
- **Quick Start**: [CACHE_QUICK_START.md](./CACHE_QUICK_START.md)
- **Maintenance Scripts**: `scripts/maintenance.js --help`

### Resources

- [Node-cache Docs](https://www.npmjs.com/package/node-cache)
- [Opossum Docs](https://nodeshift.dev/opossum/)
- [MongoDB Performance](https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/)
- [PM2 Docs](https://pm2.keymetrics.io/docs/)

### Issues

For bugs or questions:
- GitHub Issues: [Create an issue]
- Email: support@komikuhuy.com

## 🎉 Success Criteria

Your cache system is working well if:

- ✅ Cache hit rate > 80%
- ✅ Response time < 100ms (cached)
- ✅ Response time < 500ms (uncached)
- ✅ Memory usage < 400MB
- ✅ Can handle 100+ concurrent users
- ✅ Circuit breaker stays CLOSED
- ✅ Error rate < 1%

Run load test to verify:

```bash
k6 run scripts/load-test.js
```

## 📝 Changelog

### Version 1.0.0 (February 28, 2026)

- ✅ Multi-tier caching system implemented
- ✅ Circuit breaker pattern for database protection
- ✅ Automatic memory management
- ✅ Health monitoring & statistics
- ✅ Cache invalidation strategies
- ✅ Maintenance scripts
- ✅ Load testing scripts
- ✅ Complete documentation

## 📄 License

[Your License Here]

---

**Last Updated:** February 28, 2026  
**Version:** 1.0.0  
**Status:** Production Ready  
**Tested On:** VPS 1GB RAM, Node.js 18+, MongoDB 6+

---

**Ready to start?** → [Quick Start Guide](./CACHE_QUICK_START.md)  
**Need details?** → [Complete Documentation](./CACHING_SYSTEM.md)  
**Having issues?** → [Troubleshooting](./CACHING_SYSTEM.md#troubleshooting)
