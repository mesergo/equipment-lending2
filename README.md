<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/65b19fac-416e-4500-9084-710622e95632

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. One-time only — create the starter manager/admin accounts:
   `npm run seed:users`
   (creates `server/data/users.json`; see "Manager login" below for the accounts it prints)
4. Run the app (this starts both the Vite frontend and the local auth server together):
   `npm run dev`

If you'd rather run them separately: `npm run dev:client` (Vite only) and `npm run dev:server`
(the auth API only, on port 4001 by default).

## Routing & organization access

Every association ("עמותה") gets its own page, addressed purely by URL hash:

- `#org/<CODE>` — the association's public catalog + equipment (e.g. `#org/HESED`). Open to anyone,
  no login — this is what patients/family members and the association's own public link use.
- `#org/<CODE>/patient_portal` — the association's lending-request form (בקשת השאלה). Also public.
- `#org/<CODE>/cart` — checkout for that association's catalog. Also public.
- `#org/<CODE>/admin` — that association's own manager dashboard. Requires logging in as a manager
  of that specific association (see "Manager login" below). It is scoped strictly to the
  association's own warehouses, equipment, orders, requests and volunteers — it can never see or
  edit another association's data, and it can't create new associations.
- `#ADMIN` (no org code) — the global super-admin view. Requires logging in as the super-admin
  account. Still sees and manages every association, exactly as before.

`<CODE>` is the `code` field on each `Organization` record in `src/data/mockData.ts` (e.g. `HESED`,
`EZER`, `YAD`, `LEV`). An unrecognized code shows a friendly "not found" screen instead of falling
back to showing all data.

## Manager login

The `/admin` pages are now gated by a real login — a small local server (`server/index.ts`) checks
the username/password against hashed passwords and issues a signed session token; the browser can no
longer get into an admin page just by knowing the URL.

Run `npm run seed:users` once to create the starter accounts (it prints the exact usernames and
passwords it created). By default that's one manager per organization plus one super-admin:

| Username         | Role                       |
|------------------|----------------------------|
| `admin`          | super-admin (sees everything) |
| `hesed_manager`  | manager of עמותת חסד ומרפא (`org-hesed`) |
| `ezer_manager`   | manager of עזר מציון (`org-ezer`) |
| `yad_manager`    | manager of יד שרה (`org-yad`) |
| `lev_manager`    | manager of רחשי לב (`org-lev`) |

These are **test passwords only** (see `server/seed-users.ts`) — change them, or edit
`server/data/users.json` with a freshly-hashed password, before giving this to anyone real. That
file is gitignored on purpose; it's local to whoever runs the server.

**What this does and doesn't cover today:** the login itself is real and server-verified (hashed
passwords with `bcryptjs`, signed sessions with `jsonwebtoken`, checked in `server/auth.ts`). Orders
now live on the server too (see "Return dates & WhatsApp reminders" below) and every order route
re-checks the logged-in user's role/organization server-side. Equipment, warehouses, organizations,
requests and volunteers, though, still live only in the browser's in-memory mock state
(`src/data/mockData.ts`) — so a determined admin user with devtools open could still poke at *that*
state directly. When you move onto your MongoDB server, the important next step is to bring those
the rest of the way over too: move each remaining CRUD action (add/edit equipment, add a warehouse,
etc.) into server routes protected by `requireAuth` from `server/auth.ts`, the same way
`server/ordersRoutes.ts` already does for orders.

`JWT_SECRET` (in `.env`) signs the session tokens — keep it private and out of git (it already is,
via `.gitignore`). Changing it logs everyone out at once.

## Return dates & WhatsApp reminders

Orders now live on the server (`server/data/orders.json`, gitignored — same JSON-file-now,
MongoDB-later pattern as the users store) instead of only in the browser's memory. That was a
prerequisite for this feature: a page refresh used to silently delete every loan record, and a
reminder job can't run inside a browser tab that might be closed.

- **Customer-chosen return date:** step 2 of checkout (`CartCheckoutView`) now has a date picker
  instead of a silent "+14 days". It's bounded between tomorrow and the shortest `maxLoanDays`
  among the items in the cart.
- **WhatsApp reminders:** `server/reminders.ts` runs on an interval (`REMINDER_CHECK_INTERVAL_MINUTES`
  in `.env`, default 60) and sends (at most once per order per day) a reminder starting the day
  before the return date and continuing every day — including every day it's overdue — until the
  order leaves `active_in_ward`. **No WhatsApp account is wired up yet** — with the default
  `WHATSAPP_PROVIDER=console`, nothing is actually sent; instead it's logged to the server console
  and appended to `server/data/whatsapp-log.jsonl` so you can see exactly what would have gone out.
  When you're ready to actually send messages, pick a provider (a Meta WhatsApp Business Cloud API
  number, or Twilio's WhatsApp API are the two common paths) and implement the matching stub in
  `server/whatsapp.ts` — the reminder logic itself won't need to change.
  You can trigger a sweep on demand (handy for testing) with:
  `curl -X POST http://localhost:4001/api/reminders/run-now -H "Authorization: Bearer <super-admin token>"`
