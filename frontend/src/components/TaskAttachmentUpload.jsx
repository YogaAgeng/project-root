'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '@/lib/axios';
import toast from 'react-hot-toast';

/**
 * Upload a single attachment to a task.
 * Returns { localId, status, message } without throwing.
 */
async function uploadAttachment(taskId, uploadObject, setUploads) {
  const formData = new FormData();
  formData.append('file', uploadObject.file);

  try {
    // Update status to uploading
    setUploads((prev) =>
      prev.map((item) =>
        item.localId === uploadObject.localId
          ? { ...item, status: 'uploading', progress: 0, message: null }
          : item
      )
    );

    await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        setUploads((prev) =>
          prev.map((item) =>
            item.localId === uploadObject.localId
              ? { ...item, progress: percent }
              : item
          )
        );
      },
    });

    setUploads((prev) =>
      prev.map((item) =>
        item.localId === uploadObject.localId
          ? { ...item, status: 'success', progress: 100 }
          : item
      )
    );

    return { localId: uploadObject.localId, status: 'success' };
  } catch (error) {
    const message =
      error.response?.data?.errors?.file?.[0] ?? 'Gagal mengunggah file.';

    setUploads((prev) =>
      prev.map((item) =>
        item.localId === uploadObject.localId
          ? { ...item, status: 'failed', message }
          : item
      )
    );

    return { localId: uploadObject.localId, status: 'failed', message };
  }
}

export default function TaskAttachmentUpload({ taskId, onUploadSuccess }) {
  const [uploads, setUploads] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      uploads.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Map raw files to upload objects with preview URLs and unique IDs.
   */
  const handleFileSelect = useCallback((files) => {
    const newUploads = Array.from(files).map((file) => ({
      localId: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending', // pending | uploading | success | failed
      message: null,
      previewUrl: URL.createObjectURL(file),
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  /**
   * Handle file input change.
   */
  const onFileInputChange = (e) => {
    if (e.target.files?.length) {
      handleFileSelect(e.target.files);
      e.target.value = ''; // Reset to allow re-selecting the same file
    }
  };

  /**
   * Drag & drop handlers.
   */
  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  /**
   * Remove a file from the list (with memory cleanup).
   */
  const handleRemoveFile = useCallback((localId) => {
    setUploads((prev) => {
      const target = prev.find((item) => item.localId === localId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.localId !== localId);
    });
  }, []);

  /**
   * Retry a failed upload — reset state then re-upload.
   */
  const handleRetry = useCallback(
    async (localId) => {
      const target = uploads.find((item) => item.localId === localId);
      if (!target) return;

      // Reset state before retrying
      setUploads((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? { ...item, status: 'uploading', progress: 0, message: null }
            : item
        )
      );

      const result = await uploadAttachment(taskId, target, setUploads);
      if (result.status === 'success' && onUploadSuccess) {
        onUploadSuccess();
      }
    },
    [uploads, taskId, onUploadSuccess]
  );

  /**
   * Upload all pending files in parallel via Promise.allSettled.
   */
  const handleUploadAll = async () => {
    const pendingUploads = uploads.filter((item) => item.status === 'pending');
    if (pendingUploads.length === 0) {
      toast('Tidak ada file untuk diunggah.', { icon: '⚠️' });
      return;
    }

    const results = await Promise.allSettled(
      pendingUploads.map((item) =>
        uploadAttachment(taskId, item, setUploads)
      )
    );

    // Check if at least 1 upload succeeded → trigger SWR revalidation
    const hasSuccess = results.some(
      (r) => r.status === 'fulfilled' && r.value?.status === 'success'
    );

    if (hasSuccess && onUploadSuccess) {
      onUploadSuccess();
    }

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value?.status === 'success'
    ).length;
    const failCount = pendingUploads.length - successCount;

    if (successCount > 0) {
      toast.success(`${successCount} file berhasil diunggah.`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} file gagal diunggah.`);
    }
  };

  /**
   * Format file size to human readable.
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  /**
   * Get file type icon based on extension/mime.
   */
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      case 'pdf':
        return '📄';
      case 'docx':
      case 'doc':
        return '📝';
      case 'mp4':
        return '🎬';
      default:
        return '📎';
    }
  };

  /**
   * Get status badge styling.
   */
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-slate-700/50 text-slate-300 border border-slate-600';
      case 'uploading':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'success':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Menunggu';
      case 'uploading':
        return 'Mengunggah';
      case 'success':
        return 'Berhasil';
      case 'failed':
        return 'Gagal';
      default:
        return status;
    }
  };

  const pendingCount = uploads.filter((u) => u.status === 'pending').length;
  const isUploading = uploads.some((u) => u.status === 'uploading');

  return (
    <div className="space-y-5">
      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
          isDragging
            ? 'border-blue-400 bg-blue-500/10 shadow-lg shadow-blue-500/10 scale-[1.01]'
            : 'border-slate-600 bg-slate-800/30 hover:border-slate-400 hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf,.docx,.mp4"
          onChange={onFileInputChange}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className={`text-5xl transition-transform duration-300 ${isDragging ? 'scale-110 -translate-y-1' : ''}`}>
            {isDragging ? '📥' : '☁️'}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-200">
              {isDragging ? 'Lepaskan file di sini' : 'Seret & lepas file atau klik untuk memilih'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              JPG, PNG, PDF, DOCX, MP4 • Maks. 10MB per file
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Daftar File ({uploads.length})
            </h3>
            {pendingCount > 0 && (
              <button
                onClick={handleUploadAll}
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {isUploading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Mengunggah...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Unggah Semua ({pendingCount})
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {uploads.map((item) => (
              <div
                key={item.localId}
                className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                  item.status === 'failed'
                    ? 'border-red-500/30 bg-red-500/5'
                    : item.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-slate-700 bg-slate-800/50'
                } hover:bg-slate-800/70`}
              >
                {/* Progress bar background */}
                {item.status === 'uploading' && (
                  <div
                    className="absolute inset-0 bg-blue-500/10 transition-all duration-300 ease-out"
                    style={{ width: `${item.progress}%` }}
                  />
                )}

                <div className="relative flex items-center gap-4 p-4">
                  {/* Preview / Icon */}
                  <div className="flex-shrink-0">
                    {item.file.type.startsWith('image/') && item.previewUrl ? (
                      <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-600">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700/50 text-2xl">
                        {getFileIcon(item.file.name)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {item.file.name}
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {formatFileSize(item.file.size)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadge(item.status)}`}>
                        {getStatusLabel(item.status)}
                      </span>
                      {item.status === 'uploading' && (
                        <span className="text-xs font-mono text-blue-400">
                          {item.progress}%
                        </span>
                      )}
                    </div>
                    {item.message && (
                      <p className="mt-1 text-xs text-red-400">{item.message}</p>
                    )}
                  </div>

                  {/* Progress Bar (thin) */}
                  {item.status === 'uploading' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {item.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(item.localId)}
                        className="rounded-lg bg-amber-500/10 p-2 text-amber-400 transition-colors hover:bg-amber-500/20"
                        title="Coba lagi"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    {item.status !== 'uploading' && (
                      <button
                        onClick={() => handleRemoveFile(item.localId)}
                        className="rounded-lg bg-slate-700/50 p-2 text-slate-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                        title="Hapus"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
