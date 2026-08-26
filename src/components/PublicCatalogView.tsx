import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import type { Organization, Product, Model } from '../types';

// Public, no-login page addressed by the organization's token (#catalog/:token). Visual
// design matches the AI Studio "שבת אחים" reference captured in PRD.md US-114 as closely as
// an independent implementation reasonably can: teal logo badge, segmented step indicator,
// bold heading with teal accent underline, white rounded cards with a circular selector and
// an icon tile. No code or image assets were copied from that reference — icons here are
// lucide-react (already a project dependency), not the reference's custom illustrations.

const TEAL = '#0d9488'; // tailwind teal-600, matches the reference's accent color closely

interface CatalogData {
  organization: Organization;
  products: Array<Product & { model?: Model }>;
}

export default function PublicCatalogView({ token }: { token: string }) {
  const [data, setData] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
  const STEPS = 6;
  // DOM-first child renders on the right under RTL, matching the reference's active segment
  // sitting at the right (start-of-reading) side of the bar.
  const ACTIVE_STEP = 0;

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
              className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: i === ACTIVE_STEP ? TEAL : '#e5e7eb' }}
            />
          ))}
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">איזה מוצר תרצה?</h1>
        <p className="text-gray-400 mb-3">ניתן לבחור מספר מוצרים יחד</p>
        <div className="h-1 w-10 rounded-full mb-8" style={{ backgroundColor: TEAL }} />

        {products.length === 0 ? (
          <p className="text-gray-500">אין כרגע מוצרים זמינים.</p>
        ) : (
          <div className="space-y-4">
            {products.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-4 bg-white rounded-2xl shadow-sm p-5 cursor-pointer border border-gray-100"
                >
                  {/* DOM order [image, text, selector] renders image on the right and the
                      selector on the left under RTL, matching the reference layout. */}
                  {p.model?.imageUrl ? (
                    <img src={p.model.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <Package className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
                    </div>
                  )}

                  <div className="flex-1 text-right">
                    <p className="font-bold text-gray-900">{p.model?.name ?? p.name}</p>
                    {p.model?.price !== undefined && (
                      <p className="text-sm font-semibold mt-1" style={{ color: TEAL }}>
                        סכום פיקדון: {p.model.price}₪
                      </p>
                    )}
                  </div>

                  <span
                    className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
                    style={{ borderColor: isSelected ? TEAL : '#d1d5db', backgroundColor: isSelected ? TEAL : 'transparent' }}
                  >
                    {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                  </span>
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(p.id)} className="sr-only" />
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
