import {
  LayoutDashboard,
  Building2,
  MapPin,
  Warehouse as WarehouseIcon,
  Tag,
  Package,
  Boxes,
  Users,
  HandCoins,
  CreditCard,
  FileText,
  UserCog,
  Package as LogoIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export interface NavItem {
  route: string;
  label: string;
  icon: typeof LayoutDashboard;
  // Roles allowed to see this item. Omit to allow everyone.
  roles?: UserRole[];
}

// Mirrors the sidebar menu observed on the live lendingCRM admin panel, in the same order:
// לוח בקרה, ארגונים, סניפים, מחסנים, קטגוריות, דגמים, מוצרים, לקוחות, השאלות, תשלומים,
// לוגי פעולות, משתמשים. "ארגונים" is super_admin-only (organizations aren't self-service).
export const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { route: 'organizations', label: 'ארגונים', icon: Building2, roles: ['super_admin'] },
  { route: 'branches', label: 'סניפים', icon: MapPin },
  { route: 'warehouses', label: 'מחסנים', icon: WarehouseIcon },
  { route: 'categories', label: 'קטגוריות', icon: Tag },
  { route: 'models', label: 'דגמים', icon: Package },
  { route: 'products', label: 'מוצרים', icon: Boxes },
  { route: 'customers', label: 'לקוחות', icon: Users },
  { route: 'loans', label: 'השאלות', icon: HandCoins },
  { route: 'payments', label: 'תשלומים', icon: CreditCard },
  { route: 'action-logs', label: 'לוגי פעולות', icon: FileText },
  { route: 'users', label: 'משתמשים', icon: UserCog },
];

export default function Sidebar({ current, onNavigate }: { current: string; onNavigate: (route: string) => void }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const visible = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <aside className="w-64 shrink-0 border-e border-gray-200 bg-white flex flex-col">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
          <LogoIcon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate">lendingCRM</p>
          <p className="text-xs text-gray-400 truncate">מערכת השאלת ציוד</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = current === item.route;
          return (
            <button
              key={item.route}
              onClick={() => onNavigate(item.route)}
              className={`flex items-center gap-3 w-full text-right px-3 py-2.5 text-sm rounded-lg transition-colors ${
                active ? 'bg-teal-50 text-teal-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-teal-600' : 'text-gray-400'}`} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-gray-100">
        <p className="font-medium text-sm text-gray-900 truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{user.email}</p>
        <button onClick={logout} className="text-xs font-medium text-teal-600 mt-2">
          התנתק
        </button>
      </div>
    </aside>
  );
}
