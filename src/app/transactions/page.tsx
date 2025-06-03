
"use client";

import { useState } from 'react';
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
import { TransactionForm } from '@/components/transactions/transaction-form';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Transaction } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionFAB } from '@/components/shared/transaction-fab';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function TransactionsPage() {
  const { transactions, deleteTransaction, dataLoading } = useAppData();
  const [isEditFormOpen, setIsEditFormOpen] = useState(false); // Renamed from isFormOpen
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  
  const dialogTitleText = "Editar Transacción"; // FAB handles new
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

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Transacciones"
          description="Registra y gestiona tus gastos e ingresos."
          // Removed actions, FAB will handle adding
        />
        <Skeleton className="w-full h-[300px]" />
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Transacciones"
        description="Registra y gestiona tus gastos e ingresos."
        // Removed original "Añadir Transacción" button; FAB handles this now.
      />
      
      <TransactionTable
        transactions={transactions} 
        onEdit={handleEdit}
        onDelete={handleDeleteConfirm}
        isLoading={dataLoading}
      />

      <TransactionFAB />

      {/* Dialog for Editing Transactions */}
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
