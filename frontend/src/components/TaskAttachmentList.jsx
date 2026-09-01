'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import apiClient from '@/lib/axios';
import toast from 'react-hot-toast';

/**
 * SWR fetcher using the centralized Axios instance.
 */
const fetcher = (url) => apiClient.get(url).then((res) => res.data);

/**
 * Download a file attachment via binary blob response.
 */
async function handleDownload(attachmentId, fileName) {
  try {
    const response = await apiClient.get(
      `/attachments/${attachmentId}/download`,
      { responseType: 'blob' }
    );

    // Create a temporary object URL from the blob
    const url = URL.createObjectURL(new Blob([response.data]));

    // Create a virtual <a> element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Mengunduh ${fileName}`);
  } catch (error) {
    // Blob error parsing: Laravel returns JSON errors as blob when responseType is 'blob'
    try {
      const errorText = await error.response.data.text();
      const errorJson = JSON.parse(errorText);
      toast.error(errorJson.message || 'Gagal mengunduh file.');
    } catch {
      toast.error('Gagal mengunduh file.');
    }
  }
}

export default function TaskAttachmentList({ taskId }) {
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(taskId ? `/tasks/${taskId}/attachments` : null, fetcher, {
    revalidateOnFocus: false,
  });

  // Current user state untuk evaluasi hak akses tombol Hapus
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

  const attachments = data?.attachments || [];

  const [deletingId, setDeletingId] = useState(null);

  /**
   * Delete an attachment with window.confirm prompt and SWR mutate.
   */
  const handleDelete = async (attachment) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus lampiran "${attachment.file_name}"?`
    );
    if (!confirmed) return;

    setDeletingId(attachment.id);
    try {
      await apiClient.delete(`/attachments/${attachment.id}`);
      toast.success('Lampiran berhasil dihapus.');
      // Mutate SWR dengan key yang tepat agar daftar terbarui instan
      await mutate();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Gagal menghapus lampiran. Anda mungkin tidak memiliki hak akses.';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Format file size to human readable.
   */
  const formatFileSize = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  /**
   * Format date to locale string.
   */
  const formatDate = useCallback((dateStr) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  /**
   * Get file type icon.
   */
  const getFileIcon = (mimeType, fileName) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('wordprocessingml') || fileName?.endsWith('.docx')) return '📝';
    if (mimeType?.startsWith('video/')) return '🎬';
    return '📎';
  };

  /**
   * Get mime type badge color.
   */
  const getMimeColor = (mimeType) => {
    if (mimeType?.startsWith('image/')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (mimeType === 'application/pdf') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (mimeType?.includes('wordprocessingml')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (mimeType?.startsWith('video/')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  /**
   * Get readable file type label.
   */
  const getFileTypeLabel = (mimeType) => {
    if (mimeType?.startsWith('image/')) return 'Gambar';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType?.includes('wordprocessingml')) return 'DOCX';
    if (mimeType?.startsWith('video/')) return 'Video';
    return 'File';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-700" />
                <div className="h-3 w-1/4 rounded bg-slate-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
        <p className="text-red-400">Gagal memuat daftar lampiran.</p>
        <button
          onClick={() => mutate()}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Coba Lagi
        </button>
      </div>
    );
  }

  // Empty state
  if (attachments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-8 text-center">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-slate-400">Belum ada lampiran untuk tugas ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Lampiran ({attachments.length})
        </h3>
        <button
          onClick={() => mutate()}
          className="rounded-lg bg-slate-700/50 p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
          title="Refresh"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="group rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/70"
        >
          <div className="flex items-center gap-4">
            {/* File Icon */}
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700/50 text-2xl transition-transform duration-200 group-hover:scale-105">
              {getFileIcon(attachment.mime_type, attachment.file_name)}
            </div>

            {/* File Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
                {attachment.file_name}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getMimeColor(attachment.mime_type)}`}>
                  {getFileTypeLabel(attachment.mime_type)}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  {formatFileSize(attachment.file_size)}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  {attachment.uploader?.name || 'Unknown'}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-slate-400">
                  {formatDate(attachment.created_at)}
                </span>
              </div>
            </div>

            {/* Action Buttons: Download & Hapus (Kaku, Solid, No Animation) */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleDownload(attachment.id, attachment.file_name)}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold px-3 py-1.5 border border-slate-600 flex items-center gap-1.5"
                title={`Unduh ${attachment.file_name}`}
              >
                <span>⬇️</span>
                <span>Download</span>
              </button>

              {/* Tombol Hapus HANYA tampil jika user adalah uploader ATAU pembuat task */}
              {currentUser &&
                (currentUser.id === attachment.uploaded_by ||
                 currentUser.id === data?.task_created_by) && (
                <button
                  type="button"
                  onClick={() => handleDelete(attachment)}
                  disabled={deletingId === attachment.id}
                  className="bg-red-950/70 hover:bg-red-900 text-red-300 text-xs font-semibold px-3 py-1.5 border border-red-800 flex items-center gap-1.5 disabled:opacity-50"
                  title={`Hapus ${attachment.file_name}`}
                >
                  <span>🗑️</span>
                  <span>{deletingId === attachment.id ? 'Menghapus...' : 'Hapus'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Export the mutate key pattern for external revalidation
export function getAttachmentListKey(taskId) {
  return `/tasks/${taskId}/attachments`;
}
