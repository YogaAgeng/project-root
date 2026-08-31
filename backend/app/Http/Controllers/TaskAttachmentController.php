<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessTaskAttachment;
use App\Models\Task;
use App\Models\TaskAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TaskAttachmentController extends Controller
{
    /**
     * List all attachments for a task.
     */
    public function index(Task $task)
    {
        $attachments = $task->attachments()
            ->with('uploader:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'attachments' => $attachments,
            'task_created_by' => $task->created_by,
        ]);
    }

    /**
     * Upload a new attachment to a task.
     *
     * POST /api/tasks/{task}/attachments
     */
    public function store(Request $request, Task $task)
    {
        $request->validate([
            'file' => 'required|file|mimes:jpg,png,pdf,docx,mp4|max:10240',
        ], [
            'file.mimes' => 'Jenis file tidak diizinkan. Hanya file jpg, png, pdf, docx, dan mp4 yang diperbolehkan.',
            'file.max' => 'Ukuran file melebihi batas maksimal 10MB.',
        ]);

        $uploadedFile = $request->file('file');
        $path = $uploadedFile->store('attachments', 'local');

        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'file_name' => $uploadedFile->getClientOriginalName(),
            'file_path' => $path,
            'file_size' => $uploadedFile->getSize(),
            'mime_type' => $uploadedFile->getClientMimeType(),
            'uploaded_by' => $request->user()->id,
        ]);

        // Dispatch background job for post-upload processing
        ProcessTaskAttachment::dispatch($attachment);

        // Trigger Notifikasi jika uploader bukan task creator
        if ($task->created_by !== $request->user()->id) {
            \App\Models\AppNotification::notify(
                $task->created_by,
                'attachment_added',
                'Lampiran Baru Diunggah',
                $request->user()->name . " mengunggah lampiran '{$attachment->file_name}' pada tugas: {$task->title}",
                "/tasks/{$task->id}/attachments"
            );
        }

        return response()->json([
            'message' => 'File berhasil diunggah.',
            'attachment' => $attachment,
        ], 201);
    }

    /**
     * Download an attachment.
     *
     * GET /api/attachments/{attachment}/download
     */
    public function download(TaskAttachment $attachment)
    {
        $task = $attachment->task;
        $user = request()->user();

        // Anti-IDOR: only task creator or assignee can download
        abort_if(
            $user->id !== $task->created_by && $user->id !== $task->assigned_user_id,
            403,
            'Unauthorized access to this attachment.'
        );

        // Verify file exists on disk
        abort_if(
            !Storage::disk('local')->exists($attachment->file_path),
            404,
            'File not found on server.'
        );

        return Storage::disk('local')->download(
            $attachment->file_path,
            $attachment->file_name
        );
    }

    /**
     * Delete an attachment.
     *
     * DELETE /api/attachments/{attachment}
     */
    public function destroy(TaskAttachment $attachment)
    {
        $user = auth()->user();
        $task = $attachment->task;

        // Otorisasi Hapus (Anti-IDOR): HANYA uploader ATAU task creator
        abort_if(
            $user->id !== $attachment->uploaded_by && $user->id !== $task->created_by,
            403,
            'Unauthorized: Anda bukan pemilik file atau pembuat task ini.'
        );

        $filePath = $attachment->file_path;

        // Gunakan Database Transaction agar tidak terjadi ghost/zombie record
        \Illuminate\Support\Facades\DB::transaction(function () use ($attachment) {
            $attachment->delete();
        });

        // Hapus file fisik setelah database dipastikan aman terhapus
        if ($filePath && Storage::disk('local')->exists($filePath)) {
            Storage::disk('local')->delete($filePath);
        }

        // Trigger Notifikasi ke uploader jika dihapus oleh task creator (moderasi)
        if ($attachment->uploaded_by !== $user->id) {
            \App\Models\AppNotification::notify(
                $attachment->uploaded_by,
                'attachment_deleted',
                'Lampiran Dimoderasi',
                "Lampiran '{$attachment->file_name}' pada tugas '{$task->title}' telah dihapus oleh pembuat tugas.",
                "/tasks/{$task->id}/attachments"
            );
        }

        return response()->json([
            'message' => 'Lampiran berhasil dihapus.',
        ]);
    }
}
