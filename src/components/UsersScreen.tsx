import { useEffect, useState } from 'react';
import { useAuth, useAuthedFetch } from '../context/AuthContext';
import type { UserRole } from '../types';

interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  title?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'מנהל ראשי',
  org_manager: 'מנהל ארגון',
  coordinator: 'סדרן',
};

// Not a generic EntityTable screen: user creation needs a password field (write-only, never
// shown back) and role assignment is permission-gated (super_admin can assign any role;
// org_manager can only assign org_manager/coordinator within their own org) — see PRD.md
// US-113 and server/usersRoutes.ts.
export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const authedFetch = useAuthedFetch();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('coordinator');
  const [title, setTitle] = useState('');

  const assignableRoles: UserRole[] =
    currentUser?.role === 'super_admin' ? ['super_admin', 'org_manager', 'coordinator'] : ['org_manager', 'coordinator'];

  async function load() {
    setLoading(true);
    const res = await authedFetch('/api/users');
    const data = await res.json();
    setUsers(data.items || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
    setRole(assignableRoles[assignableRoles.length - 1]);
    setTitle('');
  }

  async function submitCreate() {
    setError(null);
    const res = await authedFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, role, title: title || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'שגיאה ביצירת משתמש');
      return;
    }
    setCreating(false);
    await load();
  }

  function startEdit(u: PublicUser) {
    setCreating(false);
    setEditingId(u.id);
    setName(u.name);
    setRole(u.role);
    setTitle(u.title || '');
    setPassword('');
    setError(null);
  }

  async function submitEdit(id: string) {
    setError(null);
    const patch: Record<string, unknown> = { name, role, title: title || undefined };
    if (password) patch.password = password;
    const res = await authedFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'שגיאה בעדכון משתמש');
      return;
    }
    setEditingId(null);
    await load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">משתמשים</h1>
        {!creating && !editingId && (
          <button onClick={startCreate} className="bg-blue-600 text-white text-sm rounded px-3 py-1.5">
            + חדש
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <div className="bg-white border rounded p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {creating && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">מייל</label>
                <input type="email" className="border rounded px-2 py-1 text-sm w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">שם</label>
              <input type="text" className="border rounded px-2 py-1 text-sm w-full" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תפקיד</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תפקיד/תיאור</label>
              <input type="text" className="border rounded px-2 py-1 text-sm w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{creating ? 'סיסמה' : 'סיסמה חדשה (אופציונלי)'}</label>
              <input type="password" className="border rounded px-2 py-1 text-sm w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={creating ? submitCreate : () => submitEdit(editingId as string)}
              className="bg-blue-600 text-white text-sm rounded px-3 py-1.5"
            >
              שמור
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setEditingId(null);
              }}
              className="text-sm text-gray-600 px-3 py-1.5"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">טוען...</p>
      ) : (
        <div className="bg-white border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-right px-3 py-2 font-medium text-gray-600">שם</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">מייל</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">תפקיד</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">תיאור</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{ROLE_LABELS[u.role]}</td>
                  <td className="px-3 py-2">{u.title}</td>
                  <td className="px-3 py-2 text-left">
                    <button onClick={() => startEdit(u)} className="text-blue-600 text-xs">
                      עריכה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
