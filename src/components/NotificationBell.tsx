import { useEffect, useRef, useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useAuthedFetch } from '../context/AuthContext';
import type { Notification } from '../types';

// Bell + dropdown, matching the notification center on the live lendingCRM admin panel
// (loan created / loan returned, with unread badge, mark-all-read, clear). Polls every 30s
// so staff notice new loans without a full page reload — cheap enough at this data scale
// (org-scoped list, not a websocket-worthy volume).
export default function NotificationBell() {
  const authedFetch = useAuthedFetch();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await authedFetch('/api/notifications');
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await authedFetch(`/api/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ read: true }) });
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await authedFetch('/api/notifications/mark-all-read', { method: 'POST' });
  }

  async function clearAll() {
    setItems([]);
    await authedFetch('/api/notifications', { method: 'DELETE' });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="התראות"
        className="relative p-2 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
      >
        <Bell className="w-5 h-5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="font-semibold text-sm text-gray-900">התראות</p>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllRead}
                title="סמן הכל כנקרא"
                className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              >
                <Check className="w-4 h-4" strokeWidth={2} />
              </button>
              <button
                onClick={clearAll}
                title="נקה"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">אין התראות</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`w-full text-right px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${
                    n.read ? '' : 'bg-teal-50/40'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{new Date(n.date).toLocaleString('he-IL')}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
