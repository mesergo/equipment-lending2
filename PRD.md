# PRD: מיגרציה ל-MongoDB + השלמת פערי המערכת (equipment-lending)

## 1. מבוא

הפרויקט הוא מערכת השאלת ציוד רפואי (מיטות, מזרנים וכו') לעמותות. קיים כבר שלד React
מלא (`src/`) עם שרת Express קטן (`server/`) שמשתמש כרגע באחסון קבצי JSON
(`server/data/*.json`, דרך `server/store.ts` / `server/ordersStore.ts` /
`server/genericStore.ts`) כתחליף זמני ל-MongoDB. המטרה: להעביר את כל ה-persistence
בפועל ל-MongoDB, ובמקביל לסגור פערים אמיתיים שהתגלו בסריקת הקוד ובהשוואה מול המערכת
הקיימת בפרודקשן (`lendingCRM`, ptdev1.message.co.il/admin).

השוואה מול המערכת החיה העלתה כמה פערי פיצ'רים/מודל (ראו §6 הערות טכניות) שכדאי להכריע
עליהם *לפני* שכותבים את הראוטים הסופיים ל-Mongo, כדי לא לכתוב סכימה פעמיים.

## 2. מטרות

- כל ה-persistence עובר מקבצי JSON ל-MongoDB (users, orders, products, models,
  branches, warehouses, equipment, customers) בלי לשנות את חוזה ה-API כלפי הפרונט.
- סגירת שלושת פערי ה-persistence הקריטיים שאובחנו בקוד: מלאי (stock) מתעדכן היום רק
  בזיכרון הדפדפן; ל-organizations/patientRequests/volunteers/sanitizationQueue אין
  API בשרת בכלל.
- הסרת קוד מת (7 קומפוננטות לגאסי לא מחוברות).
- כל story קטן מספיק למחזור עבודה בודד (~10 דקות), בסדר תלויות (DB layer → routes →
  קליינט), עם קריטריון "Typecheck passes" ולעיתים "Verify changes work in browser".

## 3. User Stories

### שלב א' — תשתית Mongo

#### US-001: Docker Compose ל-MongoDB מקומי
**Description:** כמפתח, אני רוצה `docker-compose.yml` שמריץ MongoDB מקומי, כדי שיהיה
מסד נתונים אמיתי לפתח ולבדוק מולו.

**Acceptance Criteria:**
- [ ] `docker-compose.yml` בשורש הפרויקט עם שירות `mongo` (image `mongo:7`), פורט
      27017, volume בשם לפרסיסטנטיות
- [ ] `docker compose up -d` מרים קונטיינר תקין (`docker ps` מראה אותו רץ)
- [ ] מתועד ב-README: `docker compose up -d` כצעד ראשון לפני `npm run dev`

#### US-002: מודול חיבור Mongo (`server/db.ts`)
**Description:** כמפתח, אני רוצה מודול יחיד שמנהל את חיבור ה-MongoDB (connect פעם
אחת, caching), כדי שכל שאר קבצי ה-store ישתמשו בו בלי לשכפל לוגיקת חיבור.

**Acceptance Criteria:**
- [ ] `server/db.ts` מייצא `getDb(): Promise<Db>` שמתחבר לפי `MONGODB_URI`
      (ברירת מחדל `mongodb://127.0.0.1:27017/equipment-lending` לפיתוח מקומי)
      ומחזיר את אותו חיבור בקריאות חוזרות
- [ ] `.env.example` מתעדכן עם `MONGODB_URI`
- [ ] `server/index.ts` מחכה ל-`getDb()` לפני `app.listen` (כשל חיבור עוצר את השרת עם
      הודעה ברורה, לא נכשל בשקט מאוחר יותר)
- [ ] Typecheck passes (`npm run lint`)

### שלב ב' — מיגרציית ה-stores (תלוי ב-US-002)

#### US-003: מיגרציית `server/store.ts` (users) ל-Mongo
**Description:** כמפתח, אני רוצה ש-`readUsers`/`writeUsers`/`findUserByUsername`
יעבדו מול קולקציית `users` ב-Mongo במקום `users.json`, בלי לשנות את החתימה כלפי
הקוראים מעבר להפיכתם ל-async.

**Acceptance Criteria:**
- [ ] הפונקציות הופכות ל-async, קוראות/כותבות ל-collection `users` (unique index על
      `username`, lowercase)
- [ ] כל הקוראים (`server/index.ts` login/me, `server/seed-users.ts`,
      `server/setupRoutes.ts`) מעודכנים ל-`await`
- [ ] `npm run seed:users` יוצר משתמשים ב-Mongo (לא ב-JSON), ומסרב לרוץ שוב אם כבר יש
      מסמכים בקולקציה
- [ ] Typecheck passes; התחברות עובדת ידנית מול השרת המקומי מול ה-Mongo של US-001

#### US-004: מיגרציית `server/ordersStore.ts` (orders) ל-Mongo
**Description:** כמו US-003 אבל לקולקציית `orders`, כולל ה-seed הראשוני מ-
`INITIAL_ORDERS`.

**Acceptance Criteria:**
- [ ] `readOrders`/`createOrder`/`findOrder`/`updateOrder` הופכים ל-async מול
      collection `orders` (unique index על `id`); seed חד-פעמי אם הקולקציה ריקה
- [ ] `server/ordersRoutes.ts` ו-`server/reminders.ts` מעודכנים ל-`await`
- [ ] Typecheck passes; יצירת הזמנה מהקטלוג ואישור החזרה עובדים end-to-end מול Mongo

#### US-005: מיגרציית `server/genericStore.ts` ל-Mongo (`createMongoStore`)
**Description:** כמפתח, אני רוצה שה-factory הגנרי (שמשמש products/models/branches/
warehouses/equipment/customers) יעבוד מול Mongo collections במקום קבצי JSON, בלי
לשנות את הממשק (`readAll/find/create/update/remove`) מעבר להפיכתו ל-async.

**Acceptance Criteria:**
- [ ] `createMongoStore<T>(collectionName, seed)` מחליף את `createJsonStore` — אותה
      חתימה, async; seed חד-פעמי אם הקולקציה ריקה; unique index על `id`
- [ ] פרוייקציה `{_id: 0}` בקריאות כדי לא לדלוף `_id` של Mongo לפרונט
- [ ] `server/catalogRoutes.ts` מעודכן במלואו ל-`await` (כולל `makeCrud` הגנרי
      ו-`warehousesStore` המיוצא שנצרך מ-`ordersRoutes.ts`)
- [ ] Typecheck passes; קטלוג נטען, CRUD על ציוד/מוצר/דגם/סניף/מחסן/לקוח עובד מול
      הממשק

#### US-006: ניקוי — קבצי JSON ישנים
**Description:** אחרי שכל ה-stores עוברים ל-Mongo, אני רוצה לוודא שאין יותר קוד
שקורא/כותב ל-`server/data/*.json`.

**Acceptance Criteria:**
- [ ] גרפ חיפוש (`fs.readFileSync`/`writeFileSync` עם `server/data`) לא מחזיר תוצאות
      מחוץ ל-git history
- [ ] קבצי ה-JSON עצמם נשארים במקום (כבר ב-gitignore, לא בשימוש) — לא נמחקים
- [ ] README מתעדכן: מוסר התיאור "JSON-file-now, MongoDB-later", מוחלף בהוראות
      MongoDB בפועל (docker compose, `MONGODB_URI`)
- [ ] Typecheck passes

### שלב ג' — סגירת פערי persistence אמיתיים (תלוי בשלב ב')

#### US-007: מלאי (stock) נשמר בשרת, לא רק בזיכרון הדפדפן
**Description:** כמנהל מערכת, אני רוצה שכמות המלאי הזמינה (`stockAvailable`) תתעדכן
בשרת בפועל בזמן checkout/אישור החזרה, כדי שמצב המלאי לא יתבדר בין מכשירים/טאבים.

**Acceptance Criteria:**
- [ ] `POST /orders` מקטין אטומית `stockAvailable` של כל SKU בהזמנה (ב-Mongo, לא
      בזיכרון קליינט)
- [ ] `POST /orders/:id/confirm-return` מגדיל בחזרה את `stockAvailable`
- [ ] `src/App.tsx` מפסיק לעדכן stock ב-state מקומי ומסתמך על הנתון שחוזר מהשרת
- [ ] Typecheck passes; Verify changes work in browser — checkout שתי יחידות מאותו
      SKU בשני טאבים מראה מלאי עקבי אחרי רענון

#### US-008: API + Mongo store ל-Organizations
**Description:** כמנהל-על, אני רוצה CRUD אמיתי לארגונים (כרגע רק ב-state מקומי),
לפי אותו pattern שכבר קיים ל-products/branches וכו'.

**Acceptance Criteria:**
- [ ] `createMongoStore<Organization>('organizations', ORGANIZATIONS)` +
      `GET /organizations` ציבורי, `POST/PATCH/DELETE` ל-super_admin בלבד
- [ ] `App.tsx`: `handleAddOrganization` קורא ל-API במקום למוטט state מקומי בלבד
- [ ] Typecheck passes; Verify changes work in browser

#### US-009: API + Mongo store ל-PatientRequests
**Description:** כמו US-008, לבקשות ציוד ליד המיטה (`PatientRequest`).

**Acceptance Criteria:**
- [ ] `createMongoStore<PatientRequest>` + ראוטים תואמי-הרשאות ל-`canAccessOrg`
      (כמו customers)
- [ ] `App.tsx`: `handleAddNewRequest`/`handleAssignVolunteerToRequest`/
      `handleUpdatePatientRequestStatus` קוראים ל-API
- [ ] Typecheck passes; Verify changes work in browser

#### US-010: API + Mongo store ל-Volunteers
**Description:** כמו US-008/009, למתנדבים (`Volunteer`) — כרגע אין אפילו fetch
ראשוני ב-`App.tsx`.

**Acceptance Criteria:**
- [ ] `createMongoStore<Volunteer>` + ראוטים org-scoped
- [ ] `App.tsx` טוען מתנדבים בעליית האפליקציה ומחובר ל-CRUD קיים בממשק
- [ ] Typecheck passes; Verify changes work in browser

#### US-011: API + Mongo store ל-SanitizationLog
**Description:** כמו לעיל, לתור החיטוי (`sanitizationQueue`).

**Acceptance Criteria:**
- [ ] `createMongoStore<SanitizationLog>` + ראוטים org-scoped
- [ ] `App.tsx`: `handleAdvanceSanitizationStep`/`handleFinishSanitization` קוראים
      ל-API
- [ ] Typecheck passes; Verify changes work in browser

### שלב ד' — ניקוי קוד מת (עצמאי, אפשר במקביל לשלב ג')

#### US-012: הסרת קומפוננטות legacy לא מחוברות
**Description:** כמפתח, אני רוצה להסיר 7 קומפוננטות שאינן מיובאות משום מקום
(`InventoryView`, `ActiveLoansView`, `DashboardView`, `StatsBanner`, `VolunteersView`,
`NewLoanModal`, `ReturnModal`, `LoanReceiptModal`) שעובדות מול מודל ישן (`LoanRecord`)
שכבר הוחלף ב-`OrderRecord`.

**Acceptance Criteria:**
- [ ] אימות חוזר עם grep שאף אחת מהקומפוננטות לא מיובאת לפני מחיקה
- [ ] הקבצים נמחקים; אם `LoanRecord` נשאר לא-בשימוש לגמרי אחרי המחיקה — מוסר גם הוא
      מ-`src/types/index.ts`
- [ ] Typecheck passes

### שלב ה' — עיצוב מסך ההשאלה הציבורי לפי ארגון (תלוי בשלב ב', עצמאי משלבים ג'/ד')

#### US-013: עיצוב מחדש של מסך בחירת המוצר הציבורי (per-org) לפי רפרנס
**Description:** כמנהל-על, אני רוצה שמסך הקטלוג/בחירת המוצר הציבורי (`CatalogStoreView`
ו/או `PatientPortalView`) יעוצב מחדש בסגנון wizard מדורג עם מיתוג הארגון (לוגו,
כותרת, "בס"ד" לארגונים דתיים) וכרטיסי מוצר עם checkbox/תמונה/תיאור/סכום פקדון —
לפי הרפרנס העיצובי שסופק: אפליקציית AI Studio "שבת אחים - מערכת השאלת ציוד"
(https://aistudio.google.com/apps/8fb78a2c-dcaa-4d35-9e99-3b11430ee826). **הבהרה:**
זה רפרנס ויזואלי בלבד (screenshots) — לא מעתיקים קוד מהאפליקציה של אותו רפרנס,
בונים מימוש עצמאי בהתאם למערכת העיצוב הקיימת שלנו (Tailwind, `Organization.color`/
`logoIcon` הקיימים כבר במודל הנתונים).

**Acceptance Criteria:**
- [ ] כותרת עמוד עם לוגו/שם הארגון (מ-`Organization`) ואינדיקטור שלבים (progress
      steps) בסגנון wizard, כמו ברפרנס
- [ ] כרטיס מוצר: תמונה, שם+דגם, תיאור קצר, "סכום פיקדון: X₪", checkbox/רדיו לבחירה
      מרובה
- [ ] העיצוב עקבי בין הארגונים (כל ארגון עם ה-URL/קוד/לוגו/צבע שלו — התשתית הזו
      כבר קיימת דרך `#org/<CODE>`, לא נדרש שינוי בניתוב עצמו)
- [ ] Typecheck passes; Verify changes work in browser — נבדק לפחות בשני ארגונים
      שונים (`#org/HESED`, `#org/LEV` וכו') כדי לוודא שהמיתוג באמת דינמי ולא הרדקוד

## 4. Non-Goals (לא בתוכנית הזו)

- אינטגרציה עם ספק WhatsApp אמיתי (נשאר `console` provider)
- הוספת תפקיד "סדרן" (coordinator) למודל ההרשאות — פער שזוהה מול המערכת החיה, אך
  דורש החלטת מוצר לפני מימוש (ראו §6)
- הוספת שדות ת.ז/כתובת ל-Customer — אותו דבר, דורש החלטת מוצר (המודל הנוכחי נמנע
  מזה במכוון)
- שכפול "לוגי פעולות" (audit trail) של המערכת הישנה — תכונה משמעותית, ראויה ל-PRD
  נפרד
- שכפול ישות Payment/סליקה נפרדת מול חברת סליקה אמיתית — היקף גדול, PRD נפרד
- פענוח מטרת שדה "הקלטה" (קובץ אודיו) שמופיע על סניפים/מחסנים/קטגוריות/דגמים
  במערכת הישנה — לא ברור מהממשק, צריך לברר מול בעל המוצר לפני שמחליטים אם ואיך
  לשכפל

## 5. Progress Log

ראו `progress.txt` — עדכון בסוף כל מחזור עבודה.

## 6. הערות טכניות / פערים שזוהו מול המערכת החיה (ptdev1.message.co.il/admin)

- **היררכיית קטלוג הפוכה בשמות**: מערכת חיה = קטגוריה → דגם (מחיר+תמונה) → מוצר
  (SKU בודד, ממוספר, עם סטטוס השאלה חי). קוד מקומי = Product → Model → EquipmentItem.
  המיפוי הישיר: local.Product ≈ live.קטגוריה (בערך), local.Model ≈ live.דגם,
  local.EquipmentItem ≈ live.מוצר. לא שינוי בהיקף ה-PRD הזה, אבל נדרש בזמן כל שיחת
  מוצר עתידית כדי לא להתבלבל בין "מוצר" בשתי המערכות.
- **תפקיד "סדרן"**: במערכת החיה יש שלושה תפקידי משתמש (מנהל כללי/מנהל ארגון/סדרן),
  מקומי יש רק שניים. סדרן נראה כמו role של dispatch/coordination — קרוב מושגית
  ל-Volunteer אבל עם login. צריך החלטה: להרחיב את auth roles או להשאיר בגדר Volunteer.
- **תשלומים**: מערכת חיה עוקבת אחרי סטטוס חיוב אמיתי מול חברת סליקה (מזהה עסקה,
  ספרות אחרונות של כרטיס, תאריך חיוב, האם חויב). מקומי יש רק שדות hold בסיסיים על
  ה-Order עצמו. פער אמיתי אם יש כוונה לחייב כרטיסי אשראי בפועל.
- **audit trail**: מערכת חיה שומרת לוג פעולות מובנה (מי שינה מה, מתי, על איזו
  השאלה) שגם מוצג inline בטופס עריכת ההשאלה עצמה. אין מקבילה מקומית.
- **Customer**: מערכת חיה שומרת ת.ז + כתובת מלאה (רחוב/עיר/מספר בניין). הקוד המקומי
  מנע את זה במכוון (ראו הערה ב-`Customer` type: "replaces address"). צריך החלטת
  פרטיות/מוצר מודעת, לא רק "להוסיף שדות".
