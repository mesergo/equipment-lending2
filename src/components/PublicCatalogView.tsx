import { useEffect, useState, type FormEvent } from 'react';
import {
  Package,
  BedDouble,
  Moon,
  Armchair,
  Accessibility,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Star,
  ShieldCheck,
} from 'lucide-react';
import type { Organization, Product, Model, Branch, Loan } from '../types';

// Public, no-login page addressed by the organization's token (#catalog/:token).
//
// This went through several revision rounds against the AI Studio "שבת אחים" reference
// (PRD.md US-114) after user feedback that earlier passes were missing whole steps. The
// final pass actually clicked all the way through the reference's real flow (not just its
// first screen) to get the true step order: select → terms → personal details → location →
// date → payment → success. No code or image assets were copied from that reference —
// copy/labels below are written independently; icons are lucide-react (already a project
// dependency); the "location" step uses the organization's real Branch records instead of
// the reference's hardcoded hospital-wing list, since this platform serves organizations
// generally, not one specific hospital.

const TEAL = '#0d9488'; // tailwind teal-600, matches the reference's accent color closely

function pickIcon(name: string) {
  if (/מיטה|מיטת/.test(name)) return BedDouble;
  if (/מזרון|מזרן/.test(name)) return Moon;
  if (/גלגלים/.test(name)) return Accessibility;
  if (/כיסא/.test(name)) return Armchair;
  return Package;
}

type DurationEstimate = 'unknown' | 'few_days' | 'one_day';
const DURATION_LABELS: Record<DurationEstimate, string> = {
  unknown: 'לא ידוע',
  few_days: 'לימים בודדים',
  one_day: 'ליום אחד',
};

interface CatalogData {
  organization: Organization;
  products: Array<Product & { model?: Model }>;
  branches: Branch[];
}

