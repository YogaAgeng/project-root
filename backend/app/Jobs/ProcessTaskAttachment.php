<?php

namespace App\Jobs;

use App\Models\TaskAttachment;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessTaskAttachment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The attachment instance.
     */
    public TaskAttachment $attachment;

    /**
     * Create a new job instance.
     */
    public function __construct(TaskAttachment $attachment)
    {
        $this->attachment = $attachment;
    }

    /**
     * Execute the job.
     *
     * This is a placeholder for future post-upload processing such as:
     * - Generating thumbnails for images
     * - Extracting metadata from documents
     * - Virus scanning
     * - Compressing video files
     */
    public function handle(): void
    {
        // TODO: Implement post-upload processing logic
        // Example: Log::info("Processing attachment: {$this->attachment->file_name}");
    }
}
