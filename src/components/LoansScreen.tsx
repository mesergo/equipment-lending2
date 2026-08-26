import { useEffect, useMemo, useState } from 'react';
import { useAuthedFetch } from '../context/AuthContext';
import type { Loan, LoanStatus, Product, Customer, ActionLog } from '../types';

const STATUS_LABELS: Record<LoanStatus, string> = {
  loaned: 'מושאל',
  returned: 'חזר',
  not_returned: 'לא הוחזר',
  pending_review: 'בבדיקה',
};

const STATUS_TABS: Array<{ value: LoanStatus | 'all'; label: string }> = [
  { value: 'all', label: 'כל ההשאלות' },
  { value: 'loaned', label: 'מושאל' },
  { value: 'returned', label: 'חזר' },
  { value: 'pending_review', label: 'בבדיקה' },
  { value: 'not_returned', label: 'לא הוחזר' },
];

// Dedicated screen (not the generic EntityTable) because Loans has real logic beyond CRUD:
// status tabs like the live system, customer/product pickers instead of free text, and an
// inline audit trail (ActionLog) per loan — see PRD.md US-112.
export default function LoansScreen() {
  const authedFetch = useAuthedFetch();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<LoanStatus | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCustomerId, setNewCustomerId] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newLoanDate, setNewLoanDate] = useState('');
  const [newPatientName, setNewPatientName] = useState('');

  const [editStatus, setEditStatus] = useState<LoanStatus>('loaned');
  const [editReturnDate, setEditReturnDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  async function loadAll() {
    setLoading(true);
    const [loansRes, productsRes, customersRes, logsRes] = await Promise.all([
      authedFetch('/api/loans'),
      authedFetch('/api/products'),
      authedFetch('/api/customers'),
      authedFetch('/api/action-logs'),
    ]);
    setLoans((await loansRes.json()).items || []);
    setProducts((await productsRes.json()).items || []);
    setCustomers((await customersRes.json()).items || []);
    setLogs((await logsRes.json()).items || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerName = (id: string) => {
    const c = customers.find((c) => c.id === id);
    return c ? `${c.firstName} ${c.lastName}` : id;
  };
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const availableProducts = useMemo(() => products.filter((p) => p.loanStatus === 'not_loaned'), [products]);

  const visibleLoans = useMemo(
    () => (tab === 'all' ? loans : loans.filter((l) => l.status === tab)),
    [loans, tab]
  );

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setError(null);
    setNewCustomerId('');
    setNewProductId('');
    setNewLoanDate(new Date().toISOString().slice(0, 10));
    setNewPatientName('');
  }

  async function submitCreate() {
    setError(null);
    const res = await authedFetch('/api/loans', {
      method: 'POST',
      body: JSON.stringify({
        customerId: newCustomerId,
        productId: newProductId,
        loanDate: newLoanDate,
        hospitalizedPatientName: newPatientName || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'שגיאה ביצירת השאלה');
      return;
    }
    setCreating(false);
    await loadAll();
  }

  function startEdit(loan: Loan) {
    setCreating(false);
    setEditingId(loan.id);
    setEditStatus(loan.status);
    setEditReturnDate(loan.returnDate || '');
    setEditNotes(loan.notes || '');
    setError(null);
  }

  async function submitEdit(loanId: string) {
    setError(null);
    const res = await authedFetch(`/api/loans/${loanId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: editStatus, returnDate: editReturnDate || undefined, notes: editNotes || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'שגיאה בעדכון השאלה');
      return;
    }
    setEditingId(null);
    await loadAll();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">השאלות</h1>
        {!creating && (
          <button onClick={startCreate} className="bg-teal-600 text-white text-sm rounded px-3 py-1.5">
            + השאלה חדשה
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`text-sm rounded-full px-3 py-1 border ${
              tab === t.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {creating && (
        <div className="bg-white border rounded p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">לקוח</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={newCustomerId} onChange={(e) => setNewCustomerId(e.target.value)}>
                <option value="">— בחר —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">מוצר (זמינים בלבד)</label>
              <select className="border rounded px-2 py-1 text-sm w-full" value={newProductId} onChange={(e) => setNewProductId(e.target.value)}>
                <option value="">— בחר —</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">תאריך השאלה</label>
              <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={newLoanDate} onChange={(e) => setNewLoanDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">שם מאושפז</label>
              <input type="text" className="border rounded px-2 py-1 text-sm w-full" value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submitCreate} className="bg-teal-600 text-white text-sm rounded px-3 py-1.5">
              שמור
            </button>
            <button onClick={() => setCreating(false)} className="text-sm text-gray-600 px-3 py-1.5">
              ביטול
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">טוען...</p>
      ) : visibleLoans.length === 0 ? (
        <p className="text-gray-500">אין השאלות בקטגוריה זו.</p>
      ) : (
        <div className="space-y-3">
          {visibleLoans.map((loan) => (
            <div key={loan.id} className="bg-white border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {productName(loan.productId)} — {customerName(loan.customerId)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {loan.hospitalizedPatientName && `מאושפז: ${loan.hospitalizedPatientName} · `}
                    תאריך השאלה: {loan.loanDate}
                    {loan.returnDate && ` · תאריך החזרה: ${loan.returnDate}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs rounded-full px-2 py-1 bg-gray-100">{STATUS_LABELS[loan.status]}</span>
                  <button onClick={() => startEdit(loan)} className="text-teal-600 text-xs">
                    עריכה
                  </button>
                </div>
              </div>

              {editingId === loan.id && (
                <div className="mt-3 border-t pt-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">סטטוס</label>
                      <select className="border rounded px-2 py-1 text-sm w-full" value={editStatus} onChange={(e) => setEditStatus(e.target.value as LoanStatus)}>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">תאריך החזרה</label>
                      <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={editReturnDate} onChange={(e) => setEditReturnDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">הערה</label>
                      <input type="text" className="border rounded px-2 py-1 text-sm w-full" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
                    </div>
                  </div>
                  {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => submitEdit(loan.id)} className="bg-teal-600 text-white text-sm rounded px-3 py-1.5">
                      שמור
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-gray-600 px-3 py-1.5">
                      ביטול
                    </button>
                  </div>
                </div>
              )}

              {/* Inline audit trail — matches the live system showing this directly in the loan edit form */}
              {logs.filter((l) => l.loanId === loan.id).length > 0 && (
                <div className="mt-3 border-t pt-3 text-xs text-gray-500 space-y-1">
                  {logs
                    .filter((l) => l.loanId === loan.id)
                    .map((l) => (
                      <p key={l.id}>
                        {new Date(l.date).toLocaleString('he-IL')} — {l.notes}
                      </p>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
