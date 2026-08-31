'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import apiClient from '@/lib/axios';
import toast from 'react-hot-toast';

const fetcher = (url) => apiClient.get(url).then((res) => res.data);

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // SWR Fetching data notifikasi (auto-poll setiap 15 detik)
  const { data, mutate } = useSWR('/notifications', fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler Tandai 1 Notifikasi Dibaca
  const handleMarkAsRead = async (notifId, e) => {
    if (e) e.stopPropagation();
    try {
      await apiClient.post(`/notifications/${notifId}/read`);
      await mutate();
    } catch {
      toast.error('Gagal memperbarui status notifikasi.');
    }
  };

  // Handler Tandai Semua Dibaca
  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/mark-all-read');
      toast.success('Semua notifikasi ditandai dibaca.');
      await mutate();
    } catch {
      toast.error('Gagal memperbarui notifikasi.');
    }
  };

  // Format Tanggal
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Tombol Lonceng Notifikasi */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 border border-slate-700 flex items-center justify-center"
        title="Notifikasi Aktivitas"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-600 border border-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.2">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel (Dark Glassmorphism Kaku) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 shadow-2xl z-50">
          {/* Header Panel */}
          <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white uppercase tracking-wider">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span className="bg-blue-950 border border-blue-800 text-blue-400 text-xs px-2 py-0.5 font-mono">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-slate-400 hover:text-blue-400 underline font-medium"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* Isi Daftar Notifikasi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <span>Belum ada notifikasi aktivitas.</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 text-xs ${
                    !notif.is_read ? 'bg-slate-950/90 border-l-2 border-blue-500' : 'bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5">
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 bg-blue-400 inline-block" />
                        )}
                        <p className="font-bold text-white">{notif.title}</p>
                      </div>
                      <p className="text-slate-300 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {!notif.is_read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-1.5 py-0.5 border border-slate-700 text-[10px]"
                          title="Tandai telah dibaca"
                        >
                          ✓
                        </button>
                      )}
                      {notif.link && (
                        <Link
                          href={notif.link}
                          onClick={() => {
                            if (!notif.is_read) handleMarkAsRead(notif.id);
                            setIsOpen(false);
                          }}
                          className="bg-blue-950/70 hover:bg-blue-900 text-blue-300 px-2 py-0.5 border border-blue-800 text-[10px] font-semibold"
                        >
                          Buka →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
