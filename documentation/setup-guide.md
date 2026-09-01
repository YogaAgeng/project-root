# Panduan Setup Lengkap — Task Management System

Dokumen ini memandu langkah-langkah penyiapan dan eksekusi lokal untuk penguji sistem.

---

## 1. Prasyarat Sistem & Ekstensi PHP

| Komponen | Versi Minimum | Catatan |
|---|---|---|
| **PHP** | 8.2+ | Ekstensi aktif: `pdo_mysql` / `pdo_sqlite`, `sodium`, `gd`, `pcntl` |
| **Composer** | 2.x | Manajemen paket backend |
| **Node.js** | 18+ | Runtime frontend Next.js |
| **npm** | 9+ | Package manager frontend |

### Verifikasi Ekstensi PHP Wajib di `php.ini`
Buka file `php.ini` Anda (misal `C:\xampp\php\php.ini`) dan pastikan baris berikut **tidak diawali titik koma (;)**:
```ini
extension=gd
extension=sodium
extension=pcntl ; (pada Linux/WSL/standalone)
```

---

## 2. Penyiapan Backend (Laravel 12)

```bash
cd backend

# Install dependencies
composer install

# Salin konfigurasi environment
cp .env.example .env

# Generate encryption keys
php artisan key:generate
php artisan jwt:secret

# Eksekusi migrasi tabel dan data awal (seeder)
php artisan migrate --seed
```

### Konfigurasi Reverb & Queue di `backend/.env`
```env
BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database

REVERB_APP_ID=transcosmos_task_app
REVERB_APP_KEY=reverbkey1234567890ab
REVERB_APP_SECRET=reverbsecret1234567890ab
REVERB_HOST="localhost"
REVERB_PORT=8080
REVERB_SCHEME=http
```

---

## 3. Penyiapan Frontend (Next.js 15)

```bash
cd frontend

# Install dependencies (termasuk laravel-echo dan pusher-js)
npm install
```

Pastikan file `frontend/.env.local` memiliki variabel berikut:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_REVERB_APP_KEY=reverbkey1234567890ab
NEXT_PUBLIC_REVERB_HOST=localhost
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

---

## 4. Eksekusi 4 Terminal Terpisah (Wajib)

Untuk menguji seluruh fungsionalitas sistem (HTTP API, WebSockets real-time, Background Jobs, dan Frontend UI), buka **4 jendela terminal**:

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
*Fungsi:* Menjalankan job `ProcessTaskAttachment` (simulasi virus scan & thumbnail resize).

### 🖥️ Terminal 4 — Laravel Reverb WebSocket Server
```bash
cd backend
php artisan reverb:start
```
*Port:* `ws://localhost:8080` (Menerima dan menyiarkan event `TaskUpdated`, `CommentAdded`, `NotificationSent`).

---

## 5. Akun Pengujian

- **Email:** `test@example.com`
- **Password:** `password`
