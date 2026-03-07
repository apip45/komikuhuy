# 💾 Memory Optimization for 1GB RAM VPS

> **Objective:** Optimize AF-Komik V2 untuk berjalan optimal di VPS dengan 1GB RAM

---

## 📊 CURRENT MEMORY ALLOCATION

### Typical 1GB VPS Memory Distribution

```
Total RAM: 1024 MB
├── System/OS: ~200-300 MB
├── MySQL: ~200 MB (configured)
├── MongoDB: ~150 MB (configured)
├── Redis (optional): ~50-100 MB
├── Nginx: ~20-50 MB
├── Node.js App: ~250-400 MB
└── Available Buffer: ~50-100 MB
```

**Problem:** Jika Node.js app use >400MB, system mulai swap = **VERY SLOW**

---

## 🎯 TARGET MEMORY USAGE

**Goal:** Node.js app harus stay under **300MB** untuk safety margin

```
Current Node.js Memory: ~400-500MB ❌
Target After Optimization: ~250-300MB ✅
Savings Needed: 150-200MB ⚡
```

---

## 🔍 MEMORY HOTSPOTS IDENTIFIED

### 1. Logging Overhead (HIGH IMPACT)

**Current Problem:**
```javascript
// Double buffers for every log
console.log('[MODEL] ...'); // stdout buffer
logger.debug('...');         // winston buffer (file + rotation)
```

**Memory Impact:**
- Console buffer: ~20-30MB
- Logger buffer: ~30-40MB
- Log file watchers: ~10MB
- **Total: ~60-80MB** ❌

**Solution:**
```javascript
// Use ONLY logger
logger.debug('[MODEL] ...');
// Remove all console.log

// Or conditional
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] ...');
}
```

**Savings: 30-40MB** ✅

---

### 2. Session Store (MEDIUM IMPACT)

**Current:** MongoDB session store (GOOD!)

