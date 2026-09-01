'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Toaster, toast } from 'react-hot-toast';
import apiClient from '@/lib/axios';
import NotificationBell from '@/components/NotificationBell';
import getEcho from '@/lib/echo';

// SWR Fetcher menggunakan centralized axios instance
const fetcher = (url) => apiClient.get(url).then((res) => res.data);

export default function TaskCommentsPage({ params }) {
  const resolvedParams = use(params);
  const taskId = resolvedParams.taskId;

  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Edit & Delete Komentar
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editBody, setEditBody] = useState('');
  const [isUpdatingComment, setIsUpdatingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  // Current user state untuk otorisasi tampilan (Edit & Hapus)
  const { data: authData } = useSWR('/auth/me', fetcher, { revalidateOnFocus: false });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (authData?.user) {
      setCurrentUser(authData.user);
    } else if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setCurrentUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
    }
  }, [authData]);

  // State Paginasi Komentar
  const [page, setPage] = useState(1);

  // SWR Fetching komentar task (tanpa auto-polling, dimutasi via WebSocket)
  const swrKey = taskId ? `/tasks/${taskId}/comments${page > 1 ? `?page=${page}` : ''}` : null;
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  // Real-time WebSocket Subscription via Laravel Echo
  useEffect(() => {
    if (!taskId) return;

    const echo = getEcho();
    if (!echo) return;

    const channelName = `tasks.${taskId}`;
    const channel = echo.private(channelName);

    const handleCommentAdded = () => {
      mutate();
    };

    channel.listen('CommentAdded', handleCommentAdded);
    channel.listen('.CommentAdded', handleCommentAdded);

    // Cleanup saat unmount untuk mencegah memory leak
    return () => {
      echo.leave(channelName);
      echo.leaveChannel(`private-${channelName}`);
    };
  }, [taskId, mutate]);

  const comments = data?.comments || [];
  const taskCreatedBy = data?.task_created_by;
  const currentPage = data?.current_page || 1;
  const lastPage = data?.last_page || 1;
  const totalComments = data?.total !== undefined ? data.total : comments.length;

  // Handler Submit Komentar Baru (POST)
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!body.trim()) {
      toast.error('Isi komentar tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post(`/tasks/${taskId}/comments`, { body });
      toast.success('Komentar berhasil ditambahkan.');
      setBody('');
      // Mutate SWR agar komentar baru langsung muncul
      await mutate();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.body?.[0] ||
        'Gagal menambahkan komentar.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Mulai Edit Inline
  const handleStartEdit = (comment) => {
    setEditingCommentId(comment.id);
    setEditBody(comment.body);
  };

  // Handler Batal Edit
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditBody('');
  };

  // Handler Simpan Perubahan Komentar (PUT)
  const handleSaveEdit = async (commentId) => {
    if (!editBody.trim()) {
      toast.error('Isi komentar tidak boleh kosong.');
      return;
    }

    setIsUpdatingComment(true);
    try {
      await apiClient.put(`/comments/${commentId}`, { body: editBody });
      toast.success('Komentar berhasil diperbarui.');
      setEditingCommentId(null);
      setEditBody('');
      await mutate();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.body?.[0] ||
        'Gagal memperbarui komentar.';
      toast.error(msg);
    } finally {
      setIsUpdatingComment(false);
    }
  };

  // Handler Hapus Komentar (DELETE) dengan window.confirm
  const handleDeleteComment = async (comment) => {
    const confirmed = window.confirm(
      'Apakah Anda yakin ingin menghapus komentar ini?'
    );
    if (!confirmed) return;

    setDeletingCommentId(comment.id);
    try {
      await apiClient.delete(`/comments/${comment.id}`);
      toast.success('Komentar berhasil dihapus.');
      await mutate();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Gagal menghapus komentar. Anda mungkin tidak memiliki hak akses.';
      toast.error(msg);
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Format Tanggal Statis
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontSize: '14px',
          },
        }}
      />

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Statis */}
        <div className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <h1 className="text-2xl font-bold tracking-wide text-white">
                  Komentar Task #{taskId}
                </h1>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Diskusi dan catatan tim untuk pengerjaan tugas ini.
                {currentUser && (
                  <span className="ml-2 text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 text-blue-400">
                    Login sebagai: {currentUser.name} (ID #{currentUser.id})
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />

              <Link
                href={`/tasks/${taskId}/attachments`}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2 border border-slate-700 flex items-center gap-2"
              >
                <span>📎</span>
                <span>Lampiran Task</span>
              </Link>
              <Link
                href="/tasks"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold px-4 py-2 border border-slate-700 flex items-center gap-2"
              >
                <span>←</span>
                <span>Kembali ke Board</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Form Tambah Komentar (Hanya tampil jika TIDAK error / user memiliki hak akses) */}
        {!error && (
          <div className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
              Tulis Komentar Baru
            </h2>
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <textarea
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tuliskan catatan atau tanggapan Anda di sini..."
                className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-semibold px-6 py-2 border border-blue-500 flex items-center gap-2"
                >
                  <span>💬</span>
                  <span>{isSubmitting ? 'Mengirim...' : 'Kirim Komentar'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Daftar Komentar */}
        <div className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Daftar Diskusi ({comments.length})
            </h2>
            <button
              type="button"
              onClick={() => mutate()}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-slate-300"
            >
              🔄 Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              <span>Memuat komentar...</span>
            </div>
          ) : error ? (
            <div className="border border-red-900 bg-red-950/50 p-6 text-center text-red-300">
              <span className="text-3xl block mb-2">🚫</span>
              <p className="font-semibold text-sm">
                {error.response?.status === 403
                  ? 'Akses Ditolak (403): Anda tidak berhak melihat maupun menulis komentar pada task ini.'
                  : 'Gagal memuat komentar dari server.'}
              </p>
              <div className="mt-4">
                <Link
                  href="/tasks"
                  className="bg-red-900/80 hover:bg-red-800 text-white text-xs font-semibold px-4 py-2 border border-red-700"
                >
                  ← Kembali ke Task Board
                </Link>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              <span className="text-2xl block mb-1">🗨️</span>
              <p>Belum ada komentar untuk task ini. Jadilah yang pertama berkomentar!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const isEditing = editingCommentId === comment.id;
                const canEdit = currentUser && currentUser.id === comment.user_id;
                const canDelete =
                  currentUser &&
                  (currentUser.id === comment.user_id ||
                   currentUser.id === taskCreatedBy);

                return (
                  <div
                    key={comment.id}
                    className="border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 font-semibold text-blue-400">
                          {comment.user?.name || 'Anonim'}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({comment.user?.email || '-'})
                        </span>
                        {currentUser && comment.user_id === currentUser.id && (
                          <span className="text-[10px] bg-blue-950 border border-blue-800 text-blue-300 px-1.5 py-0.2 font-mono">
                            Anda
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>

                    {/* Tampilan Inline Form Edit vs Paragraf Komentar */}
                    {isEditing ? (
                      <div className="space-y-2 mt-2">
                        <textarea
                          rows={3}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          className="w-full bg-slate-900 border border-amber-600 px-3 py-2 text-sm text-white focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 border border-slate-700"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(comment.id)}
                            disabled={isUpdatingComment}
                            className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white text-xs font-semibold px-4 py-1.5 border border-amber-500"
                          >
                            {isUpdatingComment ? 'Menyimpan...' : 'Simpan Perubahan (PUT)'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                          {comment.body}
                        </p>

                        {/* Tombol Aksi: Edit & Hapus Bersyarat */}
                        {(canEdit || canDelete) && (
                          <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/80">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(comment)}
                                className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold px-2.5 py-1 border border-slate-700 flex items-center gap-1"
                              >
                                <span>✏️</span>
                                <span>Edit</span>
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment)}
                                disabled={deletingCommentId === comment.id}
                                className="bg-red-950/70 hover:bg-red-900 text-red-300 text-xs font-semibold px-2.5 py-1 border border-red-800 flex items-center gap-1 disabled:opacity-50"
                              >
                                <span>🗑️</span>
                                <span>{deletingCommentId === comment.id ? 'Menghapus...' : 'Hapus'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Kontrol Paginasi Komentar (Kaku, Solid, No Animation) */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800 pt-3 mt-4">
              <div className="text-xs text-slate-400 font-mono">
                Halaman {currentPage} dari {lastPage} (Total {totalComments} Komentar)
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs px-2.5 py-1 border border-slate-700"
                >
                  ← Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
                  disabled={currentPage >= lastPage}
                  className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs px-2.5 py-1 border border-slate-700"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
