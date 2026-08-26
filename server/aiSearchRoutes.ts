import { Router } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

// AI-powered natural-language catalog search (e.g. "משהו שעוזר לקום מהמיטה" instead of
// having to know the exact product name or pick a category). This is deliberately additive
// only: CatalogStoreView.tsx keeps its existing instant plain-text search running client-side
// no matter what, and only MERGES IN whatever this endpoint returns. So if GEMINI_API_KEY isn't
// set up yet, or the Gemini call fails for any reason (quota, network, bad key), the catalog page
// keeps working exactly as it did before this feature existed - it just won't get the extra
// semantic matches for that one search.

const MAX_ITEMS = 400; // the live catalog is nowhere near this size; just a sanity guard on payload size
const MODEL = 'gemini-2.5-flash';

function isConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  // ".env.example" ships a literal placeholder value - treat that the same as "not set".
  return Boolean(key && key.trim().length > 0 && key !== 'MY_GEMINI_API_KEY' && key !== 'REPLACE_WITH_A_LONG_RANDOM_STRING');
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

interface SearchableItem {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export const aiSearchRouter = Router();

// Public, like the rest of the catalog read endpoints - the customer browsing the catalog isn't
// logged in.
aiSearchRouter.post('/catalog/ai-search', async (req, res) => {
  const query = String(req.body?.query || '').trim();
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const items: SearchableItem[] = rawItems.slice(0, MAX_ITEMS).filter((it: any) => it && typeof it.id === 'string' && typeof it.name === 'string');

  if (!query || items.length === 0) {
    res.json({ matchedIds: [], aiAvailable: isConfigured() });
    return;
  }

  if (!isConfigured()) {
    res.json({ matchedIds: [], aiAvailable: false });
    return;
  }

  try {
    const catalogText = items
      .map((it) => {
        const parts = [`id: ${it.id}`, `שם: ${it.name}`];
        if (it.category) parts.push(`קטגוריה: ${it.category}`);
        if (it.description) parts.push(`תיאור: ${it.description}`);
        return `- ${parts.join(' | ')}`;
      })
      .join('\n');

    const prompt = `אתה עוזר חיפוש בקטלוג ציוד רפואי ועזרי שהייה להשאלה חינם דרך עמותת חסד.
להלן רשימת פריטים זמינים (מזהה, שם, קטגוריה, תיאור), ואחריה חיפוש חופשי שכתב לקוח בעברית - הלקוח
לרוב מתאר צורך או מטרה ("משהו שעוזר לקום מהמיטה", "לישון בבית חולים ליד הילד") ולא בהכרח את שם
המוצר המדויק.

החזר אך ורק את מזהי הפריטים (id) שרלוונטיים לצורך שתואר, מסודרים מהכי רלוונטי לפחות רלוונטי.
אם אף פריט לא רלוונטי, החזר מערך ריק. אל תמציא מזהה שלא ברשימה.

רשימת הפריטים:
${catalogText}

חיפוש הלקוח: "${query}"`;

    const response = await getClient().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchedIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['matchedIds'],
        },
      },
    });

    const text = response.text ?? '{}';
    const parsed = JSON.parse(text);
    const validIds = new Set(items.map((it) => it.id));
    const matchedIds = Array.isArray(parsed.matchedIds)
      ? parsed.matchedIds.filter((id: unknown): id is string => typeof id === 'string' && validIds.has(id))
      : [];

    res.json({ matchedIds, aiAvailable: true });
  } catch (err) {
    console.error('[ai-search] Gemini call failed, falling back to plain-text search only:', (err as Error).message);
    res.json({ matchedIds: [], aiAvailable: false });
  }
});
