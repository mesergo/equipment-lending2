// Legacy fixed 5-value category enum. Kept only so old code/data that hasn't been migrated to
// the Product/Model/SKU hierarchy below still type-checks; new code should use Product+Model.
export type EquipmentCategory =
  | 'mobility'      // ניידות ושיקום (כסאות גלגלים, קביים, הליכונים)
  | 'medical'       // מכשור רפואי ונשימתי (מחולל חמצן, סטורציה, טנס, משאבות)
  | 'comfort'       // שהייה ולינת מלווים (מיטת מלווה, כורסה נפתחת, מצעים, מטענים)
  | 'sabbath'       // ערכות שבת ומועדים (מיחם, פלטה, נרות שבת, הבדלה)
  | 'hygiene';      // רחצה, יולדות והיגיינה (כסא רחצה, ידיות ואקום, עזר ליולדת)

// SKU/item ("מק"ט") status. Renamed per the client's terminology: "פעיל/לא פעיל" -> "זמין/לא זמין",
// the old "הוחזר וממתין לאישור מערכת" was removed and split into 'on_loan' + 'faulty_pending_inspection'.
export type EquipmentStatus =
  | 'available'               // זמין
  | 'unavailable'             // לא זמין
  | 'on_loan'                 // בהשאלה
  | 'faulty_pending_inspection' // תקול וממתין לבדיקה
  | 'sanitizing';             // בתהליך חיטוי (בין החזרה לזמינות מחדש)

// --------------------------------------------------------------------------------------------
// Product / Model / SKU hierarchy ("מוצר" > "דגם" > "מק"ט"), replacing the old flat
// EquipmentCategory+EquipmentItem model. A Product is a product type (e.g. "מיטת מלווה"), a Model
// is a specific model of that product (has its own image/description/deposit/internal cost), and
// a SKU (still called EquipmentItem in code, see below) is one trackable stocked unit of a model
// sitting in a specific warehouse.
// --------------------------------------------------------------------------------------------

export interface Product {
  id: string;
  organizationId: string;
  organizationName?: string;
  name: string;         // "מוצר", למשל: מיטת מלווה, מזרן מתקפל, כסא גלגלים
  description?: string;
}

export interface Model {
  id: string;
  productId: string;
  organizationId: string;
  name: string;           // "דגם"
  description?: string;   // תיאור קצר במלל חופשי
  imageUrl?: string;      // התמונה "נמשכת" מכאן לכל מק"ט של הדגם
  depositAmount: number;  // פיקדון (לשעבר "מחיר") - כרגע קבוע פר-דגם, לא פר-מק"ט
  internalCost?: number;  // עלות פנימית - לא מוצג ללקוח
  maxLoanDays: number;
  weightCapacityKg?: number;
  isUrgentSabbath?: boolean;
  featured?: boolean;
}

// New Branch entity ("סניף") sitting above Warehouse: a physical site/hospital (e.g. "תל השומר",
// "אחר"), as opposed to a Warehouse which is a storage location that serves (one or more) branches.
export interface Branch {
  id: string;
  organizationId: string;
  organizationName?: string;
  name: string;       // למשל: המרכז הרפואי שיבא תל השומר
  city?: string;
  isDefault?: boolean;
  notes?: string;
}

// Customer ("לקוח"), identified by mobile phone - deliberately no ID number and no email field
// (removed per the client's request), and no full address (a free-text notes field instead).
export interface Customer {
  id: string;
  organizationId?: string;
  fullName: string;
  mobilePhone: string;      // מזהה ראשי לזיהוי לקוח חוזר
  secondaryPhone?: string;
  notes?: string;           // הערות חופשיות (במקום כתובת מלאה)
  createdAt: string;
}

export interface Organization {
  id: string;
  code: string;
  name: string;
  shortName?: string;
  logoIcon?: string;
  description: string;
  contactPhone: string;
  contactEmail?: string;
  headquarters?: string;
  color?: string;
  activeWarehousesCount?: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  organizationName?: string;
  // NEW: the branch ("סניף") this warehouse primarily serves. hospitalName/city are kept as
  // denormalized display copies of the branch's own name/city (set automatically when a branch
  // is chosen) rather than being freely retyped — see server/branchesStore.ts.
  branchId?: string;
  hospitalName: string; // שם בית החולים או המרכז הרפואי שבו נמצא המחסן (או משרת אותו)
  city?: string;
  location: string;    // קומה, אגף, מיקום מדויק
  managerName: string;
  managerPhone: string;
  accessCode?: string; // רשות - קוד גישה (לוקרים/מחסן), לא חובה
  activeVolunteersCount: number;
  hasSmartLockers: boolean;
  sections: string[];
  departments?: string[];
}

// Alias for compatibility
export type Hospital = Warehouse;

export interface EquipmentItem {
  id: string;
  sku: string;
  name: string;
  // NEW source of truth: which Model (דגם) this SKU/unit belongs to - see Product/Model above.
  // "category" is kept only as an optional legacy/derived field for any old code path still
  // reading it directly; new code should resolve category via model -> product instead.
  modelId?: string;
  category?: EquipmentCategory;
  description: string;
  fullSpecs?: string[];
  organizationId?: string;
  organizationName?: string;
  warehouseId: string;
  hospitalId?: string; // fallback alias for warehouseId
  hospitalName?: string;
  depotLocation: string;
  status: EquipmentStatus;
  condition: 'new' | 'excellent' | 'good' | 'needs_inspection';
  stockTotal: number;
  stockAvailable: number;
  depositAmount: number;
  maxLoanDays: number;
  currentLoanId?: string;
  lastSanitizedAt?: string;
  photoUrl?: string;
  isUrgentSabbath?: boolean;
  featured?: boolean;
  weightCapacityKg?: number;
}

