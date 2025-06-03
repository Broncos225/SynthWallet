
import type { LucideIcon } from 'lucide-react';

export type TransactionType = 'expense' | 'income' | 'transfer';

export type Transaction = {
  id: string;
  accountId: string | null; // Can be null for transfers before specific account assignment
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // ISO string
  categoryId?: string | null;
  payee?: string | null;
  fromAccountId?: string | null;
  toAccountId?: string | null;
  relatedDebtTransactionId?: string | null;
  savingGoalId?: string | null;
};

export type Category = {
  id:string;
  name: string;
  icon: string;
  color?: string | null;
  parentId?: string | null; 
};

export type Budget = {
  id: string;
  categoryId: string;
  amount: number;
  month: string; // YYYY-MM format, e.g., "2024-07"
};

export type CategorizationResult = {
  suggestedCategoryId: string | null;
  alternatives: Category[];
  confidence?: number; // Optional: 0-1
};

export type ChartDataPoint = {
  name: string;
  value: number;
  fill?: string;
  id?: string;
};

export type ExpenseTemplate = {
  id: string;
  name: string;
  description?: string;
  amount: number;
  categoryId: string;
  payee?: string;
  accountId?: string;
};

export type Account = {
  id: string;
  name: string;
  type: string;
  icon: string;
  color?: string | null;
  initialBalance: number;
  currentBalance: number;
};

export type Debt = {
  id: string;
  name: string;
  type: 'owed_by_me' | 'owed_to_me';
  debtorOrCreditor: string;
  initialAmount: number;
  currentBalance: number;
  dueDate?: string | null;
  creationDate: string; // ISO string
  status: 'pendiente' | 'parcial' | 'pagada';
};

export type DebtTransaction = {
  id: string;
  debtId: string;
  type: 'abono_realizado' | 'abono_recibido';
  amount: number;
  transactionDate: string; // ISO string
  notes?: string | null;
  accountId?: string;
  relatedTransactionId?: string | null;
};

export type ThemeSettings = {
  background?: string; // e.g., "240 10% 10%"
  foreground?: string;
  card?: string;
  primary?: string;
  accent?: string;
  numberFormatLocale?: string; // e.g., 'es-ES' or 'es-CO'
};

export type SavingGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null; // ISO string for date only
  icon: string;
  color?: string | null;
  creationDate: string; // ISO string
  status: 'active' | 'completed';
};

export type RecurringTransactionFrequency = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'yearly';

export type RecurringTransaction = {
  id: string;
  name: string;
  type: 'expense' | 'income';
  amount: number;
  categoryId: string | null;
  accountId: string | null;
  payee: string | null;
  frequency: RecurringTransactionFrequency;
  startDate: string; // ISO date string (yyyy-MM-dd)
  endDate: string | null; // ISO date string (yyyy-MM-dd)
  notes: string | null;
  isActive: boolean;
  nextDueDate: string | null; // ISO date string (yyyy-MM-dd)
  lastProcessedDate: string | null; // ISO date string (yyyy-MM-dd)
};
