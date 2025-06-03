
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

export default function TransactionsPage() {
  const { transactions, deleteTransaction, dataLoading } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | undefined>(undefined);
  const [transactionToDeleteId, setTransactionToDeleteId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  
  const dialogTitleText = transactionToEdit ? "Editar Transacción" : "Añadir Nueva Transacción";
  const dialogDescriptionText = transactionToEdit 
    ? "Actualiza los detalles de tu transacción."
    : "Introduce los detalles de tu nueva transacción (gasto o ingreso).";

  const handleEdit = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsFormOpen(true);
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
    setIsFormOpen(false);
    setTransactionToEdit(undefined); 
  };
  
  const handleDialogClose = () => {
    setIsFormOpen(false);
    setTransactionToEdit(undefined); 
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Transacciones"
          description="Registra y gestiona tus gastos e ingresos."
          actions={
            <Button disabled>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir Transacción
            </Button>
          }
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
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setTransactionToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Transacción
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>
                  {dialogDescriptionText}
                </DialogDescription>
              </DialogHeader>
              <TransactionForm
                transactionToEdit={transactionToEdit} 
                onSave={handleFormSave} 
                dialogClose={handleDialogClose} 
              />
            </DialogContent>
          </Dialog>
        }
      />
      
      <TransactionTable
        transactions={transactions} 
        onEdit={handleEdit}
        onDelete={handleDeleteConfirm}
        isLoading={dataLoading}
      />

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

    