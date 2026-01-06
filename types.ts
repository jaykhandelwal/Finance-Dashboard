
export interface Transaction {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  amount: number;
  originalDescription: string;
  enhancedDescription: string;
  category: string;
  tags: string[];
  source: string; // Display name for source (e.g. "Chase Upload", "Manual")
  accountId?: string; // Link to specific account
  isExpense: boolean; // true for debit, false for credit
  status: 'verified' | 'potential_duplicate' | 'needs_review';
  confidence: number; // 0-100 Score of AI certainty
  isReviewed: boolean; // true if user has manually checked/verified this line item
  splitDetails?: SplitDetails; // Details if this transaction is lent/split
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
}

export interface SplitItem {
  id: string;
  name: string;
  amount: number;
  paidAmount?: number; // Amount paid back so far
  isSettled: boolean;
  dateSettled?: string;
  payments?: Payment[]; // History of payments for this specific item
}

export interface SplitDetails {
  totalLent: number; // Sum of all items amounts
  items: SplitItem[]; // List of people who owe money
  dateLent: string;
  splitType: 'equal' | 'exact' | 'shares';
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'credit_card' | 'wallet' | 'other';
  last4Digits?: string;
  color: string;
  institution?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  budget?: number;
}

export interface Rule {
  id: string;
  name: string;
  isActive: boolean;
  criteria: {
    field: 'originalDescription' | 'amount' | 'enhancedDescription';
    operator: 'contains' | 'equals' | 'starts_with' | 'greater_than' | 'less_than';
    value: string;
  };
  actions: {
    renameTo?: string;
    setCategory?: string;
    addTags?: string[];
  };
}

export interface ProcessingResult {
  newTransactions: Transaction[];
  potentialDuplicates: DuplicatePair[];
}

export interface DuplicatePair {
  id: string; // ID of the pair logic
  existing: Transaction;
  incoming: Transaction;
  confidence: number; // 0-1
}

export type ViewState = 'dashboard' | 'transactions' | 'upload' | 'duplicates' | 'settings' | 'lending';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Groceries', color: '#10b981' },
  { id: '2', name: 'Dining Out', color: '#f59e0b' },
  { id: '3', name: 'Utilities', color: '#3b82f6' },
  { id: '4', name: 'Rent/Mortgage', color: '#6366f1' },
  { id: '5', name: 'Shopping', color: '#ec4899' },
  { id: '6', name: 'Travel', color: '#8b5cf6' },
  { id: '7', name: 'Income', color: '#84cc16' },
  { id: '8', name: 'Other', color: '#94a3b8' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-1', name: 'Chase Sapphire', type: 'credit_card', last4Digits: '4242', color: '#1e40af', institution: 'Chase' },
  { id: 'acc-2', name: 'Wells Fargo Checking', type: 'bank', last4Digits: '8899', color: '#dc2626', institution: 'Wells Fargo' },
];

export const DEFAULT_RULES: Rule[] = [
  { 
    id: 'rule-1', 
    name: 'Auto-tag Uber', 
    isActive: true, 
    criteria: { field: 'originalDescription', operator: 'contains', value: 'UBER' }, 
    actions: { setCategory: 'Travel', addTags: ['Rideshare'] } 
  },
  { 
    id: 'rule-2', 
    name: 'Clean up Starbucks', 
    isActive: true, 
    criteria: { field: 'originalDescription', operator: 'contains', value: 'STARBUCKS' }, 
    actions: { renameTo: 'Starbucks', setCategory: 'Dining Out', addTags: ['Coffee'] } 
  }
];
