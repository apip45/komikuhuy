# AF-Komik V2

Platform baca komik online yang dibangun dengan arsitektur modern, scalable, dan siap produksi.

---

## 📋 Daftar Isi

1. [Gambaran Umum Aplikasi](#-gambaran-umum-aplikasi)
2. [Tujuan Proyek](#-tujuan-proyek)
3. [Arsitektur Sistem](#-arsitektur-sistem)
4. [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
5. [Struktur Folder](#-struktur-folder)
6. [Desain Database](#-desain-database)
7. [Sistem Scraper](#-sistem-scraper)
8. [Logging System](#-logging-system)
9. [Environment Variables](#-environment-variables)
10. [Cara Install](#-cara-install)
11. [Cara Menjalankan](#-cara-menjalankan)
12. [Output Program](#-output-program)
13. [Catatan Production](#-catatan-production)
14. [Rencana Pengembangan Mobile App](#-rencana-pengembangan-mobile-app)

---

## 📖 Gambaran Umum Aplikasi

**AF-Komik V2** adalah platform web untuk membaca komik (manga, manhwa, manhua) secara online. Platform ini dirancang dengan arsitektur yang memungkinkan pengembangan skala besar dan integrasi dengan aplikasi mobile di masa depan.

### Fitur Utama (Direncanakan)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| 📚 Koleksi Komik | Ribuan judul komik dari berbagai sumber | Planned |
| 🔍 Pencarian | Filter berdasarkan judul, genre, status | Planned |
| 📖 Comic Reader | Reader responsif dengan lazy loading | Planned |
| 👤 Akun Pengguna | Registrasi, login, profil | Planned |
| ⭐ Bookmark | Simpan komik favorit | Planned |
| 📜 Riwayat Baca | Lacak progress membaca | Planned |
| 🔔 Notifikasi | Pemberitahuan chapter baru | Planned |
| 📱 Mobile App | Aplikasi Android/iOS | Planned |

### Karakteristik Platform

- **Dark Theme**: Tema gelap sebagai default untuk kenyamanan membaca
- **Neon Blue Accent**: Warna aksen biru neon untuk estetika modern
- **Responsive Design**: Tampilan optimal di desktop, tablet, dan mobile
- **Server-Side Rendering**: Menggunakan EJS untuk SEO yang lebih baik

---

## 🎯 Tujuan Proyek

### Tujuan Jangka Pendek (Phase 1)
1. Membangun fondasi proyek yang solid dan terstruktur
2. Menyiapkan koneksi database (MongoDB + MySQL)
3. Mengimplementasikan sistem logging
4. Membuat layout dasar dengan Tailwind CSS
5. Menyiapkan sistem autentikasi (struktur)

### Tujuan Jangka Menengah (Phase 2-3)
1. Implementasi sistem autentikasi lengkap
2. Pengembangan halaman browse dan search komik
3. Pembuatan comic reader
4. Sistem bookmark dan reading history
5. Admin panel untuk manajemen konten

### Tujuan Jangka Panjang (Phase 4+)
1. REST API untuk aplikasi mobile
2. Aplikasi mobile (React Native)
3. Push notifications
4. CDN integration
5. Redis caching

---

## 🏗️ Arsitektur Sistem

### Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AF-KOMIK V2 ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────────────────────────────────────────┐   │
│  │   Browser   │────▶│              EXPRESS.JS SERVER                   │   │
│  │   (Client)  │◀────│                                                  │   │
│  └─────────────┘     │  ┌─────────────────────────────────────────┐    │   │
│                      │  │              Middlewares                 │    │   │
│  ┌─────────────┐     │  │  • Body Parser (JSON, URL-encoded)       │    │   │
│  │   Mobile    │     │  │  • Session Middleware (connect-mongo)    │    │   │
│  │   App       │────▶│  │  • Authentication Middleware             │    │   │
│  │  (Future)   │◀────│  │  • Role Authorization Middleware         │    │   │
│  └─────────────┘     │  │  • Request Logger                        │    │   │
│                      │  └─────────────────────────────────────────┘    │   │
│                      │                                                  │   │
│                      │  ┌─────────────────────────────────────────┐    │   │
│                      │  │              Routes + Controllers        │    │   │
│                      │  │  • Index Routes (/, /login, /register)   │    │   │
│                      │  │  • Comic Routes (browse, detail, read)   │    │   │
│                      │  │  • User Routes (profile, bookmarks)      │    │   │
│                      │  │  • Admin Routes (management panel)       │    │   │
│                      │  │  • API Routes (for mobile apps)          │    │   │
│                      │  └─────────────────────────────────────────┘    │   │
│                      │                                                  │   │
│                      │  ┌─────────────────────────────────────────┐    │   │
│                      │  │              View Engine (EJS)           │    │   │
│                      │  │  • Layouts (main.ejs)                    │    │   │
│                      │  │  • Partials (navbar, footer)             │    │   │
│                      │  │  • Pages (home, login, register, etc.)   │    │   │
│                      │  │  • Error Pages (404, 500, 403)           │    │   │
│                      │  └─────────────────────────────────────────┘    │   │
│                      └─────────────────────────────────────────────────┘   │
│                                          │                                  │
│                          ┌───────────────┴───────────────┐                 │
│                          │                               │                 │
│                          ▼                               ▼                 │
│  ┌───────────────────────────────┐   ┌───────────────────────────────┐    │
│  │      MONGODB ATLAS            │   │           MYSQL                │    │
│  │      (User Data)              │   │      (Comic Content)           │    │
│  │                               │   │                                │    │
│  │  Collections:                 │   │  Tables:                       │    │
│  │  ├── users                    │   │  ├── komik                     │    │
│  │  │   • _id, username, email   │   │  │   • id, param, title        │    │
│  │  │   • password, role         │   │  │   • thumbnail, genres       │    │
│  │  │   • createdAt, updatedAt   │   │  │   • synopsis, latest_chapter│    │
│  │  │                            │   │  │                             │    │
│  │  ├── sessions                 │   │  ├── chapter                   │    │
│  │  │   • _id, expires, session  │   │  │   • id, komik_id, param     │    │
│  │  │                            │   │  │   • chapter_label           │    │
│  │  ├── bookmarks                │   │  │   • release_date            │    │
│  │  │   • userId, comicId        │   │  │                             │    │
│  │  │   • cachedData, createdAt  │   │  └── image                     │    │
│  │  │                            │   │      • id, chapter_id          │    │
│  │  └── readinghistories         │   │      • page_number, image_url  │    │
│  │      • userId, comicId        │   │                                │    │
│  │      • chapterId, progress    │   │                                │    │
│  └───────────────────────────────┘   └───────────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    SCRAPER (Separate CLI Program)                    │   │
│  │                                                                      │   │
│  │  • Runs independently from Express server                           │   │
│  │  • Writes ONLY to MySQL database                                    │   │
│  │  • Never imported into Express application                          │   │
│  │  • Modes: Full Scrape, Periodic Scrape                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Alasan Pemisahan Database

| Aspek | MongoDB | MySQL |
|-------|---------|-------|
| **Tipe Data** | User data yang fleksibel | Comic data yang terstruktur |
| **Keunggulan** | Schema-less, cepat untuk session | Relasi antar tabel, JOIN query |
| **Skalabilitas** | Horizontal scaling | Vertical scaling |
| **Use Case** | Session, user preferences | Relasi komik-chapter-image |

---

## 🛠️ Teknologi yang Digunakan

### Backend Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Node.js | ≥18.0.0 | JavaScript runtime |
| Express.js | ^4.18.2 | Web framework |
| EJS | ^3.1.9 | Template engine (SSR) |
| Mongoose | ^8.0.3 | MongoDB ODM |
| mysql2 | ^3.6.5 | MySQL driver dengan promise |

### Database

| Database | Layanan | Fungsi |
|----------|---------|--------|
| MongoDB | Atlas (Cloud) | Users, sessions, bookmarks, history |
| MySQL | Local/Cloud | Komik, chapter, image |

### Session & Security

| Package | Fungsi |
|---------|--------|
| express-session | Session management |
| connect-mongo | MongoDB session store |
| dotenv | Environment variables |

### Logging & Development

| Package | Fungsi |
|---------|--------|
| winston | Application logging |
| nodemon | Auto-reload development |

### Frontend (CDN)

| Teknologi | Fungsi |
|-----------|--------|
| Tailwind CSS | Utility-first CSS framework |

> **Catatan**: Tailwind CSS digunakan via CDN untuk menghindari build step yang kompleks. Ini cocok untuk development dan prototyping. Untuk production dengan performa optimal, pertimbangkan untuk menggunakan Tailwind build dengan purge CSS.

---

## 📁 Struktur Folder

```
/server
├── /config                      # Konfigurasi aplikasi
│   ├── logger.js               # Winston logger configuration
│   │                            # - Console logging dengan warna
│   │                            # - File logging (combined.log, error.log)
│   │                            # - Exception & rejection handlers
│   │
│   ├── mongo.js                # MongoDB connection configuration
│   │                            # - Mongoose connection setup
│   │                            # - Connection event handlers
│   │                            # - Graceful shutdown handling
│   │
│   ├── mysql.js                # MySQL pool configuration
│   │                            # - Connection pool creation
│   │                            # - Query & transaction helpers
│   │                            # - Pool close for shutdown
│   │
│   └── session.js              # Session middleware configuration
│                                # - express-session setup
│                                # - connect-mongo store
│                                # - Secure cookie options
│
├── /controllers                 # Request handlers
│   └── indexController.js      # Homepage, login, register handlers
│
├── /database                    # Database related files
│   └── schema.sql              # MySQL schema (komik, chapter, image)
│
├── /logs                        # Log files (auto-generated)
│   ├── combined.log            # All log levels
│   ├── error.log               # Error level only
│   ├── exceptions.log          # Uncaught exceptions
│   └── rejections.log          # Unhandled promise rejections
│
├── /middlewares                 # Custom middleware functions
│   ├── index.js                # Middleware exports
│   ├── auth.middleware.js      # isAuthenticated, isAuthenticatedAPI
│   └── role.middleware.js      # isAdmin, isAdminAPI, hasRole
│
├── /models                      # Data models
│   ├── /mongo                  # MongoDB models (Mongoose)
│   │   ├── index.js            # Model exports
│   │   ├── User.js             # User schema
│   │   ├── Bookmark.js         # Bookmark schema
│   │   └── ReadingHistory.js   # Reading history schema
│   │
│   └── /mysql                  # MySQL query helpers
│       ├── index.js            # Query exports
│       ├── Comic.js            # Comic queries
│       ├── Chapter.js          # Chapter queries
│       └── Page.js             # Page/Image queries
│
├── /public                      # Static files
│   ├── /css                    # Custom CSS files
│   │   └── styles.css          # Additional styles
│   ├── /js                     # Client-side JavaScript
│   │   └── main.js             # Main JS file
│   └── /images                 # Static images
│
├── /routes                      # Route definitions
│   └── index.js                # Main routes (/, /login, /register)
│
├── /views                       # EJS templates
│   ├── /layouts                # Layout templates
│   │   └── main.ejs            # Main layout (Tailwind CDN, dark theme)
│   │
│   ├── /partials               # Reusable components
│   │   ├── navbar.ejs          # Navigation bar
│   │   └── footer.ejs          # Footer
│   │
│   ├── /pages                  # Page templates
│   │   ├── home.ejs            # Homepage
│   │   ├── login.ejs           # Login page
│   │   └── register.ejs        # Registration page
│   │
│   └── /errors                 # Error pages
│       ├── 403.ejs             # Forbidden
│       ├── 404.ejs             # Not found
│       └── 500.ejs             # Server error
│
├── app.js                       # Application entry point
├── package.json                 # Dependencies & scripts
├── .env                         # Environment variables (tidak di-commit)
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore rules
└── README.md                    # Dokumentasi ini
```

---

## 💾 Desain Database

### MongoDB (User Data)

MongoDB Atlas digunakan untuk menyimpan data yang berhubungan dengan user karena:
- Schema fleksibel untuk data user yang mungkin berubah
- Performa tinggi untuk session storage
- Mudah diskala horizontal

#### Collection: users

```javascript
{
  _id: ObjectId,              // ID unik MongoDB
  username: String,           // Username unik (3-20 karakter)
  email: String,              // Email unik
  password: String,           // Password ter-hash (bcrypt)
  role: String,               // 'user' atau 'admin'
  isActive: Boolean,          // Status akun
  isEmailVerified: Boolean,   // Status verifikasi email
  profile: {
    avatar: String,           // URL avatar
    displayName: String       // Nama tampilan
  },
  createdAt: Date,            // Tanggal pembuatan akun
  updatedAt: Date             // Tanggal update terakhir
}
```

#### Collection: sessions

```javascript
{
  _id: String,                // Session ID
  expires: Date,              // Waktu kadaluarsa
  session: {
    cookie: Object,           // Cookie metadata
    userId: String,           // ID user yang login
    userRole: String          // Role user
  }
}
```

#### Collection: bookmarks

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // Reference ke users
  comicId: Number,            // ID komik di MySQL
  cachedData: {               // Cache untuk performa
    title: String,
    coverImage: String
  },
  notes: String,              // Catatan user (opsional)
  createdAt: Date
}
```

#### Collection: readinghistories

```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // Reference ke users
  comicId: Number,            // ID komik di MySQL
  chapterId: Number,          // ID chapter di MySQL
  chapterNumber: Number,      // Nomor chapter
  lastPage: Number,           // Halaman terakhir dibaca
  progress: Number,           // Progress 0-100%
  lastReadAt: Date            // Waktu baca terakhir
}
```

### MySQL (Comic Content)

MySQL digunakan untuk menyimpan data komik karena:
- Relasi yang jelas antara komik → chapter → image
- Performa query dengan JOIN
- Integritas data dengan foreign key

#### Diagram Relasi

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    komik    │───────│   chapter   │───────│    image    │
│             │  1:N  │             │  1:N  │             │
└─────────────┘       └─────────────┘       └─────────────┘
```

#### Table: komik

| Column | Type | Constraint | Deskripsi |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | ID unik komik |
| param | VARCHAR(255) | UNIQUE, NOT NULL | URL slug (one-piece) |
| title | VARCHAR(500) | NOT NULL | Judul komik |
| thumbnail | VARCHAR(1000) | | URL cover image |
| description | TEXT | | Deskripsi singkat |
| synopsis | TEXT | | Sinopsis lengkap |
| genres | JSON | | Array genre ["Action", "Adventure"] |
| latest_chapter | VARCHAR(50) | | Label chapter terbaru |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Waktu update |

#### Table: chapter

| Column | Type | Constraint | Deskripsi |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | ID unik chapter |
| komik_id | INT | FK → komik.id | Reference ke komik |
| param | VARCHAR(255) | NOT NULL | URL slug (chapter-100) |
| chapter_label | VARCHAR(100) | NOT NULL | Label tampilan "Chapter 100" |
| release_date | TIMESTAMP | | Tanggal rilis chapter |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu pembuatan record |

**Constraints:**
- `UNIQUE (komik_id, param)` - Tidak boleh ada chapter dengan param sama dalam satu komik
- `ON DELETE CASCADE` - Hapus komik → hapus semua chapter

#### Table: image

| Column | Type | Constraint | Deskripsi |
|--------|------|------------|-----------|
| id | INT | PK, AUTO_INCREMENT | ID unik image |
| chapter_id | INT | FK → chapter.id | Reference ke chapter |
| page_number | INT | NOT NULL | Nomor halaman (1, 2, 3, ...) |
| image_url | VARCHAR(1000) | NOT NULL | URL gambar halaman |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu pembuatan record |

**Constraints:**
- `UNIQUE (chapter_id, page_number)` - Tidak boleh ada page dengan nomor sama dalam satu chapter
- `ON DELETE CASCADE` - Hapus chapter → hapus semua image

---

## 🕷️ Sistem Scraper

Scraper adalah program CLI terpisah yang bertugas mengambil data komik dari sumber eksternal dan menyimpannya ke database MySQL.

### Prinsip Desain

1. **Terpisah dari Server** - Scraper tidak di-import ke Express app
2. **Write ke MySQL Only** - Hanya menulis ke database MySQL
3. **Idempotent** - Bisa dijalankan berulang tanpa duplikasi data
4. **Logging** - Mencatat semua aktivitas scraping

### Full Scrape

Full scrape digunakan untuk:
- Inisialisasi database pertama kali
- Menambah sumber komik baru
- Recovery setelah data corruption

```bash
# Contoh perintah (struktur saja, belum diimplementasi)
cd /scraper
node scrape.js --full --source="source_name"
```

**Proses Full Scrape:**
1. Fetch daftar semua komik dari sumber
2. Parse metadata (title, genre, synopsis, cover)
3. Fetch daftar chapter untuk setiap komik
4. Simpan URL image untuk setiap chapter
5. Update timestamp dan status

**Estimasi Waktu:**
- 1000 komik: ~2-4 jam (tergantung rate limiting)
- Gunakan dengan hati-hati untuk menghindari ban

### Periodic Scrape

Periodic scrape digunakan untuk update rutin konten baru.

```bash
# Contoh perintah (struktur saja, belum diimplementasi)
node scrape.js --update --since="24h"
```

**Jadwal yang Direkomendasikan:**

| Interval | Target | Deskripsi |
|----------|--------|-----------|
| 1 jam | Popular comics | Komik dengan rating/views tinggi |
| 6 jam | All ongoing | Semua komik dengan status ongoing |
| 24 jam | Metadata refresh | Update info seperti rating, view count |
| 7 hari | Full validation | Cek missing chapters, broken links |

**Implementasi dengan Cron:**

```bash
# Contoh crontab entries
0 * * * * cd /path/to/scraper && node scrape.js --update --popular
0 */6 * * * cd /path/to/scraper && node scrape.js --update --ongoing
0 3 * * * cd /path/to/scraper && node scrape.js --update --metadata
0 2 * * 0 cd /path/to/scraper && node scrape.js --validate
```

---

## 📝 Logging System

### Konfigurasi Winston

Sistem logging menggunakan Winston dengan konfigurasi berikut:

**Log Levels:**
- `error` - Error yang memerlukan perhatian segera
- `warn` - Warning untuk potensi masalah
- `info` - Informasi umum operasional
- `debug` - Detail debugging (hanya di development)

**Output Destinations:**

| File | Level | Deskripsi |
|------|-------|-----------|
| `logs/combined.log` | All | Semua level log |
| `logs/error.log` | Error only | Hanya error |
| `logs/exceptions.log` | - | Uncaught exceptions |
| `logs/rejections.log` | - | Unhandled promise rejections |
| Console | All | Output berwarna ke terminal |

**Format Log:**
```
[2026-01-02 10:30:45] INFO: Server running on port 3000
[2026-01-02 10:30:50] INFO: GET /
[2026-01-02 10:31:02] ERROR: Database connection failed
```

### Console Logging

Selain Winston, aplikasi juga menggunakan `console.log` langsung untuk tracking proses startup:

```
========================================
   AF-KOMIK V2 - Server Starting...    
========================================
[ENV] Environment variables loaded
[ENV] NODE_ENV: development
[ENV] PORT: 3000
[APP] Express module loaded
[LOGGER] Winston logger initialized successfully
...
```

---

## 🔐 Environment Variables

### File .env

Buat file `.env` di root folder `/server` berdasarkan template `.env.example`:

```bash
cp .env.example .env
```

### Daftar Variabel

| Variabel | Required | Default | Deskripsi |
|----------|----------|---------|-----------|
| NODE_ENV | No | development | 'development' atau 'production' |
| PORT | No | 3000 | Port server |
| MONGODB_URI | **Yes** | - | MongoDB Atlas connection string |
| MONGODB_DBNAME | No | af_komik_v2 | Nama database MongoDB |
| MYSQL_HOST | **Yes** | - | MySQL host |
| MYSQL_PORT | No | 3306 | MySQL port |
| MYSQL_USER | **Yes** | - | MySQL username |
| MYSQL_PASSWORD | **Yes** | - | MySQL password |
| MYSQL_DATABASE | **Yes** | - | Nama database MySQL |
| SESSION_SECRET | **Yes** | - | Secret untuk session signing |
| SESSION_MAX_AGE | No | 86400000 | Durasi session (24 jam) |
| COOKIE_SECURE | No | false | true jika menggunakan HTTPS |

### Contoh Nilai

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DBNAME=af_komik_v2

# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=secret123
MYSQL_DATABASE=af_komik

# Session
SESSION_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
SESSION_MAX_AGE=86400000
COOKIE_SECURE=false
```

---

## 🚀 Cara Install

### Prerequisites

Pastikan sudah terinstall:
- Node.js versi 18.0.0 atau lebih baru
- npm atau yarn
- MySQL Server (local atau cloud)
- Akun MongoDB Atlas (gratis)

### Langkah 1: Clone Repository

```bash
git clone https://github.com/yourusername/AF-Komik-V2.git
cd AF-Komik-V2/server
```

### Langkah 2: Install Dependencies

```bash
npm install
```

### Langkah 3: Setup MongoDB Atlas

1. Buka [MongoDB Atlas](https://cloud.mongodb.com/)
2. Buat cluster baru (free tier tersedia)
3. Buat database user dengan password
4. Whitelist IP address Anda (atau 0.0.0.0/0 untuk development)
5. Dapatkan connection string dari "Connect" → "Connect your application"
6. Copy connection string ke file `.env`

### Langkah 4: Setup MySQL

1. Buat database baru:
```sql
CREATE DATABASE af_komik CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Jalankan schema SQL:
```bash
mysql -u root -p af_komik < database/schema.sql
```

Atau melalui MySQL client:
```sql
USE af_komik;
SOURCE /path/to/server/database/schema.sql;
```

### Langkah 5: Setup Environment

```bash
# Copy template environment
cp .env.example .env

# Edit dengan nilai yang sesuai
nano .env  # atau gunakan editor lain
```

### Langkah 6: Buat Folder Logs

```bash
mkdir -p logs
```

---

## ▶️ Cara Menjalankan

### Development Mode

Menggunakan nodemon untuk auto-reload:

```bash
npm run dev
```

### Production Mode

Tanpa auto-reload:

```bash
npm start
```

### Verifikasi

Buka browser dan akses:
- Homepage: http://localhost:3000
- Login: http://localhost:3000/login
- Register: http://localhost:3000/register

---

## 📺 Output Program

### Console Output Saat Startup

```
========================================
   AF-KOMIK V2 - Server Starting...    
========================================
[ENV] Environment variables loaded
[ENV] NODE_ENV: development
[ENV] PORT: 3000
[APP] Express module loaded
[LOGGER] Winston logger initialized successfully
[LOGGER] Log level: debug
[LOGGER] Log files directory: /home/user/AF-Komik-V2/server/logs
[APP] Configuration modules loaded
[ROUTES] Registering index routes...
[ROUTES] Registered: GET /
[ROUTES] Registered: GET /login
[ROUTES] Registered: GET /register
[ROUTES] Index routes registration complete
[APP] Route modules loaded
[APP] Express application created
[APP] View engine configured: EJS
[APP] Views directory: /home/user/AF-Komik-V2/server/views
[MIDDLEWARE] JSON body parser configured (limit: 10mb)
[MIDDLEWARE] URL-encoded body parser configured (limit: 10mb)
[MIDDLEWARE] Static files served from: /home/user/AF-Komik-V2/server/public
[MIDDLEWARE] Request logging middleware configured
[APP] Event handlers registered (SIGTERM, SIGINT, uncaughtException, unhandledRejection)

[APP] Starting application initialization...

[INIT] Starting application initialization...

[INIT] Step 1: Connecting to MongoDB...
[MONGODB] Attempting to connect to MongoDB Atlas...
[MONGODB] ✓ MongoDB Atlas connected successfully
[MONGODB] Database: af_komik_v2
[MONGODB] Connection pool size: 10

[INIT] Step 2: Connecting to MySQL...
[MYSQL] Creating connection pool...
[MYSQL] Host: localhost
[MYSQL] Port: 3306
[MYSQL] Database: af_komik
[MYSQL] User: root
[MYSQL] Pool created. Testing connection...
[MYSQL] ✓ Connection test successful
[MYSQL] ✓ MySQL connected successfully
[MYSQL] Connection pool size: 10

[INIT] Step 3: Setting up session middleware...
[SESSION] Configuring session middleware...
[SESSION] Environment: development
[SESSION] ✓ Session middleware configured successfully
[SESSION] Cookie httpOnly: true
[SESSION] Cookie sameSite: lax
[SESSION] Cookie secure: false
[SESSION] Cookie maxAge: 86400000ms (24 hours)
[SESSION] Session store: MongoDB (connect-mongo)

[INIT] Step 4: Registering routes...
[ROUTES] ✓ Index routes registered at /
[ROUTES] ✓ 404 handler registered
[ROUTES] ✓ Global error handler registered

========================================
   AF-KOMIK V2 - Server Started!       
========================================
[SERVER] ✓ Server running on port 3000
[SERVER] ✓ Environment: development
[SERVER] ✓ URL: http://localhost:3000
========================================
```

### Request Logging

```
[REQUEST] 2026-01-02T10:30:45.123Z - GET /
[REQUEST] 2026-01-02T10:30:46.456Z - GET /login
[REQUEST] 2026-01-02T10:30:47.789Z - GET /register
[REQUEST] 2026-01-02T10:30:48.012Z - GET /nonexistent
[404] Page not found: GET /nonexistent
```

### Graceful Shutdown

```
^C
[SHUTDOWN] SIGINT received. Starting graceful shutdown...
[SHUTDOWN] Closing MySQL connection pool...
[MYSQL] Connection pool closed
[MONGODB] Connection closed due to application termination
[SHUTDOWN] ✓ Graceful shutdown completed
```

---

## 🏭 Catatan Production

### Checklist Sebelum Deploy

- [ ] Ubah `NODE_ENV` ke `production`
- [ ] Generate `SESSION_SECRET` yang kuat dan unik
- [ ] Set `COOKIE_SECURE` ke `true` (memerlukan HTTPS)
- [ ] Setup reverse proxy (nginx/Apache)
- [ ] Konfigurasi SSL certificate
- [ ] Setup process manager (PM2)
- [ ] Konfigurasi firewall
- [ ] Setup monitoring (uptime, metrics)
- [ ] Backup strategy untuk database

### Keamanan

1. **Session Secret**: Gunakan string random minimal 64 karakter
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Environment Variables**: Jangan pernah commit `.env` ke repository

3. **HTTPS**: Wajib untuk production
   - Gunakan Let's Encrypt untuk SSL gratis
   - Set `COOKIE_SECURE=true`

4. **Rate Limiting**: Implementasi rate limiting untuk API (Phase 2)

### Performa

1. **Connection Pooling**: Sudah dikonfigurasi (10 connections)
2. **CDN**: Pertimbangkan menggunakan CDN untuk static assets
3. **Caching**: Implementasi Redis cache untuk API responses (Phase 3)
4. **Image Optimization**: Gunakan lazy loading dan WebP format

### Monitoring

1. **Health Check Endpoint**: Buat endpoint `/health` untuk monitoring
2. **Error Tracking**: Pertimbangkan Sentry atau similar
3. **APM**: New Relic atau Datadog untuk performance monitoring
4. **Log Aggregation**: ELK Stack atau cloud logging service

---

## 📱 Rencana Pengembangan Mobile App

### Teknologi yang Direncanakan

| Teknologi | Fungsi |
|-----------|--------|
| React Native | Cross-platform mobile framework |
| Expo | Development toolchain |
| REST API | Komunikasi dengan backend |
| JWT | Authentication untuk mobile |

### Arsitektur Mobile

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE APP (React Native)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Screens   │  │    State    │  │     Components      │ │
│  │             │  │  Management │  │                     │ │
│  │  • Home     │  │  (Zustand/  │  │  • ComicCard        │ │
│  │  • Browse   │  │   Redux)    │  │  • ChapterList      │ │
│  │  • Reader   │  │             │  │  • ImageViewer      │ │
│  │  • Profile  │  │             │  │  • Navbar           │ │
│  │  • Bookmarks│  └─────────────┘  │  • SearchBar        │ │
│  └─────────────┘                   └─────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                      API Layer                          ││
│  │  • Axios/Fetch for HTTP requests                        ││
│  │  • JWT token management                                 ││
│  │  • Request/Response interceptors                        ││
│  │  • Offline support with local storage                   ││
│  └─────────────────────────────────────────────────────────┘│
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  AF-KOMIK V2 REST API                       │
│                                                             │
│  Endpoints:                                                 │
│  • POST /api/auth/login                                     │
│  • POST /api/auth/register                                  │
│  • GET  /api/comics                                         │
│  • GET  /api/comics/:id                                     │
│  • GET  /api/comics/:id/chapters                            │
│  • GET  /api/chapters/:id/pages                             │
│  • GET  /api/user/bookmarks                                 │
│  • POST /api/user/bookmarks                                 │
│  • GET  /api/user/history                                   │
│  • POST /api/user/history                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Fitur Mobile App (Direncanakan)

| Fitur | Prioritas | Deskripsi |
|-------|-----------|-----------|
| Comic Browser | High | Browse dan search komik |
| Comic Reader | High | Baca dengan gesture support |
| User Auth | High | Login/register |
| Bookmarks | Medium | Simpan komik favorit |
| Reading History | Medium | Lacak progress baca |
| Offline Reading | Medium | Download chapter untuk offline |
| Push Notification | Low | Notifikasi chapter baru |
| Dark Mode | Low | Tema gelap (match web) |

### Timeline Pengembangan

```
Phase 1 (Current)     Phase 2           Phase 3           Phase 4
    │                    │                 │                 │
    ▼                    ▼                 ▼                 ▼
Foundation ───────► Auth + Core ────► Enhancement ────► Mobile App
                    Features            + API
                    
• Project setup     • Login/Register   • REST API        • React Native
• Database conn     • Comic browser    • JWT Auth        • Core screens
• Session           • Comic reader     • API docs        • Offline mode
• Layout/Views      • Bookmarks        • Rate limiting   • Push notif
• Logging           • History          • Caching         • App stores
```

---

## 📞 Kontak & Kontribusi

### Kontribusi

Kontribusi sangat diterima! Silakan:
1. Fork repository
2. Buat branch fitur (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buka Pull Request

### Kontak

- **Email**: afifudinzuhri@gmail.com
- **GitHub**: [github.com/afifudinzuhri](https://github.com/afifudinzuhri)

---

## 📄 Lisensi

Distributed under the MIT License. See `LICENSE` for more information.

---

*Dokumentasi ini dibuat pada: 2 Januari 2026*
*Versi: 2.0.0 - Phase 1 Foundation*
