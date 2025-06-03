
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
import { ExpenseForm } from '@/components/expenses/expense-form';
import { ExpenseTable } from '@/components/expenses/expense-table';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Expense } from '@/types';
import { useToast } from "@/hooks/use-toast";

export default function ExpensesPage() {
  const { expenses, deleteExpense, dataLoading } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | undefined>(undefined);
  const [expenseToDeleteId, setExpenseToDeleteId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  
  const dialogTitleText = expenseToEdit ? "Editar Gasto" : "Añadir Nuevo Gasto";
  const dialogDescriptionText = expenseToEdit 
    ? "Actualiza los detalles de tu gasto."
    : "Introduce los detalles de tu nuevo gasto.";

  const handleEdit = (expense: Expense) => {
    setExpenseToEdit(expense);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (expenseId: string) => {
    setExpenseToDeleteId(expenseId);
  };

  const executeDelete = async () => {
    if (expenseToDeleteId) {
      await deleteExpense(expenseToDeleteId);
      toast({ title: "Gasto Eliminado", description: "El gasto ha sido eliminado exitosamente."});
      setExpenseToDeleteId(undefined);
    }
  };

  const handleFormSave = () => {
    setIsFormOpen(false);
    setExpenseToEdit(undefined); 
  };
  
  const handleDialogClose = () => {
    setIsFormOpen(false);
    setExpenseToEdit(undefined); 
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Gastos"
        description="Registra y gestiona tus gastos."
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setExpenseToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>
                  {dialogDescriptionText}
                </DialogDescription>
              </DialogHeader>
              <ExpenseForm 
                expenseToEdit={expenseToEdit} 
                onSave={handleFormSave} 
                dialogClose={handleDialogClose} 
              />
            </DialogContent>
          </Dialog>
        }
      />
      
      <ExpenseTable 
        expenses={expenses} 
        onEdit={handleEdit}
        onDelete={handleDeleteConfirm}
        isLoading={dataLoading}
      />

      <AlertDialog open={!!expenseToDeleteId} onOpenChange={() => setExpenseToDeleteId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el gasto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDeleteId(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
