<?php

namespace App\Policies;

use App\Models\TaskAttachment;
use App\Models\User;

class TaskAttachmentPolicy
{
    /**
     * Determine if the user can download the attachment.
     *
     * Only the task creator or the assigned user may download.
     */
    public function download(User $user, TaskAttachment $attachment): bool
    {
        $task = $attachment->task;

        return $user->id === $task->created_by
            || $user->id === $task->assigned_user_id;
    }
}
