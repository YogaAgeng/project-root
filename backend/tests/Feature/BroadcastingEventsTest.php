<?php

namespace Tests\Feature;

use App\Events\CommentAdded;
use App\Events\NotificationSent;
use App\Events\TaskUpdated;
use App\Models\AppNotification;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class BroadcastingEventsTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_events_implement_should_broadcast_now(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $event = new TaskUpdated($task, 'updated');
        $channels = $event->broadcastOn();

        $this->assertInstanceOf(\Illuminate\Contracts\Broadcasting\ShouldBroadcastNow::class, $event);
        $this->assertEquals('private-tasks.' . $task->id, $channels[0]->name);
        $this->assertEquals('private-user.' . $user->id, $channels[1]->name);
    }

    public function test_comment_added_event_broadcasts_on_task_channel(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);
        $comment = TaskComment::factory()->create([
            'task_id' => $task->id,
            'user_id' => $user->id,
        ]);

        $event = new CommentAdded($comment);
        $channels = $event->broadcastOn();

        $this->assertInstanceOf(\Illuminate\Contracts\Broadcasting\ShouldBroadcastNow::class, $event);
        $this->assertEquals('private-tasks.' . $task->id, $channels[0]->name);
    }

    public function test_notification_sent_event_broadcasts_on_user_channel(): void
    {
        $user = User::factory()->create();
        $notification = AppNotification::create([
            'user_id' => $user->id,
            'type' => 'task_assigned',
            'title' => 'Tugas Baru',
            'message' => 'Anda mendapatkan tugas baru.',
            'is_read' => false,
        ]);

        $event = new NotificationSent($notification);
        $channels = $event->broadcastOn();

        $this->assertInstanceOf(\Illuminate\Contracts\Broadcasting\ShouldBroadcastNow::class, $event);
        $this->assertEquals('private-user.' . $user->id, $channels[0]->name);
    }
}
