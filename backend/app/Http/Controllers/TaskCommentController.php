<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Task;
use App\Models\TaskComment;
use Illuminate\Http\Request;

class TaskCommentController extends Controller
{
    /**
     * Display a listing of comments for a task with pagination.
     *
     * GET /api/tasks/{task}/comments
     */
    public function index(Task $task)
    {
        // Otorisasi Wajib (Anti-IDOR)
        abort_if(
            auth()->id() !== $task->created_by && auth()->id() !== $task->assigned_user_id,
            403,
            'Unauthorized access to this task comments.'
        );

        $perPage = request()->integer('per_page', 10);
        $paginated = $task->comments()->with('user')->latest()->paginate($perPage);

        return response()->json([
            'comments' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
            'task_created_by' => $task->created_by,
        ]);
    }

    /**
     * Store a newly created comment for a task.
     *
     * POST /api/tasks/{task}/comments
     */
    public function store(Request $request, Task $task)
    {
        // Otorisasi Wajib (Anti-IDOR)
        abort_if(
            auth()->id() !== $task->created_by && auth()->id() !== $task->assigned_user_id,
            403,
            'Unauthorized access to this task comments.'
        );

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'body' => $validated['body'],
            'user_id' => auth()->id(),
        ]);

        $comment->load('user');

        // Trigger Notifikasi In-App ke pembuat task (jika bukan penulis komentar)
        if ($task->created_by !== auth()->id()) {
            AppNotification::notify(
                $task->created_by,
                'comment_added',
                'Komentar Baru pada Tugas Anda',
                auth()->user()->name . " menambahkan komentar pada tugas '{$task->title}'",
                "/tasks/{$task->id}/comments"
            );
        }

        // Trigger Notifikasi ke assignee (jika ada, dan bukan penulis komentar, dan bukan creator)
        if ($task->assigned_user_id && $task->assigned_user_id !== auth()->id() && $task->assigned_user_id !== $task->created_by) {
            AppNotification::notify(
                $task->assigned_user_id,
                'comment_added',
                'Komentar Baru pada Tugas',
                auth()->user()->name . " menambahkan komentar pada tugas '{$task->title}'",
                "/tasks/{$task->id}/comments"
            );
        }

        // Broadcast real-time event via Reverb
        broadcast(new \App\Events\CommentAdded($comment));

        return response()->json([
            'message' => 'Komentar berhasil ditambahkan.',
            'comment' => $comment,
        ], 201);
    }

    /**
     * Update an existing task comment.
     *
     * PUT/PATCH /api/comments/{comment}
     */
    public function update(Request $request, TaskComment $comment)
    {
        // Otorisasi Update (Anti-IDOR): HANYA pemilik komentar
        abort_if(
            $comment->user_id !== auth()->id(),
            403,
            'Unauthorized: Hanya pemilik komentar yang dapat mengedit komentar ini.'
        );

        $validated = $request->validate([
            'body' => 'required|string',
        ]);

        $comment->update([
            'body' => $validated['body'],
        ]);

        $comment->load('user');

        return response()->json([
            'message' => 'Komentar berhasil diperbarui.',
            'comment' => $comment,
        ]);
    }

    /**
     * Delete an existing task comment.
     *
     * DELETE /api/comments/{comment}
     */
    public function destroy(TaskComment $comment)
    {
        $userId = auth()->id();
        $taskCreatorId = $comment->task->created_by;

        // Otorisasi Delete (Moderasi & Anti-IDOR): HANYA pemilik komentar ATAU pembuat task
        abort_if(
            $comment->user_id !== $userId && $taskCreatorId !== $userId,
            403,
            'Unauthorized: Hanya pemilik komentar atau pembuat tugas yang dapat menghapus komentar ini.'
        );

        // Jika dimoderasi oleh task creator (bukan pemilik asli), beri notifikasi ke pemilik
        if ($comment->user_id !== $userId) {
            AppNotification::notify(
                $comment->user_id,
                'comment_moderated',
                'Komentar Dimoderasi',
                "Komentar Anda pada tugas '{$comment->task->title}' telah dihapus oleh pembuat tugas.",
                "/tasks/{$comment->task_id}/comments"
            );
        }

        $comment->delete();

        return response()->json([
            'message' => 'Komentar berhasil dihapus.',
        ]);
    }
}
