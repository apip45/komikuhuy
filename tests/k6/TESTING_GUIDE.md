# AF-Komik V2 - Performance Testing Guide

Panduan lengkap untuk melakukan performance testing menggunakan k6 pada aplikasi AF-Komik V2.

## 📋 Daftar Isi

- [Persiapan](#persiapan)
- [Jenis-jenis Test](#jenis-jenis-test)
- [Menjalankan Test](#menjalankan-test)
- [Interpretasi Hasil](#interpretasi-hasil)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

---

## 🚀 Persiapan

### 1. Install K6

#### Windows
```powershell
choco install k6
```

#### macOS
```bash
brew install k6
```

#### Linux (Ubuntu/Debian)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### 2. Verifikasi Instalasi
```bash
k6 version
```

### 3. Persiapan Environment

Pastikan aplikasi sudah running dan dapat diakses:
- **Production**: https://comic.mikan.my.id
- **Staging**: https://staging.comic.mikan.my.id (jika ada)
- **Local**: http://localhost:3000

---

## 🎯 Jenis-jenis Test

### 1. Quick Test (2 menit)
**Tujuan**: Validasi cepat bahwa sistem berfungsi dengan baik.

**Kapan digunakan**:
- Setelah deployment
- Untuk validasi cepat dalam CI/CD
- Development testing

**Cara menjalankan**:
```bash
# Linux/Mac
./run-test.sh -t quick

# Windows
.\run-test.ps1 -Type quick

# Manual
k6 run tests/k6/quick-test.js
```

**Expected Results**:
- ✅ p95 < 800ms
- ✅ Error rate < 10%
- ✅ Cache hit > 40%

---

### 2. Full Performance Test (18 menit)
**Tujuan**: Testing komprehensif dengan berbagai tahap load.

**Kapan digunakan**:
- Pre-production testing
- Performance benchmark
- Capacity planning

**Load Pattern**:
```
0 → 20 → 50 → 100 (warm-up: 5 menit)
100 users sustained (5 menit)
100 → 200 (stress: 5 menit)
200 → 0 (cool-down: 3 menit)
```

**Cara menjalankan**:
```bash
# Linux/Mac
./run-test.sh -t full

# Windows
.\run-test.ps1 -Type full

# Manual
k6 run tests/k6/performance-test.js
```

**Expected Results**:
- ✅ p95 < 500ms
- ✅ Error rate < 5%
- ✅ Cache hit > 60%
- ✅ Throughput > 100 req/s

---

### 3. Stress Test (19 menit)
**Tujuan**: Menemukan breaking point sistem.

**Kapan digunakan**:
- Capacity planning
- Finding system limits
- Infrastructure sizing

**Load Pattern**:
```
0 → 50 → 100 → 200 → 300 → 400 → 500
Hold at 500 for 3 minutes
```

**Cara menjalankan**:
```bash
# Linux/Mac
./run-test.sh -t stress

# Windows
.\run-test.ps1 -Type stress

# Manual
k6 run tests/k6/stress-test.js
```

**Expected Results**:
- ⚠️ System should survive
- ⚠️ p95 may exceed 2000ms at peak
- ⚠️ Error rate < 25% acceptable
- ⚠️ Identifies breaking point

---

### 4. Spike Test (15 menit)
**Tujuan**: Test respons terhadap sudden traffic spike.

**Kapan digunakan**:
- Before marketing campaigns
- Testing auto-scaling
- Viral content preparation

**Load Pattern**:
```
20 users → 200 users (in 30s) → back to 20
20 users → 400 users (in 30s) → back to 20  
20 users → 600 users (in 20s) → back to 20
```

**Cara menjalankan**:
```bash
# Linux/Mac
./run-test.sh -t spike

# Windows
.\run-test.ps1 -Type spike

# Manual
k6 run tests/k6/spike-test.js
```

**Expected Results**:
- ✅ System survives spikes
- ✅ Recovery rate > 80%
- ⚠️ Temporary degradation acceptable
- ✅ No cascading failures

---

### 5. Soak Test (4+ jam)
**Tujuan**: Menemukan memory leaks dan stability issues.

**Kapan digunakan**:
- Pre-production final validation
- After major infrastructure changes
- Monthly stability checks

**Load Pattern**:
```
Warm-up: 5 minutes to 50 users
Sustained: 4 hours at 50 users
Cool-down: 5 minutes to 0
```

**Cara menjalankan**:
```bash
# Linux/Mac - Full 4 hours
./run-test.sh -t soak

# Short version (30 minutes)
./run-test.sh -t soak -d 30m

# Windows - Full 4 hours
.\run-test.ps1 -Type soak

# Short version (30 minutes)
k6 run -e DURATION=30m tests/k6/soak-test.js
```

**Expected Results**:
- ✅ Response time stays stable
- ✅ No memory growth over time
- ✅ Error rate stays < 5%
- ✅ Cache remains effective

---

## 🔄 Menjalankan Test

### Menggunakan Helper Scripts

#### Linux/macOS
```bash
# Quick test
./run-test.sh -t quick

# Full test dengan custom environment
./run-test.sh -t full -e staging

# Stress test dengan output file
./run-test.sh -t stress -o results/stress-$(date +%Y%m%d).json

# Custom VUs dan duration
./run-test.sh -t quick -v 100 -d 5m

# Custom URL
./run-test.sh -t full -u http://localhost:3000
```

#### Windows PowerShell
```powershell
# Quick test
.\run-test.ps1 -Type quick

# Full test dengan custom environment
.\run-test.ps1 -Type full -Environment staging

# Stress test dengan output file
.\run-test.ps1 -Type stress -Output results/stress-$((Get-Date).ToString('yyyyMMdd')).json

# Custom VUs dan duration
.\run-test.ps1 -Type quick -Vus 100 -Duration 5m

# Custom URL
.\run-test.ps1 -Type full -Url http://localhost:3000
```

### Menggunakan NPM Scripts

```bash
# Quick test
npm run test:quick

# Full performance test
npm test

# Stress test
npm run test:stress

# Spike test
npm run test:spike

# Soak test (4 hours)
npm run test:soak

# Short soak test (30 minutes)
npm run test:soak:short

# Environment-specific tests
npm run test:production
npm run test:staging
npm run test:local

# Load variations
npm run test:light    # 10 VUs, 1 minute
npm run test:medium   # 50 VUs, 5 minutes
npm run test:heavy    # 200 VUs, 10 minutes

# CI/CD test
npm run test:ci       # Quick, quiet test for pipelines
```

### Manual k6 Commands

```bash
# Basic test
k6 run performance-test.js

# Custom VUs and duration
k6 run --vus 100 --duration 5m performance-test.js

# Custom environment
k6 run -e BASE_URL=http://localhost:3000 performance-test.js

# With JSON output
k6 run --out json=results.json performance-test.js

# Quiet mode (for CI)
k6 run --quiet performance-test.js

# No thresholds
k6 run --no-thresholds performance-test.js

# Verbose output
k6 run --verbose performance-test.js
```

---

## 📊 Interpretasi Hasil

### Understanding Metrics

#### Response Time Metrics
```
Average (avg):     Rata-rata waktu response
Median (p50):      50% request lebih cepat dari nilai ini
90th percentile:   90% request lebih cepat dari nilai ini
95th percentile:   95% request lebih cepat dari nilai ini (PENTING!)
99th percentile:   99% request lebih cepat dari nilai ini
Maximum:           Response time terlambat
```

#### Performance Targets

| Metric | Excellent | Good | Needs Work |
|--------|-----------|------|------------|
| **p95** | < 500ms | < 1000ms | > 1000ms |
| **p99** | < 1000ms | < 2000ms | > 2000ms |
| **Error Rate** | < 5% | < 10% | > 10% |
| **Cache Hit** | > 60% | > 40% | < 40% |
| **Throughput** | > 100 req/s | > 50 req/s | < 50 req/s |

### Reading the Console Output

```
📊 Request Statistics:
  Total Requests: 45678        # Total HTTP requests
  Requests/sec: 76.13          # Throughput (higher is better)

⏱️  Response Times:
  Average: 156.23ms            # Average latency
  Median (p50): 142.50ms       # Typical user experience
  95th percentile: 385.12ms    # Target: < 500ms ✅
  99th percentile: 892.45ms    # Target: < 1000ms ✅
  Max: 1523.67ms              # Worst case

✅ Success Rate:
  Passed Checks: 98.76%        # Test success rate
  Failed Requests: 1.24%       # Error rate (target: < 5%)

🚀 Cache Performance:
  Cache Hit Rate: 67.89%       # Cache effectiveness (target: > 60%)

🎯 Performance Assessment:
  ✅ EXCELLENT - All thresholds met!
```

### Performance Ratings

#### ✅ EXCELLENT
- System performs optimally
- Ready for production
- Can handle expected load

**Criteria**:
- p95 < 500ms
- Error rate < 5%
- Cache hit > 60%

**Action**: Deploy with confidence!

#### ⚠️ GOOD
- System functional but suboptimal
- Minor optimization needed
- Acceptable for production

**Criteria**:
- p95 < 1000ms
- Error rate < 10%
- Cache hit > 40%

**Action**: 
- Monitor closely
- Plan optimizations
- Consider if acceptable

#### ❌ NEEDS IMPROVEMENT
- Significant performance issues
- Not ready for production
- Requires immediate attention

**Criteria**:
- p95 > 1000ms
- Error rate > 10%
- Cache hit < 40%

**Action**:
- DO NOT DEPLOY
- Investigate issues
- Optimize before retesting

### HTML Report

HTML report disimpan di `tests/k6/results/summary.html` dan berisi:

- **Visual Dashboard**: Metric cards dengan color coding
- **Response Time Table**: Detailed percentile breakdown
- **Performance Assessment**: Automated analysis
- **Recommendations**: Actionable improvement suggestions

Buka dengan browser untuk presentasi yang lebih baik.

---

## 💡 Best Practices

### Before Testing

#### 1. Persiapan Environment
```bash
# Backup database
mysqldump -u user -p af_komik > backup_$(date +%Y%m%d).sql

# Check system resources
htop                    # CPU/Memory
netstat -an | grep 3000 # Port availability
redis-cli INFO memory   # Redis status
```

#### 2. Warm-up Cache
```bash
# Run quick warm-up test first
k6 run --vus 5 --duration 30s quick-test.js
```

#### 3. Notify Team
Informasikan team bahwa Anda akan melakukan load testing untuk menghindari alarm monitoring yang false positive.

### During Testing

#### 1. Monitor Server Metrics
```bash
# CPU and Memory
htop

# Database queries
mysqladmin -i 1 processlist

# Redis stats
redis-cli --stat

# Application logs
tail -f logs/app.log
```

#### 2. Watch for Issues
- CPU usage > 80%
- Memory leaks (growing usage)
- Database connection pool exhausted
- Redis evictions
- Error spikes

### After Testing

#### 1. Analyze Results
```bash
# Save results with timestamp
cp results/summary.json results/archive/test_$(date +%Y%m%d_%H%M%S).json

# Compare with baseline
diff results/baseline.json results/summary.json
```

#### 2. Generate Report
```bash
# Create comparison report
node scripts/compare-results.js \
  results/baseline.json \
  results/summary.json \
  > results/comparison.md
```

#### 3. Document Findings
Update documentation dengan:
- Test results
- Performance improvements/degradations
- Action items
- Next steps

### Testing Schedule

#### Development
- ✅ Quick test setiap PR
- ✅ Full test setiap merge ke main

#### Staging
- ✅ Full test setelah deployment
- ✅ Stress test mingguan
- ✅ Spike test sebelum campaign

#### Production
- ✅ Quick test setelah deployment
- ✅ Soak test bulanan
- ✅ Capacity test quarterly

---

## 🐛 Troubleshooting

### Issue: High Error Rate

**Symptoms**:
- Error rate > 10%
- Many 500 errors
- Request timeouts

**Diagnosis**:
```bash
# Check application logs
tail -f logs/app.log | grep ERROR

# Check database
mysql> SHOW PROCESSLIST;
mysql> SHOW ENGINE INNODB STATUS;

# Check Redis
redis-cli INFO stats
redis-cli SLOWLOG GET 10
```

**Solutions**:
1. Increase database connection pool
2. Optimize slow queries
3. Check Redis memory limits
4. Review error logs for patterns

### Issue: Slow Response Times

**Symptoms**:
- p95 > 1000ms
- Growing response times
- Timeouts

**Diagnosis**:
```bash
# Profile slow endpoints
# Check database slow query log
tail -f /var/log/mysql/slow-query.log

# Check Redis latency
redis-cli --latency

# Profile application
# Use APM tools (New Relic, DataDog, etc.)
```

**Solutions**:
1. Add database indexes
2. Increase cache TTL
3. Optimize N+1 queries
4. Enable query caching
5. Use read replicas

### Issue: Low Cache Hit Rate

**Symptoms**:
- Cache hit < 40%
- Many cache misses
- High database load

**Diagnosis**:
```bash
# Check Redis stats
redis-cli INFO stats
redis-cli INFO memory

# Check cache keys
redis-cli KEYS "cache:*" | wc -l

# Check eviction policy
redis-cli CONFIG GET maxmemory-policy
```

**Solutions**:
1. Increase Redis memory
2. Adjust eviction policy
3. Warm cache on startup
4. Increase TTL for stable data
5. Implement cache hierarchies

### Issue: k6 Test Crashes

**Symptoms**:
- k6 exits unexpectedly
- "Too many open files" error
- Out of memory

**Solutions**:
```bash
# Increase file descriptors (Linux/Mac)
ulimit -n 10000

# Reduce VUs or batch size in test config
export const options = {
  batch: 5,  // Reduce from 10
  batchPerHost: 3,  // Reduce from 6
};

# Increase sleep times
sleep(randomIntBetween(2, 5));

# Use --compatibility-mode
k6 run --compatibility-mode=base performance-test.js
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Performance Test

on:
  push:
    branches: [ main, staging ]
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday 2 AM

jobs:
  performance-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run performance test
        run: |
          cd tests/k6
          k6 run --out json=results.json performance-test.js
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: k6-results
          path: tests/k6/results/
      
      - name: Comment PR with results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('tests/k6/results.json'));
            // Parse and comment results
```

### GitLab CI

```yaml
performance-test:
  stage: test
  image: grafana/k6:latest
  script:
    - cd tests/k6
    - k6 run --out json=results.json performance-test.js
  artifacts:
    paths:
      - tests/k6/results/
    expire_in: 1 week
  only:
    - main
    - staging
```

### Jenkins

```groovy
pipeline {
    agent any
    
    stages {
        stage('Performance Test') {
            steps {
                sh '''
                    cd tests/k6
                    k6 run --out json=results.json performance-test.js
                '''
            }
        }
        
        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'tests/k6/results/**', fingerprint: true
            }
        }
    }
}
```

---

## 📈 Advanced Tips

### 1. Custom Test Scenarios

Create custom test combining multiple scenarios:

```javascript
import { scenario1 } from './scenarios/homepage.js';
import { scenario2 } from './scenarios/reading.js';

export const options = {
  scenarios: {
    homepage: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      exec: 'scenario1',
    },
    reading: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
      ],
      exec: 'scenario2',
    },
  },
};
```

### 2. Data-Driven Testing

Use external data files:

```javascript
import { SharedArray } from 'k6/data';

const comics = new SharedArray('comics', function() {
  return JSON.parse(open('./data/comics.json'));
});

export default function() {
  const comic = comics[__VU % comics.length];
  http.get(`${BASE_URL}/comics/${comic.slug}`);
}
```

### 3. Custom Metrics

Track business-specific metrics:

```javascript
import { Rate, Trend } from 'k6/metrics';

const chapterLoadTime = new Trend('chapter_load_time');
const popularComicErrors = new Rate('popular_comic_errors');

export default function() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/comics/one-piece/chapter-1000`);
  chapterLoadTime.add(Date.now() - start);
  
  if (res.status !== 200) {
    popularComicErrors.add(1);
  }
}
```

---

## ✅ Pre-Production Checklist

Before going live, ensure:

- [ ] All quick tests pass consistently
- [ ] Full performance test meets targets
- [ ] Stress test identifies safe capacity
- [ ] Spike test shows graceful degradation
- [ ] Soak test runs for 4+ hours without issues
- [ ] Database queries optimized with proper indexes
- [ ] Cache hit rate > 60% sustained
- [ ] Error rate < 5% under normal load
- [ ] Monitoring and alerts configured
- [ ] Auto-scaling tested (if applicable)
- [ ] Backup and rollback procedures ready
- [ ] Performance baseline documented

---

**Happy Testing! 🚀**

Untuk pertanyaan atau bantuan, hubungi DevOps team atau buat issue di repository.
