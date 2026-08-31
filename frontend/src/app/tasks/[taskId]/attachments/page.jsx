'use client';

import { use, useCallback } from 'react';
import { useSWRConfig } from 'swr';
import { Toaster } from 'react-hot-toast';
import TaskAttachmentUpload from '@/components/TaskAttachmentUpload';
import TaskAttachmentList, { getAttachmentListKey } from '@/components/TaskAttachmentList';

export default function TaskAttachmentsPage({ params }) {
  const { taskId } = use(params);
  const { mutate } = useSWRConfig();

  /**
   * Called when uploads succeed — revalidate the attachment list.
   */
  const handleUploadSuccess = useCallback(() => {
    mutate(getAttachmentListKey(taskId));
  }, [mutate, taskId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#e2e8f0',
            border: '1px solid #334155',
            borderRadius: '12px',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1e293b' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
          },
        }}
      />

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg shadow-lg shadow-blue-500/20">
              📎
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Lampiran Tugas
              </h1>
              <p className="text-sm text-slate-400">
                Task ID: <span className="font-mono text-slate-300">#{taskId}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Unggah File
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
            <TaskAttachmentUpload
              taskId={taskId}
              onUploadSuccess={handleUploadSuccess}
            />
          </div>
        </section>

        {/* Divider */}
        <div className="mb-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

        {/* Attachment List Section */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              File Tersimpan
            </h2>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 backdrop-blur-sm">
            <TaskAttachmentList taskId={taskId} />
          </div>
        </section>
      </div>
    </div>
  );
}
