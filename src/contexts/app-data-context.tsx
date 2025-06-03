
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { ref, onValue, set, push, remove as firebaseRemove, update as firebaseUpdate, get, child, serverTimestamp, type DatabaseReference } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import type { Transaction, Budget, Category, ExpenseTemplate, Account, Debt, DebtTransaction, ThemeSettings, SavingGoal, TransactionType, RecurringTransaction, RecurringTransactionFrequency } from '@/types';
import { INITIAL_CATEGORIES, DEFAULT_CATEGORY_ID, RESERVED_CATEGORY_IDS, DEFAULT_ACCOUNT_ID, INITIAL_ACCOUNTS, DEFAULT_THEME_SETTINGS, DEFAULT_CURRENCY } from '@/lib/constants';
import { formatISO, parseISO, isValid as dateFnsIsValid } from 'date-fns';
import { calculateNextDueDate } from '@/lib/utils';

interface AppDataContextType {
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  expenseTemplates: ExpenseTemplate[];
  accounts: Account[];
  debts: Debt[];
  debtTransactions: DebtTransaction[];
  themeSettings: ThemeSettings | null;
  savingGoals: SavingGoal[];
  recurringTransactions: RecurringTransaction[];
  transactionToPrefillFromRecurring: Partial<Transaction> | null;
  dataLoading: boolean;
  user: any;

  addTransaction: (transaction: Omit<Transaction, 'id' | 'date' | 'relatedDebtTransactionId'> & { date: Date }) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;

  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;

  getCategoryById: (id: string | null | undefined) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  getParentCategories: () => Category[];
  getSubcategories: (parentId: string) => Category[];
  getCategoryName: (categoryId: string | null | undefined) => string;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  isCategoryInUse: (categoryId: string) => boolean;

  addExpenseTemplate: (template: Omit<ExpenseTemplate, 'id'>) => Promise<void>;
  updateExpenseTemplate: (template: ExpenseTemplate) => Promise<void>;
  deleteExpenseTemplate: (templateId: string) => Promise<void>;
  getExpenseTemplates: () => ExpenseTemplate[];

  addAccount: (accountData: Omit<Account, 'id' | 'currentBalance'>) => Promise<void>;
  updateAccount: (accountData: Account) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  getAccountById: (accountId: string | null | undefined) => Account | undefined;
  getAccountByName: (name: string) => Account | undefined;
  getAccountName: (accountId: string | null | undefined) => string;
  isAccountInUse: (accountId: string) => boolean;

  addDebt: (debtData: Omit<Debt, 'id' | 'currentBalance' | 'creationDate' | 'status'> & {dueDate?: Date}) => Promise<Debt | null>;
  getDebtById: (debtId: string) => Debt | undefined;
  addDebtTransaction: (transactionData: Omit<DebtTransaction, 'id' | 'transactionDate' | 'relatedTransactionId'> & {transactionDate: Date; accountId: string;}) => Promise<DebtTransaction | null>;
  deleteDebtTransaction: (debtTransactionId: string, debtId: string) => Promise<void>;
  getTransactionsForDebt: (debtId: string) => DebtTransaction[];
  deleteDebt: (debtId: string) => Promise<void>;

  updateThemeSettings: (newSettings: ThemeSettings) => Promise<void>;
  formatUserCurrency: (amount: number, currency?: string) => string;

  addSavingGoal: (goalData: Omit<SavingGoal, 'id' | 'currentAmount' | 'creationDate' | 'status'> & { targetDate?: Date }) => Promise<SavingGoal | null>;
  updateSavingGoal: (goalData: SavingGoal) => Promise<void>;
  deleteSavingGoal: (goalId: string) => Promise<void>;
  getSavingGoalById: (goalId: string | null | undefined) => SavingGoal | undefined;
  getSavingGoalByName: (name: string) => SavingGoal | undefined;
  getSavingGoalName: (goalId: string | null | undefined) => string;
  getTransactionsForSavingGoal: (goalId: string) => Transaction[];

  addRecurringTransaction: (recordData: Omit<RecurringTransaction, 'id' | 'nextDueDate' | 'lastProcessedDate'>) => Promise<RecurringTransaction | null>;
  updateRecurringTransaction: (recordData: RecurringTransaction) => Promise<void>;
  deleteRecurringTransaction: (recurringId: string) => Promise<void>;
  getRecurringTransactionById: (recurringId: string) => RecurringTransaction | undefined;
  processRecurringTransactionAsDone: (recurringId: string, processedDate: string) => Promise<void>;
  setTransactionToPrefillFromRecurring: Dispatch<SetStateAction<Partial<Transaction> | null>>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

function sortTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateA = parseISO(a.date);
    const dateB = parseISO(b.date);
    if (!dateFnsIsValid(dateA) || !dateFnsIsValid(dateB)) return 0;
    return dateB.getTime() - dateA.getTime();
  });
}

