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
- [ ] `createMongoStore<Organization>` + ראוטים: GET ציבורי (לצורך דף קטלוג
      לפי token), POST/PATCH/DELETE ל-super_admin בלבד (ארגונים לא נוצרים
      ע"י org_manager)
- [ ] Typecheck passes; CRUD נבדק בפועל מול Atlas

#### US-104: API ל-Branches, Warehouses, Categories, Models (קטלוג)
**Description:** ארבע ישויות עם אותו pattern בדיוק (org-scoped CRUD) — story
אחד כי הן זהות מבנית לחלוטין, ריבוי stories פה רק ייצור חזרתיות.

**Acceptance Criteria:**
- [ ] 4 stores + ראוטים, כל אחד עם GET ציבורי + CRUD מוגן (`canAccessOrg`)
- [ ] Typecheck passes; CRUD נבדק בפועל על כל 4 הישויות מול Atlas

#### US-105: API ל-Products (SKU) — כולל `loanStatus`
**Description:** כמו US-104 אך עם שדה `loanStatus` שמתעדכן אוטומטית ע"י
מחזור ה-Loan (לא ניתן לעריכה ידנית חופשית מה-CRUD הגנרי — ייאכף ב-US-107).

**Acceptance Criteria:**
- [ ] store + ראוטים ל-Products; `loanStatus` ברירת מחדל `not_loaned` ביצירה
- [ ] Typecheck passes; CRUD בסיסי נבדק מול Atlas

#### US-106: API ל-Customers
**Acceptance Criteria:**
- [ ] store + ראוטים org-scoped, כולל `GET /customers/lookup?phone=` ציבורי
      (כמו במערכת החיה — מסך בקשת השאלה מזהה לקוח חוזר לפי טלפון)
- [ ] Typecheck passes; CRUD + lookup נבדקים מול Atlas

### שלב ג' — Loan (הליבה העסקית, תלוי בשלב ב')

#### US-107: API ל-Loans — כולל עדכון `loanStatus` אוטומטי + ActionLog
**Description:** ה-story הכי קריטי: יצירת/עדכון Loan צריכה גם לעדכן את
`Product.loanStatus` בהתאם (ליצור → `loaned`, בהחזרה → `returned`), וגם
לכתוב שורה ל-ActionLog בכל שינוי — בדיוק כמו שנצפה בטופס עריכת ההשאלה
במערכת החיה (הטקסט המתועד אוטומטית: "מנהל ארגון X עדכן... תאריך ... סטטוס").

**Acceptance Criteria:**
- [ ] store + ראוטים ל-Loans, org-scoped (super_admin רואה הכל)
- [ ] יצירת Loan → Product.loanStatus הופך ל-`loaned` (atomic, לא race)
- [ ] עדכון סטטוס ל-`returned` → Product.loanStatus חוזר ל-`not_loaned`
- [ ] כל create/update על Loan כותב שורת ActionLog (performedBy מה-auth token)
- [ ] Typecheck passes; מחזור מלא (יצירה→עדכון→החזרה) נבדק מול Atlas, כולל
      וידוא ש-Product.loanStatus ו-ActionLog באמת השתנו כצפוי

#### US-108: API ל-Payments (מודל נתונים בלבד)
**Description:** CRUD רגיל, בלי שום קריאה אמיתית לחברת סליקה (Non-Goal, §3).

**Acceptance Criteria:**
- [ ] store + ראוטים org-scoped
- [ ] Typecheck passes; CRUD נבדק מול Atlas

#### US-109: API ל-ActionLog (קריאה בלבד כלפי לקוחות ה-API)
**Description:** ActionLog נכתב רק פנימית (מ-US-107 ודומיו), אבל צריך endpoint
לקריאה כדי שהאדמין יוכל להציג את הלוג (כמו מסך "לוגי פעולות" במערכת החיה).

**Acceptance Criteria:**
- [ ] `GET /action-logs` מוגן, org-scoped, ממוין מהחדש לישן
- [ ] Typecheck passes; נבדק מול רשומות אמיתיות שנוצרו ב-US-107

### שלב ד' — Frontend (תלוי בשלב ג')

#### US-110: שלד אפליקציה + Auth + ניווט אדמין
**Description:** `src/App.tsx`, `AuthContext`, מסך login, וה-sidebar הראשי
(תואם למבנה התפריט שנצפה במערכת החיה: לוח בקרה, ארגונים, סניפים, מחסנים,
קטגוריות, דגמים, מוצרים, לקוחות, השאלות, תשלומים, לוגי פעולות, משתמשים).

**Acceptance Criteria:**
- [ ] Login עובד, טוקן נשמר, ניווט מוצג לפי role (coordinator/org_manager לא
      רואים "ארגונים")
- [ ] Typecheck passes; Verify changes work in browser

#### US-111: מסכי CRUD גנריים לטבלאות (ארגונים/סניפים/מחסנים/קטגוריות/דגמים/
מוצרים/לקוחות)
**Description:** קומפוננטת טבלה גנרית אחת (חיפוש, מיון, עריכה inline/מודל,
מחיקה) שמוזנת קונפיגורציה לכל ישות — לא 7 קומפוננטות נפרדות כפולות, בדיוק
כמו שה-backend כבר בנוי גנרית (US-104/105/106).