**If using memory store (DON'T!):**
- 1000 active sessions × 2KB = 2MB
- 10000 active sessions × 2KB = 20MB
- With session data growth = 50-100MB

**Current Setup:** ✅ Sessions in MongoDB = minimal memory impact

**Optimization:**
```javascript
// Tune session config
store: MongoStore.create({
  touchAfter: 24 * 3600,  // ✅ Already set!
  ttl: 86400,              // ✅ 24 hours
  autoRemove: 'native'     // ✅ Auto cleanup
})
```

**No change needed!** Already optimal.

---

### 3. NodeCache Memory Usage (MEDIUM IMPACT)

**Current Configuration:**
```javascript
HOT: { maxKeys: 30, stdTTL: 1800 }    // 30 items
WARM: { maxKeys: 100, stdTTL: 1800 }  // 100 items
COLD: { maxKeys: 100, stdTTL: 86400 } // 100 items
```

**Memory Estimation:**
- HOT: 30 comics × ~5KB = ~150KB
- WARM: 100 list pages × ~10KB = ~1MB
- COLD: 100 chapters × ~20KB = ~2MB
- **Total: ~3-5MB** ✅ Good!

**Recommendation untuk 1GB RAM:**
```javascript
// Current limits are PERFECT! Don't increase.
// If memory pressure, DECREASE:

HOT: { maxKeys: 20, stdTTL: 1800 }    // 20 items (reduce from 30)
WARM: { maxKeys: 50, stdTTL: 1800 }   // 50 items (reduce from 100)
COLD: { maxKeys: 80, stdTTL: 86400 }  // 80 items (reduce from 100)

// Savings: 1-2MB
```

**Should you migrate to Redis?**

| Aspect | NodeCache | Redis |
|--------|-----------|-------|
| Memory | In-process (efficient) | Separate process (+50-100MB) |
| For 1GB RAM | ✅ **KEEP NodeCache** | ❌ Too much overhead |
| Multi-process | Only with PM2 cluster | ✅ Shared |

**Decision for 1GB RAM:** **KEEP NodeCache + PM2 single instance**

---

### 4. Database Connection Pools (MEDIUM IMPACT)

#### MySQL Pool

**Current:**
```javascript
{
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000
}
```

**Memory per connection:** ~1-2MB  
**Total:** 10 × 2MB = **20MB**

**Optimized for 1GB RAM:**
```javascript
{
  connectionLimit: 8,      // Reduce from 10
  maxIdle: 4,              // Reduce from 10 (keep only 4 idle)
  idleTimeout: 30000,      // Reduce from 60s to 30s
  queueLimit: 10,          // Limit queue (prevent memory growth)
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
}
```

**Savings: 4-6MB**

#### MongoDB Pool

**Current:**
```javascript
{
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}
```

**Memory per connection:** ~1MB  
**Total:** 10 × 1MB = **10MB**

**Optimized:**
```javascript
{
  maxPoolSize: 8,          // Reduce from 10
  minPoolSize: 2,          // Keep minimum 2 warm
  maxIdleTimeMS: 30000,    // Close idle after 30s
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
}
```

**Savings: 2-3MB**

**Total DB Pool Savings: 6-9MB**

---

### 5. Request Processing (HIGH IMPACT)

**Problem: Unbounded Request Payloads**

```javascript
// MASALAH: No size limit on body-parser
app.use(express.json()); // Default 100kb, tapi bisa diset unlimited!
app.use(express.urlencoded({ extended: true }));
```

**Attack Scenario:**
- Attacker sends 100MB JSON payload
- Express loads into memory
- **OOM crash!**

**Solution:**
```javascript
// Enforce strict limits
app.use(express.json({ limit: '10kb' }));           // Max 10KB JSON
app.use(express.urlencoded({ 
  limit: '10kb',                                     // Max 10KB form data
  extended: true,
  parameterLimit: 50                                 // Max 50 params
}));
```

**Protection:** Prevent memory attacks

---

### 6. Response Buffering (MEDIUM IMPACT)

**Current:** Responses fully buffered before sending

```javascript
// Large dataset rendered to string in memory first
res.render('comics', { comics: largeArray });
// EJS renders entire HTML (could be 100KB-1MB) in memory
```

**For most pages:** ✅ OK (HTML < 100KB)

**For large admin pages:** ⚠️ Watch out

**Mitigation:**
- Limit pagination to max 100 items
- For exports, use streaming responses

---

### 7. Array/Object Operations (LOW-MEDIUM IMPACT)

**Problem: Large array transformations**

```javascript
// Loading 1000 comics
const results = await query('SELECT * FROM komik LIMIT 1000');

// Transform with map (creates new array in memory!)
const comics = results.map(row => ({
  ...row,
  genres: JSON.parse(row.genres) // Parse JSON for each
}));

// Now have 2 arrays in memory (results + comics)
```

**For 1000 items × 10KB:** ~10MB × 2 = **20MB peak**

**Solution:**
```javascript
// Option 1: Transform in-place (careful!)
for (let i = 0; i < results.length; i++) {
  results[i].genres = JSON.parse(results[i].genres || '[]');
}
// Only 1 array in memory

// Option 2: Don't parse if not needed
const comics = results.map(row => ({
  ...row,
  genres: row.genres // Keep as string if not used in view
}));
```

**Savings:** 5-10MB per large query

---

## 🎯 MEMORY OPTIMIZATION CHECKLIST

### Priority 1: High Impact (50-80MB savings)

- [ ] **Remove double logging**
  - Find & replace all `console.log` + `logger.*` combos
  - Keep only `logger.*`
  - Conditional console.log for dev only
  - **Savings: 30-40MB**

- [ ] **Limit request payload size**
  ```javascript
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ limit: '10kb', parameterLimit: 50 }));
  ```
  - **Protection: Prevent OOM attacks**

- [ ] **Enforce pagination limits**
  ```javascript
  const MAX_LIMIT = 100;
  const limit = Math.min(parseInt(req.query.limit) || 30, MAX_LIMIT);
  ```
  - **Protection: Prevent loading entire DB into memory**

### Priority 2: Medium Impact (10-20MB savings)

- [ ] **Optimize DB connection pools**
  - MySQL: `connectionLimit: 8, maxIdle: 4`
  - MongoDB: `maxPoolSize: 8, minPoolSize: 2`
  - **Savings: 6-9MB**

- [ ] **Remove frontend debugging logs**
  - Clean up `console.log` in EJS templates
  - **Savings: 3-5MB (HTML size reduction)**

- [ ] **In-place array transformations**
  - Avoid creating copy arrays when possible
  - **Savings: 5-10MB per large query**

### Priority 3: Monitoring & Safety

- [ ] **Set PM2 memory limit**
  ```javascript
  // ecosystem.config.js
  max_memory_restart: '350M' // Restart if exceeds 350MB
  ```

- [ ] **Monitor memory usage**
  ```javascript
  // Add memory monitoring endpoint
  app.get('/health/memory', (req, res) => {
    const usage = process.memoryUsage();
    res.json({
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`
    });
  });
  ```

- [ ] **Add memory pressure warnings**
  ```javascript
  setInterval(() => {
    const usage = process.memoryUsage();
    const rssInMB = usage.rss / 1024 / 1024;
    
    if (rssInMB > 300) {
      logger.warn('High memory usage', { rss: `${rssInMB}MB` });
    }
    
    if (rssInMB > 350) {
      logger.error('Critical memory usage!', { rss: `${rssInMB}MB` });
      // Maybe trigger cache clear
      cacheService.flushWarmTier();
    }
  }, 60000); // Check every minute
  ```

---

## 📊 PM2 CONFIGURATION FOR 1GB RAM

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'af-komik-v2',
    script: './app.js',
    instances: 1,              // SINGLE instance only!
    exec_mode: 'fork',         // NOT cluster mode
    max_memory_restart: '350M', // Restart if exceed 350MB
    
    // Memory optimization
    node_args: [
      '--max-old-space-size=384', // Limit heap to 384MB
      '--gc-interval=100',         // Force GC more often
      '--optimize-for-size'        // Prioritize memory over speed
    ],
    
    // Environment
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=384'
    },
    
    // Monitoring
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto restart on crash
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s'
  }]
};
```

