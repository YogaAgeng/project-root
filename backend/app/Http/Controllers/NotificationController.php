<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Display a listing of notifications for current user.
     *
     * GET /api/notifications
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $notifications = AppNotification::where('user_id', $user->id)
            ->latest()
            ->paginate(15);

        $unreadCount = AppNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'notifications' => $notifications->items(),
            'current_page' => $notifications->currentPage(),
            'last_page' => $notifications->lastPage(),
            'total' => $notifications->total(),
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark a single notification as read.
     *
     * POST /api/notifications/{notification}/read
     */
    public function markAsRead(AppNotification $notification)
    {
        abort_if(
            $notification->user_id !== auth()->id(),
            403,
            'Unauthorized.'
        );

        $notification->update(['is_read' => true]);

        return response()->json([
            'message' => 'Notifikasi ditandai telah dibaca.',
            'notification' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read for current user.
     *
     * POST /api/notifications/mark-all-read
     */
    public function markAllAsRead(Request $request)
    {
        AppNotification::where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'message' => 'Semua notifikasi telah ditandai dibaca.',
        ]);
    }
}
