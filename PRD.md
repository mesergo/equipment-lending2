# PRD: בניית equipment-lending מחדש — לפי lendingCRM (ptdev1.message.co.il/admin) בלבד

## 1. מבוא

**החלטה:** הקוד הישן בפרויקט (שהגיע מ-AI Studio, מבוסס על מודל Product→Model→SKU
משלו) **נמחק לגמרי**. הפרויקט נבנה מחדש מאפס, ומודל הנתונים/המסכים היחיד שלפיו
בונים הוא המערכת החיה הקיימת ב-**https://ptdev1.message.co.il/admin** ("lendingCRM").
לא משתמשים בהנחות/שמות/היררכיה מהקוד הישן שנמחק.

התשתית הטכנית (React + Express + MongoDB, Tailwind, auth עם JWT) נשארת כפי
שהוקמה קודם — Atlas מחובר ועובד, `server/db.ts`/`createMongoStore` הם infra
גנרי לא-תלוי-דומיין ונבנים מחדש באותו pattern.

## 2. מודל הנתונים (מבוסס על סריקת ptdev1.message.co.il/admin בפועל)

היררכיית הקטלוג במערכת החיה (שימו לב: **הפוכה** משמות בקוד הישן שנמחק):

```
Organization (ארגון)
  └─ Branch (סניף)
  └─ Warehouse (מחסן)
  └─ Category (קטגוריה)
       └─ Model (דגם)               ← יש מחיר, תמונה
            └─ Product (מוצר) = SKU בודד, ממוספר, עם סטטוס השאלה חי
  └─ Customer (לקוח)
  └─ User (משתמש, 3 תפקידים)
  └─ Loan/השאלה                     ← מקשר Customer + Product + תאריכים + Payment
  └─ Payment (תשלום)
  └─ ActionLog (לוגי פעולות)         ← audit trail על שינויים בהשאלות
```

### שדות לפי ישות (מהסריקה בפועל):

- **Organization**: name, logo, phone, email, address, description, token
  (מזהה ציבורי ב-URL, למשל `/catalog/<token>`)
- **Branch**: organizationId, name, branchManagerName, recording (קובץ אודיו —
  ראו §5 non-goals, לא ברור מה תפקידו)
- **Warehouse**: organizationId, name, location, entryCode, accessInstructions,
  capacity, recording
- **Category**: organizationId, name, recording
- **Model**: organizationId, categoryId, name, imageUrl, price, recording
- **Product** (SKU): organizationId, modelId, warehouseId, name (כולל מספר
  פריט, למשל "מס 309"), price, status (active/inactive), loanStatus
  (not_loaned/loaned/returned), imageUrl
- **Customer**: organizationId, firstName, lastName, idNumber (ת.ז),
  mobilePhone, city, street, buildingNumber
- **Loan**: organizationId, status (loaned/returned/not_returned/pending_review),
  customerId, hospitalizedPatientName (שם מאושפז — טקסט חופשי, נפרד מ-Customer),
  productId, loanDate, returnDate, paymentId, notes (טקסט חופשי + לוג פעולות
  מוצג inline)
- **Payment**: organizationId, customerId, wasCharged (bool), status,
  chargeAmount, chargeReason, issueDate, date, clearingCompanyPaymentId,
  lastCardDigits — **מודל נתונים בלבד, בלי אינטגרציה אמיתית מול חברת סליקה**
  (המשתמש ימסור פרטי חברת הסליקה בהמשך — ראו §5)
- **ActionLog**: organizationId, date, actionType, performedBy, loanId, notes
- **User**: organizationId (ריק ל-super_admin), name, email, passwordHash,
  role (`super_admin` | `org_manager` | `coordinator`), title

### הרשאות (לפי המערכת החיה):
שלושה תפקידים (לא שניים כמו בקוד הישן): **מנהל ראשי** (super_admin, רואה הכל),
**מנהל ארגון** (org_manager, מוגבל לארגון שלו), **סדרן** (coordinator —
תפקיד תפעולי/שיבוץ בתוך ארגון, היקף הרשאות מדויק ייקבע ב-US-102 לפי מה שנצפה
בממשק: כנראה יכול לראות/לעדכן השאלות אך לא CRUD על ישויות קטלוג).

## 3. Non-Goals (מפורש, מחוץ להיקף כרגע)

- אינטגרציה אמיתית מול חברת סליקה — Payment הוא מודל נתונים בלבד; המשתמש
  ימסור את הפרטים בהמשך
- שכפול מדויק של שדה "הקלטה" (אודיו) על Branch/Warehouse/Category/Model —
  לא ברור מהממשק מה תפקידו (IVR? נגישות?); Non-Goal עד לבירור מול המשתמש
