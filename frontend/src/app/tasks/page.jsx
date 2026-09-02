'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Toaster, toast } from 'react-hot-toast';
import apiClient from '@/lib/axios';
import NotificationBell from '@/components/NotificationBell';
import getEcho from '@/lib/echo';
import {
  LayoutDashboard,
  ListTodo,
  Plus,
  LogOut,
  Pencil,
  Trash2,
  Paperclip,
  MessageSquare,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  CheckCircle2,
  CircleDot,
  Ban,
  RefreshCw,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react';

const fetcher = (url) => apiClient.get(url).then((res) => res.data);

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, dot: 'bg-amber-500' },
  in_progress: { label: 'In Progress', icon: CircleDot, dot: 'bg-blue-500' },
  completed: { label: 'Completed', icon: CheckCircle2, dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', icon: Ban, dot: 'bg-red-500' },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', dot: 'bg-red-500' },
  high: { label: 'High', dot: 'bg-orange-500' },
  medium: { label: 'Medium', dot: 'bg-zinc-400' },
  low: { label: 'Low', dot: 'bg-zinc-600' },
};

export default function TasksPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const { data: authData } = useSWR('/auth/me', fetcher, { revalidateOnFocus: false });
  const { data: usersData } = useSWR('/users', fetcher, { revalidateOnFocus: false });
  const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);

  useEffect(() => {
    if (authData?.user) setCurrentUser(authData.user);
    else if (typeof window !== 'undefined') {
      const s = localStorage.getItem('user');
      if (s) { try { setCurrentUser(JSON.parse(s)); } catch { /* */ } }
    }
  }, [authData]);

  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('desc');
  const [page, setPage] = useState(1);
  const [activeNav, setActiveNav] = useState('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'pending', priority: 'medium', due_date: '', assigned_user_id: '' });

  const [editingTask, setEditingTask] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', description: '', status: 'pending', priority: 'medium', due_date: '', assigned_user_id: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  const queryParams = new URLSearchParams();
  if (page > 1) queryParams.set('page', page);
  if (status) queryParams.set('status', status);
  if (sort) queryParams.set('sort', sort);
  const qs = queryParams.toString();
  const swrKey = `/tasks${qs ? `?${qs}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR(swrKey, fetcher, { revalidateOnFocus: false });

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId) return;
    const echo = getEcho();
    if (!echo) return;
    const ch = `user.${userId}`;
    const channel = echo.private(ch);
    const h = () => { mutate(); };
    channel.listen('TaskUpdated', h);
    channel.listen('.TaskUpdated', h);
    return () => { echo.leave(ch); echo.leaveChannel(`private-${ch}`); };
  }, [currentUser?.id, mutate]);

  const tasks = data?.tasks || [];
  const currentPage = data?.current_page || 1;
  const lastPage = data?.last_page || 1;
  const totalTasks = data?.total !== undefined ? data.total : tasks.length;

  const handleInputChange = (e) => { setFormData((p) => ({ ...p, [e.target.name]: e.target.value })); };
  const handleEditInputChange = (e) => { setEditFormData((p) => ({ ...p, [e.target.name]: e.target.value })); };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Title is required.'); return; }
    setIsSubmitting(true);
    try {
      await apiClient.post('/tasks', { title: formData.title, description: formData.description || null, status: formData.status, priority: formData.priority, due_date: formData.due_date || null, assigned_user_id: formData.assigned_user_id ? Number(formData.assigned_user_id) : null });
      toast.success('Task created.');
      await mutate();
      setFormData({ title: '', description: '', status: 'pending', priority: 'medium', due_date: '', assigned_user_id: '' });
      setIsFormOpen(false);
    } catch (err) { toast.error(err.response?.data?.errors?.title?.[0] || err.response?.data?.message || 'Failed.'); }
    finally { setIsSubmitting(false); }
  };

  const handleOpenEdit = (task) => {
    setEditingTask(task);
    setEditFormData({ title: task.title || '', description: task.description || '', status: task.status || 'pending', priority: task.priority || 'medium', due_date: task.due_date ? task.due_date.substring(0, 10) : '', assigned_user_id: task.assigned_user_id ? String(task.assigned_user_id) : '' });
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editFormData.title.trim()) { toast.error('Title is required.'); return; }
    setIsUpdating(true);
    try {
      await apiClient.put(`/tasks/${editingTask.id}`, { title: editFormData.title, description: editFormData.description || null, status: editFormData.status, priority: editFormData.priority, due_date: editFormData.due_date || null, assigned_user_id: editFormData.assigned_user_id ? Number(editFormData.assigned_user_id) : null });
      toast.success('Task updated.');
      await mutate();
      setEditingTask(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setIsUpdating(false); }
  };

  const handleDeleteTask = async (task) => {
    if (!window.confirm(`Delete "${task.title}" (#${task.id})?`)) return;
    setIsDeletingId(task.id);
    try { await apiClient.delete(`/tasks/${task.id}`); toast.success('Deleted.'); if (selectedTask?.id === task.id) setSelectedTask(null); await mutate(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setIsDeletingId(null); }
  };

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* */ }
    finally { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const inputCls = 'w-full bg-black border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-950';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5';

  const navItems = [
    { key: '', nav: 'all', label: 'All Tasks', icon: ListTodo },
    { key: 'pending', nav: 'pending', label: 'Pending', icon: Clock },
    { key: 'in_progress', nav: 'in_progress', label: 'In Progress', icon: CircleDot },
    { key: 'completed', nav: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'cancelled', nav: 'cancelled', label: 'Cancelled', icon: Ban },
  ];

  return (
    <div className="h-screen bg-black text-zinc-300 p-4 overflow-hidden">
      <Toaster position="top-right" toastOptions={{ style: { background: '#09090b', color: '#d4d4d8', border: '1px solid #27272a', borderRadius: '12px', fontSize: '13px' } }} />

      {/* EDIT MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Edit Task #{editingTask.id}</h2>
              <button onClick={() => setEditingTask(null)} className="text-zinc-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className={labelCls}>Title *</label><input type="text" name="title" required value={editFormData.title} onChange={handleEditInputChange} className={inputCls} /></div>
                <div className="md:col-span-2"><label className={labelCls}>Description</label><textarea name="description" rows={3} value={editFormData.description} onChange={handleEditInputChange} className={inputCls} /></div>
                <div><label className={labelCls}>Status</label><select name="status" value={editFormData.status} onChange={handleEditInputChange} className={inputCls}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                <div><label className={labelCls}>Priority</label><select name="priority" value={editFormData.priority} onChange={handleEditInputChange} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div><label className={labelCls}>Due Date</label><input type="date" name="due_date" value={editFormData.due_date} onChange={handleEditInputChange} className={inputCls} /></div>
                <div><label className={labelCls}>Assignee</label><select name="assigned_user_id" value={editFormData.assigned_user_id} onChange={handleEditInputChange} className={inputCls}><option value="">— None —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setEditingTask(null)} className="bg-zinc-800 text-zinc-300 text-sm font-medium px-5 py-2.5 rounded-lg">Cancel</button>
                <button type="submit" disabled={isUpdating} className="bg-white text-black text-sm font-bold px-6 py-2.5 rounded-lg disabled:opacity-50">{isUpdating ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 p-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">New Task</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-zinc-500"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitTask} className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className={labelCls}>Title *</label><input type="text" name="title" required value={formData.title} onChange={handleInputChange} placeholder="Task title..." className={inputCls} /></div>
                <div className="md:col-span-2"><label className={labelCls}>Description</label><textarea name="description" rows={3} value={formData.description} onChange={handleInputChange} placeholder="Describe the task..." className={inputCls} /></div>
                <div><label className={labelCls}>Status</label><select name="status" value={formData.status} onChange={handleInputChange} className={inputCls}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                <div><label className={labelCls}>Priority</label><select name="priority" value={formData.priority} onChange={handleInputChange} className={inputCls}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                <div><label className={labelCls}>Due Date</label><input type="date" name="due_date" value={formData.due_date} onChange={handleInputChange} className={inputCls} /></div>
                <div><label className={labelCls}>Assignee</label><select name="assigned_user_id" value={formData.assigned_user_id} onChange={handleInputChange} className={inputCls}><option value="">— None —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setIsFormOpen(false)} className="bg-zinc-800 text-zinc-300 text-sm font-medium px-5 py-2.5 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-white text-black text-sm font-bold px-6 py-2.5 rounded-lg disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-COLUMN GRID */}
      <div className="h-[calc(100vh-2rem)] grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ═══ LEFT SIDEBAR ═══ */}
        <div className="lg:col-span-3 h-full bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col p-4 overflow-hidden">
          {/* Brand */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center">
              <LayoutDashboard size={18} className="text-black" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight leading-none">Task Console</p>
              {currentUser && <p className="text-[11px] text-zinc-600 mt-0.5">{currentUser.name}</p>}
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.nav;
              return (
                <button
                  key={item.nav}
                  onClick={() => { setActiveNav(item.nav); setStatus(item.key); setPage(1); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg ${isActive ? 'bg-white text-black font-bold' : 'text-zinc-400 font-medium'}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="border-t border-zinc-800 my-4" />

          {/* Sort */}
          <div className="mb-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600 mb-2 flex items-center gap-1"><ArrowUpDown size={11} /> Sort by</p>
            <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="w-full bg-black border border-zinc-800 rounded-lg text-sm text-zinc-300 px-3 py-2 focus:outline-none">
              <option value="desc">Due Date: Latest</option>
              <option value="asc">Due Date: Earliest</option>
            </select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom Actions */}
          <div className="space-y-2">
            <button onClick={() => setIsFormOpen(true)} className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-bold py-3 rounded-xl">
              <Plus size={16} /> New Task
            </button>
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0"><NotificationBell /></div>
              <button onClick={handleLogout} className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm font-medium py-2.5 rounded-xl">
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="lg:col-span-6 h-full bg-black flex flex-col gap-4 overflow-hidden">
          {/* Header & Tabs */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Tasks</h1>
                <p className="text-xs text-zinc-600 mt-0.5">{totalTasks} total · Page {currentPage}/{lastPage}</p>
              </div>
              <button onClick={() => mutate()} className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-medium px-3 py-2 rounded-lg">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-1">
              {['all', 'pending', 'in_progress', 'completed'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveNav(tab); setStatus(tab === 'all' ? '' : tab); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md ${activeNav === tab ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
                >
                  {tab === 'all' ? 'All' : tab === 'in_progress' ? 'In Progress' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Task Cards */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-zinc-600 text-sm">Loading tasks...</div>
            ) : error ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center">
                <AlertCircle size={24} className="text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-400 font-semibold">Failed to load tasks.</p>
                <Link href="/login" className="inline-block mt-3 bg-white text-black text-xs font-bold px-4 py-2 rounded-lg">Go to Login</Link>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                <ListTodo size={32} className="mb-2" />
                <p className="text-sm">No tasks found.</p>
              </div>
            ) : (
              tasks.map((task) => {
                const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                const isSelected = selectedTask?.id === task.id;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTask(task)}
                    className={`w-full text-left bg-zinc-950 border rounded-2xl p-4 ${isSelected ? 'border-white' : 'border-zinc-800'}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status indicator: 8x8 square */}
                      <div className={`w-2 h-2 mt-1.5 flex-shrink-0 ${sc.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white truncate">{task.title}</span>
                          <div className={`w-2 h-2 flex-shrink-0 ${pc.dot}`} title={pc.label} />
                        </div>
                        {task.description && <p className="text-xs text-zinc-600 truncate mt-0.5">{task.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-600">
                          <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(task.due_date)}</span>
                          <span className="flex items-center gap-1"><User size={11} />{task.creator?.name || '?'}</span>
                          {task.assigned_user && <span>→ {task.assigned_user.name}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-700 mt-0.5">#{task.id}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between px-4 py-3">
              <span className="text-xs text-zinc-600 font-mono">{currentPage}/{lastPage}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="bg-zinc-900 text-zinc-400 px-2 py-1.5 rounded-md text-xs disabled:opacity-30 border border-zinc-800"><ChevronLeft size={14} /></button>
                {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                  <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1.5 text-xs font-mono rounded-md border ${p === currentPage ? 'bg-white text-black border-white font-bold' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>{p}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={currentPage >= lastPage} className="bg-zinc-900 text-zinc-400 px-2 py-1.5 rounded-md text-xs disabled:opacity-30 border border-zinc-800"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="lg:col-span-3 h-full flex flex-col gap-4 overflow-hidden">
          {selectedTask ? (
            <>
              {/* PRIMARY CARD — High contrast white */}
              <div className="bg-white text-black rounded-3xl p-6 flex-shrink-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-black/40 mb-3">Task Details</p>
                <h2 className="text-xl font-bold leading-tight tracking-tight">{selectedTask.title}</h2>
                <p className="text-[11px] font-mono text-black/30 mt-1">ID #{selectedTask.id}</p>

                {selectedTask.description && (
                  <p className="text-xs text-black/60 leading-relaxed mt-3">{selectedTask.description}</p>
                )}

                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-black/40 font-semibold">Status</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <span className={`w-2 h-2 ${STATUS_CONFIG[selectedTask.status]?.dot}`} />
                      {STATUS_CONFIG[selectedTask.status]?.label || selectedTask.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-black/40 font-semibold">Priority</span>
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      <span className={`w-2 h-2 ${PRIORITY_CONFIG[selectedTask.priority]?.dot}`} />
                      {PRIORITY_CONFIG[selectedTask.priority]?.label || selectedTask.priority}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  <button onClick={() => handleOpenEdit(selectedTask)} className="w-full flex items-center justify-center gap-2 bg-black text-white text-sm font-bold py-2.5 rounded-xl">
                    <Pencil size={14} /> Edit Task
                  </button>
                  {selectedTask.created_by === currentUser?.id && (
                    <button onClick={() => handleDeleteTask(selectedTask)} disabled={isDeletingId === selectedTask.id} className="w-full flex items-center justify-center gap-2 bg-black/10 text-black text-sm font-bold py-2.5 rounded-xl disabled:opacity-50">
                      <Trash2 size={14} /> {isDeletingId === selectedTask.id ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>

              {/* SECONDARY CARD — Dark info */}
              <div className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl p-6 flex-1 overflow-y-auto">
                <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Information</p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-zinc-600 font-semibold mb-1 flex items-center gap-1"><Calendar size={11} /> Due Date</p>
                    <p className="text-sm font-mono text-white">{formatDate(selectedTask.due_date)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-600 font-semibold mb-1 flex items-center gap-1"><User size={11} /> Created by</p>
                    <p className="text-sm text-white">{selectedTask.creator?.name || 'Unknown'}</p>
                  </div>
                  {selectedTask.assigned_user && (
                    <div>
                      <p className="text-[11px] text-zinc-600 font-semibold mb-1 flex items-center gap-1"><User size={11} /> Assigned to</p>
                      <p className="text-sm text-white">{selectedTask.assigned_user.name}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <Link href={`/tasks/${selectedTask.id}/attachments`} className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl border border-zinc-700">
                    <Paperclip size={13} /> Attachments
                  </Link>
                  <Link href={`/tasks/${selectedTask.id}/comments`} className="w-full flex items-center justify-center gap-2 bg-zinc-800 text-zinc-300 text-xs font-semibold py-2.5 rounded-xl border border-zinc-700">
                    <MessageSquare size={13} /> Comments
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl flex-1 flex items-center justify-center">
              <div className="text-center text-zinc-700">
                <ListTodo size={32} className="mx-auto mb-2" />
                <p className="text-sm font-medium">Select a task</p>
                <p className="text-xs text-zinc-800 mt-0.5">to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
