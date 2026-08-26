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
import type { Organization, Product, Model, Loan } from '../types';

// Public, no-login page addressed by the organization's token (#catalog/:token). Visual
// design matches the AI Studio "שבת אחים" reference captured in PRD.md US-114 as closely as
// an independent implementation reasonably can. No code or image assets were copied from
// that reference — icons here are lucide-react (already a project dependency), chosen per
// product name to approximate the reference's illustrations rather than one generic icon for
// everything; terms/policy copy below is written independently, not copied from the reference.
//
// Full flow, matching the reference's step count (its progress bar had 6 segments, several of
// which turned out to be: product selection → contact details → terms confirmation → payment
// → send). Only the first two steps existed before this pass — added terms and payment after
// user feedback that the page was missing steps. The payment step is visual only: card fields
// are never sent to the server (no real clearing-company integration yet, see PRD.md Non-
// Goals) — it exists so the flow isn't missing a step, not to actually process a card.

const TEAL = '#0d9488'; // tailwind teal-600, matches the reference's accent color closely

function pickIcon(name: string) {
  if (/מיטה|מיטת/.test(name)) return BedDouble;
  if (/מזרון|מזרן/.test(name)) return Moon;
  if (/גלגלים/.test(name)) return Accessibility;
  if (/כיסא/.test(name)) return Armchair;
  return Package;
}

interface CatalogData {
  organization: Organization;
  products: Array<Product & { model?: Model }>;
}

type Step = 'select' | 'details' | 'terms' | 'payment' | 'success';
const STEPS = 6;
const STEP_INDEX: Record<Step, number> = { select: 0, details: 1, terms: 2, payment: 3, success: 4 };

export default function PublicCatalogView({ token }: { token: string }) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>('select');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [patientName, setPatientName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
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

      const [productsRes, modelsRes] = await Promise.all([fetch('/api/products'), fetch('/api/models')]);
      const { items: allProducts } = (await productsRes.json()) as { items: Product[] };
      const { items: allModels } = (await modelsRes.json()) as { items: Model[] };
      const modelsById = new Map(allModels.map((m) => [m.id, m]));

      const products = allProducts
        .filter((p) => p.organizationId === organization.id && p.loanStatus === 'not_loaned')
        .map((p) => ({ ...p, model: modelsById.get(p.modelId) }));

      if (!cancelled) setData({ organization, products });
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

  const { organization, products } = data;
  const selectedProducts = products.filter((p) => selected.has(p.id));
  const totalDeposit = selectedProducts.reduce((sum, p) => sum + (p.model?.price ?? 0), 0);
  // DOM-first child renders on the right under RTL, matching the reference's active segment
  // sitting at the right (start-of-reading) side of the bar — active segment advances left as
  // the customer moves through steps.
  const ACTIVE_STEP = STEP_INDEX[step];

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
                    // fire reliably (reported as "buttons don't work"; reproduced directly:
                    // a real click on the visible circle left the underlying checkbox
                    // unchecked). role="checkbox" + aria-checked + keyboard handling keep it
                    // accessible without depending on that forwarding behavior.
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
                onClick={() => setStep('details')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 mt-8 font-semibold text-white transition-colors disabled:cursor-not-allowed"
                style={{ backgroundColor: selected.size > 0 ? TEAL : '#d1d5db' }}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                המשך לשלב הבא
              </button>
            )}
          </>
        )}

        {step === 'details' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">פרטים ליצירת קשר</h1>
            <p className="text-gray-400 mb-3">נדרש כדי להשלים את בקשת ההשאלה</p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
              <p className="text-sm font-medium text-gray-500 mb-2">מוצרים שנבחרו</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {selectedProducts.map((p) => (
                  <li key={p.id}>{p.model?.name ?? p.name}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם פרטי</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם משפחה</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">טלפון נייד</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מאושפז (אופציונלי)</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                disabled={!firstName || !lastName || !phone}
                onClick={() => setStep('terms')}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-colors disabled:cursor-not-allowed"
                style={{ backgroundColor: firstName && lastName && phone ? TEAL : '#d1d5db' }}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                המשך לשלב הבא
              </button>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 px-5 font-semibold text-gray-600 border border-gray-200 bg-white"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                חזרה
              </button>
            </div>
          </>
        )}

        {step === 'terms' && (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">תנאי השימוש וההשאלה</h1>
            <p className="text-gray-400 mb-3">נא לקרוא ולאשר לפני המשך</p>
            <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4" style={{ color: TEAL }}>
                <ShieldCheck className="w-5 h-5" strokeWidth={2} />
                <p className="font-semibold">הציוד שברשותכם ניתן לכם בהשאלה על ידי {organization.name}</p>
              </div>
              <ul className="text-gray-600 text-sm space-y-2 list-disc pr-5">
                <li>הציוד מיועד לשימוש האדם עבורו הוזמן בלבד.</li>
                <li>יש לשמור על ניקיון הציוד ותקינותו במהלך תקופת ההשאלה.</li>
                <li>בתום השימוש, יש להחזיר את הציוד למחסן או לתאם איסוף.</li>
                <li>סכום הפיקדון יוחזר במלואו לאחר החזרת הציוד במצב תקין.</li>
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

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                disabled={!termsAccepted}
                onClick={() => setStep('payment')}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-colors disabled:cursor-not-allowed"
                style={{ backgroundColor: termsAccepted ? TEAL : '#d1d5db' }}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                המשך לשלב הבא
              </button>
              <button
                type="button"
                onClick={() => setStep('details')}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 px-5 font-semibold text-gray-600 border border-gray-200 bg-white"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                חזרה
              </button>
            </div>
          </>
        )}

        {step === 'payment' && (
          <form onSubmit={submitRequest}>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">פרטי פיקדון</h1>
            <p className="text-gray-400 mb-3">סה"כ פיקדון לשמירה: {totalDeposit}₪</p>
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

            <div className="flex gap-3 mt-8">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl py-4 font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: TEAL }}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                {submitting ? 'שולח...' : 'שלח בקשה להשאלה'}
              </button>
              <button
                type="button"
                onClick={() => setStep('terms')}
                className="flex items-center justify-center gap-2 rounded-2xl py-4 px-5 font-semibold text-gray-600 border border-gray-200 bg-white"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                חזרה
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: TEAL }} strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">הבקשה נשלחה בהצלחה</h1>
            <p className="text-gray-500">
              {confirmedCount === selectedProducts.length
                ? `נרשמה השאלה עבור ${confirmedCount} מוצרים.`
                : `נרשמה השאלה עבור ${confirmedCount} מתוך ${selectedProducts.length} מוצרים שנבחרו — חלק כבר לא היו זמינים.`}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 tracking-widest mt-12">
          {organization.name} &bull; מערכת ניהול ציוד דיגיטלית &bull; V1.0
        </p>
      </div>
    </div>
  );
}
