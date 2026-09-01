<?php

namespace App\Jobs;

use App\Models\TaskAttachment;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Throwable;

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
     */
    public function handle(): void
    {
        try {
            // a. Simulasikan pemindaian virus (2 detik)
            sleep(2);

            // b. Cek apakah mime_type adalah image
            if (str_starts_with($this->attachment->mime_type, 'image/')) {
                $this->generateThumbnail();
            }

            // c. Jika semua berhasil, update status menjadi processed
            $this->attachment->update([
                'status' => 'processed',
            ]);
        } catch (Throwable $e) {
            // d. Update status menjadi failed dan lempar ulang eksepsi untuk failed_jobs
            $this->attachment->update([
                'status' => 'failed',
            ]);

            throw $e;
        }
    }

    /**
     * Generate thumbnail using native PHP GD extension.
     */
    protected function generateThumbnail(): void
    {
        if (! function_exists('imagecreatefromstring')) {
            return;
        }

        $filePath = $this->attachment->file_path;
        $disk = Storage::disk('local');

        if (! $disk->exists($filePath)) {
            return;
        }

        $fullPath = $disk->path($filePath);
        $imageData = @file_get_contents($fullPath);
        if ($imageData === false) {
            return;
        }

        // Create image from string data using native GD
        $srcImage = @imagecreatefromstring($imageData);
        if (! $srcImage) {
            return;
        }

        $origWidth = imagesx($srcImage);
        $origHeight = imagesy($srcImage);

        if ($origWidth <= 0 || $origHeight <= 0) {
            imagedestroy($srcImage);
            return;
        }

        // Max dimensions for thumbnail
        $maxWidth = 200;
        $maxHeight = 200;

        // Calculate aspect ratio
        $ratio = min($maxWidth / $origWidth, $maxHeight / $origHeight, 1);
        $newWidth = (int) max(1, round($origWidth * $ratio));
        $newHeight = (int) max(1, round($origHeight * $ratio));

        $thumbImage = imagecreatetruecolor($newWidth, $newHeight);

        // Preserve transparency for PNG
        imagealphablending($thumbImage, false);
        imagesavealpha($thumbImage, true);

        imagecopyresampled(
            $thumbImage,
            $srcImage,
            0, 0, 0, 0,
            $newWidth,
            $newHeight,
            $origWidth,
            $origHeight
        );

        // Determine destination thumbnail path
        $pathInfo = pathinfo($filePath);
        $thumbDir = ($pathInfo['dirname'] ?? 'attachments') . '/thumbnails';
        $thumbPath = $thumbDir . '/thumb_' . $pathInfo['basename'];

        // Output image to buffer
        ob_start();
        if ($this->attachment->mime_type === 'image/png') {
            imagepng($thumbImage);
        } else {
            imagejpeg($thumbImage, null, 85);
        }
        $thumbContent = ob_get_clean();

        // Clean up GD resources
        imagedestroy($srcImage);
        imagedestroy($thumbImage);

        if ($thumbContent !== false) {
            $disk->put($thumbPath, $thumbContent);
        }
    }
}
