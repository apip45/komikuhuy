# AF-Komik Scraper

Scraper mandiri untuk mengambil data komik dari komiku.org dan menyimpannya ke database MySQL.

## 📋 Daftar Isi

1. [Tujuan](#-tujuan)
2. [Mode Scraping](#-mode-scraping)
   - [Full Scrape](#1-full-scrape-scrap-alljs)
   - [Periodic Scrape](#2-periodic-scrape-scrap-latestjs)
   - [Fix Chapters](#3-fix-chapters-fix-chaptersjs)
3. [Fitur Utama](#-fitur-utama)
4. [Struktur Folder](#-struktur-folder)
5. [Instalasi](#-instalasi)
6. [Konfigurasi](#-konfigurasi)
7. [Cara Menjalankan](#-cara-menjalankan)
8. [Contoh Output](#-contoh-output)
9. [Catatan Penting](#-catatan-penting)

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
| `komik` | id, param, title, thumbnail, description, synopsis, genres, latest_chapter, **status**, **author**, **comic_type**, **last_scraped**, updated_at |
| `chapter` | id, komik_id, param, chapter_label, release_date |
| `image` | id, chapter_id, page_number, image_url |

> 💡 **Auto-Migration**: Kolom baru (status, author, comic_type, last_scraped) akan ditambahkan otomatis saat scraper pertama kali dijalankan.

> ⚠️ **Penting**: Scraper ini hanya menyimpan URL gambar, TIDAK mengunduh file gambar ke server.

---

## 🔄 Mode Scraping

### 1. FULL SCRAPE (`scrap-all.js`)

Mode untuk scraping pertama kali atau refresh total database.

**Karakteristik:**
- Mengambil SEMUA halaman daftar komik
- Mengambil detail SEMUA komik
- Mengambil SEMUA chapter dan gambar
- ✨ **Auto-Resume**: Otomatis lanjut dari halaman terakhir jika terputus
- ✨ **Chapter Sync**: Mendeteksi dan mengisi chapter yang hilang
- Waktu eksekusi: berjam-jam hingga berhari-hari
- Direkomendasikan untuk inisialisasi pertama

**Kapan Digunakan:**
- Setup pertama kali
- Reset database
- Migrasi data
- Melanjutkan scraping yang terputus

### 2. PERIODIC SCRAPE (`scrap-latest.js`)

Mode untuk update berkala database.

**Karakteristik:**
- Hanya scan ±10 halaman terbaru
- Maksimal ±100 komik per eksekusi
- ✨ **Chapter Sync**: Mendeteksi dan mengisi chapter yang hilang (bukan hanya chapter baru)
- Waktu eksekusi: 15-60 menit
- Direkomendasikan via cron job

**Kapan Digunakan:**
- Update harian/per-jam
- Menambah chapter baru
- Memperbaiki chapter yang hilang
- Sinkronisasi dengan website

### 3. SINGLE COMIC SCRAPE (`scrap-single.js`) ⭐ NEW

Mode untuk scraping komik spesifik berdasarkan parameter.

**Karakteristik:**
- Mengambil data untuk 1 komik saja (berdasarkan parameter URL)
- Mengambil detail komik dan semua chapter
- Ideal untuk komik yang terlewat atau perlu di-update
- Waktu eksekusi: 1-10 menit (tergantung jumlah chapter)
- Dapat dijalankan via admin dashboard atau command line

**Kapan Digunakan:**
- Komik tertentu tidak ter-scrape dari full/periodic scraper
- Update manual untuk komik tertentu
- Menambahkan komik baru yang baru muncul di Komiku
- Perbedaan data antara API Komiku dan web Komiku asli

**Cara Menggunakan:**
```bash
# Via command line
node scrap-single.js one-piece
node scrap-single.js naruto --skip-images
node scrap-single.js bleach --skip-chapters

# Via Admin Dashboard
# 1. Masuk ke menu Admin > Scraper
# 2. Scroll ke bagian "Scrape Specific Comic"
# 3. Masukkan parameter komik (contoh: one-piece)
# 4. Klik tombol "Scrape Single Comic"
```

**Contoh Parameter:**
- URL: `https://komiku.org/manga/one-piece/` → Parameter: `one-piece`
- URL: `https://komiku.org/manga/detective-conan/` → Parameter: `detective-conan`
- URL: `https://komiku.org/manga/black-clover/` → Parameter: `black-clover`

### 4. FIX CHAPTERS (`fix-chapters.js`)

Mode khusus untuk memperbaiki chapter yang tidak lengkap.

**Karakteristik:**
- Scan database untuk komik dengan chapter tidak lengkap
- Bandingkan dengan website dan tambahkan chapter yang hilang
- Tidak menghapus data yang sudah ada
- Waktu eksekusi: tergantung jumlah komik yang diperbaiki

**Kapan Digunakan:**
- Setelah full scrape selesai, untuk memastikan data lengkap
- Ketika menemukan komik dengan chapter yang loncat (misal: ch 1 → ch 14 → ch 20)
- Perbaikan data berkala

**Contoh Masalah yang Diperbaiki:**
```
❌ Sebelum: Chapter 1, 14, 20, 55, 89 (banyak yang hilang)
✅ Sesudah: Chapter 1, 2, 3, ... 14, 15, ... 89 (lengkap)
```

---

## ✨ Fitur Utama

### Auto-Resume (Full Scrape)

Full scraper menyimpan progress ke file `progress-full.json`. Jika scraping terputus (error, timeout, manual stop), scraper akan otomatis melanjutkan dari halaman terakhir saat dijalankan kembali.

```json
// progress-full.json
{
  "lastCompletedPage": 25,
  "lastComic": "one-piece",
  "totalComicsProcessed": 625,
  "lastUpdated": "2026-01-05T10:30:00.000Z"
}
```

### Chapter Sync System

Semua mode scraping menggunakan sistem **Chapter Sync** yang cerdas:

1. **Ambil daftar chapter** dari website
2. **Bandingkan** dengan chapter di database
3. **Identifikasi** chapter yang hilang (di website tapi tidak di DB)
4. **Insert** HANYA chapter yang hilang
5. **Scrape gambar** untuk chapter baru

```
Website: Ch 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
DB:      Ch 1, 2,       5, 6,       9, 10
                  ↓ Sync ↓
Missing: Ch    3, 4,       7, 8
                  ↓ Insert ↓  
DB:      Ch 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ✅
```

### Smart Metadata Update

Scraper secara otomatis mengambil metadata tambahan:
- **Status**: Ongoing, Completed, dll
- **Author**: Nama author/artist
- **Comic Type**: Manga, Manhwa, Manhua
- **Last Scraped**: Timestamp kapan terakhir di-scrape

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
├── scrap-all.js           # Entry point: Full scrape (dengan auto-resume)
├── scrap-latest.js        # Entry point: Periodic scrape
├── fix-chapters.js        # Entry point: Fix missing chapters
├── progress-full.json     # File progress auto-resume (auto-generated)
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
  status VARCHAR(100),
  author VARCHAR(500),
  comic_type VARCHAR(100),
  last_scraped TIMESTAMP,
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

# Scrape semua komik (auto-resume dari progress terakhir)
node scrap-all.js

# Scrape dengan auto-resume (default)
node scrap-all.js --resume

# Reset progress dan mulai dari awal
node scrap-all.js --reset

# Scrape dengan opsi halaman
node scrap-all.js --start-page 1 --end-page 10

# Dry run (tanpa simpan ke database)
node scrap-all.js --dry-run

# Skip scraping gambar
node scrap-all.js --skip-images
```

**Opsi Full Scrape:**

| Opsi | Deskripsi |
|------|-----------|
| `--resume` | Lanjutkan dari halaman terakhir (default) |
| `--reset` | Reset progress dan mulai dari halaman 1 |
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

### Fix Chapters (Perbaikan)

```bash
cd /path/to/AF-Komik-V2/server/scraper

# Fix semua komik dengan chapter tidak lengkap
node fix-chapters.js

# Fix komik spesifik (by param atau title)
node fix-chapters.js --comic solo-leveling
node fix-chapters.js --comic "Solo Leveling"

# Limit jumlah komik yang diperbaiki
node fix-chapters.js --limit 50

# Preview mode (tidak menyimpan ke DB)
node fix-chapters.js --dry-run

# Skip scraping gambar
node fix-chapters.js --skip-images
```

**Opsi Fix Chapters:**

| Opsi | Deskripsi |
|------|-----------|
| `--comic <param>` | Fix komik spesifik (by param atau title) |
| `--limit <n>` | Maksimal komik yang diperbaiki |
| `--skip-images` | Skip scraping gambar chapter baru |
| `--dry-run` | Preview tanpa simpan ke DB |
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
2026-01-02 10:00:00 [INFO ] Resume mode: Starting from page 1
2026-01-02 10:00:00 [INFO ] Options: {"startPage":1,"endPage":0,"skipChapters":false}
2026-01-02 10:00:00 [INFO ] Initializing MySQL connection pool...
2026-01-02 10:00:01 [INFO ] MySQL connection test successful
============================================================
                     Phase 1: Comic List                     
============================================================
2026-01-02 10:00:02 [INFO ] Scraping comic list page 1: https://komiku.org/daftar-komik/page/1/
2026-01-02 10:00:03 [INFO ] Found 50 comics on page 1
2026-01-02 10:00:04 [INFO ] Progress saved: page 1, 50 comics processed
...
============================================================
                    Phase 2: Comic Details                   
============================================================
2026-01-02 10:05:00 [INFO ] [Comics] Progress: 1/500 - one-piece
2026-01-02 10:05:02 [INFO ] Comic inserted: one-piece (ID: 1)
2026-01-02 10:05:03 [INFO ] Chapter sync: 0 existing, 15 from website, 15 missing
2026-01-02 10:05:02 [INFO ] Inserted 15 new chapters for one-piece
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

### Fix Chapters

```
============================================================
                  AF-KOMIK FIX CHAPTERS                      
============================================================
2026-01-02 20:00:00 [INFO ] Starting fix chapters...
2026-01-02 20:00:00 [INFO ] Options: {"limit":0,"skipImages":false,"dryRun":false}
============================================================
           Phase 1: Finding Comics with Missing Chapters     
============================================================
2026-01-02 20:00:05 [INFO ] Found 25 comics with potentially incomplete chapters
============================================================
              Phase 2: Syncing Missing Chapters              
============================================================
2026-01-02 20:00:10 [INFO ] [Fix] Progress: 1/25 - one-piece
2026-01-02 20:00:12 [INFO ] Chapter sync: 85 existing, 120 from website, 35 missing
2026-01-02 20:00:15 [INFO ] Inserted 35 missing chapters for one-piece
...
============================================================
                     FIX COMPLETE                            
============================================================
2026-01-02 21:30:00 [INFO ] Duration: 90 minutes

Comics:
  Checked:      25
  Fixed:        18
  Already OK:   7
  Failed:       0

Chapters:
  Missing:      450
  Inserted:     450
  Failed:       0

Images:
  Inserted:     7200
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
| Fix Chapters | 30-120 menit | Sedang |
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

### Progress File

File progress untuk auto-resume: `progress-full.json`

Untuk reset progress:
```bash
# Via command line option
node scrap-all.js --reset

# Atau hapus file manual
rm progress-full.json
```

---

## 🎛️ Admin Panel

Scraper dapat dijalankan melalui Admin Panel di `/admin/scraper`:

| Tombol | Endpoint | Fungsi |
|--------|----------|--------|
| Full Scrape | `POST /admin/scraper/full` | Jalankan scrap-all.js --resume |
| Latest Scrape | `POST /admin/scraper/latest` | Jalankan scrap-latest.js |
| Fix Chapters | `POST /admin/scraper/fix-chapters` | Jalankan fix-chapters.js |
| Reset Progress | `POST /admin/scraper/reset-progress` | Reset progress auto-resume |
| Get Progress | `GET /admin/scraper/progress` | Lihat progress terakhir |

---

## 📞 Dukungan

Jika mengalami masalah:

1. Cek log di `logs/scraper.log`
2. Pastikan koneksi database OK
3. Test akses website manual
4. Cek konfigurasi di `.env`

---

*Scraper ini dibuat untuk keperluan pembelajaran dan pengembangan. Gunakan secara bertanggung jawab.*
