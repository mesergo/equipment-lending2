import React, { useState } from 'react';
import { CheckCircle2, PackageCheck, ShieldAlert } from 'lucide-react';

interface ReportReturnViewProps {
  orderId?: string;
  organizationCode?: string;
  onNavigateToCatalog: () => void;
}

// Public page (no login) a customer reaches from a link in their WhatsApp reminder to say
// "I already returned this equipment" — this is what stops the daily reminders, and is what
// shows up as a pending confirmation in the organization's admin panel (see App.tsx / server).
export const ReportReturnView: React.FC<ReportReturnViewProps> = ({ orderId, organizationCode, onNavigateToCatalog }) => {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!orderId) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-3" dir="rtl">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h1 className="text-lg font-black text-slate-900">קישור לא תקין</h1>
        <p className="text-sm text-slate-500">חסר מספר הזמנה בקישור. ודאו שהעתקתם את הקישור המלא מהודעת הוואטסאפ.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/report-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'לא ניתן היה לרשום את הדיווח');
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setErrorMessage('בעיית תקשורת עם השרת. נסו שוב בעוד רגע.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4" dir="rtl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-black text-slate-900">הדיווח התקבל, תודה!</h1>
        <p className="text-sm text-slate-500">
          התזכורות ייפסקו, ונציג מהעמותה יבדוק את הציוד ויאשר את סגירת ההשאלה בקרוב.
        </p>
        <button
          onClick={onNavigateToCatalog}
          className="text-xs font-bold text-teal-700 hover:text-teal-800 underline"
        >
          חזרה לדף העמותה
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4" dir="rtl">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-5">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
            <PackageCheck className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">דיווח על החזרת ציוד</h1>
          <p className="text-xs text-slate-500">
            הזמנה <span className="font-mono">{orderId}</span>
            {organizationCode ? ` • עמותת ${organizationCode}` : ''}
          </p>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
          כדי לאשר שזו ההזמנה שלכם, הזינו את מספר הטלפון שנמסר בעת ההשאלה. לאחר הדיווח נציג מטעם
          העמותה יבדוק את הציוד בפועל ויסגור את ההשאלה.
        </p>

        {status === 'error' && errorMessage && (
          <div className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label className="block text-slate-700 font-bold text-xs mb-1">מספר טלפון שנמסר בהזמנה *</label>
          <input
            type="tel"
            required
            placeholder="05X-XXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors"
        >
          {status === 'submitting' ? 'שולח…' : 'דיווחתי שהחזרתי את הציוד'}
        </button>
      </form>
    </div>
  );
};
