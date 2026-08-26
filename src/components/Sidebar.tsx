import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export interface NavItem {
  route: string;
  label: string;
  // Roles allowed to see this item. Omit to allow everyone.
  roles?: UserRole[];
}

// Mirrors the sidebar menu observed on the live lendingCRM admin panel, in the same order:
// לוח בקרה, ארגונים, סניפים, מחסנים, קטגוריות, דגמים, מוצרים, לקוחות, השאלות, תשלומים,
// לוגי פעולות, משתמשים. "ארגונים" is super_admin-only (organizations aren't self-service).
export const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', label: 'לוח בקרה' },
  { route: 'organizations', label: 'ארגונים', roles: ['super_admin'] },
  { route: 'branches', label: 'סניפים' },
  { route: 'warehouses', label: 'מחסנים' },
  { route: 'categories', label: 'קטגוריות' },
  { route: 'models', label: 'דגמים' },
  { route: 'products', label: 'מוצרים' },
  { route: 'customers', label: 'לקוחות' },
  { route: 'loans', label: 'השאלות' },
  { route: 'payments', label: 'תשלומים' },
  { route: 'action-logs', label: 'לוגי פעולות' },
  { route: 'users', label: 'משתמשים' },
];

export default function Sidebar({ current, onNavigate }: { current: string; onNavigate: (route: string) => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const visible = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <aside className="w-56 shrink-0 border-e bg-white flex flex-col">
      <div className="p-4 border-b">
        <p className="font-medium text-sm truncate">{user.name}</p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
        <button onClick={logout} className="text-xs text-blue-600 mt-1">
          התנתק
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {visible.map((item) => (
          <button
            key={item.route}
            onClick={() => onNavigate(item.route)}
            className={`block w-full text-right px-4 py-2 text-sm hover:bg-gray-100 ${
              current === item.route ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
