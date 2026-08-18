export type EquipmentCategory = 
  | 'mobility'      // ניידות ושיקום (כסאות גלגלים, קביים, הליכונים)
  | 'medical'       // מכשור רפואי ונשימתי (מחולל חמצן, סטורציה, טנס, משאבות)
  | 'comfort'       // שהייה ולינת מלווים (מיטת מלווה, כורסה נפתחת, מצעים, מטענים)
  | 'sabbath'       // ערכות שבת ומועדים (מיחם, פלטה, נרות שבת, הבדלה)
  | 'hygiene';      // רחצה, יולדות והיגיינה (כסא רחצה, ידיות ואקום, עזר ליולדת)

export type EquipmentStatus = 
  | 'available'     // זמין להשאלה
  | 'loaned'        // מושאל כעת
  | 'sanitizing'    // בתהליך חיטוי ובדיקה
  | 'maintenance'   // בתיקון / תחזוקה תקופתית
  | 'reserved';     // שמור להעברה למחלקה

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
  hospitalName: string; // שם בית החולים או המרכז הרפואי שבו נמצא המחסן (או משרת אותו)
  city?: string;
  location: string;    // קומה, אגף, מיקום מדויק
  managerName: string;
  managerPhone: string;
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
  category: EquipmentCategory;
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
  expectedReturnDate: string;
  actualReturnDate?: string;
  orderStatus: OrderStatus;
  
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
