# Task Management System

Sistem manajemen tugas berbasis web yang memungkinkan pengguna membuat, mengelola, melacak tugas secara kolaboratif, dengan pembaruan real-time via WebSockets (Laravel Reverb & Echo) dan background job queue.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Backend** | Laravel 12 (PHP 8.2+) |
| **Frontend** | Next.js 15 (React 19) |
| **Authentication** | JSON Web Token (JWT via header `Authorization: Bearer <token>`) |
| **WebSockets** | Laravel Reverb & Laravel Echo (Pusher Protocol) |
| **Queue** | Laravel Database Queue (`QUEUE_CONNECTION=database`) |
| **Database** | MySQL (`transcosmos_task_db`) |
| **Styling** | Vanilla CSS (Dark Glassmorphism) & Tailwind CSS |

---

## Fitur Utama

- **Autentikasi JWT** — Login, Logout via JWT Bearer Token (Anti-CSRF & Stateless)
- **Real-Time WebSockets** — Pembaruan instan pada Task, Komentar, dan Notifikasi In-App via Laravel Reverb & Echo (tanpa polling)
- **Manajemen Task** — CRUD tugas dengan filter status, sorting due date, dan paginasi
- **User Assignment** — Penugasan pengguna ke task
- **Komentar Real-Time** — Diskusi komentar per task dengan moderasi oleh pembuat tugas
- **Lampiran & Background Job** — Upload file dengan antrean async virus scanning dan auto-generate thumbnail menggunakan PHP GD
- **Notifikasi In-App Real-Time** — Toast & dropdown notification instan via WebSockets
- **Anti-IDOR** — Otorisasi ketat pada setiap endpoint (403 Forbidden)

---

## Setup Guide & Prasyarat

### 1. Prasyarat Ekstensi PHP

Sebelum menjalankan aplikasi, pastikan modul **MySQL di XAMPP Control Panel sudah AKTIF (Started)** dan ekstensi berikut sudah aktif di `php.ini` Anda:
- `extension=pdo_mysql` — Driver database MySQL.
- `extension=gd` — Diperlukan untuk background job pemrosesan thumbnail gambar.
- `extension=sodium` — Diperlukan untuk enkripsi JWT.
- `extension=pcntl` — Diperlukan saat menjalankan Laravel Reverb WebSocket server (di Linux/macOS/WSL atau mode standalone).

---

### 2. Konfigurasi Environment File

Salin dan sinkronkan file `.env` di backend dan `.env.local` di frontend:

```bash
# Backend
cd backend
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
php artisan migrate:fresh --seed
```

Pastikan variabel Reverb, Database, & Queue di `backend/.env` terkonfigurasi:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=transcosmos_task_db
DB_USERNAME=root
DB_PASSWORD=

BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database

REVERB_APP_ID=949759
REVERB_APP_KEY=tkpus4smxngsyzsukohd
REVERB_APP_SECRET=lf9gbmxq2oj3cplujs8m
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http
```

Dan variabel di `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_REVERB_APP_KEY=tkpus4smxngsyzsukohd
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

---

### 3. Instruksi Menjalankan Aplikasi (4 Terminal Terpisah)

Penguji **WAJIB** membuka 4 jendela terminal terpisah dan menjalankan perintah berikut:

#### 🖥️ Terminal 1 — Backend HTTP Server
```bash
cd backend
php artisan serve
```
> Server berjalan di: `http://127.0.0.1:8000`

#### 🖥️ Terminal 2 — Frontend Next.js Server
```bash
cd frontend
npm install
npm run dev
```
> Aplikasi web berjalan di: `http://localhost:3000`

#### 🖥️ Terminal 3 — Queue Worker (Background Processing)
```bash
cd backend
php artisan queue:work
```
> Memproses antrean virus scanning dan thumbnail generator secara asinkron.

#### 🖥️ Terminal 4 — Laravel Reverb WebSocket Server
```bash
cd backend
php artisan reverb:start
```
> WebSocket server berjalan di: `ws://localhost:8080` untuk siaran event real-time.

---

## Akun Demo untuk Pengujian

| Email | Password | Keterangan |
|---|---|---|
| `test@example.com` | `password` | Akun Demo Utama (ID #1) |

---

## Struktur Proyek

```
project-root/
├── backend/          # Laravel 12 API (JWT, Reverb, Queue)
│   ├── app/          # Controllers, Models, Events, Jobs
│   ├── config/       # Konfigurasi Reverb, Auth, Broadcasting, JWT
│   ├── database/     # Migrations, Seeders, Factories
│   ├── routes/       # API & Channels routes
│   └── tests/        # PHPUnit automated tests
├── frontend/         # Next.js 15 SPA (React 19, Echo)
│   ├── src/          # Pages, Components, lib/echo.js, lib/axios.js
│   ├── tests/        # Vitest & React Testing Library tests
│   └── package.json
├── documentation/    # Dokumentasi sistem & API
│   ├── architecture.md
│   ├── setup-guide.md
│   └── api-docs/
└── README.md
```
