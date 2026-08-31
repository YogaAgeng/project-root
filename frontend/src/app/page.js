import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="max-w-md w-full border border-slate-800 bg-slate-900/90 p-8 text-center backdrop-blur-md">
        <span className="text-4xl block mb-3">📋</span>
        <h1 className="text-2xl font-bold text-white mb-2">
          Task Management System
        </h1>
        <p className="text-sm text-slate-400 mb-6">
          Sistem manajemen tugas dan lampiran file terintegrasi dengan Laravel API.
        </p>

        <div className="space-y-3">
          <Link
            href="/tasks"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 border border-blue-500 text-sm"
          >
            Buka Task Board →
          </Link>
          <Link
            href="/login"
            className="block w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-4 border border-slate-700 text-sm"
          >
            Halaman Login
          </Link>
        </div>
      </div>
    </div>
  );
}
