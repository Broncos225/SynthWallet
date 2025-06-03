
import type { Expense, Budget, ExpenseTemplate, Debt, DebtTransaction } from '@/types';
import { subDays, formatISO, startOfMonth, subMonths as dateFnsSubMonths, addMonths, isValid, parseISO } from 'date-fns';
// INITIAL_CATEGORIES will now be primarily used by AppDataContext for new user seeding

const today = new Date();
const currentMonthStart = startOfMonth(today);
const currentMonthYYYYMM = isValid(currentMonthStart) ? formatISO(currentMonthStart, { representation: 'date' }).substring(0, 7) : "2024-01"; // Fallback
const lastMonthStart = startOfMonth(dateFnsSubMonths(today,1));
const lastMonthYYYYMM = isValid(lastMonthStart) ? formatISO(lastMonthStart, { representation: 'date' }).substring(0,7) : "2023-12"; // Fallback

// These mock data arrays are now largely for reference or for contexts where Firebase isn't available.
// The AppDataContext will fetch and manage data from Firebase.

export const MOCK_EXPENSES: Expense[] = [
  // { id: '1', description: 'Compras en SuperMart', amount: 75.50, date: formatISO(subDays(currentMonthStart, 2)), categoryId: 'food_groceries', payee: 'SuperMart' },
  // ... other expenses
];

export const MOCK_BUDGETS: Budget[] = [
  // { id: 'b1', categoryId: 'food', amount: 500, month: currentMonthYYYYMM },
  // ... other budgets
];

export const MOCK_EXPENSE_TEMPLATES: ExpenseTemplate[] = [
  // { id: 'tmpl_coffee', name: 'Café Matutino', description: 'Café diario', amount: 3.50, categoryId: 'food_coffee', payee: 'Cafetería Local' },
  // ... other templates
];

export const MOCK_DEBTS: Debt[] = [
  // {
  //   id: 'debt_1',
  //   name: 'Préstamo a Juan Pérez',
  //   type: 'owed_to_me',
  //   debtorOrCreditor: 'Juan Pérez',
  //   initialAmount: 200,
  //   currentBalance: 150,
  //   creationDate: formatISO(subDays(today, 30)),
  //   dueDate: formatISO(addMonths(today, 2)),
  //   status: 'parcial',
  // },
  // ... other debts
];

export const MOCK_DEBT_TRANSACTIONS: DebtTransaction[] = [
  // { id: 'dt_1_1', debtId: 'debt_1', type: 'abono_recibido', amount: 50, transactionDate: formatISO(subDays(today, 10)), notes: 'Primer abono de Juan' },
  // ... other transactions
];
