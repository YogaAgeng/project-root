# API Documentation — Task Management System

Semua endpoint API berada di `http://localhost:8000/api/`.

Autentikasi menggunakan **HttpOnly Cookie** yang dikirim otomatis setelah login.

---

## Authentication

### POST `/api/register`
Daftar akun baru.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password",
  "password_confirmation": "password"
}
```

**Response:** `201 Created`
```json
{
  "user": { "id": 1, "name": "John Doe", "email": "john@example.com" },
  "token": "1|abc..."
}
```
> Cookie `auth_token` dikirim sebagai HttpOnly cookie.

---

### POST `/api/login`
Login dan dapatkan token.

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "password"
}
```

**Response:** `200 OK`
```json
{
  "user": { "id": 1, "name": "Test User", "email": "test@example.com" },
  "token": "2|xyz..."
}
```

---

### POST `/api/logout` 🔒
Logout dan hapus token.

**Response:** `200 OK`
```json
{ "message": "Logged out successfully" }
```

---

### GET `/api/me` 🔒
Dapatkan data user yang sedang login.

**Response:** `200 OK`
```json
{ "id": 1, "name": "Test User", "email": "test@example.com" }
```

---

## Users

### GET `/api/users` 🔒
Daftar semua user (untuk dropdown assignment).

**Response:** `200 OK`
```json
{
  "users": [
    { "id": 1, "name": "Test User" },
    { "id": 2, "name": "Ella Cormier DVM" }
  ]
}
```

---

## Tasks

### GET `/api/tasks` 🔒
Daftar tugas milik user (created_by atau assigned_user_id).

**Query Parameters:**
| Param | Default | Keterangan |
|-------|---------|------------|
| `page` | `1` | Halaman |
| `per_page` | `6` | Item per halaman |
| `status` | — | Filter: `pending`, `in_progress`, `completed`, `cancelled` |
| `sort` | `due_date_desc` | Sorting: `due_date_asc`, `due_date_desc` |

**Response:** `200 OK`
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Task Title",
      "description": "...",
      "status": "pending",
      "priority": "high",
      "due_date": "2026-09-15",
      "created_by": 1,
      "assigned_user_id": 2,
      "creator": { "id": 1, "name": "Test User" },
      "assignee": { "id": 2, "name": "Ella Cormier DVM" }
    }
  ],
  "current_page": 1,
  "last_page": 2,
  "per_page": 6,
  "total": 9
}
```

---

### POST `/api/tasks` 🔒
Buat task baru.

**Request Body:**
```json
{
  "title": "Judul Tugas",
  "description": "Deskripsi tugas",
  "status": "pending",
  "priority": "high",
  "due_date": "2026-12-31",
  "assigned_user_id": 2
}
```

**Response:** `201 Created`

---

### PUT/PATCH `/api/tasks/{task}` 🔒
Update task. Hanya `created_by` atau `assigned_user_id`.

**Request Body:** (semua field opsional)
```json
{
  "title": "Judul Baru",
  "status": "in_progress",
  "priority": "urgent"
}
```

**Response:** `200 OK` | `403 Forbidden`

---

### DELETE `/api/tasks/{task}` 🔒
Hapus task. Hanya `created_by`.

**Response:** `200 OK` | `403 Forbidden`

---

## Task Comments

### GET `/api/tasks/{task}/comments` 🔒
Daftar komentar task. Hanya `created_by` atau `assigned_user_id` dari task.

**Query Parameters:**
| Param | Default |
|-------|---------|
| `page` | `1` |
| `per_page` | `10` |

**Response:** `200 OK`
```json
{
  "comments": [
    {
      "id": 1,
      "body": "Isi komentar",
      "user_id": 1,
      "task_id": 1,
      "created_at": "2026-08-31T10:00:00.000000Z",
      "user": { "id": 1, "name": "Test User" }
    }
  ],
  "current_page": 1,
  "last_page": 1,
  "per_page": 10,
  "total": 3
}
```

---

### POST `/api/tasks/{task}/comments` 🔒
Tambah komentar. Hanya `created_by` atau `assigned_user_id` dari task.

**Request Body:**
```json
{ "body": "Komentar baru" }
```

**Response:** `201 Created` | `403 Forbidden`

---

### PUT/PATCH `/api/comments/{comment}` 🔒
Edit komentar. Hanya pemilik komentar (`user_id`).

**Request Body:**
```json
{ "body": "Komentar yang diedit" }
```

**Response:** `200 OK` | `403 Forbidden`

---

### DELETE `/api/comments/{comment}` 🔒
Hapus komentar. Pemilik komentar ATAU `created_by` task (moderasi).

**Response:** `200 OK` | `403 Forbidden`

---

## Task Attachments

### GET `/api/tasks/{task}/attachments` 🔒
Daftar lampiran task.

---

### POST `/api/tasks/{task}/attachments` 🔒
Upload lampiran (multipart/form-data).

**Request Body:**
| Field | Type |
|-------|------|
| `file` | File (max 10MB) |

---

### GET `/api/attachments/{attachment}/download` 🔒
Download file lampiran.

---

### DELETE `/api/attachments/{attachment}` 🔒
Hapus lampiran. `uploaded_by` ATAU `created_by` task.

**Response:** `200 OK` | `403 Forbidden`

---

## Notifications

### GET `/api/notifications` 🔒
Daftar notifikasi user yang login.

**Response:** `200 OK`
```json
{
  "notifications": [
    {
      "id": 1,
      "type": "task_assigned",
      "title": "Tugas Baru",
      "message": "Anda ditugaskan pada task...",
      "link": "/tasks",
      "is_read": false,
      "created_at": "2026-08-31T12:00:00.000000Z"
    }
  ],
  "unread_count": 3
}
```

---

### POST `/api/notifications/{notification}/read` 🔒
Tandai satu notifikasi sebagai dibaca.

---

### POST `/api/notifications/mark-all-read` 🔒
Tandai semua notifikasi sebagai dibaca.

---

> 🔒 = Memerlukan autentikasi (HttpOnly Cookie atau Bearer Token)
