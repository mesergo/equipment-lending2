import { useEffect, useState } from 'react';
import { Plus, Pencil, Inbox, UserCog } from 'lucide-react';
import { useAuth, useAuthedFetch } from '../context/AuthContext';
import { useOptions } from './CatalogScreens';
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

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'bg-purple-50 text-purple-700',
  org_manager: 'bg-teal-50 text-teal-700',
  coordinator: 'bg-blue-50 text-blue-700',
};

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';

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
  const [organizationId, setOrganizationId] = useState('');

  const assignableRoles: UserRole[] =
    currentUser?.role === 'super_admin' ? ['super_admin', 'org_manager', 'coordinator'] : ['org_manager', 'coordinator'];

  // org_manager/coordinator users must belong to an organization; super_admin doesn't. When the
  // caller is themselves org_manager, the backend always forces their own org regardless of what's
  // sent (see server/usersRoutes.ts), so this selector is only needed — and only shown — for
  // super_admin, who has no organization of their own to fall back on.
  const organizationOptions = useOptions('/api/organizations', 'name');
  const needsOrganization = currentUser?.role === 'super_admin' && role !== 'super_admin';

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
    setOrganizationId('');
  }

  async function submitCreate() {
    setError(null);
    if (needsOrganization && !organizationId) {
      setError('יש לבחור ארגון');
      return;
    }
    const res = await authedFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        name,
        role,
        title: title || undefined,
        organizationId: needsOrganization ? organizationId : undefined,
      }),
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
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">משתמשים</h1>
        {!creating && !editingId && (
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            חדש
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {creating && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">מייל</label>
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">שם</label>
              <input type="text" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">תפקיד</label>
              <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">תפקיד/תיאור</label>
              <input type="text" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            {creating && needsOrganization && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">ארגון</label>
                <select className={inputClass} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                  <option value="">— בחר —</option>
                  {organizationOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{creating ? 'סיסמה' : 'סיסמה חדשה (אופציונלי)'}</label>
              <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={creating ? submitCreate : () => submitEdit(editingId as string)}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              שמור
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setEditingId(null);
              }}
              className="text-sm font-medium text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Inbox className="w-10 h-10 mb-2" strokeWidth={1.5} />
          <p className="text-sm">אין משתמשים עדיין</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="text-right px-4 py-3 font-medium text-gray-500">שם</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">מייל</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">תפקיד</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">תיאור</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 text-gray-700">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                          <UserCog className="w-3.5 h-3.5 text-teal-600" strokeWidth={2} />
                        </div>
                        {u.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.title}</td>
                    <td className="px-4 py-3 text-left whitespace-nowrap">
                      <button
                        onClick={() => startEdit(u)}
                        aria-label="עריכה"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
