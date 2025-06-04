
"use client";

import { useState, useMemo, useEffect } from 'react';
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
} from "@/components/ui/alert-dialog"
import { TransactionForm } from '@/components/transactions/transaction-form';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionFilters, type FilterState } from '@/components/transactions/transaction-filters';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Transaction, Account, Category, TransactionType } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionFAB } from '@/components/shared/transaction-fab';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parseISO, isValid as dateFnsIsValid } from 'date-fns';
import { DEFAULT_CATEGORY_ID } from '@/lib/constants'; // Import DEFAULT_CATEGORY_ID

const initialFilterState: FilterState = {
  startDate: null,
  endDate: null,
  type: 'all',
  categoryId: 'all',
  accountId: 'all',
  description: '',
};

export default function TransactionsPage() {
  const { 
    transactions: allTransactions, 
    deleteTransaction, 
    dataLoading,
    accounts,
    getParentCategories,
    getCategoryById // Added getCategoryById
  } = useAppData();
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | undefined>(undefined);
  const { toast } = useToast();

  const [filterValues, setFilterValues] = useState<FilterState>(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilterState);

  const parentCategoriesForFilter = getParentCategories(); // Use a different variable name to avoid conflict if needed

  const dialogTitleText = "Editar Transacción";
  const dialogDescriptionText = "Actualiza los detalles de tu transacción.";

  const handleEdit = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsEditFormOpen(true);
  };

  const handleDeleteConfirm = (transactionId: string) => {
    setTransactionToDeleteId(transactionId);
  };

  const executeDelete = async () => {
    if (transactionToDeleteId) {
      await deleteTransaction(transactionToDeleteId);
      toast({ title: "Transacción Eliminada", description: "La transacción ha sido eliminada exitosamente."});
      setTransactionToDeleteId(undefined);
    }
  };

  const handleFormSave = () => {
    setIsEditFormOpen(false);
    setTransactionToEdit(undefined); 
  };
  
  const handleDialogClose = () => {
    setIsEditFormOpen(false);
    setTransactionToEdit(undefined); 
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filterValues);
  };

  const handleResetFilters = () => {
    setFilterValues(initialFilterState);
    setAppliedFilters(initialFilterState);
  };

  const filteredTransactions = useMemo(() => {
    if (dataLoading) return [];
    return allTransactions.filter(transaction => {
      let transactionDate;
      try {
        transactionDate = parseISO(transaction.date);
        if (!dateFnsIsValid(transactionDate)) return false; // Invalid date format in data
      } catch (e) {
        return false; // Error parsing date
      }
      

      if (appliedFilters.startDate && transactionDate < appliedFilters.startDate) return false;
      if (appliedFilters.endDate && transactionDate > new Date(appliedFilters.endDate.setHours(23, 59, 59, 999))) return false;
      
      if (appliedFilters.type !== 'all' && transaction.type !== appliedFilters.type) return false;
      
      if (appliedFilters.accountId !== 'all') {
        if (transaction.type === 'transfer') {
          if (transaction.fromAccountId !== appliedFilters.accountId && transaction.toAccountId !== appliedFilters.accountId) return false;
        } else {
          if (transaction.accountId !== appliedFilters.accountId) return false;
        }
      }
      
      if (appliedFilters.categoryId !== 'all') {
        if (transaction.type === 'transfer') return false; // Transfers don't have categories

        if (appliedFilters.categoryId === DEFAULT_CATEGORY_ID) { // Check for "Sin Categoría"
            if (transaction.categoryId && transaction.categoryId !== DEFAULT_CATEGORY_ID) return false;
            if (!transaction.categoryId) return true; // Explicitly include transactions with null/undefined categoryId
        } else {
            const category = transaction.categoryId ? getCategoryById(transaction.categoryId) : null;
            if (!category || (category.id !== appliedFilters.categoryId && category.parentId !== appliedFilters.categoryId)) {
              return false;
            }
        }
      }
      
      if (appliedFilters.description && !transaction.description.toLowerCase().includes(appliedFilters.description.toLowerCase())) return false;
      
      return true;
    });
  }, [allTransactions, appliedFilters, dataLoading, getCategoryById]);
  

  if (dataLoading && !allTransactions.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Transacciones"
          description="Registra y gestiona tus gastos e ingresos."
        />
        <Skeleton className="w-full h-24" /> {/* Filter skeleton */}
        <Skeleton className="w-full h-[300px]" /> {/* Table skeleton */}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones"
        description="Registra y gestiona tus gastos e ingresos."
      />

      <TransactionFilters
        filterValues={filterValues}
        setFilterValues={setFilterValues}
        accounts={accounts}
        categories={parentCategoriesForFilter} // Pass the correct variable
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
      
      <TransactionTable
        transactions={filteredTransactions} 
        onEdit={handleEdit}
        onDelete={handleDeleteConfirm}
        isLoading={dataLoading}
        itemsPerPage={10} 
      />

      <TransactionFAB />

      <Dialog open={isEditFormOpen} onOpenChange={(open) => {
        if (!open) handleDialogClose();
        else setIsEditFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={dialogTitleText}>
          <DialogHeader>
            <DialogTitle>{dialogTitleText}</DialogTitle>
            <DialogDescription>
              {dialogDescriptionText}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
            <TransactionForm
              transactionToEdit={transactionToEdit} 
              onSave={handleFormSave} 
              dialogClose={handleDialogClose} 
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!transactionToDeleteId} onOpenChange={() => setTransactionToDeleteId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la transacción.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTransactionToDeleteId(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
