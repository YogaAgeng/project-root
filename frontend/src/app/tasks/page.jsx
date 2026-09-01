'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Toaster, toast } from 'react-hot-toast';
import apiClient from '@/lib/axios';
import NotificationBell from '@/components/NotificationBell';
import getEcho from '@/lib/echo';

// SWR Fetcher menggunakan centralized axios instance
const fetcher = (url) => apiClient.get(url).then((res) => res.data);

export default function TasksPage() {
  // Current user state untuk otorisasi tampilan (misal tombol hapus)
  const [currentUser, setCurrentUser] = useState(null);

  // Ambil current user dari endpoint /auth/me
  const { data: authData } = useSWR('/auth/me', fetcher, { revalidateOnFocus: false });

  // Fetch data list user untuk dropdown assignment
  const { data: usersData } = useSWR('/users', fetcher, { revalidateOnFocus: false });
  const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);

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

  // 1. State Filter, Sort & Paginasi
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('desc');
  const [page, setPage] = useState(1);

  // State Form Modal / Create Task
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    assigned_user_id: '',
  });

  // State Edit Task
  const [editingTask, setEditingTask] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    assigned_user_id: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // 2. Membentuk query string dinamis untuk SWR Cache Revalidation
  const queryParams = new URLSearchParams();
  if (page > 1) queryParams.set('page', page);
  if (status) queryParams.set('status', status);
  if (sort) queryParams.set('sort', sort);
  const queryString = queryParams.toString();
  const swrKey = `/tasks${queryString ? `?${queryString}` : ''}`;

  // Fetch data tasks dengan SWR (tanpa auto-polling, update real-time via WebSocket)
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  // Real-time WebSocket Subscription via Laravel Echo
  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) return;

    const echo = getEcho();
    if (!echo) return;

    const channelName = `user.${userId}`;
    const channel = echo.private(channelName);

    const handleTaskUpdated = () => {
      mutate();
    };

    channel.listen('TaskUpdated', handleTaskUpdated);
    channel.listen('.TaskUpdated', handleTaskUpdated);

    // Cleanup saat unmount untuk mencegah memory leak
    return () => {
      echo.leave(channelName);
      echo.leaveChannel(`private-${channelName}`);
    };
  }, [currentUser?.id, mutate]);

  const tasks = data?.tasks || [];
  const currentPage = data?.current_page || 1;
  const lastPage = data?.last_page || 1;
  const totalTasks = data?.total !== undefined ? data.total : tasks.length;

  // Handler input create form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler input edit form
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 3. Handler Submit Create Task
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Judul task wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/tasks', {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assigned_user_id: formData.assigned_user_id ? Number(formData.assigned_user_id) : null,
      });

      toast.success('Task berhasil dibuat!');
      
      // Mutate cache SWR agar data otomatis terbarui
      await mutate();

      // Reset form
      setFormData({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
        assigned_user_id: '',
      });
      setIsFormOpen(false);
    } catch (err) {
      const errorMessage =
        err.response?.data?.errors?.title?.[0] ||
        err.response?.data?.message ||
        'Gagal membuat task.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Modal Edit Task
  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.substring(0, 10) : '',
      assigned_user_id: task.assigned_user_id ? String(task.assigned_user_id) : '',
    });
  };

  // 4. Handler Submit Update Task (PUT)
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim()) {
      toast.error('Judul task wajib diisi.');
      return;
    }

    setIsUpdating(true);
    try {
      await apiClient.put(`/tasks/${editingTask.id}`, {
        title: editFormData.title,
        description: editFormData.description || null,
        status: editFormData.status,
        priority: editFormData.priority,
        due_date: editFormData.due_date || null,
        assigned_user_id: editFormData.assigned_user_id ? Number(editFormData.assigned_user_id) : null,
      });

      toast.success('Task berhasil diperbarui.');
      await mutate();
      setEditingTask(null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.title?.[0] ||
        'Gagal memperbarui task.';
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // 5. Handler Hapus Task (DELETE) dengan window.confirm
  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus task "${task.title}" (ID #${task.id})?`
    );
    if (!confirmed) return;

    setIsDeletingId(task.id);
    try {
      await apiClient.delete(`/tasks/${task.id}`);
      toast.success('Task berhasil dihapus.');
      await mutate();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Gagal menghapus task. Anda mungkin tidak memiliki hak akses.';
      toast.error(msg);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Handler Logout Pengguna
  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Abaikan error jika token sudah expired
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  // Format Tanggal Statis
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Badge Status Warna Solid (Tanpa Animasi)
  const getStatusBadge = (st) => {
    switch (st) {
      case 'pending':
        return 'bg-amber-900/60 text-amber-200 border-amber-700';
      case 'in_progress':
        return 'bg-blue-900/60 text-blue-200 border-blue-700';
      case 'completed':
        return 'bg-emerald-900/60 text-emerald-200 border-emerald-700';
      case 'cancelled':
        return 'bg-red-900/60 text-red-200 border-red-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Badge Prioritas Warna Solid (Tanpa Animasi)
  const getPriorityBadge = (pr) => {
    switch (pr) {
      case 'urgent':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      case 'high':
        return 'bg-orange-950 text-orange-300 border-orange-800';
      case 'medium':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'low':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
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

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <h1 className="text-2xl font-bold tracking-wide text-white">
                  Task Management Board
                </h1>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Kelola daftar tugas, lakukan filter status, dan atur lampiran berkas.
                {currentUser && (
                  <span className="ml-2 text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 text-blue-400">
                    Login sebagai: {currentUser.name} (ID #{currentUser.id})
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Modul Notifikasi In-App */}
              <NotificationBell />

              <button
                type="button"
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 border border-blue-500 flex items-center gap-2"
              >
                <span>➕</span>
                <span>{isFormOpen ? 'Tutup Form' : 'Tambah Task Baru'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2.5 border border-slate-700 flex items-center gap-2"
              >
                <span>👤</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Dialog Edit Task (Fixed Overlay, Kaku, Solid, No Animation) */}
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl border-2 border-amber-600 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-lg">✏️</span>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Edit Task #{editingTask.id}: {editingTask.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-2.5 py-1 border border-slate-700"
                >
                  ✕ Tutup
                </button>
              </div>

              <form onSubmit={handleUpdateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Judul Task <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      value={editFormData.title}
                      onChange={handleEditInputChange}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Deskripsi Task
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      value={editFormData.description}
                      onChange={handleEditInputChange}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditInputChange}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Prioritas
                    </label>
                    <select
                      name="priority"
                      value={editFormData.priority}
                      onChange={handleEditInputChange}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Due Date (Batas Waktu)
                    </label>
                    <input
                      type="date"
                      name="due_date"
                      value={editFormData.due_date}
                      onChange={handleEditInputChange}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                      Penerima Tugas (Assignee)
                    </label>
                    <select
                      name="assigned_user_id"
                      value={editFormData.assigned_user_id}
                      onChange={handleEditInputChange}
                      className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Tanpa Penerima (Kosong) --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} (ID #{u.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 border border-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 text-white text-sm font-semibold px-6 py-2 border border-amber-500"
                  >
                    {isUpdating ? 'Memperbarui...' : 'Simpan Perubahan (PUT)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Form Buat Task (Kaku, Solid, No Animation) */}
        {isFormOpen && (
          <div className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6">
            <h2 className="text-base font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-800">
              Form Tambah Task Baru
            </h2>
            <form onSubmit={handleSubmitTask} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Judul Task <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Contoh: Mengimplementasikan integrasi webhook..."
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Deskripsi Task
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detail deskripsi kebutuhan tugas..."
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Prioritas
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Due Date (Batas Waktu)
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                    Penerima Tugas (Assignee)
                  </label>
                  <select
                    name="assigned_user_id"
                    value={formData.assigned_user_id}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Tanpa Penerima (Kosong) --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (ID #{u.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-4 py-2 border border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm font-semibold px-6 py-2 border border-blue-500"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Task'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. Control Bar: Filter Status & Sort Due Date */}
        <div className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase text-slate-400">
                Filter Status:
              </span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-700 text-sm text-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <span className="text-xs font-semibold uppercase text-slate-400 ml-0 sm:ml-4">
                Urutkan Due Date:
              </span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-700 text-sm text-slate-200 px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="desc">Due Date: Terjauh / Terakhir (DESC)</option>
                <option value="asc">Due Date: Terdekat / Lebih Awal (ASC)</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-end gap-2">
              <span>Total: <strong className="text-slate-200">{totalTasks}</strong> task</span>
              <button
                type="button"
                onClick={() => mutate()}
                title="Refresh Cache SWR"
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1 text-slate-300"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Daftar Tasks List (Glassmorphism, Kaku/Statis, Link Lampiran, Edit & Hapus) */}
        {isLoading ? (
          <div className="border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            <span>Memuat data task...</span>
          </div>
        ) : error ? (
          <div className="border border-red-900 bg-red-950/40 p-6 text-center text-red-300">
            <p className="font-semibold">Gagal memuat data task dari backend.</p>
            <p className="text-xs text-red-400 mt-1">
              Pastikan Anda sudah login dan token tersimpan di storage.
            </p>
            <div className="mt-4">
              <Link
                href="/login"
                className="bg-red-800 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 border border-red-700"
              >
                Menuju Halaman Login
              </Link>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="border border-slate-800 bg-slate-900/50 p-12 text-center text-slate-500">
            <span className="text-3xl block mb-2">📭</span>
            <p className="text-base font-medium text-slate-400">Tidak ada task yang cocok dengan kriteria filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-slate-800 bg-slate-900/80 backdrop-blur-md p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-base font-bold text-white leading-snug">
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border font-mono ${getStatusBadge(
                            task.status
                          )}`}
                        >
                          {task.status}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border font-mono ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div>
                        <span className="text-slate-500 font-medium">Batas Waktu:</span>{' '}
                        <strong className="text-slate-300 font-mono">
                          {formatDate(task.due_date)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Dibuat:</span>{' '}
                        <span className="text-slate-400 font-mono">
                          {task.creator?.name || 'Anonim'}
                        </span>
                      </div>
                    </div>

                    {task.assigned_user && (
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500 font-medium">Penerima Tugas:</span>{' '}
                        <span className="text-blue-400 font-semibold bg-slate-950 px-2 py-0.5 border border-slate-800">
                          👤 {task.assigned_user.name}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Link
                        href={`/tasks/${task.id}/attachments`}
                        className="text-center bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold py-2 px-2 border border-slate-700 text-xs flex items-center justify-center gap-1.5"
                      >
                        <span>📎</span>
                        <span>Lampiran</span>
                      </Link>
                      <Link
                        href={`/tasks/${task.id}/comments`}
                        className="text-center bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold py-2 px-2 border border-slate-700 text-xs flex items-center justify-center gap-1.5"
                      >
                        <span>💬</span>
                        <span>Komentar</span>
                      </Link>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(task)}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold py-1.5 px-3 border border-slate-700 text-xs flex items-center gap-1.5"
                      >
                        <span>✏️</span>
                        <span>Edit Task</span>
                      </button>

                      {task.created_by === currentUser?.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          disabled={isDeletingId === task.id}
                          className="bg-red-950/60 hover:bg-red-900 text-red-300 font-semibold py-1.5 px-3 border border-red-800 text-xs flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <span>🗑️</span>
                          <span>{isDeletingId === task.id ? 'Menghapus...' : 'Hapus'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Kontrol Navigasi Paginasi (Kaku, Solid, No Animation) */}
            {lastPage > 1 && (
              <div className="flex items-center justify-between border border-slate-800 bg-slate-900/90 backdrop-blur-md p-4">
                <div className="text-xs text-slate-400 font-mono">
                  Halaman <span className="font-bold text-white">{currentPage}</span> dari{' '}
                  <span className="font-bold text-white">{lastPage}</span> (Total {totalTasks} Task)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold px-3 py-1.5 border border-slate-700 flex items-center gap-1"
                  >
                    ← Sebelumnya
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`text-xs font-mono px-2.5 py-1 border ${
                          p === currentPage
                            ? 'bg-blue-600 border-blue-500 text-white font-bold'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
                    disabled={currentPage >= lastPage}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold px-3 py-1.5 border border-slate-700 flex items-center gap-1"
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
