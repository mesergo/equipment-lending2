import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginView from './components/LoginView';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';

function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || 'dashboard');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash.slice(1) || 'dashboard');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

function AdminShell() {
  const route = useHashRoute();
  const [route1] = route.split('/'); // e.g. "loans" from "loans/loan-123"

  function navigate(next: string) {
    window.location.hash = next;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar current={route1} onNavigate={navigate} />
      <main className="flex-1 overflow-y-auto">
        <RouteContent route={route} />
      </main>
    </div>
  );
}

// Placeholder for routes not built yet in this pass — replaced screen by screen as each
// story lands (US-111 generic tables, US-112 loans, US-113 users).
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-2">{label}</h1>
      <p className="text-gray-500">מסך זה עדיין בבנייה.</p>
    </div>
  );
}

function RouteContent({ route }: { route: string }) {
  const [section] = route.split('/');
  switch (section) {
    case 'dashboard':
      return <DashboardView />;
    case 'organizations':
      return <ComingSoon label="ארגונים" />;
    case 'branches':
      return <ComingSoon label="סניפים" />;
    case 'warehouses':
      return <ComingSoon label="מחסנים" />;
    case 'categories':
      return <ComingSoon label="קטגוריות" />;
    case 'models':
      return <ComingSoon label="דגמים" />;
    case 'products':
      return <ComingSoon label="מוצרים" />;
    case 'customers':
      return <ComingSoon label="לקוחות" />;
    case 'loans':
      return <ComingSoon label="השאלות" />;
    case 'payments':
      return <ComingSoon label="תשלומים" />;
    case 'action-logs':
      return <ComingSoon label="לוגי פעולות" />;
    case 'users':
      return <ComingSoon label="משתמשים" />;
    default:
      return <DashboardView />;
  }
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">טוען...</div>;
  if (!user) return <LoginView />;
  return <AdminShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
