import { useAuth } from '../context/AuthContext';

// Minimal landing screen after login. The live system's dashboard shows per-organization
// stat cards (branches/warehouses/products/customers/loans/payments counts) — worth
// building out once the entity screens below it exist; not its own PRD story yet.
export default function DashboardView() {
  const { user } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-2">לוח בקרה</h1>
      <p className="text-gray-600">שלום {user?.name}, ברוך הבא למערכת השאלת הציוד.</p>
    </div>
  );
}