- **Customer self-reports a return:** the reminder message includes a link,
  `#org/<CODE>/return/<ORDERID>`, to a public page (`src/components/ReportReturnView.tsx`) where the
  customer confirms their phone number and reports "I already returned this equipment" — no login
  needed. That immediately stops further reminders for that order and moves it to `return_reported`.
- **Admin notification & confirmation:** every logged-in admin/org-manager view polls
  `GET /api/orders` every 20 seconds while the admin screen is open, so a return report shows up —
  even from a customer's own phone, on a completely different device — without anyone refreshing.
  A `return_reported` order is highlighted in the Orders tab and adds to a pulsing badge in the
  admin header ("🔔 N דיווחי החזרה ממתינים לבדיקה"). Staff only close the loop after *physically
  inspecting* the equipment, choosing either "הציוד תקין" (releases it straight back to available
  stock) or "נדרש חיטוי" (sends it through the sanitization station first) — the customer's report
  alone is never enough to mark it returned.

## Products, Models, Branches, Warehouses & Customers (server-persisted catalog)

The equipment catalog is now a real 3-level hierarchy instead of one flat list with a fixed
5-value category:

- **מוצר (Product)** — a product type, e.g. "כיסא גלגלים". Managed in the admin "מוצרים ודגמים" tab.
- **דגם (Model)** — a specific model under a Product. This is where the image, description,
  **פיקדון (deposit)** and an internal-only cost field live — never on the SKU itself.
- **מק"ט (SKU / `EquipmentItem`)** — one trackable stock line of a Model in a specific warehouse.
  Creating one just means picking an existing Model, a warehouse, a SKU code and a starting stock
  count; the deposit, image and max loan days are inherited from the Model automatically.

A new **סניפים (Branches)** tab sits above warehouses: a Branch is the physical site/hospital
(e.g. "המרכז הרפואי שיבא תל השומר"), while a Warehouse is a storage location that serves one —
picking a Branch when creating a warehouse fills in its hospital name/city automatically, and the
access code field is optional. Creating a warehouse no longer asks an org-manager which
organization it belongs to — that's implied by who's logged in.

