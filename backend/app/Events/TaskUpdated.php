<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Task $task;
    public string $action;

    /**
     * Create a new event instance.
     */
    public function __construct(Task $task, string $action = 'updated')
    {
        $this->task = $task->loadMissing(['creator', 'assignedUser']);
        $this->action = $action;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('tasks.' . $this->task->id),
        ];

        if ($this->task->created_by) {
            $channels[] = new PrivateChannel('user.' . $this->task->created_by);
        }

        if ($this->task->assigned_user_id && $this->task->assigned_user_id !== $this->task->created_by) {
            $channels[] = new PrivateChannel('user.' . $this->task->assigned_user_id);
        }

        return $channels;
    }

    /**
     * Data to broadcast with.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'task' => $this->task,
            'action' => $this->action,
        ];
    }
}
