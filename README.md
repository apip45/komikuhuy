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
12. [Logging System](#-logging-system)
13. [Environment Variables](#-environment-variables)
14. [Cara Install](#-cara-install)
15. [Cara Menjalankan](#-cara-menjalankan)
16. [Output Program](#-output-program)
17. [Catatan Production](#-catatan-production)
18. [Rencana Pengembangan Mobile App](#-rencana-pengembangan-mobile-app)

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
| 🔧 Scraper Control | Jalankan dan kontrol scraper | ✅ Selesai |
| 📋 Log Viewer | Lihat log eksekusi scraper | ✅ Selesai |
| 💾 Database Stats | Monitoring status database | ✅ Selesai |

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
| GET | `/admin/logs` | Halaman log viewer |
| POST | `/admin/users/:id/role` | Update role user |
| POST | `/admin/users/:id/reset-password` | Reset password user |
| POST | `/admin/users/:id/toggle-status` | Enable/disable akun user |
| POST | `/admin/scraper/run-full` | Jalankan full scraper |
| POST | `/admin/scraper/run-latest` | Jalankan latest scraper |
| POST | `/admin/scraper/stop` | Hentikan scraper yang berjalan |

#### API Routes (`/api/admin/*`)

| Method | Route | Deskripsi |
|--------|-------|-----------|
| GET | `/api/admin/stats` | Ambil statistik sistem |
| GET | `/api/admin/users` | Ambil daftar user (paginated) |
| GET | `/api/admin/scraper/status` | Cek status scraper |
| GET | `/api/admin/scraper/output` | Ambil output scraper |
| GET | `/api/admin/logs` | Ambil log scraper |

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
*Versi: 2.3.0 - Phase 4 Bookmark & History System*
