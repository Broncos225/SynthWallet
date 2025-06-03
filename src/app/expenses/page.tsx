
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ExpenseForm } from '@/components/expenses/expense-form'; //This will be used for editing existing expenses
import { TransactionForm } from '@/components/transactions/transaction-form'; // For editing existing transactions
import { ExpenseTable } from '@/components/expenses/expense-table';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Expense, Transaction } from '@/types'; // Expense might be deprecated for Transaction
import { useToast } from "@/hooks/use-toast";
import { TransactionFAB } from '@/components/shared/transaction-fab';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ExpensesPage() {
  const { transactions, deleteTransaction, dataLoading } = useAppData(); // Using 'transactions' which is the new 'expenses'
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  
  const dialogTitleText = "Editar Gasto"; // FAB handles new
  const dialogDescriptionText = "Actualiza los detalles de tu gasto.";

  const handleEdit = (transaction: Transaction) => {
    if (transaction.type !== 'expense') {
      toast({ variant: "destructive", title: "Acción no permitida", description: "Solo se pueden editar gastos desde esta sección."});
      return;
    }
    setTransactionToEdit(transaction);
    setIsEditFormOpen(true);
  };

  const handleDeleteConfirm = (transactionId: string) => {
    setTransactionToDeleteId(transactionId);
  };

  const executeDelete = async () => {
    if (transactionToDeleteId) {
      await deleteTransaction(transactionToDeleteId);
      toast({ title: "Gasto Eliminado", description: "El gasto ha sido eliminado exitosamente."});
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

  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos"
        description="Registra y gestiona tus gastos."
        // Actions are now handled by the FAB for adding new ones.
        // The header button for "Añadir Gasto" can be removed if FAB is preferred.
      />
      
      <ExpenseTable 
        expenses={expenseTransactions} // Pass only expense type transactions
        onEdit={handleEdit}
        onDelete={handleDeleteConfirm}
        isLoading={dataLoading}
      />

      <TransactionFAB />

      {/* Dialog for Editing Expenses */}
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto.
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
