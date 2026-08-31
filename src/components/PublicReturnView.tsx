import { useState, type FormEvent } from 'react';
import { Package, CheckCircle2, ChevronLeft } from 'lucide-react';

// Public, no-login self-service return page (#return/:token), matching the live system's
// "החזרת ציוד" flow: customer enters their phone, sees what's currently out on loan under
// that number, picks what they're returning. Deliberately a separate page from
// PublicCatalogView (the live system treats borrow/return as two distinct entry points, not
// steps of one wizard) — see progress.txt for the ptdev1 admin-panel comparison this came out of.

const TEAL = '#0d9488';

interface OpenLoan {
  id: string;
  productName: string;
  loanDate: string;
}

type Step = 'phone' | 'select' | 'success';

export default function PublicReturnView({ token }: { token: string }) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [loans, setLoans] = useState<OpenLoan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnedCount, setReturnedCount] = useState(0);

  async function loadLoans(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/public/customer-loans?token=${encodeURIComponent(token)}&phone=${encodeURIComponent(phone)}`);
      const data = (await res.json()) as { loans?: OpenLoan[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'שגיאה בטעינת הנתונים');
        return;
      }
      setLoans(data.loans || []);
      setSelected(new Set((data.loans || []).map((l) => l.id)));
      setStep('select');
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitReturn() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/public/loan-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phone, loanIds: Array.from(selected) }),
      });
      const data = (await res.json()) as { returned?: number; error?: string };
      if (!res.ok) {
        setError(data.error || 'שגיאה בשליחת ההחזרה');
        return;
      }
      setReturnedCount(data.returned ?? 0);
      setStep('success');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-lg mx-auto px-6 pt-10 pb-16">
        <div className="flex items-center justify-end gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: TEAL }}>
            <Package className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">החזרת ציוד</p>
            <p className="text-sm font-medium" style={{ color: TEAL }}>
              מערכת השאלת ציוד דיגיטלית
            </p>
          </div>
        </div>

        {step === 'phone' && (
          <form onSubmit={loadLoans}>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">מה מספר הטלפון שלך?</h1>
            <p className="text-gray-400 mb-6">נציג לך את המוצרים שנמצאים אצלך כרגע</p>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">טלפון נייד</label>
              <input
                type="tel"
                required
                autoFocus
                placeholder="05X-XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 mt-6 font-semibold text-white transition-colors disabled:cursor-not-allowed"
              style={{ backgroundColor: loading || !phone ? '#d1d5db' : TEAL }}
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              {loading ? 'טוען...' : 'הצג מוצרים'}
            </button>
          </form>
        )}

        {step === 'select' && (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">אילו מוצרים את/ה מחזיר/ה?</h1>
            <p className="text-gray-400 mb-6">כל המוצרים שנמצאים אצלך מסומנים מראש</p>

            {loans.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center text-gray-500">
                לא נמצאו מוצרים פתוחים למספר הטלפון הזה.
              </div>
            ) : (
              <div className="space-y-3">
                {loans.map((l) => {
                  const isSelected = selected.has(l.id);
                  return (
                    <div
                      key={l.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => toggle(l.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle(l.id);
                        }
                      }}
                      className="flex items-center justify-between gap-4 bg-white rounded-2xl shadow-sm p-5 cursor-pointer border-2 transition-colors"
                      style={{ borderColor: isSelected ? TEAL : '#f3f4f6' }}
                    >
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{l.productName}</p>
                        <p className="text-xs text-gray-400 mt-1">תאריך השאלה: {l.loanDate}</p>
                      </div>
                      <span
                        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-colors"
                        style={{ backgroundColor: isSelected ? TEAL : '#e5e7eb' }}
                      >
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={0} fill="white" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

            {loans.length > 0 && (
              <button
                type="button"
                disabled={loading || selected.size === 0}
                onClick={submitReturn}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 mt-6 font-semibold text-white transition-colors disabled:cursor-not-allowed"
                style={{ backgroundColor: loading || selected.size === 0 ? '#d1d5db' : TEAL }}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                {loading ? 'שולח...' : `החזר ${selected.size} מוצרים`}
              </button>
            )}
            <button type="button" onClick={() => setStep('phone')} className="w-full text-center text-sm text-gray-500 mt-4">
              חזרה
            </button>
          </>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: '#f0fdfa' }}>
              <CheckCircle2 className="w-11 h-11" style={{ color: TEAL }} strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">ההחזרה נקלטה בהצלחה!</h1>
            <p className="text-gray-500">
              {returnedCount} מוצרים סומנו כהוחזרו. תודה רבה, ושתהיו בריאים!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
