// Data model — rebuilt from scratch to match the live lendingCRM admin panel
// (https://ptdev1.message.co.il/admin) exactly. See PRD.md §2 for the source scan this
// was derived from. Do not reintroduce entities/fields from the old (deleted) AI-Studio
// scaffold — this file is the new source of truth.

export type UserRole = 'super_admin' | 'org_manager' | 'coordinator';

export interface Organization {
  id: string;
  token: string; // public URL identifier, e.g. /catalog/:token
  name: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  description?: string;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  branchManagerName?: string;
  recordingUrl?: string; // audio file attached in the live system — purpose unclear, see PRD §3 Non-Goals
}

export interface Warehouse {
  id: string;
  organizationId: string;
  name: string;
  location?: string;
  entryCode?: string;
  accessInstructions?: string;
  capacity?: number;
  recordingUrl?: string;
}

export interface Category {
  id: string;
  organizationId: string;
  name: string;
  recordingUrl?: string;
}

export interface Model {
  id: string;
  organizationId: string;
  categoryId: string;
  name: string;
  imageUrl?: string;
  price?: number;
  recordingUrl?: string;
}

export type ProductStatus = 'active' | 'inactive';
export type ProductLoanStatus = 'not_loaned' | 'loaned' | 'returned';

export interface Product {
  id: string;
  organizationId: string;
  modelId: string;
  warehouseId: string;
  name: string; // includes the item number, e.g. "בסיס מיטה מתקפל (ללא מזרן) מס 309"
  price?: number;
  status: ProductStatus;
  loanStatus: ProductLoanStatus;
  imageUrl?: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  idNumber?: string; // ת.ז
  mobilePhone: string;
  city?: string;
  street?: string;
  buildingNumber?: string;
}

export type LoanStatus = 'loaned' | 'returned' | 'not_returned' | 'pending_review';

export interface Loan {
  id: string;
  organizationId: string;
  status: LoanStatus;
  customerId: string;
  hospitalizedPatientName?: string; // free text, distinct from the borrowing Customer
  productId: string;
  loanDate: string; // ISO date
  returnDate?: string; // ISO date
  paymentId?: string;
  notes?: string;
}

export type PaymentStatus = 'waiting' | 'charged' | 'failed';

export interface Payment {
  id: string;
  organizationId: string;
  customerId: string;
  wasCharged: boolean;
  status: PaymentStatus;
  chargeAmount?: number;
  chargeReason?: string;
  issueDate?: string;
  date?: string;
  clearingCompanyPaymentId?: string; // no real clearing-company integration yet — data model only
  lastCardDigits?: string;
}

export interface ActionLog {
  id: string;
  organizationId: string;
  date: string; // ISO datetime
  actionType: string;
  performedBy: string; // username
  loanId: string;
  notes?: string;
}

export interface StoredUser {
  id: string;
  organizationId?: string; // absent for super_admin
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  title?: string;
}
