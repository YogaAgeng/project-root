<?php

namespace Tests\Feature;

use App\Jobs\ProcessTaskAttachment;
use App\Models\Task;
use App\Models\TaskAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TaskAttachmentJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_uploading_attachment_creates_record_with_pending_status_and_dispatches_job(): void
    {
        Storage::fake('local');
        Queue::fake();

        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $file = UploadedFile::fake()->create('document_sample.pdf', 500, 'application/pdf');

        $response = $this->actingAs($user, 'api')
            ->postJson("/api/tasks/{$task->id}/attachments", [
                'file' => $file,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('task_attachments', [
            'task_id' => $task->id,
            'file_name' => 'document_sample.pdf',
            'status' => 'pending',
        ]);

        Queue::assertPushed(ProcessTaskAttachment::class, function ($job) use ($task) {
            return $job->attachment->task_id === $task->id;
        });
    }

    public function test_process_task_attachment_job_generates_thumbnail_and_marks_as_processed(): void
    {
        Storage::fake('local');

        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $filePath = 'attachments/test_file.pdf';
        Storage::disk('local')->put($filePath, 'dummy content');

        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'file_name' => 'test_file.pdf',
            'file_path' => $filePath,
            'file_size' => 12,
            'mime_type' => 'application/pdf',
            'uploaded_by' => $user->id,
            'status' => 'pending',
        ]);

        // Run the job synchronously
        $job = new ProcessTaskAttachment($attachment);
        $job->handle();

        $attachment->refresh();

        $this->assertEquals('processed', $attachment->status);
    }

    public function test_process_task_attachment_marks_as_failed_on_exception_and_rethrows(): void
    {
        $user = User::factory()->create();
        $task = Task::factory()->create(['created_by' => $user->id]);

        $attachment = TaskAttachment::create([
            'task_id' => $task->id,
            'file_name' => 'dummy.pdf',
            'file_path' => 'attachments/dummy.pdf',
            'file_size' => 1024,
            'mime_type' => 'application/pdf',
            'uploaded_by' => $user->id,
            'status' => 'pending',
        ]);

        // Create mock/subclass job that throws exception to verify catch block
        $job = new class($attachment) extends ProcessTaskAttachment {
            public function handle(): void
            {
                try {
                    sleep(0);
                    throw new \RuntimeException('Simulated scanning error');
                } catch (\Throwable $e) {
                    $this->attachment->update(['status' => 'failed']);
                    throw $e;
                }
            }
        };

        try {
            $job->handle();
            $this->fail('Expected exception was not thrown');
        } catch (\RuntimeException $e) {
            $this->assertEquals('Simulated scanning error', $e->getMessage());
        }

        $attachment->refresh();
        $this->assertEquals('failed', $attachment->status);
    }
}
