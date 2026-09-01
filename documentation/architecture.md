# Arsitektur Sistem — Task Management

## Diagram Arsitektur

```
┌─────────────────────────┐                        ┌───────────────────────────┐
│   Frontend (Next.js 15) │                        │   Backend (Laravel 12)     │
│   Port: 3000            │                        │   Port: 8000               │
│                         │    HTTP API (REST)      │                            │
│  ┌───────────────────┐  │  ◄──────────────────►  │  ┌──────────────────────┐  │
│  │ React Pages       │  │    Authorization:       │  │ Controllers          │  │
│  │ - Login           │  │    Bearer <JWT Token>   │  │ - AuthController     │  │
│  │ - Tasks Board     │  │                        │  │ - TaskController     │  │
│  │ - Comments        │  │                        │  │ - TaskCommentCtrl    │  │
│  │ - Attachments     │  │                        │  │ - TaskAttachmentCtrl │  │
│  └───────────────────┘  │                        │  │ - NotificationCtrl   │  │
│                         │                        │  └──────────┬───────────┘  │
│  ┌───────────────────┐  │                        │             │              │
│  │ Components        │  │                        │  ┌──────────▼───────────┐  │
│  │ - NotificationBell│  │                        │  │ Models (JWT Subject) │  │
│  │ - AttachmentList  │  │                        │  │ - User               │  │
│  └───────────────────┘  │                        │  │ - Task               │  │
│                         │   WebSocket (ws://8080) │  │ - TaskComment        │  │
│  ┌───────────────────┐  │  ◄──────────────────►  │  │ - TaskAttachment     │  │
│  │ Libraries         │  │   Laravel Echo +        │  │ - AppNotification    │  │
│  │ - axios.js        │  │   Pusher Protocol       │  └──────────┬───────────┘  │
│  │ - echo.js (Echo)  │  │                        │             │              │
│  │ - SWR (cache)     │  │                        │  ┌──────────▼───────────┐  │
│  └───────────────────┘  │                        │  │ Database (MySQL)     │  │
└─────────────────────────┘                        │  │ transcosmos_task_db  │  │
                                                   │  └──────────────────────┘  │
                                                   │                            │
                           ┌─────────────────────┐ │  ┌──────────────────────┐  │
                           │ Queue Worker         │ │  │ Events (Broadcast)   │  │
                           │ php artisan          │◄┤  │ - TaskUpdated        │  │
                           │   queue:work         │ │  │ - CommentAdded       │  │
                           │                      │ │  │ - NotificationSent   │  │
                           │ Jobs:                │ │  └──────────────────────┘  │
                           │ - ProcessTask-       │ │                            │
                           │   Attachment         │ │  ┌──────────────────────┐  │
                           │   (virus scan +      │ │  │ Laravel Reverb       │  │
                           │    thumbnail GD)     │ │  │ WebSocket Server     │  │
                           └─────────────────────┘ │  │ Port: 8080           │  │
                                                   │  └──────────────────────┘  │
                                                   └───────────────────────────┘
```

## Alur Autentikasi (JWT)

1. Pengguna mengirimkan permintaan `POST /api/auth/login` berisi kredensial (email & password).
2. Backend memvalidasi kredensial via `Auth::guard('api')->attempt($credentials)`.
3. Backend mengembalikan respons JSON berisi data pengguna dan JWT Token (`token`).
4. Frontend menyimpan `token` di `localStorage` dan data `user` di `localStorage`.
5. Axios request interceptor secara dinamis menginjeksikan header `Authorization: Bearer <token>` pada setiap permintaan API berikutnya.
6. Logout (`POST /api/auth/logout`) mem-blacklist token di server dan menghapus token dari `localStorage` di client-side.
7. Jika token kedaluwarsa atau tidak valid, backend mengembalikan `401 Unauthorized` JSON (dikonfigurasi di `bootstrap/app.php`), dan response interceptor di frontend melakukan pembersihan `localStorage` serta me-redirect pengguna ke halaman login (`/login`).

## Keputusan Arsitektur: JWT dengan localStorage (Architecture Decision Record)

### 1. Keputusan
Sistem autentikasi menggunakan **JSON Web Token (JWT)** via package `php-open-source-saver/jwt-auth` dengan token disimpan di `localStorage` pada sisi klien dan dikirimkan via header `Authorization: Bearer <token>`, menggantikan mekanisme Sanctum HttpOnly Cookie sebelumnya.

### 2. Konteks & Justifikasi
Spesifikasi wajib pengujian mensyaratkan implementasi autentikasi berbasis JWT murni tanpa cookie dan prefix rute `/api/auth/*`. Penghapusan registrasi publik dilakukan karena akun pengguna dikelola secara terpusat melalui Database Seeder.

### 3. Analisis Trade-off Keamanan

| Aspek Keamanan | HttpOnly Cookie | localStorage (JWT) |
|---|---|---|
| **Perlindungan XSS** | Kuat (Cookie tidak bisa diakses JavaScript) | Perlu Mitigasi (Token dapat diakses JS jika ada celah XSS) |
| **Perlindungan CSRF** | Rentan tanpa token CSRF | Kebal CSRF (Header Authorization tidak otomatis dikirim browser) |
| **Fleksibilitas Klien** | Terbatas pada browser web | Universal (Mudah digunakan untuk mobile apps, CLI, & third-party API) |
| **Manajemen Sesi** | Terikat Domain / SameSite | Stateless / Fleksibel lintas domain |