function sortDebts(debts: Debt[]): Debt[] {
    return [...debts].sort((a,b) => {
        const dateA = parseISO(a.creationDate);
        const dateB = parseISO(b.creationDate);
        if (!dateFnsIsValid(dateA) || !dateFnsIsValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime();
    });
}

function sortDebtTransactions(transactions: DebtTransaction[]): DebtTransaction[] {
    return [...transactions].sort((a,b) => {
        const dateA = parseISO(a.transactionDate);
        const dateB = parseISO(b.transactionDate);
        if (!dateFnsIsValid(dateA) || !dateFnsIsValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime();
    });
}

function sortSavingGoals(goals: SavingGoal[]): SavingGoal[] {
  return [...goals].sort((a, b) => {
    const dateA = parseISO(a.creationDate);
    const dateB = parseISO(b.creationDate);
    if (!dateFnsIsValid(dateA) || !dateFnsIsValid(dateB)) return 0;
    return dateB.getTime() - dateA.getTime();
  });
}

function sortRecurringTransactions(transactions: RecurringTransaction[]): RecurringTransaction[] {
  return [...transactions].sort((a, b) => {
    const dateA = a.nextDueDate ? parseISO(a.nextDueDate) : 0;
    const dateB = b.nextDueDate ? parseISO(b.nextDueDate) : 0;
    if (dateA && dateB && dateFnsIsValid(dateA) && dateFnsIsValid(dateB)) return dateA.getTime() - dateB.getTime();
    if (dateA && dateFnsIsValid(dateA)) return -1;
    if (dateB && dateFnsIsValid(dateB)) return 1;
    return a.name.localeCompare(b.name);
  });
}


export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [expenseTemplates, setExpenseTemplates] = useState<ExpenseTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(INITIAL_ACCOUNTS);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtTransactions, setDebtTransactions] = useState<DebtTransaction[]>([]);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(DEFAULT_THEME_SETTINGS);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [transactionToPrefillFromRecurring, setTransactionToPrefillFromRecurring] = useState<Partial<Transaction> | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setDataLoading(true);
      const basePath = `users/${user.uid}`;
      const dataPaths = {
        transactions: `${basePath}/transactions`,
        budgets: `${basePath}/budgets`,
        categories: `${basePath}/categories`,
        expenseTemplates: `${basePath}/expenseTemplates`,
        accounts: `${basePath}/accounts`,
        debts: `${basePath}/debts`,
        debtTransactions: `${basePath}/debtTransactions`,
        themeSettings: `${basePath}/themeSettings`,
        savingGoals: `${basePath}/savingGoals`,
        recurringTransactions: `${basePath}/recurringTransactions`,
      };

      const ensureInitialData = async () => {
        const categoriesRef = ref(db, dataPaths.categories);
        const accountsRef = ref(db, dataPaths.accounts);
        const themeSettingsRef = ref(db, dataPaths.themeSettings);

        const catSnapshot = await get(categoriesRef);
        if (!catSnapshot.exists() || Object.keys(catSnapshot.val() || {}).length === 0) {
          const initialCategoriesObject: {[key: string]: Category} = {};
          INITIAL_CATEGORIES.forEach(cat => { initialCategoriesObject[cat.id] = cat; });
          await set(categoriesRef, initialCategoriesObject);
        }

        const accSnapshot = await get(accountsRef);
        if (!accSnapshot.exists() || Object.keys(accSnapshot.val() || {}).length === 0) {
          const initialAccountsObject: {[key: string]: Account} = {};
          INITIAL_ACCOUNTS.forEach(acc => { initialAccountsObject[acc.id] = acc; });
          await set(accountsRef, initialAccountsObject);
        }
        
        const themeSnapshot = await get(themeSettingsRef);
        const loadedSettings = themeSnapshot.val();
        setThemeSettings(loadedSettings ? { ...DEFAULT_THEME_SETTINGS, ...loadedSettings } : DEFAULT_THEME_SETTINGS);
      };

      ensureInitialData().then(() => {
        const listeners = [
          onValue(ref(db, dataPaths.transactions), (snapshot) => {
            setTransactions(sortTransactions(Object.values(snapshot.val() || {})));
          }),
          onValue(ref(db, dataPaths.budgets), (snapshot) => {
            setBudgets(Object.values(snapshot.val() || {}));
          }),
          onValue(ref(db, dataPaths.categories), (snapshot) => {
              const dbCategories = snapshot.val();
              if (dbCategories && Object.keys(dbCategories).length > 0) {
                   setCategories(Object.values(dbCategories).sort((a: any, b: any) => a.name.localeCompare(b.name)));
              } else {
                  setCategories(INITIAL_CATEGORIES.sort((a,b) => a.name.localeCompare(b.name)));
              }
          }),
          onValue(ref(db, dataPaths.expenseTemplates), (snapshot) => {
            setExpenseTemplates(Object.values(snapshot.val() || {}).sort((a: any, b: any) => a.name.localeCompare(b.name)));
          }),
          onValue(ref(db, dataPaths.accounts), (snapshot) => {
            const dbAccounts = snapshot.val();
             if (dbAccounts && Object.keys(dbAccounts).length > 0) {
                setAccounts(Object.values(dbAccounts).sort((a: any, b: any) => a.name.localeCompare(b.name)));
            } else {
                setAccounts(INITIAL_ACCOUNTS.sort((a,b) => a.name.localeCompare(b.name)));
            }
          }),
          onValue(ref(db, dataPaths.debts), (snapshot) => {
            setDebts(sortDebts(Object.values(snapshot.val() || {})));
          }),
          onValue(ref(db, dataPaths.debtTransactions), (snapshot) => {
            setDebtTransactions(sortDebtTransactions(Object.values(snapshot.val() || {})));
          }),
          onValue(ref(db, dataPaths.themeSettings), (snapshot) => {
             const loadedSettings = snapshot.val();
             setThemeSettings(loadedSettings ? { ...DEFAULT_THEME_SETTINGS, ...loadedSettings } : DEFAULT_THEME_SETTINGS);
          }),
          onValue(ref(db, dataPaths.savingGoals), (snapshot) => {
            setSavingGoals(sortSavingGoals(Object.values(snapshot.val() || {})));
          }),
          onValue(ref(db, dataPaths.recurringTransactions), (snapshot) => {
            setRecurringTransactions(sortRecurringTransactions(Object.values(snapshot.val() || {})));
          }),
        ];

        Promise.all([
          get(ref(db, dataPaths.transactions)),
          get(ref(db, dataPaths.budgets)),
          get(ref(db, dataPaths.expenseTemplates)),
          get(ref(db, dataPaths.debts)),
          get(ref(db, dataPaths.debtTransactions)),
          get(ref(db, dataPaths.accounts)),
          get(ref(db, dataPaths.categories)),
          get(ref(db, dataPaths.themeSettings)),
          get(ref(db, dataPaths.savingGoals)),
          get(ref(db, dataPaths.recurringTransactions)),
        ]).finally(() => setDataLoading(false));

        return () => listeners.forEach(unsubscribe => unsubscribe());
      });
    } else {
      setTransactions([]);
      setBudgets([]);
      setCategories(INITIAL_CATEGORIES);
      setExpenseTemplates([]);
      setAccounts(INITIAL_ACCOUNTS);
      setDebts([]);
      setDebtTransactions([]);
      setThemeSettings(DEFAULT_THEME_SETTINGS);
      setSavingGoals([]);
      setRecurringTransactions([]);
      setTransactionToPrefillFromRecurring(null);
      setDataLoading(false);
    }
  }, [user]);


  const addTransaction = useCallback(async (transactionData: Omit<Transaction, 'id' | 'date' | 'relatedDebtTransactionId'> & { date: Date }) => {
    if (!user) return;
    const transactionRefPath = `users/${user.uid}/transactions`;
    const newTransactionRef = push(ref(db, transactionRefPath));

    const transactionForFirebase: Transaction = {
      id: newTransactionRef.key!,
      date: formatISO(transactionData.date),
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      accountId: transactionData.type === 'transfer' ? (transactionData.fromAccountId!) : (transactionData.accountId!),
      categoryId: transactionData.type !== 'transfer' ? (transactionData.categoryId || DEFAULT_CATEGORY_ID) : null,
      payee: transactionData.payee || null,
      fromAccountId: transactionData.type === 'transfer' ? (transactionData.fromAccountId || null) : null,
      toAccountId: transactionData.type === 'transfer' ? (transactionData.toAccountId || null) : null,
      relatedDebtTransactionId: transactionData.relatedDebtTransactionId || null,
      savingGoalId: (transactionData.type === 'expense' || transactionData.type === 'income') ? (transactionData.savingGoalId || null) : null,
    };

    const updates: { [key: string]: any } = {};
    updates[`${transactionRefPath}/${transactionForFirebase.id}`] = transactionForFirebase;

    if (transactionForFirebase.type === 'expense' && transactionForFirebase.accountId) {
      const accountRefPath = `users/${user.uid}/accounts/${transactionForFirebase.accountId}`;
      const accountSnapshot = await get(ref(db, accountRefPath));
      if (accountSnapshot.exists()) {
        const account = accountSnapshot.val() as Account;
        updates[`${accountRefPath}/currentBalance`] = account.currentBalance - transactionForFirebase.amount;
      }
    } else if (transactionForFirebase.type === 'income' && transactionForFirebase.accountId) {
      const accountRefPath = `users/${user.uid}/accounts/${transactionForFirebase.accountId}`;
      const accountSnapshot = await get(ref(db, accountRefPath));
      if (accountSnapshot.exists()) {
        const account = accountSnapshot.val() as Account;
        updates[`${accountRefPath}/currentBalance`] = account.currentBalance + transactionForFirebase.amount;
      }
    } else if (transactionForFirebase.type === 'transfer') {
      if (transactionForFirebase.fromAccountId) {
        const fromAccountRefPath = `users/${user.uid}/accounts/${transactionForFirebase.fromAccountId}`;
        const fromAccountSnapshot = await get(ref(db, fromAccountRefPath));
        if (fromAccountSnapshot.exists()) {
          const account = fromAccountSnapshot.val() as Account;
          updates[`${fromAccountRefPath}/currentBalance`] = account.currentBalance - transactionForFirebase.amount;
        }
      }
      if (transactionForFirebase.toAccountId) {
        const toAccountRefPath = `users/${user.uid}/accounts/${transactionForFirebase.toAccountId}`;
        const toAccountSnapshot = await get(ref(db, toAccountRefPath));
        if (toAccountSnapshot.exists()) {
          const account = toAccountSnapshot.val() as Account;
          updates[`${toAccountRefPath}/currentBalance`] = account.currentBalance + transactionForFirebase.amount;
        }
      }
    }
    
    if (transactionForFirebase.savingGoalId && transactionForFirebase.type === 'income') {
      const goalRefPath = `users/${user.uid}/savingGoals/${transactionForFirebase.savingGoalId}`;
      const goalSnapshot = await get(ref(db, goalRefPath));
      if (goalSnapshot.exists()) {
        const goal = goalSnapshot.val() as SavingGoal;
        const newCurrentAmount = goal.currentAmount + transactionForFirebase.amount;
        updates[`${goalRefPath}/currentAmount`] = newCurrentAmount;
        updates[`${goalRefPath}/status`] = newCurrentAmount >= goal.targetAmount ? 'completed' : 'active';
      }
    }
    await firebaseUpdate(ref(db), updates);
  }, [user]);

  const updateTransaction = useCallback(async (updatedTransaction: Transaction) => {
    if (!user) return;
    if (updatedTransaction.relatedDebtTransactionId && updatedTransaction.type !== 'transfer') {
        console.warn("Attempted to update a debt-related transaction from general form. This is not allowed for non-transfers.");
        return;
    }

    const transactionRefPath = `users/${user.uid}/transactions/${updatedTransaction.id}`;
    const originalTransactionSnapshot = await get(ref(db, transactionRefPath));
    if (!originalTransactionSnapshot.exists()) {
      console.error("Original transaction not found for update");
      return;
    }
    const originalTransaction = originalTransactionSnapshot.val() as Transaction;
    const updates: { [key: string]: any } = {};

    if (originalTransaction.type === 'expense' && originalTransaction.accountId) {
      const accRef = `users/${user.uid}/accounts/${originalTransaction.accountId}`;
      const accSnap = await get(ref(db, accRef));
      if (accSnap.exists()) updates[accRef + '/currentBalance'] = accSnap.val().currentBalance + originalTransaction.amount;
    } else if (originalTransaction.type === 'income' && originalTransaction.accountId) {
      const accRef = `users/${user.uid}/accounts/${originalTransaction.accountId}`;
      const accSnap = await get(ref(db, accRef));
      if (accSnap.exists()) updates[accRef + '/currentBalance'] = accSnap.val().currentBalance - originalTransaction.amount;
    } else if (originalTransaction.type === 'transfer') {
      if (originalTransaction.fromAccountId) {
        const fromAccRef = `users/${user.uid}/accounts/${originalTransaction.fromAccountId}`;
        const fromAccSnap = await get(ref(db, fromAccRef));
        if (fromAccSnap.exists()) updates[fromAccRef + '/currentBalance'] = fromAccSnap.val().currentBalance + originalTransaction.amount;
      }
      if (originalTransaction.toAccountId) {
        const toAccRef = `users/${user.uid}/accounts/${originalTransaction.toAccountId}`;
        const toAccSnap = await get(ref(db, toAccRef));
        if (toAccSnap.exists()) updates[toAccRef + '/currentBalance'] = toAccSnap.val().currentBalance - originalTransaction.amount;
      }
    }

    if (originalTransaction.savingGoalId && originalTransaction.type === 'income') {
        const oldGoalRefPath = `users/${user.uid}/savingGoals/${originalTransaction.savingGoalId}`;
        const oldGoalSnapshot = await get(ref(db, oldGoalRefPath));
        if (oldGoalSnapshot.exists()) {
            const goal = oldGoalSnapshot.val() as SavingGoal;
            const newCurrentAmount = goal.currentAmount - originalTransaction.amount;
            updates[`${oldGoalRefPath}/currentAmount`] = newCurrentAmount;
            updates[`${oldGoalRefPath}/status`] = newCurrentAmount < goal.targetAmount ? 'active' : 'completed';
        }
    }
    
    if (updatedTransaction.type === 'expense' && updatedTransaction.accountId) {
      const accRef = `users/${user.uid}/accounts/${updatedTransaction.accountId}`;
      const accSnap = await get(child(ref(db), accRef)); 
      if (accSnap.exists()) updates[accRef + '/currentBalance'] = (updates[accRef + '/currentBalance'] ?? accSnap.val().currentBalance) - updatedTransaction.amount;
    } else if (updatedTransaction.type === 'income' && updatedTransaction.accountId) {
      const accRef = `users/${user.uid}/accounts/${updatedTransaction.accountId}`;
      const accSnap = await get(child(ref(db), accRef));
      if (accSnap.exists()) updates[accRef + '/currentBalance'] = (updates[accRef + '/currentBalance'] ?? accSnap.val().currentBalance) + updatedTransaction.amount;
    } else if (updatedTransaction.type === 'transfer') {
      if (updatedTransaction.fromAccountId) {
        const fromAccRef = `users/${user.uid}/accounts/${updatedTransaction.fromAccountId}`;
        const fromAccSnap = await get(child(ref(db), fromAccRef));
        if (fromAccSnap.exists()) updates[fromAccRef + '/currentBalance'] = (updates[fromAccRef + '/currentBalance'] ?? fromAccSnap.val().currentBalance) - updatedTransaction.amount;
      }
      if (updatedTransaction.toAccountId) {
        const toAccRef = `users/${user.uid}/accounts/${updatedTransaction.toAccountId}`;
        const toAccSnap = await get(child(ref(db), toAccRef));
        if (toAccSnap.exists()) updates[toAccRef + '/currentBalance'] = (updates[toAccRef + '/currentBalance'] ?? toAccSnap.val().currentBalance) + updatedTransaction.amount;
      }
    }
    
    if (updatedTransaction.savingGoalId && updatedTransaction.type === 'income') {
        const newGoalRefPath = `users/${user.uid}/savingGoals/${updatedTransaction.savingGoalId}`;
        const newGoalSnapshot = await get(child(ref(db),newGoalRefPath));
        if (newGoalSnapshot.exists()) {
            const goal = newGoalSnapshot.val() as SavingGoal;
            const newCurrentAmount = (updates[`${newGoalRefPath}/currentAmount`] ?? goal.currentAmount) + updatedTransaction.amount;
            updates[`${newGoalRefPath}/currentAmount`] = newCurrentAmount;
            updates[`${newGoalRefPath}/status`] = newCurrentAmount >= goal.targetAmount ? 'completed' : 'active';
        }
    }

    const finalTransactionDataForFirebase: Transaction = {
        id: updatedTransaction.id,
        date: formatISO(parseISO(updatedTransaction.date)),
        description: updatedTransaction.description,
        amount: updatedTransaction.amount,
        type: updatedTransaction.type,
        accountId: updatedTransaction.type === 'transfer' ? null : (updatedTransaction.accountId || null),
        payee: updatedTransaction.payee || null,
        relatedDebtTransactionId: updatedTransaction.relatedDebtTransactionId || null,
        categoryId: updatedTransaction.type !== 'transfer' ? (updatedTransaction.categoryId || DEFAULT_CATEGORY_ID) : null,
        fromAccountId: updatedTransaction.type === 'transfer' ? (updatedTransaction.fromAccountId || null) : null,
        toAccountId: updatedTransaction.type === 'transfer' ? (updatedTransaction.toAccountId || null) : null,
        savingGoalId: (updatedTransaction.type === 'expense' || updatedTransaction.type === 'income') ? (updatedTransaction.savingGoalId || null) : null,
    };

    updates[transactionRefPath] = finalTransactionDataForFirebase;
    await firebaseUpdate(ref(db), updates);
  }, [user]);

  const deleteTransaction = useCallback(async (transactionId: string) => {
    if (!user) return;
    const transactionRefPath = `users/${user.uid}/transactions/${transactionId}`;
    const transactionSnapshot = await get(ref(db, transactionRefPath));

    if (!transactionSnapshot.exists()) {
        console.error("Transaction not found for deletion");
        return;
    }
    const transactionToDelete = transactionSnapshot.val() as Transaction;
    const updates: { [key: string]: any } = {};

    if (transactionToDelete.relatedDebtTransactionId) {
        const debtTransactionRefPath = `users/${user.uid}/debtTransactions/${transactionToDelete.relatedDebtTransactionId}`;
        const debtTransactionSnapshot = await get(ref(db, debtTransactionRefPath));

        if (debtTransactionSnapshot.exists()) {
            const debtTransaction = debtTransactionSnapshot.val() as DebtTransaction;
            updates[debtTransactionRefPath] = null; 

            const parentDebtRefPath = `users/${user.uid}/debts/${debtTransaction.debtId}`;
            const parentDebtSnapshot = await get(ref(db, parentDebtRefPath));
            if (parentDebtSnapshot.exists()) {
                const parentDebt = parentDebtSnapshot.val() as Debt;
                let newDebtBalance = parentDebt.currentBalance + debtTransaction.amount;

                let newDebtStatus: Debt['status'] = 'parcial';
                if (newDebtBalance <= 0) newDebtStatus = 'pagada';
                else if (newDebtBalance >= parentDebt.initialAmount) newDebtStatus = 'pendiente';

                updates[`${parentDebtRefPath}/currentBalance`] = newDebtBalance;
                updates[`${parentDebtRefPath}/status`] = newDebtStatus;
            }
        }
        
        if (transactionToDelete.accountId) {
            const debtAccountRefPath = `users/${user.uid}/accounts/${transactionToDelete.accountId}`;
            const debtAccountSnapshot = await get(ref(db, debtAccountRefPath));
            if (debtAccountSnapshot.exists()) {
                const account = debtAccountSnapshot.val() as Account;
                if (transactionToDelete.type === 'expense') { 
                    updates[`${debtAccountRefPath}/currentBalance`] = account.currentBalance + transactionToDelete.amount;
                } else if (transactionToDelete.type === 'income') { 
                    updates[`${debtAccountRefPath}/currentBalance`] = account.currentBalance - transactionToDelete.amount;
                }
            }
        }
    } else { 
      if (transactionToDelete.type === 'expense' && transactionToDelete.accountId) {
        const accountRefPath = `users/${user.uid}/accounts/${transactionToDelete.accountId}`;
        const accountSnapshot = await get(ref(db, accountRefPath));
        if (accountSnapshot.exists()) {
          updates[`${accountRefPath}/currentBalance`] = accountSnapshot.val().currentBalance + transactionToDelete.amount;
        }
      } else if (transactionToDelete.type === 'income' && transactionToDelete.accountId) {
        const accountRefPath = `users/${user.uid}/accounts/${transactionToDelete.accountId}`;
        const accountSnapshot = await get(ref(db, accountRefPath));
        if (accountSnapshot.exists()) {
          updates[`${accountRefPath}/currentBalance`] = accountSnapshot.val().currentBalance - transactionToDelete.amount;
        }
      } else if (transactionToDelete.type === 'transfer') {
        if (transactionToDelete.fromAccountId) {
          const fromAccountRefPath = `users/${user.uid}/accounts/${transactionToDelete.fromAccountId}`;
          const fromAccountSnapshot = await get(ref(db, fromAccountRefPath));
          if (fromAccountSnapshot.exists()) {
              updates[`${fromAccountRefPath}/currentBalance`] = fromAccountSnapshot.val().currentBalance + transactionToDelete.amount;
          }
        }
        if (transactionToDelete.toAccountId) {
          const toAccountRefPath = `users/${user.uid}/accounts/${transactionToDelete.toAccountId}`;
          const toAccountSnapshot = await get(ref(db, toAccountRefPath));
          if (toAccountSnapshot.exists()) {
              updates[`${toAccountRefPath}/currentBalance`] = toAccountSnapshot.val().currentBalance - transactionToDelete.amount;
          }
        }
      }
      if (transactionToDelete.savingGoalId && transactionToDelete.type === 'income') {
        const goalRefPath = `users/${user.uid}/savingGoals/${transactionToDelete.savingGoalId}`;
        const goalSnapshot = await get(ref(db, goalRefPath));
        if (goalSnapshot.exists()) {
          const goal = goalSnapshot.val() as SavingGoal;
          const newCurrentAmount = goal.currentAmount - transactionToDelete.amount;
          updates[`${goalRefPath}/currentAmount`] = newCurrentAmount;
          updates[`${goalRefPath}/status`] = newCurrentAmount < goal.targetAmount ? 'active' : 'completed';
        }
      }
    }

    updates[transactionRefPath] = null; 
    await firebaseUpdate(ref(db), updates);
}, [user]);


  const addBudget = useCallback(async (budgetData: Omit<Budget, 'id'>) => {
    if (!user) return;
    const budgetsPath = `users/${user.uid}/budgets`;
    const existingBudget = budgets.find(b => b.categoryId === budgetData.categoryId && b.month === budgetData.month);

    if (existingBudget) {
        const budgetRef = ref(db, `${budgetsPath}/${existingBudget.id}`);
        await set(budgetRef, { ...existingBudget, ...budgetData });
    } else {
        const newBudgetRef = push(ref(db, budgetsPath));
        const newBudget: Budget = { ...budgetData, id: newBudgetRef.key! };
        await set(newBudgetRef, newBudget);
    }
  }, [user, budgets]);

  const updateBudget = useCallback(async (updatedBudget: Budget) => {
    if (!user) return;
    const budgetRef = ref(db, `users/${user.uid}/budgets/${updatedBudget.id}`);
    await set(budgetRef, updatedBudget);
  }, [user]);

  const deleteBudget = useCallback(async (budgetId: string) => {
    if (!user) return;
    const budgetRef = ref(db, `users/${user.uid}/budgets/${budgetId}`);
    await firebaseRemove(budgetRef);
  }, [user]);

  const addCategory = useCallback(async (categoryData: Omit<Category, 'id'>) => {
    if (!user) return;
    const categoriesRefPath = `users/${user.uid}/categories`;
    const newCategoryRef = push(ref(db, categoriesRefPath));
    const newCategory: Category = {
      ...categoryData,
      id: newCategoryRef.key!,
      color: categoryData.color || null,
      parentId: categoryData.parentId || null,
    };
    await set(newCategoryRef, newCategory);
  }, [user]);

  const updateCategory = useCallback(async (updatedCategory: Category) => {
    if (!user) return;
    const categoryToSave: Category = {
        ...updatedCategory,
        color: updatedCategory.color || null,
        parentId: updatedCategory.parentId || null,
    };
    const categoryRef = ref(db, `users/${user.uid}/categories/${updatedCategory.id}`);
    await set(categoryRef, categoryToSave);
  }, [user]);

  const isCategoryInUse = useCallback((categoryId: string): boolean => {
    const inTransactions = transactions.some(t => t.categoryId === categoryId && (t.type === 'expense' || t.type === 'income'));
    const inBudgets = budgets.some(b => b.categoryId === categoryId);
    const inRecurring = recurringTransactions.some(rt => rt.categoryId === categoryId);
    const isParentCategory = categories.some(c => c.parentId === categoryId);
    return inTransactions || inBudgets || isParentCategory || inRecurring;
  }, [transactions, budgets, categories, recurringTransactions]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!user || RESERVED_CATEGORY_IDS.includes(categoryId)) return;
    if (isCategoryInUse(categoryId)) {
        console.warn(`Category ${categoryId} is in use.`);
        return;
    }
    const categoryRef = ref(db, `users/${user.uid}/categories/${categoryId}`);
    await firebaseRemove(categoryRef);
  }, [user, isCategoryInUse]);

  const getCategoryById = useCallback((id: string | null | undefined): Category | undefined => {
    if (!id) return undefined;
    return categories.find((cat) => cat.id === id);
  }, [categories]);

  const getCategoryByName = useCallback((name: string): Category | undefined => {
    if (!name) return undefined;
    let foundCategory = categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
    if (foundCategory) return foundCategory;
    if (name.includes(' / ')) {
      const parts = name.split(' / ').map(p => p.trim());
      const parentName = parts[0];
      const childName = parts[1];
      const parentCategory = categories.find(cat => cat.name.toLowerCase() === parentName.toLowerCase() && !cat.parentId);
      if (parentCategory) {
        foundCategory = categories.find(cat => cat.name.toLowerCase() === childName.toLowerCase() && cat.parentId === parentCategory.id);
        if (foundCategory) return foundCategory;
      }
    }
    const lastNamePart = name.includes(' / ') ? name.split(' / ').pop()!.trim() : name.trim();
    return categories.find(cat => cat.name.toLowerCase() === lastNamePart.toLowerCase());
  }, [categories]);

  const getParentCategories = useCallback((): Category[] => {
    return categories.filter(cat => !cat.parentId).sort((a,b) => a.name.localeCompare(b.name));
  }, [categories]);

  const getSubcategories = useCallback((parentId: string): Category[] => {
    return categories.filter(cat => cat.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
  }, [categories]);

  const getCategoryName = useCallback((categoryId: string | null | undefined): string => {
    if (!categoryId) return 'N/A';
    const category = getCategoryById(categoryId);
    if (!category) return 'Desconocida';
    if (category.parentId) {
      const parentCategory = getCategoryById(category.parentId);
      return `${parentCategory?.name || 'Principal'} / ${category.name}`;
    }
    return category.name;
  }, [getCategoryById]);

  const getExpenseTemplates = useCallback((): ExpenseTemplate[] => {
    return expenseTemplates.sort((a,b) => a.name.localeCompare(b.name));
  }, [expenseTemplates]);

  const addExpenseTemplate = useCallback(async (templateData: Omit<ExpenseTemplate, 'id'>) => {
    if (!user) return;
    const templateRefPath = `users/${user.uid}/expenseTemplates`;
    const newTemplateRef = push(ref(db, templateRefPath));
    const newTemplate: ExpenseTemplate = { ...templateData, id: newTemplateRef.key! };
    await set(newTemplateRef, newTemplate);
  }, [user]);

  const updateExpenseTemplate = useCallback(async (updatedTemplate: ExpenseTemplate) => {
    if (!user) return;
    const templateRef = ref(db, `users/${user.uid}/expenseTemplates/${updatedTemplate.id}`);
    await set(templateRef, updatedTemplate);
  }, [user]);

  const deleteExpenseTemplate = useCallback(async (templateId: string) => {
    if (!user) return;
    const templateRef = ref(db, `users/${user.uid}/expenseTemplates/${templateId}`);
    await firebaseRemove(templateRef);
  }, [user]);

  const addAccount = useCallback(async (accountData: Omit<Account, 'id' | 'currentBalance'>) => {
    if (!user) return;
    const accountRefPath = `users/${user.uid}/accounts`;
    const newAccountRef = push(ref(db, accountRefPath));
    const newAccount: Account = {
      ...accountData,
      color: accountData.color || null,
      id: newAccountRef.key!,
      currentBalance: accountData.initialBalance
    };
    await set(newAccountRef, newAccount);
  }, [user]);

  const updateAccount = useCallback(async (updatedAccount: Account) => {
    if (!user) return;
    const accountDataToSave: Account = {
      ...updatedAccount,
      color: updatedAccount.color || null,
    };
    const accountRef = ref(db, `users/${user.uid}/accounts/${updatedAccount.id}`);
    await set(accountRef, accountDataToSave);
  }, [user]);

  const isAccountInUse = useCallback((accountId: string): boolean => {
    const inTransactions = transactions.some(t => t.accountId === accountId || (t.type === 'transfer' && (t.fromAccountId === accountId || t.toAccountId === accountId)));
    const inDebtTransactions = debtTransactions.some(dt => dt.accountId === accountId);
    const inRecurring = recurringTransactions.some(rt => rt.accountId === accountId);
    return inTransactions || inDebtTransactions || inRecurring;
  }, [transactions, debtTransactions, recurringTransactions]);

  const getAccountById = useCallback((accountId: string | null | undefined): Account | undefined => {
    if (!accountId) return undefined;
    return accounts.find(acc => acc.id === accountId);
  }, [accounts]);

  const getAccountByName = useCallback((name: string): Account | undefined => {
    if (!name) return undefined;
    return accounts.find(acc => acc.name.toLowerCase() === name.toLowerCase());
  }, [accounts]);
  
  const getAccountName = useCallback((accountId: string | null | undefined): string => {
    if (!accountId) return 'N/A';
    const account = getAccountById(accountId);
    return account?.name || 'Cuenta Desconocida';
  }, [getAccountById]);

  const deleteAccount = useCallback(async (accountId: string) => {
    if (!user || accountId === DEFAULT_ACCOUNT_ID) return;
    if (isAccountInUse(accountId)) {
      console.warn(`Account ${accountId} is in use.`);
      return;
    }
    const accountRef = ref(db, `users/${user.uid}/accounts/${accountId}`);
    await firebaseRemove(accountRef);
  }, [user, isAccountInUse]);

  const addDebt = useCallback(async (debtData: Omit<Debt, 'id' | 'currentBalance' | 'creationDate' | 'status'> & {dueDate?: Date}): Promise<Debt | null> => {
    if (!user) return null;
    const debtRefPath = `users/${user.uid}/debts`;
    const newDebtRef = push(ref(db, debtRefPath));
    const newDebt: Debt = {
      ...debtData,
      id: newDebtRef.key!,
      currentBalance: debtData.initialAmount,
      creationDate: formatISO(new Date()),
      dueDate: debtData.dueDate ? formatISO(debtData.dueDate, { representation: 'date' }) : null,
      status: debtData.initialAmount === 0 ? 'pagada' : 'pendiente',
    };
    await set(newDebtRef, newDebt);
    return newDebt;
  }, [user]);

  const getDebtById = useCallback((debtId: string): Debt | undefined => {
    return debts.find(d => d.id === debtId);
  }, [debts]);

  const addDebtTransaction = useCallback(async (transactionData: Omit<DebtTransaction, 'id' | 'transactionDate' | 'relatedTransactionId'> & {transactionDate: Date; accountId: string;}): Promise<DebtTransaction | null> => {
    if (!user || !transactionData.accountId) return null;

    const debtRefPath = `users/${user.uid}/debts/${transactionData.debtId}`;
    const parentDebtSnapshot = await get(ref(db, debtRefPath));

    if (!parentDebtSnapshot.exists()) return null;
    const parentDebt = parentDebtSnapshot.val() as Debt;

    const debtTransactionRefPath = `users/${user.uid}/debtTransactions`;
    const newDebtTransactionRef = push(ref(db, debtTransactionRefPath));

    const generalTransactionRefPath = `users/${user.uid}/transactions`;
    const newGeneralTransactionRef = push(ref(db, generalTransactionRefPath));

    const newDebtTransaction: DebtTransaction = {
      id: newDebtTransactionRef.key!,
      debtId: transactionData.debtId,
      type: transactionData.type,
      amount: transactionData.amount,
      transactionDate: formatISO(transactionData.transactionDate),
      notes: transactionData.notes || null,
      accountId: transactionData.accountId,
      relatedTransactionId: newGeneralTransactionRef.key!,
    };

    const generalTransaction: Transaction = {
      id: newGeneralTransactionRef.key!,
      accountId: transactionData.accountId,
      type: transactionData.type === 'abono_realizado' ? 'expense' : 'income',
      description: transactionData.type === 'abono_realizado' ? `Abono a deuda: ${parentDebt.name}` : `Abono recibido de deuda: ${parentDebt.name}`,
      amount: transactionData.amount,
      date: formatISO(transactionData.transactionDate),
      categoryId: DEFAULT_CATEGORY_ID, 
      relatedDebtTransactionId: newDebtTransaction.id,
      fromAccountId: null,
      toAccountId: null,
      payee: transactionData.type === 'abono_realizado' ? parentDebt.debtorOrCreditor : undefined,
      savingGoalId: null, 
    };

    const updates: {[key: string]: any} = {};
    updates[`${debtTransactionRefPath}/${newDebtTransaction.id}`] = newDebtTransaction;
    updates[`${generalTransactionRefPath}/${generalTransaction.id}`] = generalTransaction;


    const newBalance = parentDebt.currentBalance - newDebtTransaction.amount;
    let newStatus: Debt['status'] = 'parcial';
    if (newBalance <= 0) {
      newStatus = 'pagada';
    } else if (newBalance >= parentDebt.initialAmount && parentDebt.initialAmount > 0) {
      newStatus = 'pendiente';
    } else if (newBalance > 0 && newBalance < parentDebt.initialAmount) {
      newStatus = 'parcial';
    } else if (parentDebt.initialAmount === 0 && newBalance === 0) {
      newStatus = 'pagada';
    }

    updates[`${debtRefPath}/currentBalance`] = newBalance;
    updates[`${debtRefPath}/status`] = newStatus;

    const accountRefPath = `users/${user.uid}/accounts/${transactionData.accountId}`;
    const accountSnapshot = await get(ref(db, accountRefPath));
    if (accountSnapshot.exists()) {
      const account = accountSnapshot.val() as Account;
      let updatedAccountBalance = account.currentBalance;
      if (generalTransaction.type === 'expense') {
        updatedAccountBalance -= generalTransaction.amount;
      } else if (generalTransaction.type === 'income') {
        updatedAccountBalance += generalTransaction.amount;
      }
      updates[`${accountRefPath}/currentBalance`] = updatedAccountBalance;
    }

    await firebaseUpdate(ref(db), updates);
    return newDebtTransaction;
  }, [user]);

  const deleteDebtTransaction = useCallback(async (debtTransactionId: string, debtId: string) => {
    if (!user) return;

    const debtTransactionRefPath = `users/${user.uid}/debtTransactions/${debtTransactionId}`;
    const debtTransactionSnapshot = await get(ref(db, debtTransactionRefPath));

    if (!debtTransactionSnapshot.exists()) {
      console.error("Debt transaction not found for deletion");
      return;
    }
    const debtTransactionToDelete = debtTransactionSnapshot.val() as DebtTransaction;

    const updates: { [key: string]: any } = {};
    updates[debtTransactionRefPath] = null;

    const parentDebtRefPath = `users/${user.uid}/debts/${debtId}`;
    const parentDebtSnapshot = await get(ref(db, parentDebtRefPath));
    if (parentDebtSnapshot.exists()) {
      const parentDebt = parentDebtSnapshot.val() as Debt;
      let newBalance = parentDebt.currentBalance + debtTransactionToDelete.amount;
      let newStatus: Debt['status'] = 'parcial';
      if (newBalance <= 0) newStatus = 'pagada';
      else if (newBalance >= parentDebt.initialAmount && parentDebt.initialAmount > 0 ) newStatus = 'pendiente';
      else if (parentDebt.initialAmount === 0 && newBalance === 0) newStatus = 'pagada';

      updates[`${parentDebtRefPath}/currentBalance`] = newBalance;
      updates[`${parentDebtRefPath}/status`] = newStatus;
    }

    if (debtTransactionToDelete.relatedTransactionId) {
      const generalTransactionRefPath = `users/${user.uid}/transactions/${debtTransactionToDelete.relatedTransactionId}`;
      const generalTransactionSnapshot = await get(ref(db, generalTransactionRefPath));

      if (generalTransactionSnapshot.exists()) {
        const generalTransaction = generalTransactionSnapshot.val() as Transaction;
        updates[generalTransactionRefPath] = null;

        if (generalTransaction.accountId) { 
            const accountRefPath = `users/${user.uid}/accounts/${generalTransaction.accountId}`;
            const accountSnapshot = await get(ref(db, accountRefPath));
            if (accountSnapshot.exists()) {
                const account = accountSnapshot.val() as Account;
                let updatedAccountBalance = account.currentBalance;
                if (generalTransaction.type === 'expense') { 
                    updatedAccountBalance += generalTransaction.amount;
                } else if (generalTransaction.type === 'income') { 
                    updatedAccountBalance -= generalTransaction.amount;
                }
                updates[`${accountRefPath}/currentBalance`] = updatedAccountBalance;
            }
        }
      }
    }
    await firebaseUpdate(ref(db), updates);
  }, [user]);


  const getTransactionsForDebt = useCallback((debtId: string): DebtTransaction[] => {
    return debtTransactions.filter(t => t.debtId === debtId).sort((a,b) => parseISO(b.transactionDate).getTime() - parseISO(a.transactionDate).getTime());
  }, [debtTransactions]);

  const deleteDebt = useCallback(async (debtId: string) => {
    if (!user) return;
    const associatedDebtTransactions = getTransactionsForDebt(debtId);
    if (associatedDebtTransactions.length > 0) {
      console.warn(`Debt ${debtId} has associated transactions. Delete them first.`);
      return;
    }

    const updates: {[key: string]: any} = {};
    updates[`users/${user.uid}/debts/${debtId}`] = null;
    await firebaseUpdate(ref(db), updates);
  }, [user, getTransactionsForDebt]);

  const addSavingGoal = useCallback(async (goalData: Omit<SavingGoal, 'id' | 'currentAmount' | 'creationDate' | 'status'> & { targetDate?: Date }): Promise<SavingGoal | null> => {
    if (!user) return null;
    const goalRefPath = `users/${user.uid}/savingGoals`;
    const newGoalRef = push(ref(db, goalRefPath));
    const newGoal: SavingGoal = {
      ...goalData,
      id: newGoalRef.key!,
      currentAmount: 0,
      creationDate: formatISO(new Date()),
      targetDate: goalData.targetDate ? formatISO(goalData.targetDate, { representation: 'date' }) : null,
      status: 'active',
      color: goalData.color || null,
    };
    await set(newGoalRef, newGoal);
    return newGoal;
  }, [user]);

  const updateSavingGoal = useCallback(async (updatedGoal: SavingGoal) => {
    if (!user) return;
    const goalToSave: SavingGoal = {
      ...updatedGoal,
      color: updatedGoal.color || null,
      targetDate: updatedGoal.targetDate ? formatISO(parseISO(updatedGoal.targetDate), { representation: 'date' }) : null,
      status: updatedGoal.currentAmount >= updatedGoal.targetAmount ? 'completed' : 'active',
    };
    const goalRef = ref(db, `users/${user.uid}/savingGoals/${updatedGoal.id}`);
    await set(goalRef, goalToSave);
  }, [user]);

  const deleteSavingGoal = useCallback(async (goalId: string) => {
    if (!user) return;
    const goalRef = ref(db, `users/${user.uid}/savingGoals/${goalId}`);
    await firebaseRemove(goalRef);
    
    const updates: {[key:string]: any} = {};
    transactions.forEach(t => {
      if (t.savingGoalId === goalId) {
        updates[`users/${user.uid}/transactions/${t.id}/savingGoalId`] = null;
      }
    });
    if(Object.keys(updates).length > 0) {
      await firebaseUpdate(ref(db), updates);
    }
  }, [user, transactions]);

  const getSavingGoalById = useCallback((goalId: string | null | undefined): SavingGoal | undefined => {
    if (!goalId) return undefined;
    return savingGoals.find(g => g.id === goalId);
  }, [savingGoals]);

  const getSavingGoalByName = useCallback((name: string): SavingGoal | undefined => {
    if (!name) return undefined;
    return savingGoals.find(g => g.name.toLowerCase() === name.toLowerCase());
  }, [savingGoals]);

  const getSavingGoalName = useCallback((goalId: string | null | undefined): string => {
    if (!goalId) return 'N/A';
    const goal = getSavingGoalById(goalId);
    return goal?.name || 'Objetivo Desconocido';
  }, [getSavingGoalById]);

  const transactionsBySavingGoal = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    if (!dataLoading) {
        savingGoals.forEach(goal => {
            if (!map.has(goal.id)) {
                map.set(goal.id, []);
            }
        });
        transactions.forEach(t => {
            if (t.savingGoalId) {
                const goalTransactions = map.get(t.savingGoalId) || [];
                goalTransactions.push(t);
                map.set(t.savingGoalId, goalTransactions);
            }
        });
    }
    return map;
  }, [transactions, savingGoals, dataLoading]);

  const getTransactionsForSavingGoal = useCallback((goalId: string): Transaction[] => {
    return transactionsBySavingGoal.get(goalId) || [];
  }, [transactionsBySavingGoal]);


  const updateThemeSettings = useCallback(async (newSettings: ThemeSettings) => {
    if (!user) return;
    const settingsToSave = { ...DEFAULT_THEME_SETTINGS, ...newSettings };
    const themeSettingsRef = ref(db, `users/${user.uid}/themeSettings`);
    await set(themeSettingsRef, settingsToSave);
    setThemeSettings(settingsToSave); 
  }, [user]);

  const formatUserCurrency = useCallback((amount: number, currencyCode: string = DEFAULT_CURRENCY): string => {
    const locale = themeSettings?.numberFormatLocale || DEFAULT_THEME_SETTINGS.numberFormatLocale || 'es-ES';
    try {
        if (currencyCode === DEFAULT_CURRENCY) {
        return new Intl.NumberFormat(locale, {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
        } else {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
        }
    } catch (e) {
        console.warn(`Invalid locale ${locale} used for currency formatting. Falling back to es-ES.`);
        return new Intl.NumberFormat('es-ES', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    }
  }, [themeSettings?.numberFormatLocale]);

  const addRecurringTransaction = useCallback(async (recordData: Omit<RecurringTransaction, 'id' | 'nextDueDate' | 'lastProcessedDate'>) => {
    if (!user) return null;

    const { startDate, frequency } = recordData;
    const nextDueDate = calculateNextDueDate(startDate, frequency as RecurringTransactionFrequency); 

    const recurringTransactionRefPath = `users/${user.uid}/recurringTransactions`;
    const newRecurringTransactionRef = push(ref(db, recurringTransactionRefPath));
    const newRecord: RecurringTransaction = {
      id: newRecurringTransactionRef.key!,
      name: recordData.name,
      type: recordData.type,
      amount: recordData.amount,
      categoryId: recordData.categoryId || null,
      accountId: recordData.accountId || null,
      payee: recordData.payee || null,
      frequency: recordData.frequency as RecurringTransactionFrequency,
      startDate: recordData.startDate, 
      endDate: recordData.endDate || null, 
      notes: recordData.notes || null,
      isActive: recordData.isActive !== undefined ? recordData.isActive : true,
      nextDueDate: nextDueDate,
      lastProcessedDate: null,
    };
    await set(newRecurringTransactionRef, newRecord);
    return newRecord;
  }, [user]);

  const updateRecurringTransaction = useCallback(async (updatedRecord: RecurringTransaction) => {
    if (!user) return;
    const { startDate, frequency, lastProcessedDate } = updatedRecord;
    const nextDueDate = calculateNextDueDate(startDate, frequency, lastProcessedDate || undefined);
    
    const recordToSave: RecurringTransaction = {
      ...updatedRecord,
      categoryId: updatedRecord.categoryId || null,
      accountId: updatedRecord.accountId || null,
      payee: updatedRecord.payee || null,
      endDate: updatedRecord.endDate || null,
      notes: updatedRecord.notes || null,
      nextDueDate: nextDueDate,
    };

    const recordRef = ref(db, `users/${user.uid}/recurringTransactions/${updatedRecord.id}`);
    await set(recordRef, recordToSave);
  }, [user]);

  const deleteRecurringTransaction = useCallback(async (recurringId: string) => {
    if (!user) return;
    const recordRef = ref(db, `users/${user.uid}/recurringTransactions/${recurringId}`);
    await firebaseRemove(recordRef);
  }, [user]);

  const getRecurringTransactionById = useCallback((recurringId: string): RecurringTransaction | undefined => {
    return recurringTransactions.find(rt => rt.id === recurringId);
  }, [recurringTransactions]);

  const processRecurringTransactionAsDone = useCallback(async (recurringId: string, processedDate: string) => {
    if (!user) return;
    const record = getRecurringTransactionById(recurringId);
    if (!record) return;

    const nextDueDate = calculateNextDueDate(record.startDate, record.frequency, processedDate);
    const updatedRecord: RecurringTransaction = {
      ...record,
      lastProcessedDate: processedDate,
      nextDueDate: nextDueDate,
    };
    await updateRecurringTransaction(updatedRecord);
  }, [user, getRecurringTransactionById, updateRecurringTransaction]);


  const contextValue = useMemo(() => ({
    transactions,
    budgets,
    categories,
    expenseTemplates,
    accounts,
    debts,
    debtTransactions,
    themeSettings,
    savingGoals,
    recurringTransactions,
    transactionToPrefillFromRecurring,
    dataLoading,
    user,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addBudget,
    updateBudget,
    deleteBudget,
    getCategoryById,
    getCategoryByName,
    getParentCategories,
    getSubcategories,
    getCategoryName,
    addCategory,
    updateCategory,
    deleteCategory,
    isCategoryInUse,
    addExpenseTemplate,
    updateExpenseTemplate,
    deleteExpenseTemplate,
    getExpenseTemplates,
    addAccount,
    updateAccount,
    deleteAccount,
    getAccountById,
    getAccountByName,
    getAccountName,
    isAccountInUse,
    addDebt,
    getDebtById,
    addDebtTransaction,
    deleteDebtTransaction,
    getTransactionsForDebt,
    deleteDebt,
    updateThemeSettings,
    formatUserCurrency,
    addSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    getSavingGoalById,
    getSavingGoalByName,
    getSavingGoalName,
    getTransactionsForSavingGoal,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    getRecurringTransactionById,
    processRecurringTransactionAsDone,
    setTransactionToPrefillFromRecurring,
  }), [
    transactions, budgets, categories, expenseTemplates, accounts, debts, debtTransactions, themeSettings, savingGoals, recurringTransactions, transactionToPrefillFromRecurring, dataLoading, user,
    addTransaction, updateTransaction, deleteTransaction,
    addBudget, updateBudget, deleteBudget,
    getCategoryById, getCategoryByName, getParentCategories, getSubcategories, getCategoryName,
    addCategory, updateCategory, deleteCategory, isCategoryInUse,
    addExpenseTemplate, updateExpenseTemplate, deleteExpenseTemplate, getExpenseTemplates,
    addAccount, updateAccount, deleteAccount, getAccountById, getAccountByName, getAccountName, isAccountInUse,
    addDebt, getDebtById, addDebtTransaction, deleteDebtTransaction, getTransactionsForDebt, deleteDebt,
    updateThemeSettings, formatUserCurrency,
    addSavingGoal, updateSavingGoal, deleteSavingGoal, getSavingGoalById, getSavingGoalByName, getSavingGoalName, getTransactionsForSavingGoal, // Added dependency
    addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, getRecurringTransactionById, processRecurringTransactionAsDone, setTransactionToPrefillFromRecurring,
    transactionsBySavingGoal // Added dependency for the memoized map itself
  ]);

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData debe usarse dentro de un AppDataProvider');
  }
  return context;
}

