<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * Display a listing of tasks with optional filtering, sorting, and pagination.
     *
     * GET /api/tasks
     * Query parameters:
     * - page: int (optional, default 1)
     * - per_page: int (optional, default 6)
     * - status: string (optional, e.g. pending, in_progress, completed, cancelled)
     * - sort: string (optional, asc|desc based on due_date)
     */
    public function index(Request $request)
    {
        $query = Task::with(['creator', 'assignedUser'])->where(function ($q) {
            $q->where('created_by', auth()->id())
              ->orWhere('assigned_user_id', auth()->id());
        });

        // Filter opsional berdasarkan status
        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        // Pengurutan (sorting) berdasarkan due_date (ASC atau DESC)
        if ($request->filled('sort')) {
            $sortDirection = strtolower($request->query('sort')) === 'desc' ? 'desc' : 'asc';
            $query->orderBy('due_date', $sortDirection);
        } else {
            // Urutan default jika parameter sort tidak diberikan
            $query->latest();
        }

        // Paginasi terkendali (Poin 1: Menghindari Bom Skalabilitas)
        $perPage = $request->integer('per_page', 6);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'tasks' => $paginated->items(),
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
        ]);
    }

    /**
     * Store a newly created task in storage.
     *
     * POST /api/tasks
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        // Set created_by secara otomatis menggunakan ID user yang sedang login
        $validated['created_by'] = auth()->id();

        // Default nilai jika tidak dikirim
        $validated['status'] = $validated['status'] ?? 'pending';
        $validated['priority'] = $validated['priority'] ?? 'medium';

        $task = Task::create($validated);

        // Eager load relasi untuk response yang lengkap
        $task->load(['creator', 'assignedUser']);

        // Trigger Notifikasi In-App jika ditugaskan ke user lain
        if ($task->assigned_user_id && $task->assigned_user_id !== auth()->id()) {
            AppNotification::notify(
                $task->assigned_user_id,
                'task_assigned',
                'Tugas Baru Ditugaskan',
                auth()->user()->name . " menugaskan tugas '{$task->title}' kepada Anda.",
                "/tasks"
            );
        }

        // Broadcast real-time event via Reverb
        broadcast(new \App\Events\TaskUpdated($task, 'created'));

        return response()->json([
            'message' => 'Task berhasil dibuat.',
            'task' => $task,
        ], 201);
    }

    /**
     * Update the specified task in storage.
     *
     * PUT/PATCH /api/tasks/{task}
     */
    public function update(Request $request, Task $task)
    {
        // Otorisasi Update (Anti-IDOR): Hanya creator atau assignee
        abort_if(
            auth()->id() !== $task->created_by && auth()->id() !== $task->assigned_user_id,
            403,
            'Unauthorized access to update this task.'
        );

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:pending,in_progress,completed,cancelled',
            'priority' => 'nullable|string|in:low,medium,high,urgent',
            'due_date' => 'nullable|date',
            'assigned_user_id' => 'nullable|exists:users,id',
        ]);

        $prevAssignee = $task->assigned_user_id;

        $task->update($validated);
        $task->load(['creator', 'assignedUser']);

        // Trigger Notifikasi jika ada pembaruan penugasan
        if ($task->assigned_user_id && $task->assigned_user_id !== auth()->id() && $task->assigned_user_id !== $prevAssignee) {
            AppNotification::notify(
                $task->assigned_user_id,
                'task_assigned',
                'Penugasan Tugas Baru',
                auth()->user()->name . " mengalihkan tugas '{$task->title}' kepada Anda.",
                "/tasks"
            );
        } elseif ($task->assigned_user_id && $task->assigned_user_id !== auth()->id()) {
            AppNotification::notify(
                $task->assigned_user_id,
                'task_updated',
                'Pembaruan Tugas',
                "Tugas '{$task->title}' telah diperbarui oleh " . auth()->user()->name,
                "/tasks"
            );
        }

        // Broadcast real-time event via Reverb
        broadcast(new \App\Events\TaskUpdated($task, 'updated'));

        return response()->json([
            'message' => 'Task berhasil diperbarui.',
            'task' => $task,
        ]);
    }

    /**
     * Remove the specified task from storage.
     *
     * DELETE /api/tasks/{task}
     */
    public function destroy(Task $task)
    {
        // Otorisasi Delete (Anti-IDOR): HANYA creator yang berhak menghapus tugas
        abort_if(
            auth()->id() !== $task->created_by,
            403,
            'Hanya pembuat tugas yang berhak menghapus tugas ini.'
        );

        // Broadcast real-time event via Reverb before deleting
        broadcast(new \App\Events\TaskUpdated($task, 'deleted'));

        $task->delete();

        return response()->json([
            'message' => 'Task berhasil dihapus.',
        ]);
    }
}
