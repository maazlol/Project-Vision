import {
  collection,
  doc,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';

export type DonationType = 'money' | 'food' | 'clothes';
export type DonationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'action_required';
export type DonationSource = 'credits' | 'individual' | 'in_kind';

export interface DonationRecord {
  id: string;
  ngoId: string;
  ngoName: string;
  donorId?: string | null;
  donorName: string;
  type: DonationType;
  amount?: number;
  items?: string;
  quantity?: string;
  status: DonationStatus;
  adminNote?: string;
  source: DonationSource;
  timestamp?: any;
  receiptUrl?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface CreateDonationInput {
  ngoId: string;
  ngoName: string;
  donorId?: string | null;
  donorName: string;
  type: DonationType;
  amount?: number;
  items?: string;
  quantity?: string;
  status: DonationStatus;
  source: DonationSource;
  receiptUrl?: string;
  paymentMethod?: string;
  transactionId?: string;
  adminNote?: string;
}

/** Build a plain Firestore payload for a new top-level donations document. */
export function buildDonationPayload(input: CreateDonationInput) {
  const payload: Record<string, unknown> = {
    ngoId: input.ngoId,
    ngoName: input.ngoName,
    donorId: input.donorId ?? null,
    donorName: input.donorName,
    type: input.type,
    status: input.status,
    source: input.source,
    timestamp: serverTimestamp(),
  };

  if (input.amount !== undefined) payload.amount = input.amount;
  if (input.items) payload.items = input.items;
  if (input.quantity) payload.quantity = input.quantity;
  if (input.receiptUrl) payload.receiptUrl = input.receiptUrl;
  if (input.paymentMethod) payload.paymentMethod = input.paymentMethod;
  if (input.transactionId) payload.transactionId = input.transactionId;
  if (input.adminNote) payload.adminNote = input.adminNote;

  return payload;
}

/** New document ref in the top-level donations collection (for batches). */
export function newDonationRef(db: Firestore): DocumentReference {
  return doc(collection(db, 'donations'));
}

export function mapInKindDonationType(donationType: string): DonationType {
  const lower = donationType.toLowerCase();
  if (lower.includes('cloth')) return 'clothes';
  if (lower.includes('cash') || lower.includes('credit') || lower.includes('money')) {
    return 'money';
  }
  // Food packages, medicines, books, and other in-kind items default to food
  return 'food';
}

export function isMoneyDonation(d: Pick<DonationRecord, 'type'>): boolean {
  return d.type === 'money';
}

export function isApprovedMoney(d: Pick<DonationRecord, 'type' | 'status' | 'amount'>): boolean {
  return d.type === 'money' && d.status === 'approved' && typeof d.amount === 'number';
}

export function donationTimestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDonationStatus(status: DonationStatus | string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'under_review':
      return 'Under Review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'refunded':
      return 'Refunded';
    case 'action_required':
      return 'Action Required';
    default:
      return status;
  }
}

export function statusBadgeClasses(status: DonationStatus | string): string {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
    case 'under_review':
      return 'bg-amber-100 text-amber-700';
    case 'rejected':
      return 'bg-rose-100 text-rose-700';
    case 'refunded':
      return 'bg-slate-100 text-slate-600';
    case 'action_required':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}
