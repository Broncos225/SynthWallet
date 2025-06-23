
"use client";

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ref, onValue, set, push, remove as firebaseRemove, update as firebaseUpdate, get, child, serverTimestamp, type DatabaseReference, type User } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import type { Transaction, Budget, Category, ExpenseTemplate, Account, Debt, DebtTransaction, ThemeSettings, SavingGoal, TransactionType, RecurringTransaction, RecurringTransactionFrequency, Payee, FilterState } from '@/types';
import { INITIAL_CATEGORIES, DEFAULT_CATEGORY_ID, RESERVED_CATEGORY_IDS, DEFAULT_ACCOUNT_ID, INITIAL_ACCOUNTS, DEFAULT_THEME_SETTINGS, DEFAULT_CURRENCY } from '@/lib/constants';
import { formatISO, parseISO, isValid as dateFnsIsValid } from 'date-fns';
import { calculateNextDueDate, normalizeString } from '@/lib/utils';

export const initialFilterState: FilterState = {
  startDate: null,
  endDate: null,
  type: 'all',
  categoryId: 'all',
  accountId: 'all',
  description: '',
};

const LOCAL_STORAGE_FILTERS_KEY = 'synthwallet_transactionPageFilters';
const LOCAL_STORAGE_APPLIED_FILTERS_KEY = 'synthwallet_transactionPageAppliedFilters';

