import React, { useState } from 'react';
import { Lock, LogIn, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginViewProps {
  title: string;
  subtitle?: string;
}

// Shown instead of the admin dashboard whenever nobody is logged in yet.
export const LoginView: React.FC<LoginViewProps> = ({ title, subtitle }) => {
  const { login, error, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await login(username, password);
    setSubmitting(false);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" dir="rtl">
      <form
        onSubmit={handleSubmit}
        className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-5"
      >
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        {error && (
          <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-slate-700 font-bold text-xs mb-1">שם משתמש</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-bold text-xs mb-1">סיסמה</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || isLoading}
          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>{submitting ? 'מתחבר…' : 'התחברות'}</span>
        </button>
      </form>
    </div>
  );
};

// Shown instead of the admin dashboard when the logged-in user IS authenticated,
// but is not allowed into this particular organization's (or the global) admin view.
export const AccessDeniedView: React.FC<{ message: string }> = ({ message }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-slate-900">אין הרשאה</h1>
        <p className="text-sm text-slate-500">{message}</p>
        <button onClick={logout} className="text-xs font-bold text-slate-500 hover:text-rose-700 underline">
          התנתקות והחלפת משתמש
        </button>
      </div>
    </div>
  );
};
