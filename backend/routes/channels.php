<?php

use App\Models\Task;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
*/

// Private channel per-user untuk notifikasi dan update spesifik pengguna
Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Private channel per-task untuk komentar dan update status tugas (Anti-IDOR)
Broadcast::channel('tasks.{taskId}', function ($user, $taskId) {
    $task = Task::find($taskId);
    if (! $task) {
        return false;
    }

    return (int) $user->id === (int) $task->created_by
        || (int) $user->id === (int) $task->assigned_user_id;
});