A new **לקוחות (Customers)** tab identifies people by mobile phone only — no ID number field and
no email field (removed per the client's request); a free-text notes field replaces a full address.

All five of these (products, models, branches, warehouses, the equipment/SKU list, and customers)
now live on the server (`server/data/*.json`, gitignored — same JSON-file-now/MongoDB-later pattern
as orders and users, via the shared `server/genericStore.ts` factory and `server/catalogRoutes.ts`)
instead of only in the browser's memory, so admin changes survive a refresh. Product/model/branch/
warehouse/equipment lists are public (`GET /api/products`, `/api/models`, `/api/branches`,
`/api/warehouses`, `/api/equipment`) since the customer-facing catalog needs them without logging
in; customers (`/api/customers`) require login and are scoped to the caller's own organization,
same as orders.

## AI natural-language catalog search

The public catalog's search box (`src/components/CatalogStoreView.tsx`) now also understands a
described need, not just an exact product name — e.g. a customer can type "משהו שעוזר לקום מהמיטה"
and get relevant items even though none of them literally contain those words.

This is purely additive on top of the existing instant plain-text search, never a replacement for
it: typing still filters by name/SKU/description/location the moment you type, with zero delay or
network call. Only when the query is 3+ characters does a debounced (500ms) call go out to
`POST /api/catalog/ai-search` (`server/aiSearchRoutes.ts`), which asks Gemini which item ids are
relevant to the described need and merges those ids into the results, with a small "נמצאו N התאמות
חכמות נוספות" note so it's clear which results came from the AI step.

**Setup:** get a free key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY` in `.env`.
**Fully optional** — if the key is left as the placeholder (or missing entirely), or the Gemini
call fails for any reason (quota, network, bad key), the endpoint just returns no extra matches and
the catalog page keeps working exactly as it did before this feature existed; nothing breaks and no
error is shown to the customer.

**Not done yet, deliberately deferred to a later stage per the client's own request to do "ניהול"
(admin/management) first:** the public landing page copy/branding, the customer-facing loan form's
6-step redesign (product→terms→returning-customer lookup→hospital location→needed-by date→deposit),
the return-form's donation flow, and a real payment-gateway integration on the deposit step (a
provider was mentioned as available — wiring it in is a good next step). The existing catalog/cart/
checkout screens keep working against the new data model in the meantime (deposit/image/max-loan-days
are still read directly off each item, just populated from its Model at creation time), but a
brand-new SKU added through the new "מוצרים ודגמים" flow won't show one of the old 5 category chips
in the public catalog filter — that filter is exactly the piece the loan-form redesign phase replaces.

## Deploying to a shared host (cPanel / FTP-only hosting, no SSH)

This app is one Express server (`server/`) plus a Vite-built static frontend (`src/`). Locally,
`npm run dev` runs them as two separate processes (Vite's dev server + the API server) wired
together by `vite.config.ts`'s proxy. A typical shared host running this via **cPanel's "Setup
Node.js App"** (Phusion Passenger) only runs **one Node process per domain**, so for deployment
this same Express process also serves the built frontend - see the static-file block near the
bottom of `server/index.ts`. None of this changes local dev; it only activates when it finds a
`dist/` folder next to the running server.

**Step 1 - build, on your own machine (needs the internet access your dev machine already has):**

```
npm run build:deploy
```

This runs `vite build` (frontend → `dist/`), compiles the server's TypeScript to plain JavaScript
with `tsc` (no `tsx`/TypeScript needed on the host at runtime), and finishes by copying `dist/`
into `server-build/` and writing a slim `server-build/package.json` that lists only the six
packages the server actually needs at runtime (`express`, `cors`, `bcryptjs`, `jsonwebtoken`,
`dotenv`, `@google/genai`) - never `vite`/`react`/`tailwindcss`/etc, so a constrained shared-host
"Run NPM Install" stays fast and has nothing to do with the frontend build tooling.

When it's done, **`server-build/` is a single, self-contained folder ready to upload** - it
contains everything the host needs and nothing it doesn't:

```
server-build/
  package.json     <- slim production manifest
  server/*.js       <- compiled server
  src/data/mockData.js
  src/types/index.js
  dist/             <- the built frontend (copied in automatically)
```

**Step 2 - upload it.** With your FTP/SFTP client (FileZilla, WinSCP, or your panel's File
Manager), upload the **contents** of `server-build/` (not the folder itself) into whatever
directory you'll set as the Node app's "Application root" in the next step. This does not have to
be your domain's `htdocs`/`public_html` folder — cPanel's Node.js App feature routes the domain to
your app itself (via Passenger), regardless of which folder the app's code lives in; ask your host
if you're unsure which folder to use.

**Step 3 - create the Node.js App in your panel** (cPanel calls this "Setup Node.js App"; other
panels may name it differently, but the fields are the same):

| Field | Value |
|---|---|
| Node.js version | the newest available (20 or later) |
| Application mode | Production |
| Application root | the folder you uploaded `server-build/`'s contents into |
| Application URL | `rental.message.co.il` (or whichever domain/subdomain) |
| Application startup file | `server/index.js` |

Then add these **environment variables** in the same screen (this is where real secrets live on
the host — never upload your local `.env` file itself):

- `JWT_SECRET` — a long random string, **different from your local dev one** (e.g. generate one
  with `openssl rand -hex 32`, or any long random text)
- `WHATSAPP_PROVIDER` — `console` to start (logs reminders instead of sending them; see the
  WhatsApp section above for going live with a real provider later)
- `GEMINI_API_KEY` — optional, only needed for the AI catalog search (see that section above)
- `REMINDER_CHECK_INTERVAL_MINUTES` — optional, defaults to 60

Click **Create**, then click **Run NPM Install** (installs the six packages from the slim
`package.json`), then **Restart**.

**Step 4 - create the starter accounts, without SSH.** `npm run seed:users` needs a terminal,
which plain FTP/panel hosting doesn't give you. Instead, once the app is running, visit this URL
once (from a browser, or `curl -X POST`) after temporarily setting `SETUP_SECRET` (any random
string) as another environment variable in the panel and restarting the app:

```
https://rental.message.co.il/api/setup/seed-users?secret=<the SETUP_SECRET value you set>
```

That creates the same starter accounts `npm run seed:users` would (one super-admin, one manager
per organization — see "Manager login" above for the list) and returns their test passwords once.
**Change those passwords, and remove the `SETUP_SECRET` environment variable again**, right after -
the route always refuses once `server/data/users.json` already exists, so it can't be used twice,
but there's no reason to leave the door unlocked longer than needed.

Whenever you change the app's code afterward: rebuild (`npm run build:deploy`), then on the host
**only overwrite the individual files inside `server/` and `dist/`** and click **Restart** in the
panel. **Never delete-and-replace the whole `server/` folder, or the `server/data/` folder inside
it, on the host** - `server/data/*.json` (orders, users, the catalog, everything admins created
after go-live) lives in that same folder and would be wiped along with it. When in doubt, download
a copy of the host's `server/data/` folder as a backup before a redeploy.
