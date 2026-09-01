# Panduan Setup Lengkap — Task Management System

Dokumen ini memandu langkah-langkah penyiapan dan eksekusi lokal untuk penguji sistem.

---

## 1. Prasyarat Sistem & Ekstensi PHP

| Komponen | Versi Minimum | Catatan |
|---|---|---|
| **PHP** | 8.2+ | Ekstensi aktif: `pdo_mysql`, `sodium`, `gd`, `pcntl` |
| **MySQL** | 5.7+ / MariaDB 10.4+ | Aktif di port `3306` (XAMPP Control Panel) |
| **Composer** | 2.x | Manajemen paket backend |
| **Node.js** | 18+ | Runtime frontend Next.js |
| **npm** | 9+ | Package manager frontend |

### Verifikasi Ekstensi PHP Wajib di `php.ini`
Buka file `php.ini` Anda (misal `C:\xampp\php\php.ini`) dan pastikan baris berikut **tidak diawali titik koma (;)**:
```ini
extension=pdo_mysql
extension=gd
extension=sodium
extension=pcntl ; (pada Linux/WSL/standalone, untuk Laravel Reverb)
```

---

## 2. Penyiapan Database MySQL

Sebelum menjalankan migrasi, pastikan:
1. **Nyalakan service MySQL** di XAMPP Control Panel (klik tombol **Start** pada modul MySQL).
2. **Buat database** `transcosmos_task_db` melalui salah satu cara berikut:

**Cara A — Via phpMyAdmin:**
Buka `http://localhost/phpmyadmin`, klik tab **Databases**, ketik `transcosmos_task_db`, lalu klik **Create**.

**Cara B — Via MySQL CLI:**
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS transcosmos_task_db;"
```

---

## 3. Penyiapan Backend (Laravel 12)

> **Penting:** Selesaikan langkah ini sebelum melanjutkan ke penyiapan frontend.

```bash
cd backend

# Install dependencies PHP
composer install

# Salin konfigurasi environment
cp .env.example .env

# Generate encryption keys
php artisan key:generate
php artisan jwt:secret

# Pastikan service MySQL di XAMPP sudah berjalan & database sudah dibuat
php artisan migrate:fresh --seed
```

### Konfigurasi Database, Reverb, & Queue di `backend/.env`

Jika Anda menggunakan `cp .env.example .env`, nilai-nilai berikut sudah otomatis tersedia. Verifikasi jika diperlukan:

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

---

## 4. Penyiapan Frontend (Next.js 15)

```bash
cd frontend

# Install dependencies (termasuk laravel-echo, pusher-js, vitest)
npm install
```

Pastikan file `frontend/.env.local` memiliki variabel berikut (nilai `REVERB_APP_KEY` harus **identik** dengan `backend/.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_REVERB_APP_KEY=tkpus4smxngsyzsukohd
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

---

## 5. Eksekusi 4 Terminal Terpisah (Wajib)

Untuk menguji seluruh fungsionalitas sistem (HTTP API, WebSockets real-time, Background Jobs, dan Frontend UI), buka **4 jendela terminal terpisah**:

### 🖥️ Terminal 1 — Laravel HTTP API Server
```bash
cd backend
php artisan serve
```
*Port:* `http://127.0.0.1:8000`

### 🖥️ Terminal 2 — Next.js Frontend Server
```bash
cd frontend
npm run dev
```
*Port:* `http://localhost:3000`

### 🖥️ Terminal 3 — Queue Worker (Background Processing)
```bash
cd backend
php artisan queue:work
```
*Fungsi:* Menjalankan job `ProcessTaskAttachment` (simulasi virus scan & thumbnail resize secara asinkron).

### 🖥️ Terminal 4 — Laravel Reverb WebSocket Server
```bash
cd backend
php artisan reverb:start
```
*Port:* `ws://localhost:8080` (Menerima dan menyiarkan event `TaskUpdated`, `CommentAdded`, `NotificationSent`).

---

## 6. Pengujian Otomatis

- **Backend Tests (PHPUnit):**
  ```bash
  cd backend
  php artisan test
  ```
  Mencakup: Autentikasi JWT (login, logout, me, anti-IDOR, JSON 401), Broadcasting Events, dan Background Job Queue.

- **Frontend Tests (Vitest & React Testing Library):**
  ```bash
  cd frontend
  npm test
  ```
  Mencakup: Render form login, simulasi interaksi user, mocking axios, dan verifikasi localStorage.

---

## 7. Akun Pengujian

| Email | Password | Keterangan |
|---|---|---|
| `test@example.com` | `password` | Akun Demo Utama (ID #1) |

Seeder juga membuat 4 user tambahan, 15 task, dan 10 komentar untuk keperluan pengujian.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `SQLSTATE[HY000] [2002] Connection refused` | Service MySQL di XAMPP belum di-Start. Buka XAMPP Control Panel dan nyalakan MySQL. |
| `Unknown database 'transcosmos_task_db'` | Database belum dibuat. Jalankan `CREATE DATABASE transcosmos_task_db;` di MySQL. |
| CORS error di browser | Pastikan `config/cors.php` mengizinkan origin `http://localhost:3000`. |
| 401 Unauthorized | Token JWT expired. Login ulang untuk mendapatkan token baru. |
| Warning `@theme inline` di console | Pastikan file `frontend/postcss.config.mjs` ada dengan plugin `@tailwindcss/postcss`. |
| Port sudah dipakai | Ubah port: `php artisan serve --port=8001` atau `npm run dev -- -p 3001`. |