### 4. Mitigasi Risiko XSS
1. **React Auto-Escaping**: React secara bawaan melakukan sanitize dan escaping pada semua string rendering untuk mencegah injeksi script.
2. **Short-Lived Token (TTL)**: Token kedaluwarsa dalam 60 menit (`JWT_TTL=60`), membatasi durasi eksploitasi jika token bocor.
3. **Server-Side Token Blacklisting**: Saat logout, token dimasukkan ke blacklist server sehingga tidak dapat disalahgunakan lagi.
4. **Exception Handling Terpusat**: Penanganan `AuthenticationException` di `bootstrap/app.php` memastikan kegagalan autentikasi selalu mengembalikan respons JSON `401 Unauthorized` tanpa mengekspos stack trace atau redirect HTML.

### 5. Siklus Hidup Token (Token Lifecycle)

| Parameter | Nilai | Keterangan |
|---|---|---|
| `JWT_TTL` | 60 menit | Masa berlaku token aktif |
| `JWT_REFRESH_TTL` | 20160 menit (2 minggu) | Jendela waktu pembaruan token |
| `JWT_BLACKLIST_ENABLED` | `true` | Token masuk blacklist saat logout |

**Strategi Penanganan Token Expired di Frontend:**
- Ketika request menghasilkan error `401 Unauthorized`, response interceptor pada `lib/axios.js` secara otomatis:
  1. Menghapus `token` dari `localStorage`
  2. Menghapus `user` dari `localStorage`
  3. Mengarahkan halaman ke `/login` (`window.location.href = '/login'`), yang secara otomatis menghentikan WebSocket subscription Echo dan membersihkan cache SWR.

---

## Alur Real-Time (WebSockets via Laravel Reverb & Echo)

### Arsitektur Komunikasi
1. Backend mendispatch event setelah modifikasi data berhasil di-commit ke database.
2. Laravel Reverb (WebSocket server di port `8080`) menerima event dan menyiarkannya ke subscriber.
3. Frontend mendengarkan event via Laravel Echo (Pusher protocol) dan memanggil `mutate()` SWR untuk memperbarui UI secara instan tanpa polling.

### Private Channels & Events

| Channel | Format | Otorisasi | Events yang Diterima |
|---|---|---|---|
| `user.{userId}` | `private-user.{id}` | User ID harus cocok | `TaskUpdated`, `NotificationSent` |
| `tasks.{taskId}` | `private-tasks.{id}` | User harus `created_by` atau `assigned_user_id` | `TaskUpdated`, `CommentAdded` |

### Endpoint Autentikasi Broadcasting
- `POST /api/broadcasting/auth` — Endpoint otomatis dari `Broadcast::routes()`, dilindungi middleware `auth:api`. Digunakan oleh Echo client untuk mengautentikasi subscription ke private channels menggunakan JWT token.

### Komponen Frontend yang Menggunakan WebSocket

| Komponen | Channel | Event | Aksi |
|---|---|---|---|
| `NotificationBell.jsx` | `user.{userId}` | `NotificationSent` | Toast alert + `mutate()` |
| `tasks/page.jsx` | `user.{userId}` | `TaskUpdated` | `mutate()` (refresh task list) |
| `[taskId]/comments/page.jsx` | `tasks.{taskId}` | `CommentAdded` | `mutate()` (refresh comments) |

---

## Alur Background Job (Queue Processing)

1. User mengupload file lampiran via `POST /api/tasks/{task}/attachments`.
2. File disimpan di storage dengan status awal `pending`.
3. Job `ProcessTaskAttachment` di-dispatch ke database queue setelah `DB::commit()`.
4. Queue worker (`php artisan queue:work`) memproses job secara asinkron:
   - **Simulasi virus scan** (`sleep(2)`)
   - **Thumbnail generation** (PHP GD native) jika `mime_type` berawalan `image/`
5. Status attachment diperbarui menjadi `processed` (berhasil) atau `failed` (gagal).

---

## Alur Otorisasi (Anti-IDOR)

| Aksi | Siapa yang Diizinkan |
|------|---------------------|
| View/Edit Task | `created_by` ATAU `assigned_user_id` |
| Delete Task | Hanya `created_by` |
| View/Add Comment | `created_by` ATAU `assigned_user_id` dari task |
| Edit Comment | Hanya pemilik komentar (`user_id`) |
| Delete Comment | Pemilik komentar ATAU `created_by` task (moderasi) |
| Delete Attachment | `uploaded_by` ATAU `created_by` task |
| Subscribe WebSocket Channel `tasks.{taskId}` | `created_by` ATAU `assigned_user_id` |

---

## Database Schema

```
users
├── id, name, email, password, timestamps

tasks
├── id, title, description, status, priority
├── due_date, created_by (FK→users), assigned_user_id (FK→users)
├── timestamps

task_comments
├── id, task_id (FK→tasks), user_id (FK→users)
├── body, timestamps

task_attachments
├── id, task_id (FK→tasks), uploaded_by (FK→users)
├── file_name, file_path, file_size, mime_type
├── status (string, default: 'pending') — 'pending' | 'processed' | 'failed'
├── timestamps

app_notifications
├── id, user_id (FK→users), type, title, message
├── link, is_read, timestamps
```

---

## Paginasi

| Endpoint | Default Per Page |
|----------|-----------------|
| `GET /api/tasks` | 6 |
| `GET /api/tasks/{id}/comments` | 10 |

Response envelope: `{ data, current_page, last_page, per_page, total }`