type Step = 'select' | 'terms' | 'details' | 'location' | 'date' | 'payment' | 'success';
const STEPS = 6; // 'success' isn't a numbered step — it's the result once all 6 are done
const STEP_INDEX: Record<Exclude<Step, 'success'>, number> = {
  select: 0,
  terms: 1,
  details: 2,
  location: 3,
  date: 4,
  payment: 5,
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PublicCatalogView({ token }: { token: string }) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>('select');

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [extraPhone, setExtraPhone] = useState('');
  const [patientName, setPatientName] = useState('');

  const [branchId, setBranchId] = useState('');
  const [roomInfo, setRoomInfo] = useState('');

  const [loanDate, setLoanDate] = useState(todayISO());
  const [duration, setDuration] = useState<DurationEstimate | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const orgRes = await fetch(`/api/organizations/by-token/${encodeURIComponent(token)}`);
      if (!orgRes.ok) {
        if (!cancelled) setError('ארגון לא נמצא');
        return;
      }
      const { organization } = (await orgRes.json()) as { organization: Organization };

      const [productsRes, modelsRes, branchesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/models'),
        fetch('/api/branches'),
      ]);
      const { items: allProducts } = (await productsRes.json()) as { items: Product[] };
      const { items: allModels } = (await modelsRes.json()) as { items: Model[] };
      const { items: allBranches } = (await branchesRes.json()) as { items: Branch[] };
      const modelsById = new Map(allModels.map((m) => [m.id, m]));

      const products = allProducts
        .filter((p) => p.organizationId === organization.id && p.loanStatus === 'not_loaned')
        .map((p) => ({ ...p, model: modelsById.get(p.modelId) }));
      const branches = allBranches.filter((b) => b.organizationId === organization.id);

      if (!cancelled) setData({ organization, products, branches });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitRequest(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const [firstName, ...rest] = fullName.trim().split(/\s+/);
      const lastName = rest.join(' ') || firstName;
      const branchName = data?.branches.find((b) => b.id === branchId)?.name;
      const noteParts = [
        branchName && `מיקום: ${branchName}`,
        roomInfo && `מחלקה/חדר: ${roomInfo}`,
        duration && `משך משוער: ${DURATION_LABELS[duration]}`,
      ].filter(Boolean);

      const res = await fetch('/api/public/loan-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          productIds: Array.from(selected),
          firstName,
          lastName,
          phone,
          hospitalizedPatientName: patientName || undefined,
          loanDate,
          notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
        }),
      });
      const responseData = (await res.json()) as { loans?: Loan[]; error?: string };
      if (!res.ok) {
        setSubmitError(responseData.error || 'שגיאה בשליחת הבקשה');
        return;
      }
      setConfirmedCount(responseData.loans?.length ?? 0);
      setStep('success');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  const { organization, products, branches } = data;
  const selectedProducts = products.filter((p) => selected.has(p.id));
  const ACTIVE_STEP = step === 'success' ? STEPS - 1 : STEP_INDEX[step];

  function ContinueBar({
    onNext,
    onBack,
    nextDisabled,
    nextLabel = 'המשך לשלב הבא',
    type = 'button',
  }: {
    onNext?: () => void;
    onBack: () => void;
    nextDisabled?: boolean;
    nextLabel?: string;
    type?: 'button' | 'submit';
  }) {
    return (
      <div className="flex gap-3 mt-8">
        <button
          type={type}
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-colors disabled:cursor-not-allowed"
          style={{ backgroundColor: nextDisabled ? '#d1d5db' : TEAL }}
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          {nextLabel}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-2 rounded-2xl py-4 px-5 font-semibold text-gray-600 border border-gray-200 bg-white"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          חזרה
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto px-6 pt-6 pb-16">
        {/* Header: logo badge + org name/tagline as one right-aligned cluster (not spread
            across the row) — DOM order [logo, text] renders logo rightmost under RTL. */}
        <div className="flex items-center justify-end gap-3 mb-6">
          {organization.logoUrl ? (
            <img src={organization.logoUrl} alt="" className="h-12 w-12 rounded-2xl object-cover shrink-0" />
          ) : (
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: TEAL }}>
              <Package className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
          )}
          <div className="text-right">
            <p className="font-bold text-lg text-gray-900">{organization.name}</p>
            <p className="text-sm font-medium" style={{ color: TEAL }}>
              מערכת השאלת ציוד דיגיטלית
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-10">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: i <= ACTIVE_STEP ? TEAL : '#e5e7eb' }}
            />
          ))}
        </div>

        {step === 'select' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">איזה מוצר תרצה?</h1>
            <p className="text-gray-400 mb-3">ניתן לבחור מספר מוצרים יחד</p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            {products.length === 0 ? (
              <p className="text-gray-500">אין כרגע מוצרים זמינים.</p>
            ) : (
              <div className="space-y-4">
                {products.map((p) => {
                  const isSelected = selected.has(p.id);
                  const name = p.model?.name ?? p.name;
                  const Icon = pickIcon(name);
                  const isPremium = /פרימיום/.test(name);
                  return (
                    // A plain div with onClick, not a <label>+hidden-checkbox — the sr-only
                    // input relied on native label-click forwarding to toggle, which didn't
                    // fire reliably (reported as "buttons don't work"). role="checkbox" +
                    // aria-checked + keyboard handling keep it accessible without depending
                    // on that forwarding behavior.
                    <div
                      key={p.id}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => toggle(p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle(p.id);
                        }
                      }}
                      className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-5 cursor-pointer border-2 transition-colors"
                      style={{ borderColor: isSelected ? TEAL : '#f3f4f6' }}
                    >
                      {/* DOM order [image, text, selector] renders image on the right and the
                          selector on the left under RTL, matching the reference layout. */}
                      {p.model?.imageUrl ? (
                        <img src={p.model.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="relative w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Icon className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
                          {isPremium && (
                            <span className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                              <Star className="w-3 h-3 text-white" fill="white" strokeWidth={0} />
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex-1 text-right">
                        <p className="font-bold text-gray-900">{name}</p>
                        {p.model?.price !== undefined && (
                          <p className="text-sm font-semibold mt-1" style={{ color: TEAL }}>
                            סכום פיקדון: {p.model.price}₪
                          </p>
                        )}
                      </div>

                      <span
                        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-colors"
                        style={{ backgroundColor: isSelected ? TEAL : '#e5e7eb' }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {products.length > 0 && (
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => setStep('terms')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 mt-8 font-semibold text-white transition-colors disabled:cursor-not-allowed"
                style={{ backgroundColor: selected.size > 0 ? TEAL : '#d1d5db' }}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                המשך לשלב הבא
              </button>
            )}
          </>
        )}

        {step === 'terms' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">מידע על השאלת הציוד</h1>
            <p className="text-gray-400 mb-3">חשוב לקרוא ולאשר לפני שנמשיך</p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4" style={{ color: TEAL }}>
                <ShieldCheck className="w-5 h-5" strokeWidth={2} />
                <p className="font-semibold">הציוד שאתם מקבלים ניתן לכם באהבה רבה על ידי {organization.name}</p>
              </div>
              <ul className="text-gray-600 text-sm space-y-2 list-disc pr-5">
                <li>הציוד מיועד לשימוש במקום שלשמו נשאל בלבד.</li>
                <li>יש לשמור על ניקיון הציוד ושלמותו.</li>
                <li>בתום השימוש, יש להחזיר את הציוד לנקודת האיסוף שהוצאה מראש.</li>
                <li>הפיקדון יוחזר במלואו לאחר החזרת הציוד במצב תקין.</li>
              </ul>

              <label className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-5 h-5 accent-teal-600"
                />
                <span className="text-sm font-medium text-gray-800">קראתי ואני מאשר/ת את תנאי השימוש וההשאלה</span>
              </label>
            </div>

            <ContinueBar onNext={() => setStep('details')} onBack={() => setStep('select')} nextDisabled={!termsAccepted} />
          </>
        )}

        {step === 'details' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">פרטים אישיים</h1>
            <p className="text-gray-400 mb-3">נא למלא את פרטי הקשר של השואל</p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא</label>
                <input
                  type="text"
                  required
                  placeholder="ישראל ישראלי"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון נייד</label>
                <input
                  type="tel"
                  required
                  placeholder="05X-XXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון נוסף (לא חובה)</label>
                <input
                  type="tel"
                  placeholder="05X-XXXXXXX"
                  value={extraPhone}
                  onChange={(e) => setExtraPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם המאושפז (אופציונלי, אם שונה מהשואל)</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <p className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
                פרטיכם נשמרים במערכת לטובת ניהול ההשאלה בלבד. אין צורך בתעודת זהות או כתובת מייל.
              </p>
            </div>

            <ContinueBar
              onNext={() => setStep('location')}
              onBack={() => setStep('terms')}
              nextDisabled={!fullName || !phone}
            />
          </>
        )}

        {step === 'location' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">מה מיקום הציוד?</h1>
            <p className="text-gray-400 mb-3">נא לספק מיקום מדויק</p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">בחר סניף / אזור</label>
                {branches.length === 0 ? (
                  <p className="text-sm text-gray-400">אין סניפים מוגדרים לארגון זה.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBranchId(b.id)}
                        className="rounded-xl py-3 px-3 text-sm font-medium border-2 transition-colors"
                        style={{
                          borderColor: branchId === b.id ? TEAL : '#e5e7eb',
                          color: branchId === b.id ? TEAL : '#374151',
                          backgroundColor: branchId === b.id ? '#f0fdfa' : 'white',
                        }}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם המחלקה ומספר החדר</label>
                <input
                  type="text"
                  placeholder="נא לציין את שם המחלקה ומספר החדר (לדוגמה: פנימית ב', חדר 12)"
                  value={roomInfo}
                  onChange={(e) => setRoomInfo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <ContinueBar onNext={() => setStep('date')} onBack={() => setStep('details')} />
          </>
        )}

        {step === 'date' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">למתי אתה צריך את הציוד?</h1>
            <p className="text-gray-400 mb-3">תאריך השאלה מבוקש (ברירת מחדל להיום)</p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תאריך השאלה</label>
                <input
                  type="date"
                  value={loanDate}
                  onChange={(e) => setLoanDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  לכמה זמן להערכתך תצטרך את הציוד? (לא חובה)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(DURATION_LABELS) as DurationEstimate[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(duration === d ? null : d)}
                      className="rounded-xl py-3 px-2 text-sm font-medium border-2 transition-colors"
                      style={{
                        borderColor: duration === d ? TEAL : '#e5e7eb',
                        color: duration === d ? TEAL : '#374151',
                        backgroundColor: duration === d ? '#f0fdfa' : 'white',
                      }}
                    >
                      {DURATION_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ContinueBar onNext={() => setStep('payment')} onBack={() => setStep('location')} nextDisabled={!loanDate} />
          </>
        )}

        {step === 'payment' && (
          <form onSubmit={submitRequest}>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">פרטי פיקדון</h1>
            <p className="text-gray-400 mb-3">
              סה"כ פיקדון לשמירה: {selectedProducts.reduce((sum, p) => sum + (p.model?.price ?? 0), 0)}₪
            </p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מספר כרטיס אשראי</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">תוקף</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    type="text"
                    placeholder="123"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-gray-400 pt-2 border-t border-gray-100">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2} />
                שלב זה עדיין בהדגמה בלבד — פרטי האשראי אינם נשמרים או מועברים בשלב זה
              </p>
            </div>

            {submitError && <p className="text-red-600 text-sm mt-3">{submitError}</p>}

            <ContinueBar
              type="submit"
              onNext={undefined}
              onBack={() => setStep('date')}
              nextDisabled={submitting}
              nextLabel={submitting ? 'שולח...' : 'שלח בקשה להשאלה'}
            />
          </form>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: '#f0fdfa' }}>
              <CheckCircle2 className="w-11 h-11" style={{ color: TEAL }} strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">בקשת ההשאלה נשלחה!</h1>
            <p className="text-gray-500 mb-6">
              תודה רבה {fullName || ''}. בקשתך התקבלה בהצלחה במערכת {organization.name}.
              {confirmedCount < selectedProducts.length &&
                ` (${confirmedCount} מתוך ${selectedProducts.length} מוצרים נרשמו — חלק כבר לא היו זמינים.)`}
            </p>
            <div className="bg-gray-50 rounded-xl p-5">
              <p className="text-sm text-gray-700 mb-2">ברגעים הקרובים יצור עמכם קשר נציג הארגון לתיאום ההשאלה.</p>
              {phone && (
                <>
                  <p className="text-xs text-gray-400">נציג יתקשר למספר:</p>
                  <p className="font-bold text-lg" style={{ color: TEAL }}>
                    {phone}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 tracking-widest mt-12">
          {organization.name} &bull; מערכת ניהול ציוד דיגיטלית &bull; V1.0
        </p>
      </div>
    </div>
  );
}