- WhatsApp reminders אמיתי (אפשר provider "console" כמו קודם אם/כשנגיע לזה)
- AI-search בקטלוג (היה פיצ'ר בקוד הישן שנמחק — לא חלק מהמערכת החיה, לא
  בונים אותו מחדש אלא אם יתבקש)

## 4. User Stories

### שלב א' — יסודות (types, auth, users)

#### US-101: מודל הטיפוסים המלא (`src/types/index.ts`)
**Description:** להגדיר מחדש את כל הטיפוסים ב-TypeScript לפי §2 לעיל — שום
טיפוס לא מיובא/נשאר מהקוד הישן.

**Acceptance Criteria:**
- [x] קובץ `src/types/index.ts` חדש עם כל 11 הישויות מ-§2, שדות תואמים במדויק
      — 2026-08-26
- [x] Typecheck passes — 2026-08-26

#### US-102: תשתית auth עם 3 תפקידים
**Description:** לבנות מחדש `server/db.ts` (זהה ל-infra הקודם), `server/auth.ts`
(JWT, אבל `role` כולל `coordinator`), `server/store.ts` (users ב-Mongo),
`server/seed-users.ts` (חשבונות התחלתיים: super_admin אחד + org_manager
וגם coordinator לארגון דוגמה אחד).

**Acceptance Criteria:**
- [x] `AuthTokenPayload.role` הוא `'super_admin' | 'org_manager' | 'coordinator'`
      — 2026-08-26
- [x] `npm run seed:users` יוצר לפחות: super_admin, org_manager, coordinator
      — 2026-08-26
- [x] Typecheck passes; login+/me נבדק בפועל מול Atlas לכל שלושת התפקידים —
      2026-08-26 (curl/PowerShell: כל שלושת החשבונות מתחברים, /me מאשר, סיסמה
      שגויה נדחית). הערה: login לפי **email** (לא username) — תואם למסך
      ההתחברות של lendingCRM ("כתובת דואר אלקטרוני").

### שלב ב' — API לקטלוג (תלוי ב-US-101/102)

