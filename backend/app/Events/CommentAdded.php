<?php

namespace App\Events;

use App\Models\TaskComment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CommentAdded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public TaskComment $comment;

    /**
     * Create a new event instance.
     */
    public function __construct(TaskComment $comment)
    {
        $this->comment = $comment->loadMissing('user');
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tasks.' . $this->comment->task_id),
        ];
    }

    /**
     * Data to broadcast with.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'comment' => $this->comment,
        ];
    }
}