const loadFiltersFromLocalStorage = (key: string, defaultValue: FilterState): FilterState => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    return {
      ...defaultValue, // Ensure all keys from defaultValue are present
      ...parsed,
      startDate: parsed.startDate ? parseISO(parsed.startDate) : null,
      endDate: parsed.endDate ? parseISO(parsed.endDate) : null,
    };
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    // Attempt to remove corrupted item
    try {
      window.localStorage.removeItem(key);
    } catch (removeError) {
      console.error(`Error removing corrupted item ${key} from localStorage:`, removeError);
    }
    return defaultValue;
  }
};


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
  payees: Payee[];
  transactionToPrefill: Partial<Transaction> | null;
  dataLoading: boolean;
  user: any;

  transactionPageFilters: FilterState;
  setTransactionPageFilters: Dispatch<SetStateAction<FilterState>>;
  transactionPageAppliedFilters: FilterState;
  setTransactionPageAppliedFilters: Dispatch<SetStateAction<FilterState>>;

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

  addDebt: (debtData: Omit<Debt, 'id' | 'currentBalance' | 'creationDate' | 'status' | 'debtorOrCreditor'> & {dueDate?: Date, payeeId: string}) => Promise<Debt | null>;
  updateDebt: (updatedFields: Partial<Debt> & { id: string }) => Promise<void>;
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
  setTransactionToPrefill: Dispatch<SetStateAction<Partial<Transaction> | null>>;

  addPayee: (payeeData: Omit<Payee, 'id'>) => Promise<Payee | null>;
  updatePayee: (updatedPayee: Payee) => Promise<void>;
  deletePayee: (payeeId: string) => Promise<void>;
  getPayeeById: (payeeId: string | null | undefined) => Payee | undefined;
  getPayeeName: (payeeId: string | null | undefined) => string;
  getPayeeByName: (name: string) => Payee | undefined;
  isPayeeInUse: (payeeId: string) => boolean;
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
  const [payees, setPayees] = useState<Payee[]>([]);
  const [transactionToPrefill, setTransactionToPrefill] = useState<Partial<Transaction> | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [transactionPageFilters, setTransactionPageFilters] = useState<FilterState>(() =>
    loadFiltersFromLocalStorage(LOCAL_STORAGE_FILTERS_KEY, initialFilterState)
  );
  const [transactionPageAppliedFilters, setTransactionPageAppliedFilters] = useState<FilterState>(() =>
    loadFiltersFromLocalStorage(LOCAL_STORAGE_APPLIED_FILTERS_KEY, initialFilterState)
  );
  
  const prevUserRef = useRef<User | null>(user);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const filtersToSave = {
          ...transactionPageFilters,
          startDate: transactionPageFilters.startDate ? formatISO(transactionPageFilters.startDate) : null,
          endDate: transactionPageFilters.endDate ? formatISO(transactionPageFilters.endDate) : null,
        };
        window.localStorage.setItem(LOCAL_STORAGE_FILTERS_KEY, JSON.stringify(filtersToSave));
      } catch (error) {
        console.error("Error saving transactionPageFilters to localStorage", error);
      }
    }
  }, [transactionPageFilters]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const appliedFiltersToSave = {
          ...transactionPageAppliedFilters,
          startDate: transactionPageAppliedFilters.startDate ? formatISO(transactionPageAppliedFilters.startDate) : null,
          endDate: transactionPageAppliedFilters.endDate ? formatISO(transactionPageAppliedFilters.endDate) : null,
        };
        window.localStorage.setItem(LOCAL_STORAGE_APPLIED_FILTERS_KEY, JSON.stringify(appliedFiltersToSave));
      } catch (error) {
        console.error("Error saving transactionPageAppliedFilters to localStorage", error);
      }
    }
  }, [transactionPageAppliedFilters]);


  useEffect(() => {
    const wasLoggedIn = prevUserRef.current !== null;
    const isLoggedInNow = user !== null;

    if (isLoggedInNow) {
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
        payees: `${basePath}/payees`,
      };

      const ensureInitialData = async () => {
        const categoriesRef = ref(db, dataPaths.categories);
        const accountsRef = ref(db, dataPaths.accounts);
        const themeSettingsRef = ref(db, dataPaths.themeSettings);
        const payeesRef = ref(db, dataPaths.payees);

        const catSnapshot = await get(categoriesRef);
        let currentCategoriesData = catSnapshot.val() || {};
        let categoriesChanged = false;
        if (Object.keys(currentCategoriesData).length === 0) {
          INITIAL_CATEGORIES.forEach(cat => { currentCategoriesData[cat.id] = cat; });
          categoriesChanged = true;
        } else {
          RESERVED_CATEGORY_IDS.forEach(reservedId => {
            const initialReservedCat = INITIAL_CATEGORIES.find(cat => cat.id === reservedId);
            if (initialReservedCat) {
              if (!currentCategoriesData[reservedId]) {
                currentCategoriesData[reservedId] = initialReservedCat;
                categoriesChanged = true;
              } else if (reservedId === 'income' && currentCategoriesData[reservedId].parentId) {
                currentCategoriesData[reservedId].parentId = null;
                categoriesChanged = true;
              } else if ((reservedId === 'debt_payments' || reservedId === 'debt_collections') && currentCategoriesData[reservedId].parentId) {
                currentCategoriesData[reservedId].parentId = null;
                categoriesChanged = true;
              }
            }
          });
        }
        if (categoriesChanged) await set(categoriesRef, currentCategoriesData);

        const accSnapshot = await get(accountsRef);
        if (!accSnapshot.exists() || Object.keys(accSnapshot.val() || {}).length === 0) {
          const initialAccountsObject: {[key: string]: Account} = {};
          INITIAL_ACCOUNTS.forEach(acc => { initialAccountsObject[acc.id] = acc; });
          await set(accountsRef, initialAccountsObject);
        }
        
        const themeSnapshot = await get(themeSettingsRef);
        if (!themeSnapshot.exists()) {
            await set(themeSettingsRef, DEFAULT_THEME_SETTINGS);
            setThemeSettings(DEFAULT_THEME_SETTINGS); 
        } else {
            setThemeSettings({ ...DEFAULT_THEME_SETTINGS, ...themeSnapshot.val() });
        }

        const payeesSnapshot = await get(payeesRef);
        if (!payeesSnapshot.exists()) await set(payeesRef, {});

        // Load filters from localStorage if user logs in and there's no pre-existing state from same session
        if (!wasLoggedIn) { // Only load from localStorage if it's a fresh login to this session
            setTransactionPageFilters(loadFiltersFromLocalStorage(LOCAL_STORAGE_FILTERS_KEY, initialFilterState));
            setTransactionPageAppliedFilters(loadFiltersFromLocalStorage(LOCAL_STORAGE_APPLIED_FILTERS_KEY, initialFilterState));
        }

      };

      ensureInitialData().then(() => {
        const listeners = [
          onValue(ref(db, dataPaths.transactions), (snapshot) => setTransactions(sortTransactions(Object.values(snapshot.val() || {})))),
          onValue(ref(db, dataPaths.budgets), (snapshot) => setBudgets(Object.values(snapshot.val() || {}))),
          onValue(ref(db, dataPaths.categories), (snapshot) => {
              let loadedCategories: Category[] = [];
              const dbCategoriesSnapshot = snapshot.val();
              if (dbCategoriesSnapshot && Object.keys(dbCategoriesSnapshot).length > 0) loadedCategories = Object.values(dbCategoriesSnapshot);
              else loadedCategories = [...INITIAL_CATEGORIES];
              RESERVED_CATEGORY_IDS.forEach(reservedId => {
                  if (!loadedCategories.find(cat => cat.id === reservedId)) {
                      const initialReservedCat = INITIAL_CATEGORIES.find(cat => cat.id === reservedId);
                      if (initialReservedCat) loadedCategories.push(initialReservedCat);
                  }
              });
              const incomeCatIndex = loadedCategories.findIndex(cat => cat.id === 'income');
              if (incomeCatIndex > -1 && loadedCategories[incomeCatIndex].parentId) loadedCategories[incomeCatIndex].parentId = null;
              ['debt_payments', 'debt_collections'].forEach(debtCatId => {
                const debtCatIndex = loadedCategories.findIndex(cat => cat.id === debtCatId);
                if (debtCatIndex > -1 && loadedCategories[debtCatIndex].parentId) loadedCategories[debtCatIndex].parentId = null;
              });
              setCategories(loadedCategories.sort((a: Category, b: Category) => a.name.localeCompare(b.name)));
          }),
          onValue(ref(db, dataPaths.expenseTemplates), (snapshot) => setExpenseTemplates(Object.values(snapshot.val() || {}).sort((a: any, b: any) => a.name.localeCompare(b.name)))),
          onValue(ref(db, dataPaths.accounts), (snapshot) => {
            const dbAccounts = snapshot.val();
            if (dbAccounts && Object.keys(dbAccounts).length > 0) setAccounts(Object.values(dbAccounts).sort((a: any, b: any) => a.name.localeCompare(b.name)));
            else setAccounts(INITIAL_ACCOUNTS.sort((a,b) => a.name.localeCompare(b.name)));
          }),
          onValue(ref(db, dataPaths.debts), (snapshot) => setDebts(sortDebts(Object.values(snapshot.val() || {})))),
          onValue(ref(db, dataPaths.debtTransactions), (snapshot) => setDebtTransactions(sortDebtTransactions(Object.values(snapshot.val() || {})))),
          onValue(ref(db, dataPaths.themeSettings), (snapshot) => { 
             const loadedSettings = snapshot.val();
             setThemeSettings(loadedSettings ? { ...DEFAULT_THEME_SETTINGS, ...loadedSettings } : DEFAULT_THEME_SETTINGS);
          }),
          onValue(ref(db, dataPaths.savingGoals), (snapshot) => setSavingGoals(sortSavingGoals(Object.values(snapshot.val() || {})))),
          onValue(ref(db, dataPaths.recurringTransactions), (snapshot) => setRecurringTransactions(sortRecurringTransactions(Object.values(snapshot.val() || {})))),
          onValue(ref(db, dataPaths.payees), (snapshot) => setPayees(Object.values(snapshot.val() || {}).sort((a: any, b: any) => a.name.localeCompare(b.name)))),
        ];
        Promise.all(Object.values(dataPaths).map(path => get(ref(db, path)))).finally(() => setDataLoading(false));
        return () => listeners.forEach(unsubscribe => unsubscribe());
      });

    } else { 
      if (wasLoggedIn) { 
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
        setPayees([]);
        setTransactionToPrefill(null);
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(LOCAL_STORAGE_FILTERS_KEY);
          window.localStorage.removeItem(LOCAL_STORAGE_APPLIED_FILTERS_KEY);
        }
        setTransactionPageFilters(initialFilterState); 
        setTransactionPageAppliedFilters(initialFilterState); 
      } else {
        // App loaded, user is null, wasn't logged in before.
        // Filters are loaded from localStorage by useState initializer.
        // Theme is default. Other data is empty/initial.
        setThemeSettings(DEFAULT_THEME_SETTINGS);
      }
      setDataLoading(false);
    }
    prevUserRef.current = user;
  }, [user]);

  // --- Action Functions ---
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
      payeeId: transactionData.payeeId || null,
      fromAccountId: transactionData.type === 'transfer' ? (transactionData.fromAccountId || null) : null,
      toAccountId: transactionData.type === 'transfer' ? (transactionData.toAccountId || null) : null,
      relatedDebtTransactionId: transactionData.relatedDebtTransactionId || null,
      savingGoalId: (transactionData.type === 'expense' || transactionData.type === 'income') ? (transactionData.savingGoalId || null) : null,
      imageUrl: transactionData.imageUrl || null,
      notes: transactionData.notes || null,
    };

    const updates: { [key: string]: any } = {};
    updates[`${transactionRefPath}/${transactionForFirebase.id}`] = transactionForFirebase;

    let accountToUpdate: Account | undefined;
    let balanceChange = 0;

    if (transactionForFirebase.type === 'expense' && transactionForFirebase.accountId) {
      accountToUpdate = accounts.find(a => a.id === transactionForFirebase.accountId);
      balanceChange = -transactionForFirebase.amount;
      if (accountToUpdate) {
        updates[`users/${user.uid}/accounts/${accountToUpdate.id}/currentBalance`] = accountToUpdate.currentBalance + balanceChange;
      }
    } else if (transactionForFirebase.type === 'income' && transactionForFirebase.accountId) {
      accountToUpdate = accounts.find(a => a.id === transactionForFirebase.accountId);
      balanceChange = transactionForFirebase.amount;
      if (accountToUpdate) {
        updates[`users/${user.uid}/accounts/${accountToUpdate.id}/currentBalance`] = accountToUpdate.currentBalance + balanceChange;
      }
    } else if (transactionForFirebase.type === 'transfer') {
      if (transactionForFirebase.fromAccountId) {
        const fromAccount = accounts.find(a => a.id === transactionForFirebase.fromAccountId);
        if (fromAccount) {
          updates[`users/${user.uid}/accounts/${fromAccount.id}/currentBalance`] = fromAccount.currentBalance - transactionForFirebase.amount;
        }
      }
      if (transactionForFirebase.toAccountId) {
        const toAccount = accounts.find(a => a.id === transactionForFirebase.toAccountId);
        if (toAccount) {
          updates[`users/${user.uid}/accounts/${toAccount.id}/currentBalance`] = toAccount.currentBalance + transactionForFirebase.amount;
        }
      }
    }

    if (transactionForFirebase.savingGoalId && (transactionForFirebase.type === 'income' || transactionForFirebase.type === 'expense')) {
      const goal = savingGoals.find(g => g.id === transactionForFirebase.savingGoalId);
      if (goal) {
        const goalRefPath = `users/${user.uid}/savingGoals/${transactionForFirebase.savingGoalId}`;
        let newCurrentAmount = goal.currentAmount;
        if(transactionForFirebase.type === 'income') {
            newCurrentAmount += transactionForFirebase.amount;
        } else { 
            newCurrentAmount -= transactionForFirebase.amount;
        }
        updates[`${goalRefPath}/currentAmount`] = newCurrentAmount;
        updates[`${goalRefPath}/status`] = newCurrentAmount >= goal.targetAmount ? 'completed' : 'active';
      }
    }
    await firebaseUpdate(ref(db), updates);
  }, [user, accounts, savingGoals, DEFAULT_CATEGORY_ID]);

  const updateTransaction = useCallback(async (updatedTransactionData: Transaction) => {
    if (!user) return;
    if (updatedTransactionData.relatedDebtTransactionId && updatedTransactionData.type !== 'transfer') {
        console.warn("Attempted to update a debt-related transaction from general form. This is not allowed for non-transfers.");
        return;
    }

    const originalTransaction = transactions.find(t => t.id === updatedTransactionData.id);
    if (!originalTransaction) {
      console.error("Original transaction not found for update");
      return;
    }

    const updates: { [key: string]: any } = {};
    let balanceUpdates: Array<{accountId: string, change: number}> = [];

    // Revert old transaction's impact
    if (originalTransaction.type === 'expense' && originalTransaction.accountId) {
      balanceUpdates.push({accountId: originalTransaction.accountId, change: originalTransaction.amount});
    } else if (originalTransaction.type === 'income' && originalTransaction.accountId) {
      balanceUpdates.push({accountId: originalTransaction.accountId, change: -originalTransaction.amount});
    } else if (originalTransaction.type === 'transfer') {
      if (originalTransaction.fromAccountId) {
        balanceUpdates.push({accountId: originalTransaction.fromAccountId, change: originalTransaction.amount});
      }
      if (originalTransaction.toAccountId) {
        balanceUpdates.push({accountId: originalTransaction.toAccountId, change: -originalTransaction.amount});
      }
    }

    if (originalTransaction.savingGoalId && (originalTransaction.type === 'income' || originalTransaction.type === 'expense')) {
        const oldGoal = savingGoals.find(g => g.id === originalTransaction.savingGoalId);
        if (oldGoal) {
            const oldGoalRefPath = `users/${user.uid}/savingGoals/${originalTransaction.savingGoalId}`;
            let newCurrentAmount = oldGoal.currentAmount;
            if (originalTransaction.type === 'income') newCurrentAmount -= originalTransaction.amount;
            else newCurrentAmount += originalTransaction.amount; 

            updates[`${oldGoalRefPath}/currentAmount`] = newCurrentAmount; // Will be overridden if new goal is the same
            updates[`${oldGoalRefPath}/status`] = newCurrentAmount < oldGoal.targetAmount ? 'active' : 'completed';
        }
    }

    // Apply new transaction's impact
    if (updatedTransactionData.type === 'expense' && updatedTransactionData.accountId) {
      balanceUpdates.push({accountId: updatedTransactionData.accountId, change: -updatedTransactionData.amount});
    } else if (updatedTransactionData.type === 'income' && updatedTransactionData.accountId) {
      balanceUpdates.push({accountId: updatedTransactionData.accountId, change: updatedTransactionData.amount});
    } else if (updatedTransactionData.type === 'transfer') {
      if (updatedTransactionData.fromAccountId) {
        balanceUpdates.push({accountId: updatedTransactionData.fromAccountId, change: -updatedTransactionData.amount});
      }
      if (updatedTransactionData.toAccountId) {
        balanceUpdates.push({accountId: updatedTransactionData.toAccountId, change: updatedTransactionData.amount});
      }
    }
    
    // Apply saving goal impact
    if (updatedTransactionData.savingGoalId && (updatedTransactionData.type === 'income' || updatedTransactionData.type === 'expense')) {
        const newGoal = savingGoals.find(g => g.id === updatedTransactionData.savingGoalId);
        if (newGoal) {
            const newGoalRefPath = `users/${user.uid}/savingGoals/${updatedTransactionData.savingGoalId}`;
            // Start with current DB amount or amount from previous step if it's the same goal
            let newCurrentAmount = updates[`${newGoalRefPath}/currentAmount`] !== undefined ? updates[`${newGoalRefPath}/currentAmount`] : newGoal.currentAmount;

            if(updatedTransactionData.type === 'income') newCurrentAmount += updatedTransactionData.amount;
            else newCurrentAmount -= updatedTransactionData.amount; 

            updates[`${newGoalRefPath}/currentAmount`] = newCurrentAmount;
            updates[`${newGoalRefPath}/status`] = newCurrentAmount >= newGoal.targetAmount ? 'completed' : 'active';
        }
    }
    
    // Consolidate balance changes
    const finalBalanceChanges: Record<string, number> = {};
    balanceUpdates.forEach(bu => {
        finalBalanceChanges[bu.accountId] = (finalBalanceChanges[bu.accountId] || 0) + bu.change;
    });

    for (const accountId in finalBalanceChanges) {
        const account = accounts.find(a => a.id === accountId);
        if (account) {
            updates[`users/${user.uid}/accounts/${accountId}/currentBalance`] = account.currentBalance + finalBalanceChanges[accountId];
        }
    }
    
    const transactionToSave: Transaction = {
      ...updatedTransactionData,
      date: formatISO(parseISO(updatedTransactionData.date)), // Ensure date is string
      accountId: updatedTransactionData.type === 'transfer' ? null : (updatedTransactionData.accountId || DEFAULT_ACCOUNT_ID),
      categoryId: updatedTransactionData.type === 'transfer' ? null : (updatedTransactionData.categoryId || DEFAULT_CATEGORY_ID),
      fromAccountId: updatedTransactionData.type === 'transfer' ? (updatedTransactionData.fromAccountId || null) : null,
      toAccountId: updatedTransactionData.type === 'transfer' ? (updatedTransactionData.toAccountId || null) : null,
      payeeId: updatedTransactionData.payeeId === undefined ? null : updatedTransactionData.payeeId,
      savingGoalId: (updatedTransactionData.type === 'expense' || updatedTransactionData.type === 'income')
                      ? (updatedTransactionData.savingGoalId === undefined ? null : updatedTransactionData.savingGoalId)
                      : null,
      imageUrl: updatedTransactionData.imageUrl === undefined ? null : updatedTransactionData.imageUrl,
      notes: updatedTransactionData.notes === undefined ? null : updatedTransactionData.notes,
      relatedDebtTransactionId: updatedTransactionData.relatedDebtTransactionId === undefined ? null : updatedTransactionData.relatedDebtTransactionId,
    };
    
    if (transactionToSave.type === 'transfer') {
        transactionToSave.categoryId = null;
        transactionToSave.payeeId = null;
        transactionToSave.savingGoalId = null;
    } else { 
        transactionToSave.fromAccountId = null;
        transactionToSave.toAccountId = null;
    }

    updates[`users/${user.uid}/transactions/${updatedTransactionData.id}`] = transactionToSave;
    await firebaseUpdate(ref(db), updates);
  }, [user, transactions, accounts, savingGoals, DEFAULT_CATEGORY_ID, DEFAULT_ACCOUNT_ID]);

  const deleteTransaction = useCallback(async (transactionId: string) => {
    if (!user) return;
    const transactionToDelete = transactions.find(t => t.id === transactionId);

    if (!transactionToDelete) {
        console.error("Transaction not found for deletion");
        return;
    }
    const updates: { [key: string]: any } = {};

    if (transactionToDelete.relatedDebtTransactionId) {
        const debtTransaction = debtTransactions.find(dt => dt.id === transactionToDelete.relatedDebtTransactionId);
        if (debtTransaction) {
            updates[`users/${user.uid}/debtTransactions/${debtTransaction.id}`] = null;
            const parentDebt = debts.find(d => d.id === debtTransaction.debtId);
            if (parentDebt) {
                let newDebtBalance = parentDebt.currentBalance + debtTransaction.amount;
                let newDebtStatus: Debt['status'] = 'parcial';
                if (newDebtBalance <= 0) newDebtStatus = 'pagada';
                else if (newDebtBalance >= parentDebt.initialAmount) newDebtStatus = 'pendiente';
                updates[`users/${user.uid}/debts/${parentDebt.id}/currentBalance`] = newDebtBalance;
                updates[`users/${user.uid}/debts/${parentDebt.id}/status`] = newDebtStatus;
            }
        }

        if (transactionToDelete.accountId) {
            const account = accounts.find(acc => acc.id === transactionToDelete.accountId);
            if (account) {
                if (transactionToDelete.type === 'expense') {
                    updates[`users/${user.uid}/accounts/${account.id}/currentBalance`] = account.currentBalance + transactionToDelete.amount;
                } else if (transactionToDelete.type === 'income') {
                    updates[`users/${user.uid}/accounts/${account.id}/currentBalance`] = account.currentBalance - transactionToDelete.amount;
                }
            }
        }
    } else {
      if (transactionToDelete.type === 'expense' && transactionToDelete.accountId) {
        const account = accounts.find(acc => acc.id === transactionToDelete.accountId);
        if(account) updates[`users/${user.uid}/accounts/${account.id}/currentBalance`] = account.currentBalance + transactionToDelete.amount;
      } else if (transactionToDelete.type === 'income' && transactionToDelete.accountId) {
        const account = accounts.find(acc => acc.id === transactionToDelete.accountId);
        if(account) updates[`users/${user.uid}/accounts/${account.id}/currentBalance`] = account.currentBalance - transactionToDelete.amount;
      } else if (transactionToDelete.type === 'transfer') {
        if (transactionToDelete.fromAccountId) {
          const fromAccount = accounts.find(acc => acc.id === transactionToDelete.fromAccountId);
          if(fromAccount) updates[`users/${user.uid}/accounts/${fromAccount.id}/currentBalance`] = fromAccount.currentBalance + transactionToDelete.amount;
        }
        if (transactionToDelete.toAccountId) {
          const toAccount = accounts.find(acc => acc.id === transactionToDelete.toAccountId);
          if(toAccount) updates[`users/${user.uid}/accounts/${toAccount.id}/currentBalance`] = toAccount.currentBalance - transactionToDelete.amount;
        }
      }
      if (transactionToDelete.savingGoalId && (transactionToDelete.type === 'income' || transactionToDelete.type === 'expense')) {
        const goal = savingGoals.find(g => g.id === transactionToDelete.savingGoalId);
        if (goal) {
          const goalRefPath = `users/${user.uid}/savingGoals/${transactionToDelete.savingGoalId}`;
          let newCurrentAmount = goal.currentAmount;
          if(transactionToDelete.type === 'income') newCurrentAmount -= transactionToDelete.amount;
          else newCurrentAmount += transactionToDelete.amount; 

          updates[`${goalRefPath}/currentAmount`] = newCurrentAmount;
          updates[`${goalRefPath}/status`] = newCurrentAmount < goal.targetAmount ? 'active' : 'completed';
        }
      }
    }

    updates[`users/${user.uid}/transactions/${transactionId}`] = null;
    await firebaseUpdate(ref(db), updates);
  }, [user, transactions, accounts, debtTransactions, debts, savingGoals]);

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
    const inTemplates = expenseTemplates.some(et => et.categoryId === categoryId);
    const isParentCategory = categories.some(c => c.parentId === categoryId);
    return inTransactions || inBudgets || isParentCategory || inRecurring || inTemplates;
  }, [transactions, budgets, categories, recurringTransactions, expenseTemplates]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!user || RESERVED_CATEGORY_IDS.includes(categoryId)) return;
    if (isCategoryInUse(categoryId)) {
        console.warn(`Category ${categoryId} is in use.`);
        return;
    }
    const categoryRef = ref(db, `users/${user.uid}/categories/${categoryId}`);
    await firebaseRemove(categoryRef);
  }, [user, isCategoryInUse, categories]);

  const addExpenseTemplate = useCallback(async (templateData: Omit<ExpenseTemplate, 'id'>) => {
    if (!user) return;
    const templateRefPath = `users/${user.uid}/expenseTemplates`;
    const newTemplateRef = push(ref(db, templateRefPath));
    const newTemplate: ExpenseTemplate = { ...templateData, payeeId: templateData.payeeId || null, id: newTemplateRef.key! };
    await set(newTemplateRef, newTemplate);
  }, [user]);

  const updateExpenseTemplate = useCallback(async (updatedTemplate: ExpenseTemplate) => {
    if (!user) return;
    const templateRef = ref(db, `users/${user.uid}/expenseTemplates/${updatedTemplate.id}`);
    await set(templateRef, {...updatedTemplate, payeeId: updatedTemplate.payeeId || null});
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
    const inTemplates = expenseTemplates.some(et => et.accountId === accountId);
    return inTransactions || inDebtTransactions || inRecurring || inTemplates;
  }, [transactions, debtTransactions, recurringTransactions, expenseTemplates]);

  const deleteAccount = useCallback(async (accountId: string) => {
    if (!user || accountId === DEFAULT_ACCOUNT_ID) return;
    if (isAccountInUse(accountId)) {
      console.warn(`Account ${accountId} is in use.`);
      return;
    }
    const accountRef = ref(db, `users/${user.uid}/accounts/${accountId}`);
    await firebaseRemove(accountRef);
  }, [user, isAccountInUse, DEFAULT_ACCOUNT_ID]);

  const getPayeeById = useCallback((payeeId: string | null | undefined): Payee | undefined => {
      if (!payeeId) return undefined;
      return payees.find(p => p.id === payeeId);
  }, [payees]);

  const addDebt = useCallback(async (debtData: Omit<Debt, 'id' | 'currentBalance' | 'creationDate' | 'status' | 'debtorOrCreditor'> & {dueDate?: Date, payeeId: string}): Promise<Debt | null> => {
    if (!user) return null;
    const debtRefPath = `users/${user.uid}/debts`;
    const newDebtRef = push(ref(db, debtRefPath));
    
    const selectedPayee = payees.find(p => p.id === debtData.payeeId);

    const newDebt: Debt = {
      id: newDebtRef.key!,
      name: debtData.name,
      type: debtData.type,
      payeeId: debtData.payeeId,
      debtorOrCreditor: selectedPayee?.name || "Desconocido", 
      initialAmount: debtData.initialAmount,
      currentBalance: debtData.initialAmount,
      creationDate: formatISO(new Date()),
      dueDate: debtData.dueDate ? formatISO(debtData.dueDate, { representation: 'date' }) : null,
      status: debtData.initialAmount === 0 ? 'pagada' : 'pendiente',
    };
    await set(newDebtRef, newDebt);
    return newDebt;
  }, [user, payees]);

  const getTransactionsForDebt = useCallback((debtId: string): DebtTransaction[] => {
    return debtTransactions.filter(t => t.debtId === debtId).sort((a,b) => parseISO(b.transactionDate).getTime() - parseISO(a.transactionDate).getTime());
  }, [debtTransactions]);

  const updateDebt = useCallback(async (updatedFormFields: Partial<Debt> & { id: string }) => {
    if (!user) return;

    const originalDebt = debts.find(d => d.id === updatedFormFields.id);
    if (!originalDebt) {
      console.error("Original debt not found for update:", updatedFormFields.id);
      return;
    }
    const debtRefPath = `users/${user.uid}/debts/${updatedFormFields.id}`;
    const existingDebtTransactions = getTransactionsForDebt(updatedFormFields.id);

    let finalInitialAmount: number;
    let finalCurrentBalance: number;

    if (updatedFormFields.initialAmount !== undefined && existingDebtTransactions.length === 0) {
        finalInitialAmount = updatedFormFields.initialAmount;
        finalCurrentBalance = finalInitialAmount;
    } else {
        finalInitialAmount = originalDebt.initialAmount;
        finalCurrentBalance = originalDebt.currentBalance;
        if (updatedFormFields.initialAmount !== undefined && updatedFormFields.initialAmount !== originalDebt.initialAmount && existingDebtTransactions.length > 0) {
             console.warn(`DebtForm Warning: Attempt to change initialAmount for debt '${updatedFormFields.id}' which has transactions. Change ignored.`);
        }
    }

    let newStatus: Debt['status'] = 'parcial';
    if (finalInitialAmount === 0 && finalCurrentBalance === 0) {
        newStatus = 'pagada';
    } else if (finalCurrentBalance <= 0 && finalInitialAmount > 0) {
        newStatus = 'pagada';
    } else if (finalCurrentBalance >= finalInitialAmount && finalInitialAmount > 0) {
        newStatus = 'pendiente';
    } else if (finalCurrentBalance < finalInitialAmount && finalCurrentBalance > 0) {
        newStatus = 'parcial';
    }

    const selectedPayee = updatedFormFields.payeeId ? payees.find(p => p.id === updatedFormFields.payeeId) : undefined;
    const selectedPayeeName = selectedPayee?.name || originalDebt.debtorOrCreditor;

    const debtToSave: Debt = {
      ...originalDebt,
      id: updatedFormFields.id,
      name: updatedFormFields.name !== undefined ? updatedFormFields.name : originalDebt.name,
      type: updatedFormFields.type !== undefined ? updatedFormFields.type : originalDebt.type,
      payeeId: updatedFormFields.payeeId !== undefined ? updatedFormFields.payeeId : originalDebt.payeeId,
      debtorOrCreditor: selectedPayeeName,
      initialAmount: finalInitialAmount,
      currentBalance: finalCurrentBalance,
      dueDate: updatedFormFields.dueDate !== undefined
                ? (updatedFormFields.dueDate ? (typeof updatedFormFields.dueDate === 'string' ? formatISO(parseISO(updatedFormFields.dueDate), { representation: 'date' }) : formatISO(updatedFormFields.dueDate, { representation: 'date' })) : null)
                : originalDebt.dueDate,
      status: newStatus,
      creationDate: originalDebt.creationDate,
    };

    await set(ref(db, debtRefPath), debtToSave);
  }, [user, debts, payees, getTransactionsForDebt]);

  const addDebtTransaction = useCallback(async (transactionData: Omit<DebtTransaction, 'id' | 'transactionDate' | 'relatedTransactionId'> & {transactionDate: Date; accountId: string;}): Promise<DebtTransaction | null> => {
    if (!user || !transactionData.accountId) return null;

    const parentDebt = debts.find(d => d.id === transactionData.debtId);
    if (!parentDebt) return null;
    
    const debtRefPath = `users/${user.uid}/debts/${transactionData.debtId}`;
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
      categoryId: transactionData.type === 'abono_realizado' ? 'debt_payments' : 'debt_collections',
      relatedDebtTransactionId: newDebtTransaction.id,
      fromAccountId: null,
      toAccountId: null,
      payeeId: parentDebt.payeeId, 
      savingGoalId: null,
      imageUrl: null,
      notes: transactionData.notes || null,
    };

    const updates: {[key: string]: any} = {};
    updates[`${debtTransactionRefPath}/${newDebtTransaction.id}`] = newDebtTransaction;
    updates[`${generalTransactionRefPath}/${generalTransaction.id}`] = generalTransaction;

    const newBalance = parentDebt.currentBalance - newDebtTransaction.amount;
    let newStatus: Debt['status'] = 'parcial';
    if (newBalance <= 0 && parentDebt.initialAmount > 0) newStatus = 'pagada';
    else if (newBalance >= parentDebt.initialAmount && parentDebt.initialAmount > 0) newStatus = 'pendiente';
    else if (parentDebt.initialAmount === 0 && newBalance === 0) newStatus = 'pagada';
    else if (newBalance > 0 && newBalance < parentDebt.initialAmount) newStatus = 'parcial';


    updates[`${debtRefPath}/currentBalance`] = newBalance;
    updates[`${debtRefPath}/status`] = newStatus;

    const account = accounts.find(a => a.id === transactionData.accountId);
    if (account) {
      let updatedAccountBalance = account.currentBalance;
      if (generalTransaction.type === 'expense') updatedAccountBalance -= generalTransaction.amount;
      else if (generalTransaction.type === 'income') updatedAccountBalance += generalTransaction.amount;
      updates[`users/${user.uid}/accounts/${account.id}/currentBalance`] = updatedAccountBalance;
    }

    await firebaseUpdate(ref(db), updates);
    return newDebtTransaction;
  }, [user, debts, accounts, transactions]);

  const deleteDebtTransaction = useCallback(async (debtTransactionId: string, debtId: string) => {
    if (!user) return;

    const debtTransactionToDelete = debtTransactions.find(dt => dt.id === debtTransactionId);
    if (!debtTransactionToDelete) {
      console.error("Debt transaction not found for deletion");
      return;
    }

    const updates: { [key: string]: any } = {};
    updates[`users/${user.uid}/debtTransactions/${debtTransactionId}`] = null;

    const parentDebt = debts.find(d => d.id === debtId);
    if (parentDebt) {
      let newBalance = parentDebt.currentBalance + debtTransactionToDelete.amount;
      let newStatus: Debt['status'] = 'parcial';
      if (newBalance <= 0 && parentDebt.initialAmount > 0) newStatus = 'pagada';
      else if (newBalance >= parentDebt.initialAmount && parentDebt.initialAmount > 0 ) newStatus = 'pendiente';
      else if (parentDebt.initialAmount === 0 && newBalance === 0) newStatus = 'pagada';

      updates[`users/${user.uid}/debts/${parentDebt.id}/currentBalance`] = newBalance;
      updates[`users/${user.uid}/debts/${parentDebt.id}/status`] = newStatus;
    }

    if (debtTransactionToDelete.relatedTransactionId) {
      const generalTransaction = transactions.find(t => t.id === debtTransactionToDelete.relatedTransactionId);
      if (generalTransaction) {
        updates[`users/${user.uid}/transactions/${generalTransaction.id}`] = null;
        if (generalTransaction.accountId) {
            const account = accounts.find(acc => acc.id === generalTransaction.accountId);
            if (account) {
                let updatedAccountBalance = account.currentBalance;
                if (generalTransaction.type === 'expense') updatedAccountBalance += generalTransaction.amount;
                else if (generalTransaction.type === 'income') updatedAccountBalance -= generalTransaction.amount;
                updates[`users/${user.uid}/accounts/${account.id}/currentBalance`] = updatedAccountBalance;
            }
        }
      }
    }
    await firebaseUpdate(ref(db), updates);
  }, [user, debtTransactions, debts, transactions, accounts]);

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

  const updateThemeSettings = useCallback(async (newSettings: ThemeSettings) => {
    if (!user) return;
    const settingsToSave = { ...DEFAULT_THEME_SETTINGS, ...newSettings };
    const themeSettingsRef = ref(db, `users/${user.uid}/themeSettings`);
    await set(themeSettingsRef, settingsToSave);
  }, [user]);

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
      payeeId: recordData.payeeId || null,
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
      payeeId: updatedRecord.payeeId || null,
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

  const processRecurringTransactionAsDone = useCallback(async (recurringId: string, processedDate: string) => {
    if (!user) return;
    const record = recurringTransactions.find(rt => rt.id === recurringId);
    if (!record) return;

    const nextDueDate = calculateNextDueDate(record.startDate, record.frequency, processedDate);
    const updatedRecordData: RecurringTransaction = {
      ...record,
      lastProcessedDate: processedDate,
      nextDueDate: nextDueDate,
    };
    
    const recordRef = ref(db, `users/${user.uid}/recurringTransactions/${updatedRecordData.id}`);
    await set(recordRef, updatedRecordData);

  }, [user, recurringTransactions]);

  const addPayee = useCallback(async (payeeData: Omit<Payee, 'id'>): Promise<Payee | null> => {
    if (!user) return null;
    const payeesRefPath = `users/${user.uid}/payees`;
    const newPayeeRef = push(ref(db, payeesRefPath));
    const newPayee: Payee = {
      id: newPayeeRef.key!,
      name: payeeData.name,
    };
    await set(newPayeeRef, newPayee);
    return newPayee;
  }, [user]);

  const updatePayee = useCallback(async (updatedPayee: Payee) => {
    if (!user) return;
    const payeeRef = ref(db, `users/${user.uid}/payees/${updatedPayee.id}`);
    await set(payeeRef, updatedPayee);
  }, [user]);

  const isPayeeInUse = useCallback((payeeId: string): boolean => {
    const inTransactions = transactions.some(t => t.payeeId === payeeId);
    const inTemplates = expenseTemplates.some(et => et.payeeId === payeeId);
    const inRecurring = recurringTransactions.some(rt => rt.payeeId === payeeId);
    const inDebts = debts.some(d => d.payeeId === payeeId);
    return inTransactions || inTemplates || inRecurring || inDebts;
  }, [transactions, expenseTemplates, recurringTransactions, debts]);

  const deletePayee = useCallback(async (payeeId: string) => {
    if (!user) return;
    if (isPayeeInUse(payeeId)) {
      console.warn(`Payee ${payeeId} is in use and cannot be deleted.`);
      return;
    }
    const payeeRef = ref(db, `users/${user.uid}/payees/${payeeId}`);
    await firebaseRemove(payeeRef);
  }, [user, isPayeeInUse]);
  
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

  const getPayeeName = useCallback((payeeId: string | null | undefined): string => {
    if (!payeeId) return 'N/A';
    const payee = getPayeeById(payeeId);
    return payee?.name || 'Desconocido';
  }, [getPayeeById]);
  
  const getPayeeByName = useCallback((name: string): Payee | undefined => {
    if (!name) return undefined;
    const normalizedSearchName = normalizeString(name);
    return payees.find(p => normalizeString(p.name) === normalizedSearchName);
  }, [payees]);

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

  const getTransactionsForSavingGoal = useCallback((goalId: string): Transaction[] => {
    return transactionsBySavingGoal.get(goalId) || [];
  }, [transactionsBySavingGoal]);

  const getDebtById = useCallback((debtId: string): Debt | undefined => {
    return debts.find(d => d.id === debtId);
  }, [debts]);
  
  const getExpenseTemplates = useCallback((): ExpenseTemplate[] => {
    return expenseTemplates.sort((a,b) => a.name.localeCompare(b.name));
  }, [expenseTemplates]);

  const getRecurringTransactionById = useCallback((recurringId: string): RecurringTransaction | undefined => {
    return recurringTransactions.find(rt => rt.id === recurringId);
  }, [recurringTransactions]);
  
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
  }, [themeSettings]);

  // --- Context Value ---
  const contextValue = useMemo(() => ({
    transactions, budgets, categories, expenseTemplates, accounts, debts, debtTransactions, themeSettings,
    savingGoals, recurringTransactions, payees, transactionToPrefill, dataLoading, user,
    transactionPageFilters, setTransactionPageFilters, transactionPageAppliedFilters, setTransactionPageAppliedFilters,
    addTransaction, updateTransaction, deleteTransaction,
    addBudget, updateBudget, deleteBudget,
    getCategoryById, getCategoryByName, getParentCategories, getSubcategories, getCategoryName,
    addCategory, updateCategory, deleteCategory, isCategoryInUse,
    addExpenseTemplate, updateExpenseTemplate, deleteExpenseTemplate, getExpenseTemplates,
    addAccount, updateAccount, deleteAccount, getAccountById, getAccountByName, getAccountName, isAccountInUse,
    addDebt, updateDebt, getDebtById, addDebtTransaction, deleteDebtTransaction, getTransactionsForDebt, deleteDebt,
    updateThemeSettings, formatUserCurrency,
    addSavingGoal, updateSavingGoal, deleteSavingGoal, getSavingGoalById, getSavingGoalByName, getSavingGoalName, getTransactionsForSavingGoal,
    addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, getRecurringTransactionById, processRecurringTransactionAsDone,
    setTransactionToPrefill,
    addPayee, updatePayee, deletePayee, getPayeeById, getPayeeName, getPayeeByName, isPayeeInUse,
  }), [
    transactions, budgets, categories, expenseTemplates, accounts, debts, debtTransactions, themeSettings,
    savingGoals, recurringTransactions, payees, transactionToPrefill, dataLoading, user,
    transactionPageFilters, setTransactionPageFilters, transactionPageAppliedFilters, setTransactionPageAppliedFilters,
    addTransaction, updateTransaction, deleteTransaction,
    addBudget, updateBudget, deleteBudget,
    getCategoryById, getCategoryByName, getParentCategories, getSubcategories, getCategoryName,
    addCategory, updateCategory, deleteCategory, isCategoryInUse,
    addExpenseTemplate, updateExpenseTemplate, deleteExpenseTemplate, getExpenseTemplates,
    addAccount, updateAccount, deleteAccount, getAccountById, getAccountByName, getAccountName, isAccountInUse,
    addDebt, updateDebt, getDebtById, addDebtTransaction, deleteDebtTransaction, getTransactionsForDebt, deleteDebt,
    updateThemeSettings, formatUserCurrency,
    addSavingGoal, updateSavingGoal, deleteSavingGoal, getSavingGoalById, getSavingGoalByName, getSavingGoalName, getTransactionsForSavingGoal,
    addRecurringTransaction, updateRecurringTransaction, deleteRecurringTransaction, getRecurringTransactionById, processRecurringTransactionAsDone,
    setTransactionToPrefill,
    addPayee, updatePayee, deletePayee, getPayeeById, getPayeeName, getPayeeByName, isPayeeInUse,
    transactionsBySavingGoal 
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
