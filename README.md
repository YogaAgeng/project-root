# Task Management System

Sistem manajemen tugas berbasis web yang memungkinkan pengguna membuat, mengelola, dan melacak tugas secara kolaboratif.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Backend** | Laravel 12 (PHP 8.x) |
| **Frontend** | Next.js 15 (React 19) |
| **Database** | SQLite |
| **Authentication** | Laravel Sanctum (HttpOnly Cookie) |
| **Styling** | Vanilla CSS (Dark Glassmorphism) |

## Fitur Utama

- **Autentikasi** — Register, Login, Logout dengan HttpOnly Cookie (anti-XSS)
- **Manajemen Task** — CRUD tugas dengan filter status, sorting due date, dan paginasi
- **User Assignment** — Dropdown penugasan pengguna pada task
- **Komentar** — CRUD komentar per task dengan moderasi oleh pembuat tugas
- **Lampiran** — Upload, download, dan hapus file per task
- **Notifikasi In-App** — Pemberitahuan real-time untuk penugasan, komentar, dan aktivitas lampiran
- **Anti-IDOR** — Otorisasi ketat pada setiap endpoint (403 Forbidden)

## Quick Start

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve

# Frontend (terminal baru)
cd frontend
npm install
npm run dev
```

Buka **http://localhost:3000** di browser.

## Struktur Proyek

```
project-root/
├── backend/          # Laravel 12 API
│   ├── app/          # Controllers, Models, Middleware
│   ├── config/       # Konfigurasi Laravel
│   ├── database/     # Migrations, Seeders, Factories
│   ├── routes/       # API routes (api.php)
│   ├── tests/        # PHPUnit tests
│   └── README.md
├── frontend/         # Next.js 15 SPA
│   ├── src/          # Pages, Components, Libraries
│   ├── public/       # Static assets
│   ├── tests/        # Frontend tests
│   └── README.md
├── documentation/    # Dokumentasi proyek
│   ├── api-docs/     # Dokumentasi API endpoints
│   ├── architecture.md
│   └── setup-guide.md
└── README.md         # File ini
```

## Dokumentasi

- [Setup Guide](documentation/setup-guide.md) — Panduan instalasi lengkap
- [Architecture](documentation/architecture.md) — Arsitektur sistem
- [API Documentation](documentation/api-docs/) — Dokumentasi endpoint API