**Acceptance Criteria:**
- [ ] קומפוננטת `EntityTable` גנרית + קונפיג לכל אחת מ-7 הישויות
- [ ] Typecheck passes; Verify changes work in browser — CRUD מלא על לפחות
      2 ישויות שונות נבדק ידנית בדפדפן

#### US-112: מסך השאלות (Loans) — הליבה העסקית
**Description:** מסך ייעודי (לא גנרי כמו US-111) כי יש לו לוגיקה מיוחדת:
טאבים לפי סטטוס (הכל/מושאל/חזר/בבדיקה/לא הוחזר — כמו במערכת החיה), טופס
עריכה עם קישור ל-Customer/Product/Payment, ותצוגת ה-ActionLog inline.

**Acceptance Criteria:**
- [ ] רשימת השאלות עם טאבי סינון לפי סטטוס
- [ ] טופס עריכה: שינוי סטטוס באמת מעדכן Product.loanStatus (מוודאים בדפדפן,
      לא רק שה-API עובד)
- [ ] Typecheck passes; Verify changes work in browser

#### US-113: מסך משתמשים (Users) + ניהול הרשאות
**Acceptance Criteria:**
- [ ] רשימת משתמשים + יצירה/עריכה, כולל בחירת תפקיד מבין 3
- [ ] Typecheck passes; Verify changes work in browser

### שלב ה' — קטלוג ציבורי + זריעת נתונים

#### US-114: דף קטלוג ציבורי לפי ארגון (עיצוב wizard לפי הרפרנס)
**Description:** דף ציבורי (ללא login) לפי `token` הארגון — שלב-שלב, כרטיסי
מוצר עם checkbox/תמונה/תיאור/מחיר, מיתוג לפי הארגון (לוגו/שם) — בדיוק כמו
שהוגדר קודם ב-US-013 המקורי (רפרנס: אפליקציית AI Studio "שבת אחים - מערכת
השאלת ציוד"). זה עדיין רלוונטי במלואו גם אחרי המחיקה — זה על העיצוב, לא על
מודל הנתונים הישן.

**Acceptance Criteria:**
- [ ] דף `/catalog/:token` טוען מוצרים זמינים (Product עם loanStatus=
      not_loaned) לפי הארגון, בעיצוב wizard/כרטיסים כמו הרפרנס
- [ ] Typecheck passes; Verify changes work in browser בשני ארגונים שונים

#### US-115: סקריפט זריעת דאטה לדוגמה (seed) לכל הישויות
**Description:** כרגע רק users נזרעים. צריך seed גם לארגון דוגמה אחד מלא —
סניף, מחסן, קטגוריה, דגם, כמה מוצרים, לקוח — כדי שאפשר יהיה לבדוק את כל
המסכים עם נתונים אמיתיים בלי להזין הכל ידנית.

**Acceptance Criteria:**
- [ ] `npm run seed:demo` (סקריפט חדש) יוצר ארגון דוגמה מלא בכל הישויות
- [ ] אידמפוטנטי (מסרב לרוץ שוב אם כבר קיים)
- [ ] נבדק בפועל: מריצים, ורואים את הנתונים בכל מסכי ה-UI

## 5. Progress Log

ראו `progress.txt`.
