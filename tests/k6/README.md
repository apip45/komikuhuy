# K6 Performance Testing - AF-Komik V2

Load testing suite untuk menguji performa aplikasi AF-Komik V2 secara komprehensif.

## 📋 Table of Contents

- [Instalasi](#instalasi)
- [Quick Start](#quick-start)
- [Test Scenarios](#test-scenarios)
- [Cara Menjalankan Test](#cara-menjalankan-test)
- [Membaca Hasil Test](#membaca-hasil-test)
- [Threshold & Performance Target](#threshold--performance-target)
- [Tips & Best Practices](#tips--best-practices)

---

## 🚀 Instalasi

### Windows
```bash
choco install k6
```

### macOS
```bash
brew install k6
```

### Linux
```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Fedora/CentOS
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

### Docker (Alternative)
```bash
docker pull grafana/k6:latest
```

Verifikasi instalasi:
```bash
k6 version
```

---

## ⚡ Quick Start

### 1. Test Cepat (2 menit)
```bash
cd tests/k6
k6 run --vus 20 --duration 2m performance-test.js
```

### 2. Test Standard (5 menit)
```bash
cd tests/k6
k6 run --vus 50 --duration 5m performance-test.js
```

### 3. Test Lengkap dengan Stages (18 menit)
```bash
cd tests/k6
k6 run performance-test.js
```

### 4. Test dengan Custom URL
```bash
cd tests/k6
k6 run -e BASE_URL=https://comic.mikan.my.id performance-test.js
```

---

## 📊 Test Scenarios

Script ini menguji berbagai fitur aplikasi dengan distribusi traffic yang realistis:

### 1. **Homepage** (30% traffic)
- **Endpoint**: `GET /`
- **Priority**: HIGH
- **Simulasi**: Landing page visit

### 2. **Comic List** (40% traffic)
- **Endpoint**: `GET /comics?page={page}&limit={limit}`
- **Priority**: HIGH
- **Simulasi**: Browse halaman daftar komik

### 3. **Comic Detail** (60% traffic)
- **Endpoint**: `GET /comics/{param}`
- **Priority**: HIGH
- **Simulasi**: Lihat detail komik sebelum membaca

### 4. **Chapter Reader** (50% traffic) ⭐
- **Endpoint**: `GET /comics/{param}/{chapter}`
- **Priority**: CRITICAL
- **Simulasi**: Membaca chapter (core feature)
- **Note**: User spend more time here (3-8 seconds)

### 5. **Search** (20% traffic)
- **Endpoint**: `GET /comics?keyword={keyword}`
- **Priority**: MEDIUM
- **Simulasi**: Pencarian komik

### 6. **Genre Filter** (20% traffic)
- **Endpoint**: `GET /comics?genre={genre}&page={page}`
- **Priority**: MEDIUM
- **Simulasi**: Filter berdasarkan genre

### 7. **API Endpoints** (30% traffic)
Mobile app simulation:
- `GET /api/comics` - Comic list API
- `GET /api/comics/{param}` - Comic detail API
- `GET /api/comics/{param}/chapters/{chapter}` - Chapter detail API

### 8. **Static Assets** (10% traffic)
- `GET /css/styles.css`
- `GET /js/main.js`

---

## 🏃 Cara Menjalankan Test

### Basic Commands

#### Test dengan VUs (Virtual Users) Custom
```bash
k6 run --vus 100 --duration 5m performance-test.js
```

#### Test dengan Output JSON
```bash
k6 run --out json=results.json performance-test.js
```

#### Test dengan HTML Report
```bash
k6 run performance-test.js
# Report akan tersimpan di: tests/k6/results/summary.html
```

#### Test dengan Grafana Cloud (Optional)
```bash
k6 run --out cloud performance-test.js
```

### Load Test Profiles

#### 🟢 Light Load (Development)
```bash
k6 run --vus 10 --duration 1m performance-test.js
```
- 10 concurrent users
- 1 menit duration
- Cocok untuk: Dev environment testing

#### 🟡 Medium Load (Staging)
```bash
k6 run --vus 50 --duration 5m performance-test.js
```
- 50 concurrent users
- 5 menit duration
- Cocok untuk: Pre-production testing

#### 🔴 Heavy Load (Production Simulation)
```bash
k6 run --vus 200 --duration 10m performance-test.js
```
- 200 concurrent users
- 10 menit duration
- Cocok untuk: Production capacity planning

#### ⚠️ Stress Test (Break Point)
```bash
k6 run --vus 500 --duration 5m performance-test.js
```
- 500 concurrent users
- 5 menit duration
- Cocok untuk: Finding system limits

### Advanced Options

#### Test dengan Custom Thresholds
```bash
k6 run --no-thresholds performance-test.js
```

#### Test dengan Verbose Output
```bash
k6 run --verbose performance-test.js
```

#### Test dengan Specific Stage
Create custom test file:
```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};
```

---

## 📈 Membaca Hasil Test

### Console Output

Setelah test selesai, Anda akan melihat summary seperti ini:

```
================================================================================
  AF-KOMIK V2 - PERFORMANCE TEST SUMMARY
================================================================================

📊 Request Statistics:
  Total Requests: 45678
  Requests/sec: 76.13

⏱️  Response Times:
  Average: 156.23ms
  Median (p50): 142.50ms
  95th percentile: 385.12ms
  99th percentile: 892.45ms
  Max: 1523.67ms

✅ Success Rate:
  Passed Checks: 98.76%
  Failed Requests: 1.24%

🚀 Cache Performance:
  Cache Hit Rate: 67.89%

🎯 Performance Assessment:
  ✅ EXCELLENT - All thresholds met!
```

### Metrics Explained

#### Response Time Metrics
- **Average**: Rata-rata waktu response
- **Median (p50)**: 50% request lebih cepat dari nilai ini
- **p95**: 95% request lebih cepat dari nilai ini (target: < 500ms)
- **p99**: 99% request lebih cepat dari nilai ini (target: < 1000ms)
- **Max**: Response time paling lambat

#### Success Metrics
- **Passed Checks**: Persentase test yang berhasil (target: > 95%)
- **Failed Requests**: Persentase request yang error (target: < 5%)

#### Performance Metrics
- **Requests/sec**: Throughput aplikasi (target: > 100 req/s)
- **Cache Hit Rate**: Efektivitas caching (target: > 60%)

### HTML Report

HTML report akan tersimpan di `tests/k6/results/summary.html` dan berisi:

- ✅ **Visual Dashboard** dengan metric cards
- ✅ **Response Time Distribution** table
- ✅ **Performance Assessment** dengan rekomendasi
- ✅ **Pretty UI** untuk presentasi

Buka dengan browser:
```bash
# Windows
start tests/k6/results/summary.html

# macOS
open tests/k6/results/summary.html

# Linux
xdg-open tests/k6/results/summary.html
```

### JSON Output

Untuk analysis lebih lanjut:
```bash
k6 run --out json=results.json performance-test.js

# Parse dengan jq
cat results.json | jq '.metrics.http_req_duration'
```

---

## 🎯 Threshold & Performance Target

### Default Thresholds

| Metric | Target | Critical |
|--------|--------|----------|
| **p95 Response Time** | < 500ms | < 1000ms |
| **p99 Response Time** | < 1000ms | < 2000ms |
| **Error Rate** | < 5% | < 10% |
| **Cache Hit Rate** | > 60% | > 40% |
| **Throughput** | > 100 req/s | > 50 req/s |
| **Check Success Rate** | > 95% | > 90% |

### Performance Ratings

#### ✅ EXCELLENT
- p95 < 500ms
- Error rate < 5%
- Cache hit rate > 60%
- All checks pass > 95%

**Status**: Production ready!

#### ⚠️ GOOD
- p95 < 1000ms
- Error rate < 10%
- Cache hit rate > 40%
- All checks pass > 90%

**Status**: Minor optimization needed

#### ❌ NEEDS IMPROVEMENT
- p95 > 1000ms
- Error rate > 10%
- Cache hit rate < 40%
- Checks pass < 90%

**Status**: Significant issues, action required

---

## 💡 Tips & Best Practices

### Before Running Tests

1. **Warm up server**
   ```bash
   # Run quick test first to warm caches
   k6 run --vus 5 --duration 30s performance-test.js
   ```

2. **Check system resources**
   - Ensure server has adequate CPU/Memory
   - Check database connections are available
   - Verify Redis/cache is running

3. **Backup database** (for production-like tests)
   ```bash
   # MySQL backup
   mysqldump -u user -p database_name > backup.sql
   ```

### During Tests

1. **Monitor server metrics**
   - CPU usage
   - Memory usage
   - Database connection pool
   - Cache hit rates

2. **Watch for errors**
   - Check application logs
   - Monitor error rates in k6 output
   - Look for database deadlocks

### After Tests

1. **Analyze bottlenecks**
   - Identify slowest endpoints
   - Check database slow queries
   - Review cache miss patterns

2. **Compare results**
   - Baseline vs current test
   - Before vs after optimization
   - Dev vs staging vs production

3. **Share results**
   - Save HTML report
   - Share metrics with team
   - Document improvements

### Optimization Checklist

When performance is below target:

- [ ] **Database**
  - Add proper indexes
  - Optimize slow queries
  - Increase connection pool
  - Use query caching

- [ ] **Caching**
  - Increase cache TTL
  - Warm cache on startup
  - Implement cache prefetching
  - Use cache hierarchies (L1/L2)

- [ ] **Application**
  - Optimize N+1 queries
  - Reduce payload size
  - Enable compression
  - Implement pagination

- [ ] **Infrastructure**
  - Scale horizontally (more servers)
  - Scale vertically (bigger servers)
  - Use CDN for static assets
  - Optimize network latency

---

## 📝 Custom Test Scenarios

### Create Custom Test

Create `tests/k6/custom-test.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  // Your custom test logic
  const res = http.get('https://comic.mikan.my.id/comics');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

Run:
```bash
k6 run tests/k6/custom-test.js
```

### Spike Test

Test sudden traffic spike:

```javascript
export const options = {
  stages: [
    { duration: '10s', target: 10 },    // Normal traffic
    { duration: '10s', target: 500 },   // Sudden spike!
    { duration: '20s', target: 500 },   // Stay high
    { duration: '10s', target: 10 },    // Back to normal
  ],
};
```

### Soak Test

Test long-duration stability:

```javascript
export const options = {
  vus: 50,
  duration: '4h', // Run for 4 hours
};
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: High error rate
**Solution**: 
- Check server logs for errors
- Verify database connections
- Ensure Redis is running
- Check memory/CPU usage

#### Issue: Slow response times
**Solution**:
- Enable query logging
- Check database indexes
- Review cache hit rates
- Profile slow endpoints

#### Issue: k6 crashes
**Solution**:
- Reduce VUs count
- Increase system ulimit
- Add more sleep() calls
- Use --compatibility-mode

#### Issue: Results not consistent
**Solution**:
- Run multiple tests for average
- Ensure server state is reset
- Warm up caches first
- Test at different times

### Getting Help

- **K6 Documentation**: https://k6.io/docs/
- **K6 Community**: https://community.k6.io/
- **GitHub Issues**: https://github.com/grafana/k6/issues

---

## 📁 File Structure

```
tests/k6/
├── README.md                 # This file
├── performance-test.js       # Main comprehensive test
├── quick-test.js            # Quick 2-minute test
├── stress-test.js           # Stress/spike test
└── results/                 # Test results (auto-generated)
    ├── summary.html
    └── summary.json
```

---

## 🔗 Related Documentation

- [K6 Official Docs](https://k6.io/docs/)
- [K6 Test Types](https://k6.io/docs/test-types/introduction/)
- [K6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [K6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
- [K6 Cloud](https://k6.io/cloud/)

---

## 📊 Sample Results

### Before Optimization
```
Average Response Time: 856ms
p95: 1523ms
Error Rate: 8.2%
Cache Hit Rate: 23%
Throughput: 45 req/s
Rating: ❌ NEEDS IMPROVEMENT
```

### After Optimization
```
Average Response Time: 156ms
p95: 385ms
Error Rate: 1.2%
Cache Hit Rate: 68%
Throughput: 127 req/s
Rating: ✅ EXCELLENT
```

**Improvements:**
- 81% faster response time
- 75% reduction in p95
- 85% reduction in errors
- 196% increase in cache hits
- 182% increase in throughput

---

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Test

on:
  push:
    branches: [ main, staging ]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run k6 test
        run: k6 run tests/k6/performance-test.js
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: tests/k6/results/
```

---

## ✅ Checklist: Ready for Production

Before deploying to production, ensure:

- [ ] All performance tests pass
- [ ] p95 response time < 500ms
- [ ] Error rate < 5%
- [ ] Cache hit rate > 60%
- [ ] Stress test completed successfully
- [ ] Soak test (4h+) completed
- [ ] Database indexes optimized
- [ ] Monitoring & alerts configured
- [ ] Scaling strategy defined
- [ ] Rollback plan ready

---

**Happy Testing! 🚀**

For questions or issues, contact the DevOps team.