export interface CartItem {
  equipment: EquipmentItem;
  quantity: number;
  selectedDays: number;
}

export type DeliveryMethod = 
  | 'bedside_volunteer'
  | 'self_pickup_locker'
  | 'home_delivery';

export type OrderStatus =
  | 'pending_dispatch'
  | 'in_transit'
  | 'active_in_ward'
  // Customer self-reported that they returned the equipment; awaiting staff inspection.
  | 'return_reported'
  | 'returned_clean'
  | 'returned_sanitizing'
  | 'cancelled';

export type HoldStatus = 
  | 'held'
  | 'released'
  | 'charged'
  | 'waived';

export interface OrderItem {
  equipmentId: string;
  equipmentSku: string;
  equipmentName: string;
  category?: EquipmentCategory;
  quantity: number;
  depositPerUnit: number;
  days?: number;
}

export interface OrderRecord {
  id: string;
  createdAt: string;
  patientName: string;
  patientId?: string;
  patientIdNumber?: string;
  patientPhone: string;
  patientEmail?: string;
  caregiverName: string;
  caregiverRelation: string;
  caregiverPhone: string;
  organizationId?: string;
  organizationName?: string;
  warehouseId: string;
  warehouseName: string;
  hospitalId?: string;
  hospitalName?: string;
  department: string;
  roomNumber: string;
  bedNumber: string;
  deliveryMethod: DeliveryMethod;
  lockerCode?: string;
  lockerAccessCode?: string;
  items: OrderItem[];
  loanStartDate?: string;
  // ISO date (YYYY-MM-DD), chosen by the customer at checkout — the source of truth for reminders.
  expectedReturnDate: string;
  actualReturnDate?: string;
  orderStatus: OrderStatus;

  // Return reporting & reminders (server-managed — see server/ordersStore.ts, server/reminders.ts)
  returnReportedAt?: string; // ISO timestamp: when the customer reported the return themselves
  returnConfirmedAt?: string; // ISO timestamp: when staff confirmed the inspected return
  returnConfirmedBy?: string; // username of the staff member who confirmed it
  lastReminderSentOn?: string; // ISO date (YYYY-MM-DD) — guards against sending more than once/day
  reminderCount?: number;

  // Credit card & Frame hold details
  creditCardMasked: string;
  cardHolderName: string;
  cardHolderId: string;
  cardExp: string;
  totalHoldAmount: number;
  holdStatus: HoldStatus;
  holdAuthCode: string;
  voluntaryDonation: number;
  
  assignedVolunteerName?: string;
  assignedVolunteerPhone?: string;
  digitalSignatureUrl?: string;
  signatureDataUrl?: string;
  notes?: string;
}

export interface LoanRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSku: string;
  category: EquipmentCategory;
  patientName: string;
  patientIdNumber: string;
  patientPhone: string;
  caregiverName: string;
  caregiverRelation: string;
  caregiverPhone: string;
  organizationId?: string;
  organizationName?: string;
  hospitalId: string;
  hospitalName: string;
  warehouseId?: string;
  warehouseName?: string;
  department: string;
  roomNumber: string;
  bedNumber: string;
  loanDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: 'active' | 'overdue' | 'returned' | 'extended';
  depositAmount: number;
  depositStatus: 'free' | 'held' | 'refunded' | 'donated';
  signatureDataUrl?: string;
  volunteerName: string;
  volunteerPhone: string;
  notes?: string;
  smsSent: boolean;
}

export interface PatientRequest {
  id: string;
  createdAt: string;
  organizationId?: string;
  organizationName?: string;
  warehouseId: string;
  hospitalId?: string;
  warehouseName?: string;
  hospitalName?: string;
  department: string;
  roomNumber: string;
  bedNumber: string;
  patientName: string;
  requestedBy?: string;
  relation?: string;
  contactPhone: string;
  requestType?: 'equipment' | 'sabbath_kit' | 'volunteer_visit';
  equipmentRequestedName?: string;
  urgency: 'normal' | 'urgent' | 'high' | 'urgent_sabbath' | 'standard';
  requestedItemNames?: string[];
  notes?: string;
  status: 'pending' | 'volunteer_assigned' | 'in_transit' | 'completed' | 'delivered' | 'cancelled';
  assignedVolunteerName?: string;
  assignedVolunteerPhone?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  organizationId?: string;
  organizationName?: string;
  warehouseId: string;
  hospitalId?: string;
  warehouseName?: string;
  hospitalName?: string;
  currentLocation?: string;
  isAvailable?: boolean;
  status?: 'available' | 'on_call' | 'busy' | 'off_duty';
  activeTasksCount?: number;
  activeDispatchesCount?: number;
  role: string;
}

export interface SanitizationLog {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentSku: string;
  organizationId?: string;
  warehouseId?: string;
  hospitalId?: string;
  returnedAt?: string;
  returnedFromPatient?: string;
  returnedByPatientName?: string;
  conditionOnReturn?: string;
  sanitizationStep: 1 | 2 | 3 | 4;
  disinfectantUsed?: string;
  mechanicChecked?: boolean;
  technicianName?: string;
  notes?: string;
  startedAt?: string;
  isReadyForShelf: boolean;
}
