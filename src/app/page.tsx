
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { SpendingPieChart } from '@/components/reports/spending-pie-chart';
import { BudgetListItem } from '@/components/budgets/budget-list-item';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { useAppData } from '@/contexts/app-data-context';
import type { Transaction, Budget, Account } from '@/types';
import { getMonthYear, formatDate } from '@/lib/utils';
import { DollarSign, ListChecks, AlertTriangle, Wallet, Info, TrendingDown, TrendingUp, ArrowRightLeft, X as CloseIcon, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfMonth, parseISO, isValid as dateFnsIsValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransactionForm } from '@/components/transactions/transaction-form'; // Import added
import { BudgetForm } from '@/components/budgets/budget-form';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryIcon } from '@/components/expenses/category-icon';
import { cn } from '@/lib/utils';
import { exportTransactionsToCSV } from '@/lib/csv-utils';
import { TransactionFAB } from '@/components/shared/transaction-fab';


export default function DashboardPage() {
  const {
    transactions: allTransactions,
    budgets,
    accounts,
    getCategoryById,
    getCategoryName,
    getAccountName,
    getSavingGoalName,
    deleteTransaction,
    deleteBudget,
    dataLoading,
    user,
    formatUserCurrency,
    // transactionToPrefillFromRecurring and setTransactionToPrefillFromRecurring are used by TransactionFAB
  } = useAppData();

  const { toast } = useToast();
  const currentMonthYYYYMM = format(startOfMonth(new Date()), 'yyyy-MM');

  const safeTransactions = Array.isArray(allTransactions) ? allTransactions : [];
  const sortedAccounts = [...accounts].sort((a,b) => a.name.localeCompare(b.name));

  // State for editing/deleting transactions (TransactionFAB handles new transactions)
  const [transactionToEditForPage, setTransactionToEditForPage] = useState<Transaction | undefined>(undefined);
  const [isEditTransactionFormOpen, setIsEditTransactionFormOpen] = useState(false);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | undefined>(undefined);

  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | undefined>(undefined);
  const [budgetToDeleteId, setBudgetToDeleteId] = useState<string | undefined>(undefined);

  const currentMonthTransactions = safeTransactions.filter(t => getMonthYear(t.date) === currentMonthYYYYMM);
  const currentMonthExpenses = currentMonthTransactions.filter(t => t.type === 'expense');
  const totalExpensesThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const currentMonthBudgets = budgets.filter(b => b.month === currentMonthYYYYMM);
  const totalBudgetedThisMonth = currentMonthBudgets
    .filter(b => {
        const category = getCategoryById(b.categoryId);
        return category ? !category.parentId : false;
    })
    .reduce((sum, b) => sum + b.amount, 0);

  const budgetStatus = totalBudgetedThisMonth > 0
    ? `${formatUserCurrency(totalExpensesThisMonth)} / ${formatUserCurrency(totalBudgetedThisMonth)}`
    : "No hay presupuesto principal establecido";
  const budgetProgress = totalBudgetedThisMonth > 0 ? (totalExpensesThisMonth / totalBudgetedThisMonth) * 100 : 0;

  const budgetsOverspent = currentMonthBudgets.filter(budget => {
    const spent = currentMonthExpenses
      .filter(e => {
         const expenseCategory = getCategoryById(e.categoryId);
         const budgetCategory = getCategoryById(budget.categoryId);
         if (budgetCategory && !budgetCategory.parentId) { // Es una categoría padre
           return (e.categoryId === budget.categoryId || expenseCategory?.parentId === budget.categoryId);
         }
         return e.categoryId === budget.categoryId; // Es una subcategoría o una categoría sin hijos
      })
      .reduce((sum, e) => sum + e.amount, 0);
    return spent > budget.amount;
  });

  const [dynamicGreeting, setDynamicGreeting] = useState("Bienvenido");

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setDynamicGreeting("Buenos días");
    } else if (currentHour >= 12 && currentHour < 19) {
      setDynamicGreeting("Buenas tardes");
    } else {
      setDynamicGreeting("Buenas noches");
    }
  }, []);

  const currentMonthName = format(new Date(), 'MMMM yyyy', { locale: es });
  const capitalizedMonthName = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
  
  const userNamePart = user?.email?.split('@')[0] || 'Usuario';
  const capitalizedUserName = userNamePart.charAt(0).toUpperCase() + userNamePart.slice(1);

  // useEffect for transactionToPrefillFromRecurring is now in TransactionFAB

  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionToEditForPage(transaction);
    setIsEditTransactionFormOpen(true);
  };
  const handleDeleteTransactionConfirm = (id: string) => setTransactionToDeleteId(id);
  const executeDeleteTransaction = async () => {
    if (transactionToDeleteId) {
      await deleteTransaction(transactionToDeleteId);
      toast({ title: "Transacción Eliminada" });
      setTransactionToDeleteId(undefined);
    }
  };
  const handleEditTransactionFormSave = () => {
    setIsEditTransactionFormOpen(false);
    setTransactionToEditForPage(undefined);
  };
   const handleEditTransactionDialogClose = () => {
    setIsEditTransactionFormOpen(false);
    setTransactionToEditForPage(undefined);
  };

  const handleEditBudget = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsBudgetFormOpen(true);
  };
  const handleDeleteBudgetConfirm = (id: string) => setBudgetToDeleteId(id);
  const executeDeleteBudget = async () => {
    if (budgetToDeleteId) {
      await deleteBudget(budgetToDeleteId);
      toast({ title: "Presupuesto Eliminado" });
      setBudgetToDeleteId(undefined);
    }
  };
  const handleBudgetFormSave = () => {
    setIsBudgetFormOpen(false);
    setBudgetToEdit(undefined);
  };
  const handleBudgetDialogClose = () => {
    setIsBudgetFormOpen(false);
    setBudgetToEdit(undefined);
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Panel Principal"
          description={`${dynamicGreeting}, ${capitalizedUserName}! Aquí está tu resumen financiero para ${capitalizedMonthName}.`}
        />
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-[125px] w-full" />
          <Skeleton className="h-[125px] w-full" />
          <Skeleton className="h-[125px] w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-[150px] w-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <div className="md:col-span-2">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
        <div>
            <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel Principal"
        description={`${dynamicGreeting}, ${capitalizedUserName}! Aquí está tu resumen financiero para ${capitalizedMonthName}.`}
      />

      <TransactionFAB />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Gastos Totales (Este Mes)"
          value={formatUserCurrency(totalExpensesThisMonth)}
          icon={DollarSign}
        />
        <SummaryCard
          title="Estado del Presupuesto (Este Mes)"
          value={budgetStatus}
          icon={ListChecks}
          footerText={totalBudgetedThisMonth > 0 ? `${Math.round(budgetProgress)}% del presupuesto usado` : ""}
        />
         <SummaryCard
          title="Presupuestos Excedidos"
          value={String(budgetsOverspent.length)}
          icon={AlertTriangle}
          iconColor={budgetsOverspent.length > 0 ? "text-destructive" : ""}
          footerText={budgetsOverspent.length > 0 ? "Puede que se necesite acción" : "¡Todos los presupuestos en orden!"}
        />
      </div>

      {sortedAccounts.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-4">Cuentas</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedAccounts.map((account) => (
              <Card key={account.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <CategoryIcon iconName={account.icon} color={account.color} size={6} />
                    <div>
                      <CardTitle className="text-lg font-semibold truncate" title={account.name}>{account.name}</CardTitle>
                      <CardDescription className="text-xs">{account.type}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatUserCurrency(account.currentBalance)}</div>
                  <p className="text-xs text-muted-foreground">Saldo Actual</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-3">
           <SpendingPieChart transactions={currentMonthExpenses} title="Desglose de Gastos Mensuales (Categorías Principales)"/>
        </div>
        <div className="md:col-span-2">
          <Card className="shadow-lg h-full">
            <CardHeader>
              <CardTitle>Resumen de Presupuesto</CardTitle>
              <CardDescription>Estado de tus presupuestos para este mes.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentMonthBudgets.length > 0 ? (
                <ScrollArea className="h-[240px] sm:h-[300px] md:h-[350px] pr-3">
                  <div className="space-y-4">
                    {currentMonthBudgets.map(budget => (
                      <BudgetListItem
                        key={budget.id}
                        budget={budget}
                        transactions={currentMonthExpenses} 
                        onEdit={handleEditBudget}
                        onDelete={handleDeleteBudgetConfirm}
                      />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-10">No hay presupuestos establecidos para este mes.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <TransactionTable
          transactions={safeTransactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransactionConfirm}
          isLoading={dataLoading}
          title="Historial de Transacciones"
          itemsPerPage={10}
        />
      </div>

      {/* Edit Transaction Dialog (New transactions handled by TransactionFAB) */}
      <Dialog open={isEditTransactionFormOpen} onOpenChange={(open) => {
          if (!open) handleEditTransactionDialogClose();
          else setIsEditTransactionFormOpen(true);
        }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label="Editar Transacción">
          <DialogHeader>
            <DialogTitle>Editar Transacción</DialogTitle>
            <DialogDescription>Actualiza los detalles de tu transacción.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
            <TransactionForm
              transactionToEdit={transactionToEditForPage}
              onSave={handleEditTransactionFormSave}
              dialogClose={handleEditTransactionDialogClose}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transactionToDeleteId} onOpenChange={() => setTransactionToDeleteId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la transacción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDeleteId(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteTransaction} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isBudgetFormOpen} onOpenChange={(open) => {
        if(!open) handleBudgetDialogClose(); else setIsBudgetFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-[480px]" aria-label={budgetToEdit ? "Editar Presupuesto" : "Añadir Presupuesto"}>
          <DialogHeader>
            <DialogTitle>{budgetToEdit ? "Editar Presupuesto" : "Añadir Presupuesto"}</DialogTitle>
            <DialogDescription>
               {budgetToEdit ? "Actualiza los detalles de tu presupuesto." : "Define un presupuesto para una categoría y mes específicos."}
            </DialogDescription>
          </DialogHeader>
          <BudgetForm budgetToEdit={budgetToEdit} onSave={handleBudgetFormSave} dialogClose={handleBudgetDialogClose} />
        </DialogContent>
      </Dialog>

       <AlertDialog open={!!budgetToDeleteId} onOpenChange={() => setBudgetToDeleteId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el presupuesto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetToDeleteId(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteBudget} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
