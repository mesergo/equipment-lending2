import { useEffect, useState } from 'react';
import type { Organization, Product, Model } from '../types';

// Public, no-login page addressed by the organization's token (#catalog/:token) — matches
// the wizard/card design reference (AI Studio "שבת אחים" mockup) captured in PRD.md US-114:
// branded header, step indicator, product cards with image/description/price. Visual
// reference only — no code was copied from that mockup, this is an independent
// implementation against our own data model.

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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">טוען...</p>
      </div>
    );
  }

  const { organization, products } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {organization.logoUrl && <img src={organization.logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />}
          <div>
            <p className="font-bold">{organization.name}</p>
            <p className="text-xs text-gray-500">מערכת השאלת ציוד דיגיטלית</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((step) => (
            <span key={step} className={`h-1.5 w-8 rounded-full ${step === 5 ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">איזה מוצר תרצה?</h1>
        <p className="text-gray-500 mb-6">ניתן לבחור מספר מוצרים יחד</p>

        {products.length === 0 ? (
          <p className="text-gray-500">אין כרגע מוצרים זמינים.</p>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-4 bg-white border rounded-lg p-4 cursor-pointer ${
                  selected.has(p.id) ? 'border-blue-500 ring-1 ring-blue-500' : ''
                }`}
              >
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="w-5 h-5" />
                {p.model?.imageUrl ? (
                  <img src={p.model.imageUrl} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded bg-gray-100 shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{p.model?.name ?? p.name}</p>
                  {p.model?.price !== undefined && (
                    <p className="text-sm text-blue-600 mt-1">סכום פיקדון: {p.model.price}₪</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
