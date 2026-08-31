# Arsitektur Sistem — Task Management

## Diagram Arsitektur

```
┌─────────────────────┐         ┌─────────────────────┐
│   Frontend (Next.js)│         │   Backend (Laravel)  │
│   Port: 3000        │◄───────►│   Port: 8000         │
│                     │  HTTP   │                      │
│  ┌───────────────┐  │  API    │  ┌───────────────┐   │
│  │ React Pages   │  │         │  │ Controllers   │   │
│  │ - Login       │  │         │  │ - Auth        │   │
│  │ - Register    │  │         │  │ - Task        │   │
│  │ - Tasks       │  │         │  │ - Comment     │   │
│  │ - Comments    │  │         │  │ - Attachment  │   │
│  └───────────────┘  │         │  │ - Notification│   │
│                     │         │  └───────┬───────┘   │
│  ┌───────────────┐  │         │          │           │
│  │ Components    │  │         │  ┌───────▼───────┐   │
│  │ - NotifBell   │  │         │  │ Models        │   │
│  │ - Attachments │  │         │  │ - User        │   │
│  └───────────────┘  │         │  │ - Task        │   │
│                     │         │  │ - TaskComment │   │
│  ┌───────────────┐  │         │  │ - Attachment  │   │
│  │ Libraries     │  │         │  │ - Notification│   │
│  │ - axios.js    │  │         │  └───────┬───────┘   │
│  │ - SWR         │  │         │          │           │
│  └───────────────┘  │         │  ┌───────▼───────┐   │
└─────────────────────┘         │  │ SQLite DB     │   │
                                │  └───────────────┘   │
                                └─────────────────────┘
```

## Alur Autentikasi

1. User mengirim `POST /api/login` dengan email & password
2. Backend memvalidasi, membuat Sanctum token
3. Token dikirim sebagai **HttpOnly Cookie** (`auth_token`, SameSite=Lax)
4. Middleware `AuthenticateFromCookie` menjembatani cookie → Bearer header
5. Setiap request API berikutnya otomatis membawa cookie (via `withCredentials: true`)
6. Logout menghapus token dan cookie

## Alur Otorisasi (Anti-IDOR)

| Aksi | Siapa yang Diizinkan |
|------|---------------------|
| View/Edit Task | `created_by` ATAU `assigned_user_id` |
| Delete Task | Hanya `created_by` |
| View/Add Comment | `created_by` ATAU `assigned_user_id` dari task |
| Edit Comment | Hanya pemilik komentar (`user_id`) |
| Delete Comment | Pemilik komentar ATAU `created_by` task (moderasi) |
| Delete Attachment | `uploaded_by` ATAU `created_by` task |

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

## Paginasi

| Endpoint | Default Per Page |
|----------|-----------------|
| `GET /api/tasks` | 6 |
| `GET /api/tasks/{id}/comments` | 10 |

Response envelope: `{ data, current_page, last_page, per_page, total }`
