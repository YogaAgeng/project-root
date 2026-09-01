# API Documentation — Task Management System

Semua endpoint API berada di `http://localhost:8000/api/`.

Autentikasi menggunakan **JSON Web Token (JWT)** via header `Authorization: Bearer <token>`.

---

## Authentication

### POST `/api/auth/login`
Login dan dapatkan JWT token.

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
  "message": "Login successful.",
  "user": { "id": 1, "name": "Test User", "email": "test@example.com" },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

### POST `/api/auth/logout` 🔒
Logout dan invalidasi (blacklist) JWT token.

**Response:** `200 OK`
```json
{ "message": "Logged out successfully." }
```

---

### GET `/api/auth/me` 🔒
Dapatkan data user yang sedang login.

**Response:** `200 OK`
```json
{
  "user": { "id": 1, "name": "Test User", "email": "test@example.com" }
}
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

**Event Dispatched:** `TaskUpdated` → channels `private-tasks.{taskId}` dan `private-user.{assignedUserId}`

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

**Event Dispatched:** `TaskUpdated` → channels `private-tasks.{taskId}` dan `private-user.{userId}`

---

### DELETE `/api/tasks/{task}` 🔒
Hapus task. Hanya `created_by`.

**Response:** `200 OK` | `403 Forbidden`

**Event Dispatched:** `TaskUpdated` → channel `private-user.{userId}`

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

**Event Dispatched:** `CommentAdded` → channel `private-tasks.{taskId}`

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

**Response:** `200 OK`
```json
{
  "attachments": [
    {
      "id": 1,
      "file_name": "document.pdf",
      "file_size": 204800,
      "mime_type": "application/pdf",
      "status": "processed",
      "uploaded_by": 1,
      "created_at": "2026-09-01T12:00:00.000000Z",
      "uploader": { "id": 1, "name": "Test User" }
    }
  ]
}
```

> **Field `status`:** Menunjukkan status pemrosesan background job.
> - `pending` — File baru diupload, menunggu proses antrean.
> - `processed` — Virus scan selesai dan thumbnail (jika gambar) berhasil dibuat.
> - `failed` — Pemrosesan gagal.

---

### POST `/api/tasks/{task}/attachments` 🔒
Upload lampiran (multipart/form-data). File akan diproses secara asinkron oleh background queue worker.

**Request Body:**
| Field | Type | Keterangan |
|-------|------|------------|
| `file` | File (max 10MB) | File lampiran |

**Response:** `201 Created`
```json
{
  "message": "File uploaded successfully. Processing in background.",
  "attachment": {
    "id": 1,
    "file_name": "photo.jpg",
    "status": "pending"
  }
}
```

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

**Real-Time:** Event `NotificationSent` disiarkan ke channel `private-user.{userId}` saat notifikasi baru dibuat.

---

### POST `/api/notifications/{notification}/read` 🔒
Tandai satu notifikasi sebagai dibaca.

---

### POST `/api/notifications/mark-all-read` 🔒
Tandai semua notifikasi sebagai dibaca.

---

## Broadcasting Authentication

### POST `/api/broadcasting/auth` 🔒
Endpoint otomatis dari `Broadcast::routes()` untuk mengautentikasi subscription ke private WebSocket channels. Digunakan secara internal oleh Laravel Echo client.

**Request Body:** (dikirim otomatis oleh Echo)
```json
{
  "socket_id": "123456.789",
  "channel_name": "private-user.1"
}
```

**Response:** `200 OK` (dengan auth signature) | `403 Forbidden`

---

## WebSocket Channels & Events

| Channel | Events | Deskripsi |
|---|---|---|
| `private-user.{userId}` | `TaskUpdated`, `NotificationSent` | Update task dan notifikasi real-time untuk user tertentu |
| `private-tasks.{taskId}` | `TaskUpdated`, `CommentAdded` | Update task dan komentar real-time untuk kolaborator task |

---

> 🔒 = Memerlukan autentikasi JWT (`Authorization: Bearer <token>`)