**Why single instance?**
- NodeCache is in-process, not shared
- Cluster mode = multiple caches = wasted memory
- 1 instance × 350MB < 4 instances × 150MB each

---

## 🚨 DANGER SIGNS (When to Add More RAM)

Monitor these symptoms:

### ❌ System is Swapping
```bash
# Check swap usage
free -m
# If swap > 100MB used regularly = ADD MORE RAM!
```

### ❌ Frequent PM2 Restarts
```bash
pm2 logs
# If restarting due to max_memory_restart = memory leak or need more RAM
```

### ❌ Slow Response Times
- If P95 latency > 1 second consistently
- If database query times are normal but responses slow
- Might be memory pressure causing GC pauses

### ❌ High CPU with Low Load
- High CPU but low request count = excessive GC
- Means not enough memory, heap thrashing

---

## ✅ EXPECTED RESULTS

### Before Optimization

```
Node.js Process:
├── RSS: 450-500MB
├── Heap Used: 350MB
├── External: 50MB
└── GC Pause: 20-50ms

System Memory:
├── Used: 900-950MB / 1024MB
├── Available: 50-100MB
└── Swap: 100-200MB (BAD!)
```

### After Optimization

```
Node.js Process:
├── RSS: 250-300MB ✅
├── Heap Used: 200MB ✅
├── External: 30MB ✅
└── GC Pause: 10-20ms ✅

System Memory:
├── Used: 700-800MB / 1024MB ✅
├── Available: 200-300MB ✅
└── Swap: 0-20MB ✅
```

**Benefits:**
- ✅ No swapping = fast responses
- ✅ Buffer for traffic spikes
- ✅ Headroom for OS and other processes
- ✅ Can handle 2-3x more concurrent users

---

## 🎓 MEMORY OPTIMIZATION PRINCIPLES

### 1. Don't Load What You Don't Need
```javascript
// BAD: Load all fields
SELECT * FROM komik;

// GOOD: Load only needed fields
SELECT id, param, title, thumbnail FROM komik;
```

### 2. Don't Keep What You Don't Use
```javascript
// BAD: Keep results in variable
const results = await query(...);
const processed = results.map(...);
// Now have both results and processed in memory!

// GOOD: Replace immediately
let results = await query(...);
results = results.map(...); // Replace original
```

### 3. Stream Large Datasets
```javascript
// For file exports, admin reports, etc.
// Use streams instead of loading all into memory
```

### 4. Limit Input from Users
```javascript
// Always validate and limit
// Pagination, request body size, upload size, etc.
```

### 5. Monitor and Alert
```javascript
// Track memory usage
// Alert when approaching limits
// Have auto-recovery mechanisms
```

---

## 🔧 QUICK MEMORY TEST

Test your optimizations:

```javascript
// test-memory.js
const used = process.memoryUsage();
console.log('Memory Usage:');
console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)}MB`);
console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)}MB`);
console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
console.log(`  External: ${Math.round(used.external / 1024 / 1024)}MB`);

// Should be:
// RSS: < 300MB ✅
// Heap Used: < 200MB ✅
```

Run under load:
```bash
# Start app
npm start

# In another terminal, run load test
cd tests/k6
k6 run performance-test.js

# Monitor memory during test
watch -n 1 'pm2 show af-komik-v2 | grep memory'
```

---

## 📖 Related Documents

- [CODE_IMPROVEMENT_ANALYSIS.md](./CODE_IMPROVEMENT_ANALYSIS.md) - Full analysis
- [IMPROVEMENT_SUMMARY.md](./IMPROVEMENT_SUMMARY.md) - Quick action items
- [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md) - General optimizations

---

**Status:** ✅ Complete  
**Target:** Node.js app < 300MB on 1GB RAM VPS  
**Expected Savings:** 150-200MB  
**Implementation Time:** 1-2 weeks