#### US-103: API ל-Organizations
**Acceptance Criteria:**
- [x] `createMongoStore<Organization>` + ראוטים: GET ציבורי (לצורך דף קטלוג
      לפי token), POST/PATCH/DELETE ל-super_admin בלבד (ארגונים לא נוצרים
      ע"י org_manager) — 2026-08-26. גם `GET /organizations/by-token/:token`
      ציבורי (יידרש ע"י US-114, דף הקטלוג הציבורי)
- [x] Typecheck passes; CRUD נבדק בפועל מול Atlas — 2026-08-26 (יצירה כ-
      super_admin הצליחה; ניסיון יצירה כ-org_manager נדחה; lookup-by-token
      עבד). **ממצא חשוב לזכור ל-US-115:** ה-route תמיד מייצר id חדש
      (`org-${randomUUID()}`) ומתעלם מ-id שנשלח בגוף הבקשה — עקבי עם שאר
      ה-CRUD הגנרי, אבל אומר שזריעת ארגון-דוגמה עם id קבוע ("org-demo", כדי
      שיתאים ל-organizationId שכבר בחשבונות הזרועים) *לא* יכולה לעבור דרך ה-API
      הציבורי — חייבת סקריפט seed ייעודי שכותב ישירות ל-Mongo (US-115)

#### US-104: API ל-Branches, Warehouses, Categories, Models (קטלוג)
**Description:** ארבע ישויות עם אותו pattern בדיוק (org-scoped CRUD) — story
אחד כי הן זהות מבנית לחלוטין, ריבוי stories פה רק ייצור חזרתיות.

**Acceptance Criteria:**
- [x] 4 stores + ראוטים, כל אחד עם GET ציבורי + CRUD מוגן (`canAccessOrg`) —
      2026-08-26. הוספתי גם `canWriteCatalog`: **coordinator חסום מ-CRUD על
      כל 4 הישויות** (רק super_admin/org_manager) — זו ההחלטה שסימנתי כפתוחה
      ב-US-102, ראו progress.txt לנימוק
- [x] Typecheck passes; CRUD נבדק בפועל על כל 4 הישויות מול Atlas — 2026-08-26
      (POST כ-manager הצליח על כל ה-4; POST כ-coordinator נדחה כראוי על branch)

#### US-105: API ל-Products (SKU) — כולל `loanStatus`
**Description:** כמו US-104 אך עם שדה `loanStatus` שמתעדכן אוטומטית ע"י
מחזור ה-Loan (לא ניתן לעריכה ידנית חופשית מה-CRUD הגנרי — ייאכף ב-US-107).

**Acceptance Criteria:**
- [x] store + ראוטים ל-Products; `loanStatus` ברירת מחדל `not_loaned` ביצירה
      — 2026-08-26 (`extraDefaults` ב-makeCrud: `{status:'active',
      loanStatus:'not_loaned'}`, נדרס ע"י body רק אם נשלח מפורשות)
- [x] Typecheck passes; CRUD בסיסי נבדק מול Atlas — 2026-08-26 (מוצר שנוצר קיבל
      loanStatus=not_loaned כברירת מחדל, כמצופה)

#### US-106: API ל-Customers
**Acceptance Criteria:**
- [x] store + ראוטים org-scoped, כולל `GET /customers/lookup?phone=` ציבורי
      (כמו במערכת החיה — מסך בקשת השאלה מזהה לקוח חוזר לפי טלפון) — 2026-08-26.
      **החלטת הרשאות:** coordinator כן יכול ליצור/לערוך Customer (בניגוד ליתר
      ישויות הקטלוג) — סביר שסדרן צריך לרשום לקוחות חדשים כשהוא מטפל בבקשת
      השאלה בפועל; זו החלטת שיפוט, לא נצפתה במפורש בסריקת lendingCRM
- [x] Typecheck passes; CRUD + lookup נבדקים מול Atlas — 2026-08-26 (customer
      נוצר ע"י coordinator; lookup לפי טלפון מצא אותו; manager רואה אותו
      ב-GET /customers)

### שלב ג' — Loan (הליבה העסקית, תלוי בשלב ב')

#### US-107: API ל-Loans — כולל עדכון `loanStatus` אוטומטי + ActionLog
**Description:** ה-story הכי קריטי: יצירת/עדכון Loan צריכה גם לעדכן את
`Product.loanStatus` בהתאם (ליצור → `loaned`, בהחזרה → `returned`), וגם
לכתוב שורה ל-ActionLog בכל שינוי — בדיוק כמו שנצפה בטופס עריכת ההשאלה
במערכת החיה (הטקסט המתועד אוטומטית: "מנהל ארגון X עדכן... תאריך ... סטטוס").

**Acceptance Criteria:**
- [x] store + ראוטים ל-Loans, org-scoped (super_admin רואה הכל) — 2026-08-26.
      coordinator כן יכול ליצור/לעדכן (זה בדיוק התפקיד שלו) — לא נחסם כמו
      בקטלוג
- [x] יצירת Loan → Product.loanStatus הופך ל-`loaned` (atomic, לא race) —
      2026-08-26. גם: יצירת השאלה על מוצר שכבר `loaned` נדחית מראש עם 409
      (בדיקה לפני היצירה, לא רק אחריה)
- [x] עדכון סטטוס ל-`returned` → Product.loanStatus חוזר ל-`not_loaned` —
      2026-08-26
- [x] כל create/update על Loan כותב שורת ActionLog (performedBy מה-auth token)
      — 2026-08-26. הטקסט מנוסח בעברית בדומה למה שנצפה במערכת החיה
- [x] Typecheck passes; מחזור מלא (יצירה→עדכון→החזרה) נבדק מול Atlas, כולל
      וידוא ש-Product.loanStatus ו-ActionLog באמת השתנו כצפוי — 2026-08-26,
      מחזור מלא נבדק בפועל: coordinator יוצר השאלה על מוצר אמיתי מהזרעה
      (US-115) → product.loanStatus=loaned מאומת; ניסיון השאלה כפולה נדחה
      עם 409; manager מחזיר (PATCH status=returned) → product.loanStatus
      חוזר ל-not_loaned מאומת; GET /action-logs מציג 2 רשומות, ממוינות
      מהחדש לישן, עם טקסט עברי תקין. השאלה הזו (עכשיו returned) נשארה
      ב-DB כחלק מנתוני הדוגמה - לא נוקתה, כי היא מצב תקין ולא "יתום".

#### US-108: API ל-Payments (מודל נתונים בלבד)
**Description:** CRUD רגיל, בלי שום קריאה אמיתית לחברת סליקה (Non-Goal, §3).

**Acceptance Criteria:**
- [x] store + ראוטים org-scoped — 2026-08-26
- [x] Typecheck passes; CRUD נבדק מול Atlas — 2026-08-26 (יצירת תשלום ללקוח
      הדוגמה, chargeAmount=150/פיקדון; PATCH ל-wasCharged=true+status=charged;
      GET מציג את זה ל-manager. נשאר ב-DB כנתוני דוגמה לגיטימיים)

#### US-109: API ל-ActionLog (קריאה בלבד כלפי לקוחות ה-API)
**Description:** ActionLog נכתב רק פנימית (מ-US-107 ודומיו), אבל צריך endpoint
לקריאה כדי שהאדמין יוכל להציג את הלוג (כמו מסך "לוגי פעולות" במערכת החיה).

**Acceptance Criteria:**
- [x] `GET /action-logs` מוגן, org-scoped, ממוין מהחדש לישן — 2026-08-26
      (נבנה בתוך loansRoutes.ts יחד עם US-107, כי actionLogsStore גר שם)
- [x] Typecheck passes; נבדק מול רשומות אמיתיות שנוצרו ב-US-107 — 2026-08-26
      (ראו הבדיקה תחת US-107 — אותו מחזור בדיקה כיסה את שניהם ביחד)

### שלב ד' — Frontend (תלוי בשלב ג')

#### US-110: שלד אפליקציה + Auth + ניווט אדמין
**Description:** `src/App.tsx`, `AuthContext`, מסך login, וה-sidebar הראשי
(תואם למבנה התפריט שנצפה במערכת החיה: לוח בקרה, ארגונים, סניפים, מחסנים,
קטגוריות, דגמים, מוצרים, לקוחות, השאלות, תשלומים, לוגי פעולות, משתמשים).

**Acceptance Criteria:**
- [x] Login עובד, טוקן נשמר, ניווט מוצג לפי role (coordinator/org_manager לא
      רואים "ארגונים") — 2026-08-26
- [x] Typecheck passes; Verify changes work in browser — 2026-08-26 (נבדק
      בפועל ב-Browser pane: login כ-manager → dashboard מציג שם נכון → sidebar
      ללא "ארגונים" → ניווט ל"השאלות" עובד (hash routing) → logout מחזיר
      למסך login → login כ-admin → sidebar כן מציג "ארגונים". 0 שגיאות קונסולה
      בכל השלבים)

#### US-111: מסכי CRUD גנריים לטבלאות (ארגונים/סניפים/מחסנים/קטגוריות/דגמים/
מוצרים/לקוחות)
**Description:** קומפוננטת טבלה גנרית אחת (חיפוש, מיון, עריכה inline/מודל,
מחיקה) שמוזנת קונפיגורציה לכל ישות — לא 7 קומפוננטות נפרדות כפולות, בדיוק
כמו שה-backend כבר בנוי גנרית (US-104/105/106).

**Acceptance Criteria:**
- [x] קומפוננטת `EntityTable` גנרית + קונפיג לכל אחת מ-7 הישויות — 2026-08-26
      (`EntityTable.tsx` + `CatalogScreens.tsx`; שדות select עם ערכים מקושרים
      נטענים דרך `useOptions` — Model→Category, Product→Model+Warehouse)
- [x] Typecheck passes; Verify changes work in browser — CRUD מלא על לפחות
      2 ישויות שונות נבדק ידנית בדפדפן — 2026-08-26. **נבדק בפועל בדפדפן** (לא
      רק קריאות API): קטגוריות — יצירה/עריכה/מחיקה (מחיקה עצרה כצפוי ב-confirm()
      הדפדפן, מוגן מפני מחיקה בטעות); דגמים — הצגת categoryId כשם קטגוריה
      נכון (לא raw id); מוצרים — הצגת modelId+warehouseId+loanStatus נכון,
      כולל שהמוצר שהוחזר ב-US-107 מציג "לא הושאל" כמצופה
- **פער ידוע לתיקון עתידי:** super_admin לא יכול כרגע ליצור ישויות קטלוג
  (branches/warehouses/וכו') דרך ה-UI, כי אין select לבחירת ארגון בטופס —
  ה-server דורש organizationId בגוף הבקשה כש-role=super_admin (רק org_manager
  מקבל אותו אוטומטית מה-token). לא חסם קריטי כרגע (manager/coordinator כן
  עובד), אבל שווה תיקון בעתיד אם super_admin יצטרך לנהל קטלוג של ארגון
  ספציפי ישירות

#### US-112: מסך השאלות (Loans) — הליבה העסקית
**Description:** מסך ייעודי (לא גנרי כמו US-111) כי יש לו לוגיקה מיוחדת:
טאבים לפי סטטוס (הכל/מושאל/חזר/בבדיקה/לא הוחזר — כמו במערכת החיה), טופס
עריכה עם קישור ל-Customer/Product/Payment, ותצוגת ה-ActionLog inline.

**Acceptance Criteria:**
- [x] רשימת השאלות עם טאבי סינון לפי סטטוס — 2026-08-26
- [x] טופס עריכה: שינוי סטטוס באמת מעדכן Product.loanStatus (מוודאים בדפדפן,
      לא רק שה-API עובד) — 2026-08-26
- [x] Typecheck passes; Verify changes work in browser — 2026-08-26. **נבדק
      בפועל בדפדפן**: נוצרה השאלה חדשה על "כיסא גלגלים מתקפל מס 2" דרך הטופס
      (בחירת לקוח+מוצר מ-select, לא free text) — נשמרה עם שם מאושפז, סטטוס
      "מושאל", ורשומת ActionLog נוצרה מיידית; ה-ActionLog של שתי ההשאלות
      (כולל זו שנוצרה/הוחזרה קודם ב-US-107) מוצג inline בכרטיס ההשאלה, ממוין
      נכון; פתיחת טופס יצירה נוספת אחרי זה הראתה של-select "מוצר" רק 2 אפשרויות
      (מס 1 ו-מס 3) — מס 2 נעלם כי loanStatus שלו באמת התעדכן ל-loaned ונטען
      מחדש מהשרת, לא רק state מקומי אופטימי; טאב הסינון "מושאל" הראה רק את
      ההשאלה הפעילה, לא את זו שהוחזרה. **הערה על תהליך הבדיקה:** נתקלתי
      בבעיית staleness של ה-Browser pane (טאב ישן המשיך להציג bundle קודם
      אחרי restart של Vite) — נפתר ע"י פתיחת טאב חדש; לא באג באפליקציה עצמה,
      תועד ב-progress.txt

#### US-111b: מסכי Payments + ActionLog (פער שהתגלה, לא היה ב-PRD המקורי)
**Description:** US-111 כיסה 7 ישויות אבל לא Payments/ActionLog, למרות
שה-backend שלהם (US-108/109) כבר קיים והם מופיעים ב-sidebar. נוסף כתיקון
פער, לא תוכנן מראש.

**Acceptance Criteria:**
- [x] מסך תשלומים (EntityTable גנרי, כולל שדה `boolean` חדש ל-wasCharged —
      הרחבת FieldType ב-EntityTable מ-`'text'|'number'|'select'` ל-גם
      `'boolean'`) — 2026-08-26
- [x] מסך לוגי פעולות (read-only — אין create/edit/delete, כי ActionLog
      נכתב רק פנימית) — 2026-08-26
- [x] Typecheck passes; Verify changes work in browser — 2026-08-26, שני
      המסכים נבדקו בפועל עם נתונים אמיתיים מ-US-107/108 (תשלום עם
      wasCharged=כן מוצג נכון; 3 רשומות ActionLog מוצגות ממוינות)

#### US-113: מסך משתמשים (Users) + ניהול הרשאות
**Acceptance Criteria:**
- [x] רשימת משתמשים + יצירה/עריכה, כולל בחירת תפקיד מבין 3 — 2026-08-26.
      גילוי חשוב: `server/usersRoutes.ts` לא היה קיים בכלל (רק store.ts
      הפנימי) — נבנה מאפס כחלק מה-story הזה, לא רק frontend. הרשאות: super_admin
      יכול להקצות כל תפקיד לכל ארגון; org_manager יכול להקצות רק
      org_manager/coordinator בתוך הארגון שלו (לא super_admin, לא ארגון אחר) —
      נאכף גם בשרת (usersRoutes.ts assignableRoles) וגם ב-UI (הרשימה הנפתחת
      לא מציעה אפשרויות אסורות מלכתחילה)
- [x] Typecheck passes; Verify changes work in browser — 2026-08-26. **נבדק
      בפועל**: כ-org_manager, רשימת המשתמשים מציגה רק 2 משתמשים בארגון שלו
      (לא את ה-super_admin) — org-scoping עובד; הרשימה הנפתחת לתפקיד מציגה
      רק "מנהל ארגון"/"סדרן", לא "מנהל ראשי"; יצירת משתמש coordinator חדש
      הצליחה; **אימות אמיתי**: התחברתי בפועל (curl) עם המשתמש החדש
      (coordinator2@example.com) והתחברות הצליחה עם role/organizationId
      נכונים — מוכיח שה-bcrypt hashing בזמן יצירה עובד סוף-לסוף, לא רק
      שהרשומה נכתבה ל-DB

### שלב ה' — קטלוג ציבורי + זריעת נתונים

#### US-114: דף קטלוג ציבורי לפי ארגון (עיצוב wizard לפי הרפרנס)
**עדכון 2026-08-26 (אחרי המשוב "זה לא אותו עיצוב בדיוק"):** גרסה ראשונה
הייתה קרובה ברמת המבנה אבל לא ברמת הפרטים. חזרתי לרפרנס במסך מלא והשוויתי
פיקסל-לפיקסל, ותיקנתי: (1) progress bar - הסגמנט הפעיל צריך להיות **בימין**
(תואם RTL), לא בשמאל כמו שיצא לי בהתחלה; (2) header - לוגו+שם צריכים
להיות **צרור אחד צמוד מיושר לימין** (justify-end), לא justify-between
שפיזר אותם לשני קצוות הרוחב; (3) כרטיס מוצר - תיבת האייקון בימין, עיגול
הבחירה בשמאל (היה הפוך). התובנה הטכנית: תחת RTL, סדר ה-DOM children
בתוך flex row נהפך ויזואלית - "ילד ראשון" מוצג בימין, לא בשמאל כמו ב-LTR -
צריך לחשוב הפוך כל פעם שממקמים אלמנטים לפי הרפרנס.

**עדכון 2 (2026-08-26, "הכפתור לא עובד"):** כפתור "המשך לשלב הבא" היה
placeholder מת (רק UI, שום onClick). המשתמש ביקש שיעבוד בפועל - זה חרג
מהיקף US-114 המקורי (שהוגדר כתצוגה בלבד), אז הורחב בפועל ל-flow אמיתי בן
2 שלבים: בחירת מוצרים → פרטי קשר → שליחה אמיתית. נוסף
`POST /api/public/loan-requests` (ציבורי, ללא login, ב-server/loansRoutes.ts) -
מוצא/יוצר Customer לפי טלפון בתוך הארגון, יוצר Loan לכל מוצר שנבחר (מדלג
בשקט על מוצרים שכבר לא זמינים במקום להכשיל את כל הבקשה), מפעיל את אותה
לוגיקת עדכון Product.loanStatus + ActionLog כמו הנתיב המאומת. מסך הצלחה
מציג כמה מהמוצרים שנבחרו אכן נרשמו בהצלחה.
**Acceptance נוסף:** נבדק מקצה לקצה בדפדפן+API - מילוי טופס אמיתי → שליחה
→ אימות ש-Customer/Loan/Product.loanStatus/ActionLog כולם נוצרו/התעדכנו
נכון ב-Atlas, לא רק שהודעת ההצלחה הוצגה.

**עדכון 3 (2026-08-26, "חסרים שלבים... תעתיק גם את הגוון והתמונות... עמוד
סליקה ועמודים נוספים חסרים"):** חזרתי לרפרנס וניגשתי אליו הפעם ברצינות -
לא רק screenshot של המסך הראשון. גיליתי (דרך ניווט בפועל בתוך ה-preview,
כולל reload לאיפוס ל-step 1, ולחיצות על "המשך לשלב הבא") שיש הרבה יותר
מ-2 שלבים: לפחות שלב אישור תנאי שימוש (checkbox + רשימת כללים) ושלב תשלום/
פיקדון (טופס כרטיס אשראי מלא: מספר/תוקף/CVV + badge "סליקה מאובטחת").
בניתי מחדש את ה-flow עם 5 שלבים אמיתיים: select → details → **terms**
(חדש) → **payment** (חדש) → success. שלב ה-terms חוסם המשך עד שה-checkbox
מסומן (נבדק בפועל - קליק על "המשך" בלי checkbox לא זז). שלב ה-payment
מציג טופס כרטיס אשראי **ויזואלי בלבד** - השדות (מספר כרטיס/תוקף/CVV) לא
נשלחים לשרת בכלל, עם הבהרה כתובה על המסך "פרטי האשראי אינם נשמרים או
מועברים בשלב זה" - כי אין עדיין אינטגרציית סליקה אמיתית (Non-Goal מפורש),
אבל השלב עצמו קיים כדי שה-flow לא "יחסר שלב".
גם שיפרתי את זיהוי האייקונים: `pickIcon(name)` בוחר אייקון lucide-react
לפי מילות מפתח בשם המוצר (מיטה→BedDouble, מזרון→Moon, כיסא גלגלים→
Accessibility, כיסא→Armchair, ברירת מחדל→Package) במקום Package גנרי
לכל דבר - קירוב סביר לאיורים המותאמים-אישית של הרפרנס בלי להעתיק קבצי
תמונה בפועל (לא הורדתי/העתקתי נכסים גרפיים מהאפליקציה של מישהו אחר -
זה גבול מכוון, ראו הערת copyright/asset-reproduction). גם: תג "פרימיום"
(כוכב צהוב) לדגמים עם "פרימיום" בשם, ומצב בחירה עם checkmark בעיגול מלא
(לא נקודה) שתואם יותר את הרפרנס.
**Acceptance סופי:** מחזור מלא נבדק בדפדפן (לא screenshot בלבד הפעם -
ניווט אמיתי): select→details→terms (נחסם בלי checkbox, עובר עם)→payment→
submit→success, ואז אימות API ש-Customer/Loan אמיתיים נוצרו נכון.

**עדכון 4 (2026-08-26, "חסרים העמודים" — עוד screenshots מהרפרנס):**
המשתמש שלח 3 screenshots נוספים מהרפרנס: מסך הצלחה עשיר יותר ("בקשת
ההשאלה נשלחה!" + הודעה שנציג יצור קשר + מספר טלפון), שלב "מה מיקום
המיטה?" (בחירת בניין/אזור + שם מחלקה ומספר חדר), ושלב "למתי אתה צריך
את הציוד?" (תאריך + הערכת משך). הפעם לא הסתפקתי בscreenshots הבודדים -
חזרתי לרפרנס וניווטתי דרך **כל** ה-flow מההתחלה עד הסוף בעצמי (reload,
בחירת מוצר, גלילה בחיצים הקטנים, מילוי טפסים, לחיצת "המשך" בכל שלב),
כדי לקבל את סדר השלבים האמיתי ולא לנחש. הסדר האמיתי: select → **terms**
(לא details כמו שחשבתי קודם!) → details → **location** (חדש) → **date**
(חדש) → payment → success. 6 שלבים אמיתיים (=6 הסגמנטים בפס ההתקדמות),
success הוא התוצאה אחרי ששישתם הושלמו, לא segment נפרד.
- שלב location: **החלטת עיצוב מכוונת** - הרפרנס hardcoded רשימת אגפי
  בית-חולים ("בניין ילדים", "מכון הלב" וכו') שספציפית לעמותה אחת. במקום
  להעתיק את זה (לא מתאים למערכת רב-ארגונית גנרית), הבחירה נשלפת מ-
  Branches האמיתיים של הארגון (GET /api/branches, כבר קיים) - כל ארגון
  רואה את הסניפים שלו, לא רשימה קבועה. שדה טקסט חופשי למחלקה/חדר, זהה
  לרפרנס.
- שלב date: תאריך ברירת מחדל היום (state מאותחל ל-todayISO()), 3 כפתורי
  הערכת משך (לא ידוע/לימים בודדים/ליום אחד) - ניתן ללחוץ שוב על הנבחר
  כדי לבטל בחירה (toggle, לא ברפרנס אבל שיפור UX סביר).
- שלב details השתנה: שדה "שם מלא" אחד (לא first/last מפוצל כמו שבניתי
  קודם) + טלפון חובה + טלפון נוסף אופציונלי + "שם מאושפז" (השארתי, לא
  היה ברפרנס באותו שלב אבל שימושי לדומיין שלנו) + הבהרת פרטיות שמופיעה
  שם במדויק ("אין צורך בתעודת זהות או כתובת מייל").
- Backend: `server/loansRoutes.ts`'s POST /public/loan-requests הורחב
  לקבל `loanDate` (מהלקוח, לא תמיד "היום") ו-`notes` (הלקוח מרכיב מחרוזת
  עם מיקום/חדר/משך משוער ושולח כ-notes אחד - לא הוספתי שדות סכימה חדשים
  ל-Loan עבור branchId/roomInfo/duration, נמנעתי מהרחבת data model נוספת
  בסיפור שכבר גדל הרבה).
- מסך success הועשר: הודעת תודה עם השם שהוזן, "יצור עמכם קשר נציג
  הארגון", ומספר הטלפון שהוזן מוצג בבירור (בדיוק כמו הרפרנס, בלי
  "עמותת" hardcoded כי המערכת כללית).
- **תקלה בבדיקה עצמה, לא באפליקציה:** אחרי כתיבת הקוד, ניווט לעמוד
  הראה "אין מוצרים זמינים" למרות שה-API הישיר החזיר מוצר זמין - אבחנתי
  את זה כאותה תבנית שכבר נתקלתי בה (Iteration 14): תהליך auth-server ישן
  עדיין רץ ותופס את פורט 4001, מגיש קוד/state ישן, במקום זה ש-tsx watch
  ניסה להפעיל מחדש. תוקן עם עצירה מלאה + taskkill + אימות עם netstat +
  הפעלה מחדש נקייה + טאב דפדפן חדש. **Learning מתחזק:** זו התבנית
  השלישית של אותה בעיה בסשן הזה - כל פעם שמשהו "לא מתעדכן" אחרי שינוי
  ב-server/*.ts, לבדוק מיד netstat על 4001 לפני שמנחשים שזה קוד שגוי.
- **תקלת ניקוי דאטה (שגיאה שלי, לא באפליקציה):** ניסיתי למחוק מוצר יחיד
  עם encoding פגום (מ-PowerShell -Body בלי UTF-8 מפורש) באמצעות
  `Where-Object name -like "*?*"` - לא ידעתי/שכחתי ש-`?` ב-PowerShell
  `-like` הוא wildcard לתו יחיד, לא תו מילולי, אז `"*?*"` תפס *כל* מחרוזת
  לא-ריקה ומחק את **כל** מוצרי org-demo, לא רק את הפגום. שוחזר מיידית
  עם 3 מוצרים נקיים (הפעם עם `[System.Text.Encoding]::UTF8.GetBytes()`
  מפורש ל-body, לא להסתמך על ConvertTo-Json+Invoke-RestMethod
  להתמודד נכון עם עברית). **Learning:** אף פעם לא להשתמש ב--like עם
  תווי `?`/`*` בתוך string שרירותי בלי לחשוב על wildcard semantics -
  להשתמש ב--eq להשוואה מדויקת, או ל-escape מפורש, או ב--match עם regex
  מבוקר.
- Validation סופית: **מחזור מלא אמיתי בדפדפן**, שלב-אחר-שלב, לא רק
  get_page_text בין קפיצות: select (בחירת מוצר) → terms (checkbox, מוצג
  שהכפתור חסום/מופעל נכון) → details (מולאו שם+טלפון) → location (נבחר
  סניף אמיתי, מולא חדר) → date (תאריך ברירת מחדל + נבחרה הערכת משך) →
  payment (מוצג סכום פיקדון נכון) → submit → success (מוצג עם השם/טלפון
  שהוזנו). אימות API בסוף: Customer "רונית כהן" נוצר, Loan עם
  status=loaned ותאריך נכון, ו-notes מכיל בדיוק "מיקום: סניף מרכזי |
  מחלקה/חדר: פנימית ב, חדר 5 | משך משוער: לימים בודדים" - כל 3 השדות
  שנאספו בשלבים הנפרדים אכן הגיעו ל-DB נכון. 0 שגיאות קונסולה.
**Description:** דף ציבורי (ללא login) לפי `token` הארגון — שלב-שלב, כרטיסי
מוצר עם checkbox/תמונה/תיאור/מחיר, מיתוג לפי הארגון (לוגו/שם) — בדיוק כמו
שהוגדר קודם ב-US-013 המקורי (רפרנס: אפליקציית AI Studio "שבת אחים - מערכת
השאלת ציוד"). זה עדיין רלוונטי במלואו גם אחרי המחיקה — זה על העיצוב, לא על
מודל הנתונים הישן.

**Acceptance Criteria:**
- [x] דף `/catalog/:token` טוען מוצרים זמינים (Product עם loanStatus=
      not_loaned) לפי הארגון, בעיצוב wizard/כרטיסים כמו הרפרנס — 2026-08-26.
      `#catalog/:token` (hash-based, כמו כל שאר הראוטים באפליקציה, לא path-
      based) — נבדק ב-`App.tsx` ברמה הכי גבוהה, *לפני* ה-AuthProvider, כדי
      שלקוח פרטי לעולם לא יראה מסך login. תצוגה ברמת Product (לא Model
      מקובץ) לפי הניסוח המילולי של הקריטריון; שם+מחיר/תמונה מגיעים מה-Model
      המקושר
- [x] Typecheck passes; Verify changes work in browser בשני ארגונים שונים —
      2026-08-26. הורחב `server/seed-demo.ts` ליצור **שני** ארגוני דוגמה
      (org-demo/token=demo, org-demo-2/token=demo2) בדיוק כדי לאפשר את
      הבדיקה הזו — לא היה קיים ארגון שני קודם. **נבדק בפועל בדפדפן**:
      `#catalog/demo` מציג "ארגון דוגמה" + 2 מוצרים זמינים (השלישי, שמושאל
      מ-US-112, נעדר כצפוי); `#catalog/demo2` מציג "ארגון דוגמה שני" +
      "מיטת מלווה מתקפלת" ב-80₪ (נתונים שונים לגמרי, מוכיח שהמיתוג באמת
      דינמי ולא hardcoded); `#catalog/token-לא-קיים` מציג "ארגון לא נמצא"
      בלי קריסה. 0 שגיאות קונסולה בכל המקרים

#### US-115: סקריפט זריעת דאטה לדוגמה (seed) לכל הישויות
**Description:** כרגע רק users נזרעים. צריך seed גם לארגון דוגמה אחד מלא —
סניף, מחסן, קטגוריה, דגם, כמה מוצרים, לקוח — כדי שאפשר יהיה לבדוק את כל
המסכים עם נתונים אמיתיים בלי להזין הכל ידנית.

**הוזז מוקדם יותר בפועל** (בין US-106 ל-US-107) — כי US-107 (Loans) לא ניתן
היה לבדוק אמיתית בלי ארגון+מוצר+לקוח אמיתיים ומקושרים. ראו learning ב-
progress.txt (Iteration 2).

**Acceptance Criteria:**
- [x] `npm run seed:demo` (סקריפט חדש) יוצר ארגון דוגמה מלא בכל הישויות —
      2026-08-26 (`server/seed-demo.ts`: org-demo + סניף + מחסן + קטגוריה +
      דגם + 3 מוצרים + לקוח — כותב ישירות ל-Mongo, לא דרך ה-API הציבורי,
      כדי לשלוט ב-id הקבוע)
- [x] אידמפוטנטי (מסרב לרוץ שוב אם כבר קיים) — 2026-08-26, נבדק: הרצה שנייה
      מסרבת
- [x] נבדק בפועל: מריצים, ורואים את הנתונים בכל מסכי ה-UI — חלקית: הנתונים
      אומתו דרך ה-API (GET לכל endpoint) וגם שימשו בפועל לבדיקת מחזור
      Loans מלא ב-US-107. אימות חזותי בדפדפן ימתין ל-US-110+ (עדיין אין UI)

## 5. Progress Log

ראו `progress.txt`.
