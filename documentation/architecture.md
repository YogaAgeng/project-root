# Arsitektur Sistem — Task Management

## Diagram Arsitektur

```
┌─────────────────────┐         ┌─────────────────────┐
│   Frontend (Next.js)│         │   Backend (Laravel)  │
│   Port: 3000        │◄───────►│   Port: 8000         │
│                     │  HTTP   │                      │
│  ┌───────────────┐  │  API    │  ┌───────────────┐   │
│  │ React Pages   │  │  (JWT)  │  │ Controllers   │   │
│  │ - Login       │  │         │  │ - Auth        │   │
│  │ - Tasks       │  │         │  │ - Task        │   │
│  │ - Comments    │  │         │  │ - Comment     │   │
│  │ - Attachments │  │         │  │ - Attachment  │   │
│  └───────────────┘  │         │  │ - Notification│   │
│                     │         │  └───────┬───────┘   │
│  ┌───────────────┐  │         │          │           │
│  │ Components    │  │         │  ┌───────▼───────┐   │
│  │ - NotifBell   │  │         │  │ Models (JWT)  │   │
│  │ - Attachments │  │         │  │ - User        │   │
│  └───────────────┘  │         │  │ - Task        │   │
│                     │         │  │ - TaskComment │   │
│  ┌───────────────┐  │         │  │ - Attachment  │   │
│  │ Libraries     │  │         │  │ - Notification│   │
│  │ - axios.js    │  │         │  └───────┬───────┘   │
│  │ - SWR         │  │         │          │           │
│  └───────────────┘  │         │  ┌───────▼───────┐   │
└─────────────────────┘         │  │ Database (SQL)│   │
                                │  └───────────────┘   │
                                └─────────────────────┘
```

## Alur Autentikasi (JWT)

1. Pengguna mengirimkan permintaan `POST /api/auth/login` berisi kredensial (email & password).
2. Backend memvalidasi kredensial via `Auth::guard('api')->attempt($credentials)`.
3. Backend mengembalikan respons JSON berisi data pengguna dan JWT Token (`token`).
4. Axios response interceptor di frontend menangkap `token` dan menyimpannya di client-side (`localStorage`).
5. Axios request interceptor secara dinamis menginjeksikan header `Authorization: Bearer <token>` pada setiap permintaan API berikutnya.
6. Logout (`POST /api/auth/logout`) mem-blacklist token di server dan menghapus token dari `localStorage` di client-side.
7. Jika token kedaluwarsa atau tidak valid, backend mengembalikan `401 Unauthorized` JSON, dan response interceptor di frontend melakukan pembersihan `localStorage` serta me-redirect pengguna ke halaman login (`/login`).

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
  3. Mengarahkan halaman ke `/login` (`window.location.href = '/login'`), yang secara otomatis memutus siklus auto-polling dari SWR dan komponen `NotificationBell.jsx`.

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
