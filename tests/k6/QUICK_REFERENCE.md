# K6 Quick Reference - Command Cheat Sheet

## 🚀 Quick Commands

### Using Helper Scripts

```bash
# Linux/macOS
./run-test.sh -t quick                # 2-min quick test
./run-test.sh -t full                 # 18-min full test
./run-test.sh -t stress               # Stress test
./run-test.sh -t spike                # Spike test
./run-test.sh -t soak                 # 4-hour soak test

# Windows
.\run-test.ps1 -Type quick
.\run-test.ps1 -Type full
.\run-test.ps1 -Type stress
.\run-test.ps1 -Type spike
.\run-test.ps1 -Type soak
```

### Using NPM

```bash
npm run test:quick          # Quick test
npm test                    # Full test
npm run test:stress         # Stress test
npm run test:spike          # Spike test
npm run test:soak           # Soak test (4h)
npm run test:soak:short     # Soak test (30m)
```

### Direct k6 Commands

```bash
k6 run quick-test.js                           # Quick test
k6 run performance-test.js                     # Full test
k6 run stress-test.js                          # Stress test
k6 run spike-test.js                           # Spike test
k6 run soak-test.js                            # Soak test
```

---

## ⚙️ Common Options

### Custom VUs and Duration
```bash
k6 run --vus 100 --duration 5m performance-test.js
```

### Custom Environment
```bash
k6 run -e BASE_URL=http://localhost:3000 performance-test.js
k6 run -e BASE_URL=https://staging.comic.mikan.my.id performance-test.js
```

### Save Results
```bash
k6 run --out json=results/test-$(date +%Y%m%d).json performance-test.js
```

### Quiet Mode (CI/CD)
```bash
k6 run --quiet --no-color performance-test.js
```

### Disable Thresholds
```bash
k6 run --no-thresholds performance-test.js
```

### Verbose Output
```bash
k6 run --verbose performance-test.js
```

---

## 🎯 Load Profiles

### Light Load (Development)
```bash
k6 run --vus 10 --duration 1m performance-test.js
```

### Medium Load (Staging)
```bash
k6 run --vus 50 --duration 5m performance-test.js
```

### Heavy Load (Production)
```bash
k6 run --vus 200 --duration 10m performance-test.js
```

---

## 📊 Performance Targets

| Metric | Target | Command to Check |
|--------|--------|------------------|
| **p95 Response Time** | < 500ms | Look for `p(95)` in output |
| **p99 Response Time** | < 1000ms | Look for `p(99)` in output |
| **Error Rate** | < 5% | Look for `http_req_failed` |
| **Cache Hit Rate** | > 60% | Look for `cache_hit_rate` |
| **Throughput** | > 100 req/s | Look for `http_reqs` rate |

---

## 🔍 Monitoring During Test

### Server Resources
```bash
htop                          # CPU/Memory
iostat -x 1                   # Disk I/O
netstat -an | grep 3000       # Network connections
```

### Database
```bash
mysql -e "SHOW PROCESSLIST;"
mysql -e "SHOW ENGINE INNODB STATUS;"
```

### Redis
```bash
redis-cli INFO memory
redis-cli INFO stats
redis-cli --latency
redis-cli SLOWLOG GET 10
```

### Application Logs
```bash
tail -f logs/app.log
tail -f logs/error.log | grep ERROR
```

---

## 📁 File Structure

```
tests/k6/
├── README.md                 # Overview & quick start
├── TESTING_GUIDE.md         # Complete testing guide
├── QUICK_REFERENCE.md       # This file (cheat sheet)
├── package.json             # NPM scripts
├── config.js                # Configuration & test data
├── performance-test.js      # Main comprehensive test (18m)
├── quick-test.js           # Quick validation (2m)
├── stress-test.js          # Stress test (19m)
├── spike-test.js           # Spike test (15m)
├── soak-test.js            # Endurance test (4h)
├── run-test.sh             # Helper script (Linux/Mac)
├── run-test.ps1            # Helper script (Windows)
├── utils/
│   └── helpers.js          # Reusable utilities
└── results/                # Test results (auto-generated)
    ├── .gitignore
    ├── .gitkeep
    ├── summary.html        # HTML report
    └── summary.json        # JSON results
```

---

## 🚨 Quick Troubleshooting

### High error rate?
```bash
# Check logs
tail -f logs/app.log | grep ERROR

# Check database
mysql -e "SHOW PROCESSLIST;"

# Check Redis
redis-cli INFO memory
```

### Slow responses?
```bash
# Check slow queries
tail -f /var/log/mysql/slow-query.log

# Check Redis latency
redis-cli --latency

# Check cache hit rate in k6 output
```

### k6 crashes?
```bash
# Increase file descriptors
ulimit -n 10000

# Reduce load
k6 run --vus 10 --duration 1m performance-test.js

# Use compatibility mode
k6 run --compatibility-mode=base performance-test.js
```

---

## 🔗 Useful Links

- **k6 Documentation**: https://k6.io/docs/
- **k6 Examples**: https://k6.io/docs/examples/
- **k6 Metrics**: https://k6.io/docs/using-k6/metrics/
- **k6 Thresholds**: https://k6.io/docs/using-k6/thresholds/
- **k6 Community**: https://community.k6.io/

---

## 📞 Getting Help

1. Check [README.md](README.md) for overview
2. Read [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed guide
3. Check k6 documentation: https://k6.io/docs/
4. Ask in k6 community: https://community.k6.io/
5. Contact DevOps team

---

## ✅ Quick Pre-Production Checklist

Before deploying to production:

- [ ] Run `npm run test:quick` - passes
- [ ] Run `npm test` - all thresholds met
- [ ] Run `npm run test:stress` - breaking point > 200 users
- [ ] Run `npm run test:spike` - system recovers gracefully
- [ ] Cache hit rate > 60%
- [ ] p95 response time < 500ms
- [ ] Error rate < 5%
- [ ] Monitoring configured
- [ ] Auto-scaling tested

---

**Quick Start**:
1. Install k6: `choco install k6` (Windows) or `brew install k6` (macOS)
2. Run quick test: `npm run test:quick`
3. Check results: Open `results/summary.html`
4. If all green ✅, you're good to go!

---

**Pro Tips 💡**:
- Always warm up cache before testing
- Monitor server during tests
- Compare results with baseline
- Run tests before major deployments
- Schedule weekly stress tests
- Document all findings

---

For detailed information, see full documentation:
- [README.md](README.md) - Overview & setup
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Complete guide
