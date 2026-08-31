# Panduan Setup — Task Management System

## Prasyarat

| Software | Versi Minimum |
|----------|--------------|
| PHP | 8.2+ |
| Composer | 2.x |
| Node.js | 18+ |
| npm | 9+ |
| SQLite | 3.x (biasanya sudah termasuk di PHP) |

## 1. Clone Repository

```bash
git clone <repository-url> project-root
cd project-root
```

## 2. Setup Backend (Laravel)

```bash
cd backend

# Install dependencies
composer install

# Salin environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Buat database SQLite (jika belum ada)
touch database/database.sqlite

# Jalankan migrasi dan seeder
php artisan migrate --seed

# Jalankan server
php artisan serve
```

Backend berjalan di **http://localhost:8000**

### Konfigurasi .env Penting

```env
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/backend/database/database.sqlite

SANCTUM_STATEFUL_DOMAINS=localhost:3000
SESSION_DOMAIN=localhost
```

## 3. Setup Frontend (Next.js)

```bash
cd frontend

# Install dependencies
npm install

# Salin environment file (jika belum ada)
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Jalankan dev server
npm run dev
```

Frontend berjalan di **http://localhost:3000**

## 4. Akun Default (dari Seeder)

| Email | Password | Role |
|-------|----------|------|
| `test@example.com` | `password` | Test User (ID #1) |

Seeder juga membuat beberapa user tambahan, task, komentar, dan lampiran untuk testing.

## 5. Menjalankan Kedua Server Bersamaan

Buka 2 terminal terpisah:

**Terminal 1 — Backend:**
```bash
cd backend
php artisan serve
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

## 6. Verifikasi Instalasi

1. Buka **http://localhost:3000** di browser
2. Login dengan `test@example.com` / `password`
3. Pastikan halaman Task Management Board muncul
4. Coba buat task baru, tambah komentar, dan upload lampiran

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| CORS error | Pastikan `SANCTUM_STATEFUL_DOMAINS` di `.env` sesuai dengan domain frontend |
| 401 Unauthorized | Cookie auth mungkin expired, login ulang |
| SQLite error | Pastikan file `database/database.sqlite` ada dan writable |
| Port sudah dipakai | Ubah port: `php artisan serve --port=8001` atau `npm run dev -- -p 3001` |
