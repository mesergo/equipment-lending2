import { useEffect, useState } from 'react';
import { Building2, MapPin, Warehouse as WarehouseIcon, Boxes, Users, HandCoins } from 'lucide-react';
import { useAuth, useAuthedFetch } from '../context/AuthContext';
import type { Organization } from '../types';

interface OrgStats {
  organization: Organization;
  branches: number;
  warehouses: number;
  products: number;
  customers: number;
  loans: number;
}

const STAT_ROWS: Array<{ key: keyof Omit<OrgStats, 'organization'>; label: string; icon: typeof Building2; color: string }> = [
  { key: 'branches', label: 'סניפים', icon: MapPin, color: 'text-blue-600' },
  { key: 'warehouses', label: 'מחסנים', icon: WarehouseIcon, color: 'text-emerald-600' },
  { key: 'products', label: 'מוצרים', icon: Boxes, color: 'text-rose-600' },
  { key: 'customers', label: 'לקוחות', icon: Users, color: 'text-amber-600' },
  { key: 'loans', label: 'השאלות', icon: HandCoins, color: 'text-teal-600' },
];

// Per-organization stat cards, matching the shape of the live lendingCRM dashboard
// (branches/warehouses/products/customers/loans counts per org). super_admin sees every
// organization; org_manager/coordinator see only their own.
export default function DashboardView() {
  const { user } = useAuth();
  const authedFetch = useAuthedFetch();
  const [stats, setStats] = useState<OrgStats[] | null>(null);

  useEffect(() => {
    async function load() {
      const [orgsRes, branchesRes, warehousesRes, productsRes, customersRes, loansRes] = await Promise.all([
        authedFetch('/api/organizations'),
        authedFetch('/api/branches'),
        authedFetch('/api/warehouses'),
        authedFetch('/api/products'),
        authedFetch('/api/customers'),
        authedFetch('/api/loans'),
      ]);
      const [orgs, branches, warehouses, products, customers, loans] = await Promise.all([
        orgsRes.json(),
        branchesRes.json(),
        warehousesRes.json(),
        productsRes.json(),
        customersRes.json(),
        loansRes.json(),
      ]);

      const visibleOrgs: Organization[] =
        user?.role === 'super_admin'
          ? orgs.items || []
          : (orgs.items || []).filter((o: Organization) => o.id === user?.organizationId);

      const countFor = (list: Array<{ organizationId: string }>, orgId: string) =>
        list.filter((item) => item.organizationId === orgId).length;

      setStats(
        visibleOrgs.map((organization) => ({
          organization,
          branches: countFor(branches.items || [], organization.id),
          warehouses: countFor(warehouses.items || [], organization.id),
          products: countFor(products.items || [], organization.id),
          customers: countFor(customers.items || [], organization.id),
          loans: countFor(loans.items || [], organization.id),
        }))
      );
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-gray-900 mb-1">לוח בקרה</h1>
      <p className="text-gray-500 mb-6">שלום {user?.name}, ברוך הבא למערכת השאלת הציוד.</p>

      {!stats ? (
        <p className="text-gray-500">טוען...</p>
      ) : stats.length === 0 ? (
        <p className="text-gray-500">אין עדיין ארגונים להצגה.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.organization.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-teal-600" strokeWidth={2} />
                </div>
                <p className="font-bold text-gray-900 truncate">{s.organization.name}</p>
              </div>
              <div className="space-y-2">
                {STAT_ROWS.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-500">
                        <Icon className={`w-3.5 h-3.5 ${row.color}`} strokeWidth={2} />
                        {row.label}
                      </span>
                      <span className={`font-semibold ${row.color}`}>{s[row.key]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
