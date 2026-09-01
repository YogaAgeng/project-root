<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\TaskAttachmentController;
use App\Http\Controllers\TaskCommentController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Authentication Routes (JWT)
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Protected Routes (auth:api)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:api')->group(function () {
    // Broadcasting Authentication Route (JWT for Echo Private Channels)
    \Illuminate\Support\Facades\Broadcast::routes(['middleware' => ['auth:api']]);

    // Auth Protected Endpoints
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });

    // Users Assignment
    Route::get('/users', function () {
        return response()->json([
            'users' => \App\Models\User::select('id', 'name')->get(),
        ]);
    });

    // Tasks Management
    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);

    // Task Comments
    Route::get('/tasks/{task}/comments', [TaskCommentController::class, 'index']);
    Route::post('/tasks/{task}/comments', [TaskCommentController::class, 'store']);
    Route::put('/comments/{comment}', [TaskCommentController::class, 'update']);
    Route::patch('/comments/{comment}', [TaskCommentController::class, 'update']);
    Route::delete('/comments/{comment}', [TaskCommentController::class, 'destroy']);

    // Task Attachments
    Route::get('/tasks/{task}/attachments', [TaskAttachmentController::class, 'index']);
    Route::post('/tasks/{task}/attachments', [TaskAttachmentController::class, 'store']);
    Route::get('/attachments/{attachment}/download', [TaskAttachmentController::class, 'download']);
    Route::delete('/attachments/{attachment}', [TaskAttachmentController::class, 'destroy']);

    // In-App Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
});
