# AF-Komik V2

Platform baca komik online yang dibangun dengan arsitektur modern, scalable, dan siap produksi.

---

## 📋 Daftar Isi

1. [Gambaran Umum Aplikasi](#-gambaran-umum-aplikasi)
2. [Tujuan Proyek](#-tujuan-proyek)
3. [Arsitektur Sistem](#-arsitektur-sistem)
4. [Sistem Autentikasi & User](#-sistem-autentikasi--user)
5. [Sistem Konten Komik & Reader](#-sistem-konten-komik--reader)
6. [Bookmark & Riwayat Bacaan](#-bookmark--riwayat-bacaan)
7. [Admin Dashboard](#-admin-dashboard)
8. [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
9. [Struktur Folder](#-struktur-folder)
10. [Desain Database](#-desain-database)
11. [Sistem Scraper](#-sistem-scraper)
    - [Full Scraper (scrap-all.js)](#-full-scraper-scrap-alljs)
    - [Latest Scraper (scrap-latest.js)](#-latest-scraper-scrap-latestjs)
    - [Fix Chapters (fix-chapters.js)](#-fix-chapters-fix-chaptersjs)
    - [Admin Panel Scraper Control](#️-admin-panel-scraper-control)
    - [Konfigurasi Scraper](#️-konfigurasi-scraper)
    - [Jadwal Cron](#-jadwal-cron-yang-direkomendasikan)
    - [Chapter Sync System](#-chapter-sync-system)
    - [Smart Metadata Update](#-smart-metadata-update)
12. [Logging System](#-logging-system)
13. [Performance Optimization](#-performance-optimization)
14. [Environment Variables](#-environment-variables)
15. [Cara Install](#-cara-install)
16. [Cara Menjalankan](#-cara-menjalankan)
17. [Output Program](#-output-program)
18. [Catatan Production](#-catatan-production)
19. [Rencana Pengembangan Mobile App](#-rencana-pengembangan-mobile-app)

---

## 📖 Gambaran Umum Aplikasi

**AF-Komik V2** adalah platform web untuk membaca komik (manga, manhwa, manhua) secara online. Platform ini dirancang dengan arsitektur yang memungkinkan pengembangan skala besar dan integrasi dengan aplikasi mobile di masa depan.

### Fitur Utama (Direncanakan)

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| 📚 Koleksi Komik | Ribuan judul komik dari berbagai sumber | ✅ Done |
| 🔍 Pencarian | Filter berdasarkan judul, genre, status | Planned |
| 📖 Comic Reader | Reader responsif dengan lazy loading | ✅ Done |
| 👤 Akun Pengguna | Registrasi, login, profil | ✅ Done |
| ⭐ Bookmark | Simpan komik favorit | ✅ Done |
| 📜 Riwayat Baca | Lacak progress membaca | ✅ Done |
| �️ Web Scraper | Full scrape, latest scrape, auto-resume | ✅ Done |
| 🔧 Fix Chapters | Perbaiki chapter yang hilang/ter-skip | ✅ Done |
| 🖥️ Admin Panel | Kontrol scraper via web interface | ✅ Done |
| 🔔 Notifikasi | Pemberitahuan chapter baru | Planned |
| 📱 Mobile App | Aplikasi Android/iOS | Planned |

### Karakteristik Platform

- **Dark Theme**: Tema gelap sebagai default untuk kenyamanan membaca
- **Neon Blue Accent**: Warna aksen biru neon untuk estetika modern
- **Responsive Design**: Tampilan optimal di desktop, tablet, dan mobile
- **Server-Side Rendering**: Menggunakan EJS untuk SEO yang lebih baik
- **Auto-Resume Scraper**: Progress tersimpan, bisa dilanjutkan jika terputus
- **Smart Chapter Sync**: Otomatis mendeteksi dan memperbaiki chapter yang hilang

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

## � Sistem Autentikasi & User

AF-Komik V2 mengimplementasikan sistem autentikasi yang lengkap dan aman dengan fitur-fitur berikut:

### Gambaran Umum

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| 📝 Registrasi | Daftar akun baru dengan validasi | ✅ Selesai |
| 🔑 Login | Login dengan email/username | ✅ Selesai |
| 🚪 Logout | Akhiri sesi dengan aman | ✅ Selesai |
| 👤 Profil | Lihat informasi akun | ✅ Selesai |
| 🛡️ Sistem Role | Pembagian hak akses user/admin | ✅ Selesai |
| 📱 API Auth | Endpoint REST untuk mobile app | ✅ Selesai |

### Metode Autentikasi

Aplikasi ini menggunakan **session-based authentication** dengan penyimpanan di MongoDB:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ALUR AUTENTIKASI (SESSION-BASED)                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────┐    1. POST /login         ┌─────────────────────────────┐  │
│   │ Browser │ ───────────────────────▶ │  Express Server             │  │
│   │         │    (email/username +     │                             │  │
│   │         │     password)            │  ┌─────────────────────────┐│  │
│   │         │                          │  │ Auth Controller         ││  │
│   │         │                          │  │                         ││  │
│   │         │    2. Validate user      │  │ 1. Find user by email/  ││  │
│   │         │       credentials        │  │    username             ││  │
│   │         │                          │  │ 2. Compare password     ││  │
│   │         │                          │  │    dengan bcrypt        ││  │
│   │         │                          │  │ 3. Buat session         ││  │
│   │         │                          │  │ 4. Simpan ke MongoDB    ││  │
│   │         │                          │  └─────────────────────────┘│  │
│   │         │                          │              │               │  │
│   │         │                          │              ▼               │  │
│   │         │    3. Set-Cookie:        │  ┌─────────────────────────┐│  │
│   │         │ ◀───────────────────────│  │ MongoDB Session Store   ││  │
│   │         │    connect.sid=xxx       │  │                         ││  │
│   │         │                          │  │ { _id: "xxx",           ││  │
│   │         │                          │  │   expires: Date,        ││  │
│   │         │                          │  │   session: {            ││  │
│   │         │                          │  │     userId: ObjectId,   ││  │
│   │         │                          │  │     userRole: "user",   ││  │
│   │         │                          │  │     username: "john"    ││  │
│   │         │                          │  │   }                     ││  │
│   │         │                          │  │ }                       ││  │
│   └─────────┘                          │  └─────────────────────────┘│  │
│                                        └─────────────────────────────────┘  │
│                                                                          │
│   Setiap request selanjutnya:                                            │
│   Cookie: connect.sid=xxx  →  Session ditemukan  →  Request terautentikasi│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Keamanan Password

Password disimpan dengan aman menggunakan **bcrypt**:

| Aspek | Implementasi |
|-------|--------------|
| **Hashing Algorithm** | bcrypt |
| **Salt Rounds** | 12 (konfigurabel via env) |
| **Pre-save Hook** | Password otomatis di-hash sebelum disimpan |
| **Comparison** | Menggunakan `bcrypt.compare()` yang aman dari timing attacks |

```javascript
// Contoh penggunaan di User model
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
  next();
});

// Method untuk membandingkan password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
```

### Sistem Role

Aplikasi mendukung sistem role untuk pembagian hak akses:

| Role | Kode | Hak Akses |
|------|------|-----------|
| **User** | `user` | Akses fitur umum (membaca, bookmark, history) |
| **Admin** | `admin` | Semua fitur user + manajemen konten |

#### Middleware Role

```javascript
// Contoh penggunaan middleware
router.get('/profile', isAuthenticated, getProfilePage);
router.get('/admin', isAuthenticated, isAdmin, getAdminPage);
router.get('/api/admin/users', isAuthenticatedAPI, isAdminAPI, getUsers);
```

### Web Routes (Browser)

| Method | Route | Middleware | Deskripsi |
|--------|-------|------------|-----------|
| GET | `/login` | redirectIfAuthenticated | Halaman login |
| POST | `/login` | redirectIfAuthenticated | Proses login |
| GET | `/register` | redirectIfAuthenticated | Halaman registrasi |
| POST | `/register` | redirectIfAuthenticated | Proses registrasi |
| POST | `/logout` | isAuthenticated | Proses logout |
| GET | `/profile` | isAuthenticated | Halaman profil user |

### API Routes (Mobile/REST)

Untuk kebutuhan aplikasi mobile atau integrasi pihak ketiga:

| Method | Route | Middleware | Deskripsi |
|--------|-------|------------|-----------|
| POST | `/api/auth/register` | - | Registrasi user baru |
| POST | `/api/auth/login` | - | Login dan dapatkan session |
| POST | `/api/auth/logout` | isAuthenticatedAPI | Logout dan hapus session |
| GET | `/api/auth/me` | isAuthenticatedAPI | Dapatkan info user saat ini |

### Format Response API

Semua API endpoint menggunakan format response yang konsisten:

#### Success Response

```json
{
  "status": "success",
  "message": "Pesan sukses",
  "data": {
    // Data yang diminta
  }
}
```

#### Error Response

```json
{
  "status": "error",
  "message": "Pesan error",
  "data": null
}
```

### Contoh Penggunaan API

#### Registrasi User Baru

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

Response (201 Created):
```json
{
  "status": "success",
  "message": "Registrasi berhasil! Silakan login.",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2026-01-02T10:00:00.000Z"
    }
  }
}
```

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "john@example.com",
  "password": "password123"
}
```

Response (200 OK):
```json
{
  "status": "success",
  "message": "Login berhasil!",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "lastLogin": "2026-01-02T10:30:00.000Z"
    }
  }
}
```

#### Get Current User

```bash
GET /api/auth/me
Cookie: connect.sid=your_session_id
```

Response (200 OK):
```json
{
  "status": "success",
  "message": "User data retrieved successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "createdAt": "2026-01-02T10:00:00.000Z",
      "lastLogin": "2026-01-02T10:30:00.000Z"
    }
  }
}
```

#### Logout

```bash
POST /api/auth/logout
Cookie: connect.sid=your_session_id
```

Response (200 OK):
```json
{
  "status": "success",
  "message": "Logout berhasil!",
  "data": null
}
```

### HTTP Status Codes

| Code | Nama | Penggunaan |
|------|------|------------|
| 200 | OK | Request berhasil |
| 201 | Created | Resource baru dibuat (registrasi) |
| 400 | Bad Request | Input tidak valid |
| 401 | Unauthorized | Belum login atau session expired |
| 403 | Forbidden | Tidak punya akses ke resource |
| 409 | Conflict | Data sudah ada (email/username duplikat) |
| 500 | Internal Server Error | Kesalahan server |

### Session Configuration

Session dikonfigurasi di `config/session.js`:

```javascript
{
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 hari
  }
}
```

### Tips Keamanan

1. **Gunakan HTTPS di production** - Set `cookie.secure = true`
2. **SESSION_SECRET harus kuat** - Minimal 32 karakter random
3. **Jangan expose password** - Gunakan `getPublicProfile()` method
4. **Rate limiting** - Pertimbangkan untuk menambahkan di production
5. **Password policy** - Minimal 8 karakter (dapat ditingkatkan)

---

## � Sistem Konten Komik & Reader

AF-Komik V2 menyediakan sistem lengkap untuk menampilkan dan membaca komik. Semua data konten komik disimpan di MySQL dan diakses melalui model khusus.

### Gambaran Umum

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| 📋 Daftar Komik | Grid thumbnail dengan pagination | ✅ Selesai |
| 📖 Detail Komik | Info lengkap + daftar chapter | ✅ Selesai |
| 📕 Reader Chapter | Long-scroll dengan navigasi | ✅ Selesai |
| ⬅️ Navigasi Chapter | Prev/Next chapter buttons | ✅ Selesai |
| 🌐 API Endpoints | REST API untuk mobile app | ✅ Selesai |
| 👁️ Guest Access | Baca tanpa login | ✅ Selesai |

### Alur Data

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           ALUR DATA KONTEN KOMIK                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [MySQL Database]                                                           │
│        │                                                                     │
│        ├── komik (id, param, title, thumbnail, synopsis, genres)             │
│        │     │                                                               │
│        │     └── chapter (id, komik_id, param, chapter_label)                │
│        │           │                                                         │
│        │           └── image (id, chapter_id, page_number, image_url)        │
│        │                                                                     │
│        ▼                                                                     │
│   [MySQL Models] ─────────────────────────────────────────────────────────┐  │
│        │                                                                  │  │
│        ├── comic.model.js  → findAll, findByParam, count, search          │  │
│        ├── chapter.model.js → findByComicId, findByParams, getNavigation  │  │
│        └── image.model.js  → findByChapterId                              │  │
│                                                                           │  │
│        ▼                                                                  │  │
│   [Controllers] ──────────────────────────────────────────────────────────┤  │
│        │                                                                  │  │
│        ├── comicController.js                                             │  │
│        │     ├── listComicsPage() → GET /comics (EJS)                     │  │
│        │     ├── getComicDetailPage() → GET /comics/:param (EJS)          │  │
│        │     ├── listComicsAPI() → GET /api/comics (JSON)                 │  │
│        │     ├── getComicDetailAPI() → GET /api/comics/:param (JSON)      │  │
│        │     └── getChaptersAPI() → GET /api/comics/:param/chapters       │  │
│        │                                                                  │  │
│        └── chapterController.js                                           │  │
│              ├── readChapterPage() → GET /comics/:param/:chapterParam     │  │
│              └── readChapterAPI() → GET /api/comics/.../chapters/...      │  │
│                                                                           │  │
│        ▼                                                                  │  │
│   [Output]                                                                │  │
│        │                                                                  │  │
│        ├── EJS Views (Browser) ─────────────────────────────────────────┐ │  │
│        │     ├── comics.ejs        → Grid daftar komik + pagination     │ │  │
│        │     ├── comic-detail.ejs  → Info komik + daftar chapter        │ │  │
│        │     └── chapter-reader.ejs → Long-scroll reader + navigasi     │ │  │
│        │                                                                │ │  │
│        └── JSON Response (API) ─────────────────────────────────────────┤ │  │
│              └── { status, message, data }                              │ │  │
│                                                                         │ │  │
└─────────────────────────────────────────────────────────────────────────┴─┴──┘
```

### Struktur URL Web

| URL | Halaman | Deskripsi |
|-----|---------|-----------|
| `/comics` | Daftar Komik | Grid semua komik dengan pagination |
| `/comics?page=2` | Daftar Komik (halaman 2) | Pagination support |
| `/comics/one-piece` | Detail Komik | Info One Piece + daftar chapter |
| `/comics/one-piece/chapter-1100` | Reader | Baca Chapter 1100 One Piece |

### Penjelasan Halaman

#### 1. Halaman Daftar Komik (`/comics`)

Menampilkan semua komik dalam bentuk grid thumbnail.

**Fitur:**
- Grid responsif (2-6 kolom tergantung layar)
- Thumbnail cover dengan overlay chapter terbaru
- Tag genre (max 2 ditampilkan)
- Pagination dengan navigasi halaman
- Lazy loading gambar

**Query Parameters:**
- `page` - Nomor halaman (default: 1)
- `limit` - Jumlah per halaman (default: 20, max: 50)

#### 2. Halaman Detail Komik (`/comics/:param`)

Menampilkan informasi lengkap tentang sebuah komik.

**Fitur:**
- Cover image besar
- Judul dan metadata (jumlah chapter, update terakhir)
- Tag genre lengkap
- Sinopsis/deskripsi
- Tombol "Mulai Baca" (ke chapter pertama)
- Daftar chapter dengan scroll
- Tanggal rilis tiap chapter

#### 3. Halaman Reader (`/comics/:param/:chapterParam`)

Reader untuk membaca chapter dengan scroll vertikal.

**Fitur:**
- Long-scroll (semua gambar ditampilkan vertikal)
- Fixed navigation bar (atas dan bawah)
- Tombol Previous/Next chapter
- Judul komik dan chapter ditampilkan
- Jumlah halaman
- Tombol scroll-to-top
- Keyboard navigation (←/→ untuk chapter, Home/End untuk scroll)
- Lazy loading gambar (kecuali 3 pertama)

### API Endpoints

Semua API endpoint mengembalikan format JSON standar.

#### Base URL: `/api/comics`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/comics` | List semua komik |
| GET | `/api/comics/:param` | Detail komik |
| GET | `/api/comics/:param/chapters` | Daftar chapter |
| GET | `/api/comics/:param/chapters/:chapterParam` | Konten chapter |

### Contoh Response API

#### GET /api/comics

```json
{
  "status": "success",
  "message": "Comics retrieved successfully",
  "data": {
    "comics": [
      {
        "id": 1,
        "param": "one-piece",
        "title": "One Piece",
        "thumbnail": "https://example.com/one-piece.jpg",
        "description": "Kisah Monkey D. Luffy...",
        "genres": ["Action", "Adventure"],
        "latest_chapter": "Chapter 1100",
        "updated_at": "2026-01-02T10:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 10,
      "limit": 20,
      "totalItems": 200,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET /api/comics/one-piece

```json
{
  "status": "success",
  "message": "Comic retrieved successfully",
  "data": {
    "comic": {
      "id": 1,
      "param": "one-piece",
      "title": "One Piece",
      "thumbnail": "https://example.com/one-piece.jpg",
      "description": "Kisah Monkey D. Luffy...",
      "synopsis": "Monkey D. Luffy adalah seorang pemuda...",
      "genres": ["Action", "Adventure", "Comedy"],
      "latest_chapter": "Chapter 1100",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2026-01-02T10:00:00.000Z"
    },
    "chapterCount": 1100
  }
}
```

#### GET /api/comics/one-piece/chapters

```json
{
  "status": "success",
  "message": "Chapters retrieved successfully",
  "data": {
    "comic": {
      "param": "one-piece",
      "title": "One Piece"
    },
    "chapters": [
      {
        "id": 1100,
        "komik_id": 1,
        "param": "chapter-1100",
        "chapter_label": "Chapter 1100",
        "release_date": "2026-01-02T00:00:00.000Z",
        "created_at": "2026-01-02T10:00:00.000Z"
      },
      {
        "id": 1099,
        "komik_id": 1,
        "param": "chapter-1099",
        "chapter_label": "Chapter 1099",
        "release_date": "2025-12-26T00:00:00.000Z",
        "created_at": "2025-12-26T10:00:00.000Z"
      }
    ],
    "total": 1100
  }
}
```

#### GET /api/comics/one-piece/chapters/chapter-1100

```json
{
  "status": "success",
  "message": "Chapter retrieved successfully",
  "data": {
    "chapter": {
      "id": 1100,
      "param": "chapter-1100",
      "label": "Chapter 1100",
      "releaseDate": "2026-01-02T00:00:00.000Z"
    },
    "comic": {
      "param": "one-piece",
      "title": "One Piece",
      "thumbnail": "https://example.com/one-piece.jpg"
    },
    "images": [
      { "id": 1, "pageNumber": 1, "url": "https://example.com/op/1100/1.jpg" },
      { "id": 2, "pageNumber": 2, "url": "https://example.com/op/1100/2.jpg" },
      { "id": 3, "pageNumber": 3, "url": "https://example.com/op/1100/3.jpg" }
    ],
    "pageCount": 18,
    "navigation": {
      "prev": {
        "param": "chapter-1099",
        "label": "Chapter 1099"
      },
      "next": null
    }
  }
}
```

### Catatan Performa

#### Optimasi Saat Ini

1. **Prepared Statements** - Semua query menggunakan prepared statements untuk keamanan dan performa
2. **Connection Pool** - MySQL connection pool dengan 10 koneksi
3. **Lazy Loading** - Gambar di reader menggunakan lazy loading (kecuali 3 pertama)
4. **Parallel Queries** - Beberapa query dijalankan paralel dengan `Promise.all()`

#### Rencana Optimasi Masa Depan

| Optimasi | Deskripsi | Prioritas |
|----------|-----------|-----------|
| Redis Cache | Cache hasil query populer | High |
| CDN Images | Serve gambar via CDN | High |
| Image Proxy | Proxy dan resize gambar on-the-fly | Medium |
| Full-text Search | MySQL FULLTEXT untuk pencarian cepat | Medium |
| Infinite Scroll | Ganti pagination dengan infinite scroll | Low |

### Error Handling

| Kondisi | HTTP Status | Halaman/Response |
|---------|-------------|------------------|
| Komik tidak ditemukan | 404 | errors/404.ejs / JSON error |
| Chapter tidak ditemukan | 404 | errors/404.ejs / JSON error |
| Parameter tidak valid | 400 | JSON error |
| Server error | 500 | errors/500.ejs / JSON error |
| Tidak ada gambar | 200 | Pesan "Tidak ada gambar" |

---

## � Bookmark & Riwayat Bacaan

AF-Komik V2 menyediakan fitur bookmark dan riwayat bacaan untuk pengguna yang sudah login. Data disimpan di MongoDB dan terintegrasi dengan data komik dari MySQL.

### Gambaran Umum Fitur

| Fitur | Deskripsi | Akses |
|-------|-----------|-------|
| ⭐ Bookmark Komik | Simpan komik favorit untuk akses cepat | Login Required |
| 📖 Riwayat Bacaan | Otomatis tersimpan saat membaca | Login Required |
| 🔄 Resume Reading | Lanjutkan dari chapter terakhir | Login Required |
| 👁️ Guest Mode | Baca tanpa fitur bookmark/riwayat | Public |

### Cara Kerja Bookmark

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ALUR BOOKMARK                                   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [User Login]                                                          │
│       │                                                                │
│       ▼                                                                │
│  [Buka Halaman Komik] ─────► Tampilkan tombol "Bookmark"               │
│       │                                                                │
│       ▼                                                                │
│  [Klik Bookmark] ─────► POST /bookmarks/:comicParam                    │
│       │                                                                │
│       ├── Validasi komik ada di MySQL                                  │
│       │                                                                │
│       ├── Cek apakah sudah di-bookmark (MongoDB)                       │
│       │                                                                │
│       └── Simpan ke MongoDB dengan cached data:                        │
│           - comicParam (URL slug)                                      │
│           - cachedComic (title, thumbnail, genres)                     │
│           - createdAt (timestamp)                                      │
│                                                                        │
│  [Lihat Bookmark] ─────► GET /my/bookmarks                             │
│       │                                                                │
│       └── Tampilkan grid komik yang di-bookmark                        │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Cara Kerja Riwayat Bacaan

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ALUR RIWAYAT BACAAN                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [User Login]                                                          │
│       │                                                                │
│       ▼                                                                │
│  [Baca Chapter] ─────► GET /comics/:param/:chapterParam                │
│       │                                                                │
│       ▼                                                                │
│  [Controller Deteksi User Login]                                       │
│       │                                                                │
│       └── Background Save ke MongoDB:                                  │
│           - userId                                                     │
│           - comicParam                                                 │
│           - chapterParam (chapter terakhir)                            │
│           - cachedData (judul, thumbnail, label chapter)               │
│           - lastReadAt (timestamp)                                     │
│                                                                        │
│  [Riwayat Disimpan Otomatis - User Tidak Perlu Aksi Apapun]            │
│                                                                        │
│  [Lihat Riwayat] ─────► GET /my/history                                │
│       │                                                                │
│       └── Tampilkan list komik yang pernah dibaca                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Mekanisme Resume Reading

Fitur "Resume Reading" memungkinkan user melanjutkan membaca dari chapter terakhir:

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ALUR RESUME READING                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [User Klik "Lanjutkan"] ─────► GET /resume/:comicParam                │
│       │                                                                │
│       ▼                                                                │
│  [Cek Riwayat di MongoDB]                                              │
│       │                                                                │
│       ├── Ada riwayat? ─────► Redirect ke /comics/:param/:chapterParam │
│       │                                                                │
│       └── Tidak ada? ─────► Cari chapter pertama di MySQL              │
│             │                                                          │
│             ├── Ada chapter? ─────► Redirect ke chapter pertama        │
│             │                                                          │
│             └── Tidak ada? ─────► Redirect ke halaman detail komik     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Perbedaan Guest vs User Login

| Fitur | Guest (Tidak Login) | User Login |
|-------|---------------------|------------|
| Baca Komik | ✅ Bisa | ✅ Bisa |
| Lihat Daftar Komik | ✅ Bisa | ✅ Bisa |
| Bookmark Komik | ❌ Tidak Bisa | ✅ Bisa |
| Riwayat Otomatis | ❌ Tidak Ada | ✅ Tersimpan |
| Resume Reading | ❌ Tidak Bisa | ✅ Bisa |
| Halaman /my/bookmarks | ❌ Redirect Login | ✅ Bisa Akses |
| Halaman /my/history | ❌ Redirect Login | ✅ Bisa Akses |

### Web Routes

| Method | URL | Deskripsi | Auth |
|--------|-----|-----------|------|
| POST | `/bookmarks/:comicParam` | Tambah bookmark | ✅ |
| POST | `/bookmarks/:comicParam/remove` | Hapus bookmark | ✅ |
| GET | `/my/bookmarks` | Halaman daftar bookmark | ✅ |
| GET | `/my/history` | Halaman riwayat bacaan | ✅ |
| POST | `/my/history/clear` | Hapus semua riwayat | ✅ |
| POST | `/my/history/:comicParam/remove` | Hapus riwayat tertentu | ✅ |
| GET | `/resume/:comicParam` | Lanjutkan baca | ✅ |

### API Endpoints

#### Base URLs
- Bookmark: `/api/bookmarks`
- History: `/api/history`
- Resume: `/api/resume`

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/bookmarks` | List bookmark user |
| POST | `/api/bookmarks/:comicParam` | Tambah bookmark |
| DELETE | `/api/bookmarks/:comicParam` | Hapus bookmark |
| GET | `/api/bookmarks/:comicParam/status` | Cek status bookmark |
| POST | `/api/bookmarks/:comicParam/toggle` | Toggle bookmark |
| GET | `/api/history` | List riwayat bacaan |
| DELETE | `/api/history` | Hapus semua riwayat |
| DELETE | `/api/history/:comicParam` | Hapus riwayat tertentu |
| GET | `/api/resume/:comicParam` | Data resume untuk komik |

#### Read Chapter Tracking API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/read-chapters/mark` | Tandai chapter sebagai sudah dibaca |
| DELETE | `/api/read-chapters/unmark` | Hapus status sudah dibaca |
| GET | `/api/read-chapters/status/:chapterId` | Cek status baca chapter |
| GET | `/api/read-chapters/comic/:comicId` | List chapter yang sudah dibaca untuk comic |
| GET | `/api/read-chapters/stats` | Statistik baca user |

### Contoh Response API

#### GET /api/bookmarks

```json
{
  "status": "success",
  "message": "Bookmarks retrieved successfully",
  "data": {
    "bookmarks": [
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "comicParam": "one-piece",
        "comic": {
          "title": "One Piece",
          "thumbnail": "https://example.com/one-piece.jpg",
          "latestChapter": "Chapter 1100",
          "genres": ["Action", "Adventure"]
        },
        "createdAt": "2026-01-02T10:00:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 1,
      "limit": 20,
      "totalItems": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### POST /api/bookmarks/:comicParam (201 Created)

```json
{
  "status": "success",
  "message": "Bookmark added successfully",
  "data": {
    "bookmark": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "comicParam": "one-piece",
      "comic": {
        "title": "One Piece",
        "thumbnail": "https://example.com/one-piece.jpg"
      },
      "createdAt": "2026-01-02T10:00:00.000Z"
    }
  }
}
```

#### GET /api/history

```json
{
  "status": "success",
  "message": "Reading history retrieved successfully",
  "data": {
    "history": [
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k2",
        "comicParam": "one-piece",
        "chapterParam": "chapter-1100",
        "comic": {
          "title": "One Piece",
          "thumbnail": "https://example.com/one-piece.jpg"
        },
        "chapter": {
          "param": "chapter-1100",
          "label": "Chapter 1100",
          "totalPages": 18
        },
        "lastReadAt": "2026-01-02T12:30:00.000Z"
      }
    ],
    "pagination": {
      "current": 1,
      "total": 1,
      "limit": 20,
      "totalItems": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

#### GET /api/resume/one-piece

```json
{
  "status": "success",
  "message": "Resume data retrieved",
  "data": {
    "hasProgress": true,
    "comicParam": "one-piece",
    "chapterParam": "chapter-1100",
    "chapter": {
      "param": "chapter-1100",
      "label": "Chapter 1100",
      "totalPages": 18
    },
    "lastReadAt": "2026-01-02T12:30:00.000Z",
    "resumeUrl": "/comics/one-piece/chapter-1100"
  }
}
```

### Error Handling

| Kondisi | HTTP Status | Response |
|---------|-------------|----------|
| Tidak login | 401 | Redirect ke /login (Web) / JSON error (API) |
| Komik tidak ditemukan | 404 | JSON error "Comic not found" |
| Sudah di-bookmark | 409 | JSON error "Already bookmarked" |
| Bookmark tidak ditemukan | 404 | JSON error "Bookmark not found" |
| Server error | 500 | JSON error "Internal server error" |

### Catatan Implementasi

1. **Background Save**: Riwayat bacaan disimpan secara background (tidak blocking) sehingga tidak memperlambat loading halaman reader.

2. **Cached Data**: Data komik (judul, thumbnail) di-cache di MongoDB untuk mengurangi query ke MySQL saat menampilkan daftar bookmark/riwayat.

3. **Unique Index**: MongoDB menggunakan compound unique index `{userId, comicParam}` untuk mencegah duplikasi.

4. **comicParam vs comicId**: Menggunakan URL slug (`comicParam`) bukan numeric ID karena lebih stabil dan langsung dapat digunakan di URL.

---

## 🔐 Admin Dashboard

Admin Dashboard adalah panel kontrol khusus administrator untuk mengelola sistem AF-Komik V2. Dashboard ini menyediakan berbagai fitur untuk monitoring, manajemen user, dan kontrol scraper.

### Fitur Admin Dashboard

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| 📊 Dashboard | Overview statistik sistem | ✅ Selesai |
| 👥 User Management | Kelola akun pengguna | ✅ Selesai |
| �️ Scraper Control | Jalankan dan kontrol scraper | ✅ Selesai |
| 🔧 Fix Chapters | Perbaiki chapter yang hilang | ✅ Selesai |
| 📋 Log Viewer | Lihat log eksekusi scraper (real-time) | ✅ Selesai |
| 💾 Database Stats | Monitoring status database | ✅ Selesai |
| 📈 Progress Tracking | Lihat progress full scraper | ✅ Selesai |

### Akses Admin Dashboard

Admin Dashboard hanya dapat diakses oleh user dengan role `admin`. Proteksi dilakukan dengan middleware chain:

```javascript
// Web routes - redirect ke login jika tidak terautentikasi
router.get('/admin', isAuthenticated, isAdmin, dashboardController);

// API routes - return JSON 401/403 jika tidak terautentikasi/tidak admin
router.get('/api/admin/stats', isAuthenticatedAPI, isAdminAPI, getStats);
```

### Route Admin

#### Web Routes (`/admin/*`)

| Method | Route | Deskripsi |
|--------|-------|-----------|
| GET | `/admin` | Halaman dashboard utama |
| GET | `/admin/users` | Halaman manajemen user |
| GET | `/admin/scraper` | Halaman kontrol scraper |
| GET | `/admin/scraper/console` | Output console (untuk iframe) |
| GET | `/admin/scraper/progress` | Progress full scraper |
| GET | `/admin/logs` | Halaman log viewer |
| POST | `/admin/users/:id/role` | Update role user |
| POST | `/admin/users/:id/reset-password` | Reset password user |
| POST | `/admin/users/:id/toggle-status` | Enable/disable akun user |
| POST | `/admin/scraper/full` | Jalankan full scraper (resume) |
| POST | `/admin/scraper/latest` | Jalankan latest scraper |
| POST | `/admin/scraper/fix-chapters` | Jalankan fix missing chapters |
| POST | `/admin/scraper/stop` | Hentikan scraper yang berjalan |
| POST | `/admin/scraper/reset-progress` | Reset progress full scraper |

#### API Routes (`/api/admin/*`)

| Method | Route | Deskripsi |
|--------|-------|-----------|
| GET | `/api/admin/stats` | Ambil statistik sistem |
| GET | `/api/admin/users` | Ambil daftar user (paginated) |
| GET | `/api/admin/scraper/status` | Cek status scraper + progress |
| GET | `/api/admin/scraper/output` | Ambil output scraper |
| GET | `/api/admin/scraper/progress` | Ambil progress full scraper |
| GET | `/api/admin/logs` | Ambil log scraper |

### Scraper Control Panel

Halaman `/admin/scraper` menyediakan kontrol lengkap untuk scraper:

#### Tombol Aksi

| Tombol | Endpoint | Fungsi |
|--------|----------|--------|
| **Run Full Scraper (Resume)** | POST `/admin/scraper/full` | Lanjutkan scraping dari halaman terakhir |
| **Restart from Page 1** | POST `/admin/scraper/full?reset=true` | Reset progress dan mulai dari awal |
| **Run Latest Only** | POST `/admin/scraper/latest` | Scrape update terbaru saja |
| **Fix Missing Chapters** | POST `/admin/scraper/fix-chapters` | Perbaiki chapter yang hilang |
| **Stop Scraper** | POST `/admin/scraper/stop` | Hentikan scraper yang sedang berjalan |
| **Reset Progress** | POST `/admin/scraper/reset-progress` | Hapus file progress |

#### Panel Informasi

1. **Scraper Status**
   - Status: Running / Idle
   - Tipe: Full / Latest / Fix Chapters

2. **Full Scraper Progress**
   - Last Page: Halaman terakhir yang di-scrape
   - Status: in_progress / completed / error
   - Last Updated: Waktu terakhir update

3. **Database Stats**
   - Total Comics
   - Total Chapters
   - Total Images

4. **Output Console**
   - Real-time log output (auto-refresh setiap 2 detik)
   - Menggunakan iframe dengan HTML auto-refresh
   - Bisa dibuka di tab baru

### Dashboard Overview

Dashboard menampilkan informasi sistem secara real-time:

```javascript
// Data yang ditampilkan di dashboard
{
  stats: {
    comics: 1500,      // Total komik di database
    chapters: 25000,   // Total chapter
    images: 500000,    // Total halaman/gambar
    users: 150         // Total user terdaftar
  },
  database: {
    mysql: "connected",    // Status koneksi MySQL
    mongodb: "connected"   // Status koneksi MongoDB
  },
  system: {
    uptime: "5d 3h 45m",   // Server uptime
    memory: {
      used: 256,           // RAM terpakai (MB)
      total: 512           // Total RAM (MB)
    },
    nodeVersion: "v18.17.0"
  }
}
```

### User Management

Fitur manajemen user memungkinkan admin untuk:

1. **Melihat Daftar User**: Dengan pagination dan pencarian
2. **Mengubah Role User**: Upgrade/downgrade antara `user` dan `admin`
3. **Reset Password**: Generate password sementara untuk user
4. **Toggle Status**: Enable/disable akun user

```javascript
// Contoh update role user
POST /admin/users/:id/role
Body: { role: "admin" | "user" }

// Contoh reset password (generate temp password)
POST /admin/users/:id/reset-password
Response: { success: true, tempPassword: "abc123xyz" }
```

### Scraper Control

Panel kontrol scraper memungkinkan admin untuk:

1. **Run Full Scraper**: Scrape semua komik dari sumber
2. **Run Latest Scraper**: Scrape hanya update terbaru
3. **Stop Scraper**: Hentikan scraper yang sedang berjalan
4. **Monitor Output**: Lihat output real-time dari scraper

```javascript
// Scraper dijalankan menggunakan child_process.spawn
const { spawn } = require('child_process');

// Full scraper
const process = spawn('node', ['scraper/scrap-all.js'], {
  cwd: __dirname,
  env: { ...process.env }
});

// Output ditangkap dan disimpan untuk ditampilkan di UI
process.stdout.on('data', (data) => {
  scraperOutput.push(data.toString());
});
```

**Catatan**: Hanya satu instance scraper yang dapat berjalan dalam satu waktu. Sistem akan menolak request run jika scraper sudah berjalan.

### Log Viewer

Log Viewer menampilkan log eksekusi scraper dengan fitur:

1. **Filter by Level**: ALL, ERROR, WARNING, INFO, SUCCESS
2. **Search**: Cari teks dalam log
3. **Pagination**: Batasi jumlah baris yang ditampilkan
4. **Download**: Download log file lengkap

```javascript
// Log dibaca dari file scraper.log
GET /api/admin/logs?lines=500

Response:
{
  success: true,
  logs: ["[2024-01-15 10:30:00] Scraping page 1...", ...],
  file: "scraper.log"
}
```

### Desain UI Admin

Admin Dashboard menggunakan tema dark dengan aksen neon blue, konsisten dengan desain aplikasi utama:

- **Background**: `#0f172a` (dark-400)
- **Card Background**: `#1e293b` (dark-300)
- **Neon Blue Accent**: `#0d87ff` (neon-600)
- **Layout**: Sidebar navigation di kiri, konten di kanan
- **Responsive**: Mendukung tampilan mobile dengan collapsible sidebar

### Struktur File Admin

```
server/
├── controllers/admin/
│   ├── index.js                 # Export semua controller
│   ├── adminController.js       # Dashboard & stats
│   ├── userAdminController.js   # User management
│   └── scraperAdminController.js # Scraper control & logs
├── routes/
│   ├── admin.routes.js          # Web routes
│   └── api/admin.api.routes.js  # API routes
└── views/
    ├── layouts/admin.ejs        # Admin layout dengan sidebar
    └── pages/admin/
        ├── dashboard.ejs        # Dashboard page
        ├── users.ejs            # User management page
        ├── scraper.ejs          # Scraper control page
        └── logs.ejs             # Log viewer page
```

### Keamanan Admin

1. **Authentication Required**: Semua route admin membutuhkan login
2. **Role Check**: Hanya user dengan `role: 'admin'` yang dapat akses
3. **Session Based**: Menggunakan session MongoDB untuk state management
4. **CSRF Protection**: Form submission menggunakan POST method
5. **Input Validation**: Validasi input untuk mencegah injection

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
| bcrypt | Password hashing (12 salt rounds) |
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
| **status** | VARCHAR(20) | DEFAULT 'Ongoing' | Status: Ongoing / Completed |
| **author** | VARCHAR(255) | | Nama pengarang |
| **comic_type** | VARCHAR(20) | DEFAULT 'Manga' | Tipe: Manga / Manhwa / Manhua |
| **last_scraped** | TIMESTAMP | | Waktu terakhir di-scrape |
| created_at | TIMESTAMP | DEFAULT NOW() | Waktu pembuatan |
| updated_at | TIMESTAMP | ON UPDATE NOW() | Waktu update |

> **Note:** Kolom `status`, `author`, `comic_type`, dan `last_scraped` akan otomatis ditambahkan oleh scraper saat pertama kali dijalankan melalui auto-migration.

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

### Auto-Migration

Scraper secara otomatis menjalankan migration untuk menambahkan kolom baru:

```sql
-- Auto-migration yang dijalankan oleh scraper
ALTER TABLE komik ADD COLUMN status VARCHAR(20) DEFAULT 'Ongoing';
ALTER TABLE komik ADD COLUMN author VARCHAR(255);
ALTER TABLE komik ADD COLUMN comic_type VARCHAR(20) DEFAULT 'Manga';
ALTER TABLE komik ADD COLUMN last_scraped TIMESTAMP NULL;

-- Indexes untuk performa query
CREATE INDEX idx_komik_status ON komik(status);
CREATE INDEX idx_komik_last_scraped ON komik(last_scraped);
```

Migration dijalankan di `server/scraper/config/db.js` fungsi `runMigrations()`.

---

## 🕷️ Sistem Scraper

Scraper adalah program CLI terpisah yang bertugas mengambil data komik dari sumber eksternal (Komiku.org) dan menyimpannya ke database MySQL.

### Prinsip Desain

1. **Terpisah dari Server** - Scraper tidak di-import ke Express app
2. **Write ke MySQL Only** - Hanya menulis ke database MySQL
3. **Idempotent** - Bisa dijalankan berulang tanpa duplikasi data
4. **Auto-Resume** - Progress tersimpan, bisa dilanjutkan jika terputus
5. **Smart Sync** - Mendeteksi dan memperbaiki chapter yang hilang
6. **Logging** - Mencatat semua aktivitas scraping ke file

### Struktur Folder Scraper

```
server/scraper/
├── config/
│   ├── db.js                 # Koneksi database MySQL + auto-migrations
│   ├── logger.js             # Logging configuration
│   └── scraper.config.js     # Konfigurasi scraper (delay, retry, etc)
├── scrapers/
│   ├── comicList.scraper.js  # Scraper daftar komik
│   ├── comicDetail.scraper.js# Scraper detail komik + chapter list
│   └── chapter.scraper.js    # Scraper gambar chapter
├── services/
│   ├── comic.service.js      # CRUD operasi tabel komik
│   ├── chapter.service.js    # CRUD operasi tabel chapter
│   └── image.service.js      # CRUD operasi tabel image
├── utils/
│   ├── delay.js              # Delay utilities
│   └── http.js               # HTTP client dengan retry
├── scrap-all.js              # Full scraper (semua komik)
├── scrap-latest.js           # Periodic scraper (update terbaru)
├── fix-chapters.js           # Perbaiki chapter yang hilang
└── progress-full.json        # File progress untuk resume
```

### Database Schema (Auto-Migration)

Scraper akan otomatis menambahkan kolom yang diperlukan saat pertama kali dijalankan:

```sql
-- Tabel komik dengan kolom tambahan
ALTER TABLE komik ADD COLUMN status VARCHAR(20) DEFAULT 'Ongoing';
ALTER TABLE komik ADD COLUMN author VARCHAR(255);
ALTER TABLE komik ADD COLUMN comic_type VARCHAR(20) DEFAULT 'Manga';
ALTER TABLE komik ADD COLUMN last_scraped TIMESTAMP;
```

---

### 📥 Full Scraper (scrap-all.js)

Full scrape digunakan untuk:
- Inisialisasi database pertama kali
- Scrape semua komik dari sumber
- Recovery setelah data corruption

#### Penggunaan

```bash
cd server/scraper

# Jalankan full scraper (akan auto-resume dari progress terakhir)
node scrap-all.js

# Resume dari progress terakhir (default behavior)
node scrap-all.js --resume

# Reset progress dan mulai dari halaman 1
node scrap-all.js --reset

# Mulai dari halaman tertentu
node scrap-all.js --start-page 50

# Batasi sampai halaman tertentu
node scrap-all.js --start-page 1 --end-page 100

# Skip scraping chapter (hanya metadata komik)
node scrap-all.js --skip-chapters

# Skip scraping gambar
node scrap-all.js --skip-images

# Dry run (tidak menyimpan ke database)
node scrap-all.js --dry-run

# Tampilkan bantuan
node scrap-all.js --help
```

#### Command Line Options

| Option | Deskripsi | Default |
|--------|-----------|---------|
| `--resume` | Lanjutkan dari progress terakhir | ✓ (default) |
| `--reset` | Reset progress, mulai dari halaman 1 | - |
| `--start-page <n>` | Mulai dari halaman n | 1 atau resume |
| `--end-page <n>` | Berhenti di halaman n | unlimited |
| `--skip-chapters` | Hanya scrape metadata komik | false |
| `--skip-images` | Skip scraping gambar chapter | false |
| `--dry-run` | Simulasi tanpa menyimpan ke DB | false |

#### Auto-Resume Feature

Progress scraping disimpan ke file `progress-full.json`:

```json
{
  "lastPage": 130,
  "status": "in_progress",
  "lastUpdated": "2026-01-05T10:30:00.000Z",
  "options": {
    "skipChapters": false,
    "skipImages": false
  }
}
```

Ketika dijalankan lagi dengan `--resume`, scraper akan melanjutkan dari halaman 131.

#### Proses Full Scrape

```
┌─────────────────────────────────────────────────────────────────┐
│                     FULL SCRAPER WORKFLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Load Progress (jika --resume)                               │
│     └── Baca progress-full.json                                 │
│         └── Tentukan halaman mulai                              │
│                                                                 │
│  2. Run Migrations                                              │
│     └── Tambah kolom status, author, comic_type, last_scraped   │
│                                                                 │
│  3. Loop Setiap Halaman:                                        │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  3.1 Scrape Comic List dari halaman N               │     │
│     │      └── Dapat: param, title, thumbnail, genres     │     │
│     │                                                     │     │
│     │  3.2 Untuk setiap komik:                            │     │
│     │      ├── Scrape Comic Detail                        │     │
│     │      │   └── Dapat: synopsis, status, author,       │     │
│     │      │              comicType, chapter list         │     │
│     │      │                                              │     │
│     │      ├── Upsert ke database (insert/update)         │     │
│     │      │   └── Smart compare: hanya update jika ada   │     │
│     │      │       perubahan metadata                     │     │
│     │      │                                              │     │
│     │      └── Sync Chapters                              │     │
│     │          └── Bandingkan chapter di web vs database  │     │
│     │          └── Insert SEMUA chapter yang hilang       │     │
│     │          └── Tidak skip chapter di tengah           │     │
│     │                                                     │     │
│     │  3.3 Simpan progress setelah selesai halaman        │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                 │
│  4. Jika tidak ada komik di halaman → selesai                   │
│                                                                 │
│  5. Summary: tampilkan statistik scraping                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### ⚡ Latest Scraper (scrap-latest.js)

Periodic scraper untuk update rutin konten baru.

#### Penggunaan

```bash
cd server/scraper

# Jalankan latest scraper (default: 10 halaman, 100 komik)
node scrap-latest.js

# Tentukan jumlah halaman
node scrap-latest.js --pages 5

# Tentukan limit komik
node scrap-latest.js --limit 50

# Update komik ongoing yang belum di-scrape dalam 12 jam
node scrap-latest.js --update-ongoing --ongoing-hours 12

# Kombinasi options
node scrap-latest.js --pages 3 --limit 30 --update-ongoing

# Skip gambar untuk scraping lebih cepat
node scrap-latest.js --skip-images

# Dry run
node scrap-latest.js --dry-run
```

#### Command Line Options

| Option | Deskripsi | Default |
|--------|-----------|---------|
| `--pages <n>` | Jumlah halaman terbaru yang di-scan | 10 |
| `--limit <n>` | Maksimum komik yang diproses | 100 |
| `--update-ongoing` | Update komik ongoing dari database | false |
| `--ongoing-hours <n>` | Threshold jam untuk update ongoing | 12 |
| `--ongoing-limit <n>` | Limit komik ongoing yang diupdate | 50 |
| `--skip-images` | Skip scraping gambar | false |
| `--dry-run` | Simulasi tanpa menyimpan | false |

#### Smart Update Feature

Latest scraper memiliki fitur smart update:

1. **Metadata Refresh** - Selalu update metadata (status, author, genres) untuk komik yang di-scrape
2. **Chapter Sync** - Mendeteksi dan insert chapter yang hilang (bukan hanya chapter baru)
3. **Ongoing Priority** - Dengan `--update-ongoing`, prioritaskan update komik ongoing

#### Proses Latest Scrape

```
┌─────────────────────────────────────────────────────────────────┐
│                    LATEST SCRAPER WORKFLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: Scan Latest Updates                                   │
│  └── Scrape N halaman terbaru dari website                      │
│  └── Dapat daftar komik yang baru update                        │
│                                                                 │
│  Phase 2: Process Each Comic                                    │
│  ├── Jika komik sudah ada di DB:                                │
│  │   ├── Smart Update metadata (hanya jika ada perubahan)       │
│  │   └── Sync Chapters (insert semua yang hilang)               │
│  │                                                              │
│  └── Jika komik baru:                                           │
│      ├── Insert komik baru ke database                          │
│      └── Insert semua chapter                                   │
│                                                                 │
│  Phase 3: Update Ongoing (jika --update-ongoing)                │
│  └── Query komik ongoing yang last_scraped > N jam lalu         │
│  └── Refresh metadata dan sync chapters                         │
│                                                                 │
│  Phase 4: Summary                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 🔧 Fix Chapters (fix-chapters.js)

Script khusus untuk memperbaiki chapter yang hilang/tidak lengkap.

#### Masalah yang Diperbaiki

- Chapter yang mulai dari chapter 14/20 (bukan dari chapter 1)
- Chapter yang ter-skip (misal: ch 22 → 55 → 89)
- Gap di tengah chapter list

#### Penggunaan

```bash
cd server/scraper

# Scan dan perbaiki semua komik
node fix-chapters.js

# Perbaiki komik tertentu
node fix-chapters.js --comic nama-komik-param

# Batasi jumlah komik yang dicek
node fix-chapters.js --limit 100

# Skip scraping gambar (lebih cepat)
node fix-chapters.js --skip-images

# Dry run (lihat saja tanpa menyimpan)
node fix-chapters.js --dry-run
```

#### Command Line Options

| Option | Deskripsi | Default |
|--------|-----------|---------|
| `--comic <param>` | Perbaiki komik spesifik | - |
| `--limit <n>` | Maksimum komik yang dicek | all |
| `--skip-images` | Skip scraping gambar | false |
| `--dry-run` | Simulasi tanpa menyimpan | false |

#### Output Contoh

```
============================================
           AF-KOMIK FIX MISSING CHAPTERS
============================================
[INFO] Scanning for missing chapters...
[INFO] Options: {"limit":0,"comicParam":null,"skipImages":false,"dryRun":false}
[INFO] Database connection established
[INFO] Checking 1500 comics for missing chapters...
============================================
                 Processing
============================================
[PROGRESS] Comics: 1/1500 - one-piece
[INFO] [one-piece] Found 45 missing chapters (DB: 1055, Web: 1100)
[INFO]   Missing: Chapter 1, Chapter 2, Chapter 3, Chapter 4...
[INFO]   Inserted: 45/45 chapters
[PROGRESS] Comics: 2/1500 - naruto
[DEBUG] [naruto] Complete: 700/700 chapters
...
============================================
                 FIX COMPLETE
============================================
[INFO] Duration: 45 minutes

[INFO] Summary:
[INFO]   Comics Checked:      1500
[INFO]   Comics with Missing: 127
[INFO]   Chapters Found:      3456
[INFO]   Chapters Inserted:   3456
[INFO]   Chapters Failed:     0
[INFO]   Images Inserted:     45670
```

---

### 🖥️ Admin Panel Scraper Control

Scraper juga bisa dikontrol melalui Admin Panel di browser.

#### Akses Admin Panel

1. Login sebagai admin
2. Navigasi ke `/admin/scraper`

#### Fitur Admin Panel

| Tombol | Fungsi | Deskripsi |
|--------|--------|-----------|
| **Run Full Scraper (Resume)** | `scrap-all.js --resume` | Lanjutkan dari progress terakhir |
| **Restart from Page 1** | `scrap-all.js --reset` | Reset progress dan mulai dari awal |
| **Run Latest Only** | `scrap-latest.js` | Scrape update terbaru |
| **Fix Missing Chapters** | `fix-chapters.js` | Perbaiki chapter yang hilang |
| **Stop Scraper** | Kill process | Hentikan scraper yang sedang berjalan |

#### Informasi yang Ditampilkan

- **Status**: Idle / Running
- **Full Scraper Progress**: Halaman terakhir yang di-scrape
- **Database Stats**: Total komik, chapter, dan gambar
- **Output Console**: Real-time log output (auto-refresh)

---

### ⚙️ Konfigurasi Scraper

File konfigurasi: `server/scraper/config/scraper.config.js`

```javascript
module.exports = {
  // Target website
  baseUrl: 'https://komiku.org',
  
  // HTTP settings
  http: {
    timeout: 30000,                    // 30 detik timeout
    userAgent: 'Mozilla/5.0 ...',      // User agent browser
    headers: { ... }                   // Headers tambahan
  },
  
  // Delay settings (milliseconds)
  delay: {
    betweenPages: 1500,               // Delay antar halaman
    betweenComics: 1000,              // Delay antar komik
    betweenChapters: 800,             // Delay antar chapter
    randomExtra: 500                  // Random extra delay (0-500ms)
  },
  
  // Retry settings
  retry: {
    maxAttempts: 3,                   // Maksimum retry
    initialDelay: 2000,               // Delay awal retry
    maxDelay: 10000                   // Maksimum delay retry
  },
  
  // Limits
  limits: {
    latestPageLimit: 10,              // Halaman untuk latest scrape
    latestComicLimit: 100,            // Limit komik untuk latest
    concurrency: 1,                   // Concurrent requests (keep low)
    fullScrapeMaxPages: 0             // 0 = unlimited
  }
};
```

---

### 📅 Jadwal Cron yang Direkomendasikan

```bash
# Update terbaru setiap 2 jam
0 */2 * * * cd /path/to/server/scraper && node scrap-latest.js --pages 3 --limit 50

# Update komik ongoing setiap 6 jam
0 */6 * * * cd /path/to/server/scraper && node scrap-latest.js --update-ongoing --ongoing-hours 6

# Fix missing chapters setiap minggu (Minggu jam 3 pagi)
0 3 * * 0 cd /path/to/server/scraper && node fix-chapters.js --skip-images

# Full validation setiap bulan (tanggal 1 jam 2 pagi)
0 2 1 * * cd /path/to/server/scraper && node fix-chapters.js
```

---

### 🔄 Chapter Sync System

Sistem sync chapter memastikan tidak ada chapter yang hilang:

#### Cara Kerja

```javascript
// ChapterService.syncChapters(comicId, scrapedChapters)

1. Ambil semua chapter param dari database untuk komik ini
2. Bandingkan dengan chapter dari website
3. Temukan chapter yang ada di website tapi tidak di database
4. Insert semua chapter yang hilang
5. Return summary: {
     existingCount: 1055,      // Chapter di DB
     scrapedCount: 1100,       // Chapter di website
     missingCount: 45,         // Yang hilang
     insertedCount: 45,        // Yang berhasil di-insert
     status: 'synced'          // Status: complete/synced/partial
   }
```

#### Keuntungan

- ✅ Tidak ada chapter yang ter-skip
- ✅ Otomatis mendeteksi gap di tengah
- ✅ Idempotent - aman dijalankan berulang
- ✅ Efisien - hanya insert yang belum ada

---

### 📊 Smart Metadata Update

Sistem update metadata yang efisien:

```javascript
// ComicService.smartUpdate(existing, newData)

1. Bandingkan setiap field:
   - title, thumbnail, description, synopsis
   - genres (sebagai sorted array)
   - status, author, comicType
   
2. Jika ada perubahan:
   - Update hanya field yang berubah
   - Update last_scraped timestamp
   - Return { updated: true, changes: ['status', 'author'] }
   
3. Jika tidak ada perubahan:
   - Return { updated: false, changes: [] }
```

#### Keuntungan

- ✅ Mengurangi write ke database
- ✅ Tracking perubahan yang jelas
- ✅ last_scraped selalu update

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

## ⚡ Performance Optimization

### Database Statistics Caching

Admin dashboard menggunakan **intelligent caching system** untuk mengatasi lambatnya query pada tabel besar (12M+ rows).

#### Problem
- Query `SELECT COUNT(*) FROM image` membutuhkan **10-15 detik** pada tabel dengan 12+ juta baris
- Admin dashboard menjadi sangat lambat
- Database overload saat banyak request

#### Solution
Implementasi multi-layer optimization:

1. **Approximate Counts** - Menggunakan `information_schema.TABLES` untuk tabel besar (98% akurat, 150x lebih cepat)
2. **Smart Caching** - Cache otomatis dengan TTL 2-10 menit
3. **Auto-invalidation** - Cache direfresh setelah scraper selesai
4. **Background Warmup** - Pre-load cache saat server startup

#### Performance Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Page Load** | 10-15s | 50-100ms | **~150x faster** |
| **Cached Load** | 10-15s | 5-10ms | **~2000x faster** |
| **DB Load** | Every request | Every 10 min | **~60x reduction** |

#### Usage

**Manual refresh stats** (Admin Dashboard):
- Click refresh button (🔄) on Database Status card
- Stats will be refreshed and cached

**API Endpoint**:
```bash
POST /admin/stats/refresh
```

**For developers**:
```javascript
const statsService = require('./services/statsService');

// Get optimized stats
const stats = await statsService.getDatabaseStats();

// Invalidate cache after data changes
statsService.invalidateCache();
```

#### Files
- `/server/utils/statsCache.js` - Generic caching utility
- `/server/services/statsService.js` - Optimized stats service
- `/server/docs/STATS_OPTIMIZATION.md` - Full documentation
- `/server/docs/OPTIMIZATION_SUMMARY.md` - Implementation summary

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
*Versi: 2.3.0 - Phase 4 Bookmark & History System*
