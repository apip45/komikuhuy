# AF-Komik Scraper

Scraper mandiri untuk mengambil data komik dari komiku.org dan menyimpannya ke database MySQL.

## 📋 Daftar Isi

1. [Tujuan](#-tujuan)
2. [Mode Scraping](#-mode-scraping)
3. [Struktur Folder](#-struktur-folder)
4. [Instalasi](#-instalasi)
5. [Konfigurasi](#-konfigurasi)
6. [Cara Menjalankan](#-cara-menjalankan)
7. [Contoh Output](#-contoh-output)
8. [Catatan Penting](#-catatan-penting)

---

## 🎯 Tujuan

Scraper ini dibuat untuk:

1. **Mengambil Daftar Komik** - Scrape seluruh daftar komik dari website
2. **Mengambil Detail Komik** - Judul, thumbnail, sinopsis, genre, dll
3. **Mengambil Daftar Chapter** - Semua chapter untuk setiap komik
4. **Mengambil URL Gambar** - URL gambar dari setiap chapter (TIDAK mengunduh file gambar)

### Data yang Disimpan

| Tabel | Field |
|-------|-------|
| `komik` | id, param, title, thumbnail, description, synopsis, genres, latest_chapter, updated_at |
| `chapter` | id, komik_id, param, chapter_label, release_date |
| `image` | id, chapter_id, page_number, image_url |

> ⚠️ **Penting**: Scraper ini hanya menyimpan URL gambar, TIDAK mengunduh file gambar ke server.

---

## 🔄 Mode Scraping

### 1. FULL SCRAPE (`scrap-all.js`)

Mode untuk scraping pertama kali atau refresh total database.

**Karakteristik:**
- Mengambil SEMUA halaman daftar komik
- Mengambil detail SEMUA komik
- Mengambil SEMUA chapter dan gambar
- Waktu eksekusi: berjam-jam hingga berhari-hari
- Direkomendasikan untuk inisialisasi pertama

**Kapan Digunakan:**
- Setup pertama kali
- Reset database
- Migrasi data

### 2. PERIODIC SCRAPE (`scrap-latest.js`)

Mode untuk update berkala database.

**Karakteristik:**
- Hanya scan ±10 halaman terbaru
- Maksimal ±100 komik per eksekusi
- Skip data yang sudah ada
- Waktu eksekusi: 15-60 menit
- Direkomendasikan via cron job

**Kapan Digunakan:**
- Update harian/per-jam
- Menambah chapter baru
- Sinkronisasi dengan website

---

## 📁 Struktur Folder

```
/scraper
│
├── /config
│   ├── db.js              # Koneksi MySQL standalone
│   ├── logger.js          # Logger dengan file output
│   └── scraper.config.js  # Konfigurasi scraper
│
├── /utils
│   ├── http.js            # Axios instance dengan headers
│   ├── delay.js           # Utilitas delay antar request
│   └── retry.js           # Logika retry saat error
│
├── /services
│   ├── comic.service.js   # CRUD operasi tabel komik
│   ├── chapter.service.js # CRUD operasi tabel chapter
│   └── image.service.js   # CRUD operasi tabel image
│
├── /scrapers
│   ├── comicList.scraper.js   # Scraper halaman daftar komik
│   ├── comicDetail.scraper.js # Scraper halaman detail komik
│   └── chapter.scraper.js     # Scraper halaman chapter
│
├── scrap-all.js           # Entry point: Full scrape
├── scrap-latest.js        # Entry point: Periodic scrape
└── README.md              # Dokumentasi ini
```

---

## 📦 Instalasi

### 1. Install Dependencies

Pastikan berada di direktori `/server`:

```bash
cd /path/to/AF-Komik-V2/server
npm install
```

Dependencies yang dibutuhkan (sudah ada di package.json utama):
- `axios` - HTTP client
- `cheerio` - HTML parser
- `mysql2` - MySQL driver
- `dotenv` - Environment variables

### 2. Setup Environment

Pastikan file `.env` sudah dikonfigurasi dengan kredensial MySQL:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=af_komik
```

### 3. Setup Database

Pastikan tabel MySQL sudah dibuat:

```sql
-- Tabel Komik
CREATE TABLE IF NOT EXISTS komik (
  id INT AUTO_INCREMENT PRIMARY KEY,
  param VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  thumbnail VARCHAR(1000),
  description TEXT,
  synopsis TEXT,
  genres JSON,
  latest_chapter VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Chapter
CREATE TABLE IF NOT EXISTS chapter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  komik_id INT NOT NULL,
  param VARCHAR(255) NOT NULL,
  chapter_label VARCHAR(255),
  release_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (komik_id) REFERENCES komik(id) ON DELETE CASCADE,
  UNIQUE KEY unique_chapter (komik_id, param)
);

-- Tabel Image
CREATE TABLE IF NOT EXISTS image (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_id INT NOT NULL,
  page_number INT NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE
);

-- Index untuk performa
CREATE INDEX idx_komik_param ON komik(param);
CREATE INDEX idx_chapter_komik ON chapter(komik_id);
CREATE INDEX idx_image_chapter ON image(chapter_id);
```

---

## ⚙️ Konfigurasi

File konfigurasi: `config/scraper.config.js`

### Pengaturan Utama

```javascript
module.exports = {
  // Target website
  baseUrl: 'https://komiku.org',
  
  // Delay antar request (ms)
  delay: {
    betweenPages: 1500,    // Delay antar halaman daftar
    betweenComics: 1000,   // Delay antar komik
    betweenChapters: 800,  // Delay antar chapter
    randomExtra: 500       // Delay random tambahan
  },
  
  // Pengaturan retry
  retry: {
    maxAttempts: 3,        // Maksimal percobaan
    initialDelay: 2000,    // Delay awal retry
    maxDelay: 10000        // Delay maksimal retry
  },
  
  // Batasan
  limits: {
    latestPageLimit: 10,   // Halaman untuk mode periodic
    latestComicLimit: 100  // Komik maksimal untuk periodic
  }
};
```

### Mengubah Delay

Jika website lambat merespon, tingkatkan delay:

```javascript
delay: {
  betweenPages: 3000,    // 3 detik
  betweenComics: 2000,   // 2 detik
  betweenChapters: 1500  // 1.5 detik
}
```

---

## 🚀 Cara Menjalankan

### Full Scrape (Inisialisasi)

```bash
cd /path/to/AF-Komik-V2/server/scraper

# Scrape semua komik
node scrap-all.js

# Scrape dengan opsi
node scrap-all.js --start-page 1 --end-page 10

# Dry run (tanpa simpan ke database)
node scrap-all.js --dry-run

# Skip scraping gambar
node scrap-all.js --skip-images
```

**Opsi Full Scrape:**

| Opsi | Deskripsi |
|------|-----------|
| `--start-page <n>` | Mulai dari halaman ke-n |
| `--end-page <n>` | Berhenti di halaman ke-n |
| `--skip-chapters` | Hanya scrape metadata komik |
| `--skip-images` | Skip scraping URL gambar |
| `--dry-run` | Parsing tanpa simpan ke DB |
| `--help` | Tampilkan bantuan |

### Periodic Scrape (Update)

```bash
cd /path/to/AF-Komik-V2/server/scraper

# Update dengan setting default
node scrap-latest.js

# Custom jumlah halaman dan limit
node scrap-latest.js --pages 5 --limit 50

# Dry run
node scrap-latest.js --dry-run
```

**Opsi Periodic Scrape:**

| Opsi | Deskripsi |
|------|-----------|
| `--pages <n>` | Jumlah halaman terbaru yang discan |
| `--limit <n>` | Maksimal komik yang diproses |
| `--skip-images` | Skip scraping gambar baru |
| `--dry-run` | Parsing tanpa simpan ke DB |
| `--help` | Tampilkan bantuan |

### Setup Cron Job

Untuk update otomatis setiap 6 jam:

```bash
# Edit crontab
crontab -e

# Tambahkan baris ini
0 */6 * * * cd /path/to/AF-Komik-V2/server/scraper && node scrap-latest.js >> /var/log/scraper.log 2>&1
```

---

## 📊 Contoh Output

### Full Scrape

```
============================================================
                    AF-KOMIK FULL SCRAPER                    
============================================================
2026-01-02 10:00:00 [INFO ] Starting full scrape...
2026-01-02 10:00:00 [INFO ] Options: {"startPage":1,"endPage":0,"skipChapters":false}
2026-01-02 10:00:00 [INFO ] Initializing MySQL connection pool...
2026-01-02 10:00:01 [INFO ] MySQL connection test successful
============================================================
                     Phase 1: Comic List                     
============================================================
2026-01-02 10:00:02 [INFO ] Scraping comic list page 1: https://komiku.org/daftar-komik/page/1/
2026-01-02 10:00:03 [INFO ] Found 50 comics on page 1
2026-01-02 10:00:04 [INFO ] [Comic List] Progress: 1/∞ - 50 comics total
...
============================================================
                    Phase 2: Comic Details                   
============================================================
2026-01-02 10:05:00 [INFO ] [Comics] Progress: 1/500 - one-piece
2026-01-02 10:05:02 [INFO ] Comic inserted: one-piece (ID: 1)
2026-01-02 10:05:02 [INFO ] Found 15 new chapters for one-piece
...
============================================================
                     SCRAPING COMPLETE                       
============================================================
2026-01-02 12:30:00 [INFO ] Duration: 150 minutes

Comics:
  Scraped:  500
  Inserted: 480
  Updated:  20
  Failed:   0

Chapters:
  Scraped:  15000
  Inserted: 14500
  Skipped:  500
  Failed:   0

Images:
  Scraped:  180000
  Inserted: 175000
  Skipped:  5000
  Failed:   0
```

### Periodic Scrape

```
============================================================
                  AF-KOMIK PERIODIC SCRAPER                  
============================================================
2026-01-02 18:00:00 [INFO ] Starting periodic update...
2026-01-02 18:00:00 [INFO ] Options: pages=10, limit=100, dryRun=false
============================================================
                Phase 1: Scanning Latest Updates             
============================================================
2026-01-02 18:00:05 [INFO ] Found 100 comics, processing 100
============================================================
                   Phase 2: Updating Comics                  
============================================================
2026-01-02 18:00:06 [INFO ] [Update] Progress: 1/100 - solo-leveling
2026-01-02 18:00:08 [INFO ] Found 2 new chapters for solo-leveling
...
============================================================
                      UPDATE COMPLETE                        
============================================================
2026-01-02 18:45:00 [INFO ] Duration: 2700 seconds

Comics:
  Scanned:      100
  Updated:      25
  With New Ch:  15
  Failed:       0

Chapters:
  New:          45
  Skipped:      1200
  Failed:       0

Images:
  Inserted:     720
  Failed:       0
```

---

## ⚠️ Catatan Penting

### Etika Scraping

1. **Hormati Rate Limit** - Jangan set delay terlalu rendah
2. **Gunakan User-Agent yang Jelas** - Sudah dikonfigurasi di `scraper.config.js`
3. **Jangan Spam Request** - Gunakan cron dengan interval yang wajar (6+ jam)
4. **Respect robots.txt** - Cek dan patuhi aturan website

### Performa

| Mode | Estimasi Waktu | Beban Server |
|------|----------------|--------------|
| Full Scrape | 2-6 jam | Tinggi |
| Periodic (10 hal) | 15-30 menit | Rendah |
| Periodic (5 hal) | 5-15 menit | Sangat Rendah |

### Troubleshooting

**Error: Connection refused**
```bash
# Cek koneksi MySQL
mysql -u root -p -h localhost

# Pastikan MySQL service running
sudo systemctl status mysql
```

**Error: Timeout**
```javascript
// Tingkatkan timeout di config
http: {
  timeout: 60000  // 60 detik
}
```

**Error: Too many connections**
```javascript
// Kurangi connection pool
connectionLimit: 3  // di db.js
```

**Website memblokir**
- Tingkatkan delay
- Gunakan VPN/proxy
- Cek apakah IP diblokir

### Log Files

Log disimpan di: `../logs/scraper.log`

Untuk melihat log real-time:
```bash
tail -f ../logs/scraper.log
```

---

## 📞 Dukungan

Jika mengalami masalah:

1. Cek log di `logs/scraper.log`
2. Pastikan koneksi database OK
3. Test akses website manual
4. Cek konfigurasi di `.env`

---

*Scraper ini dibuat untuk keperluan pembelajaran dan pengembangan. Gunakan secara bertanggung jawab.*
