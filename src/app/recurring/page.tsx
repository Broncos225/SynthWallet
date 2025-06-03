
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
} from "@/components/ui/alert-dialog";
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { RecurringTransaction } from '@/types';
import { RecurringTransactionForm } from '@/components/recurring/recurring-transaction-form';
import { RecurringTransactionListItem } from '@/components/recurring/recurring-transaction-list-item';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

export default function RecurringTransactionsPage() {
  const {
    recurringTransactions: recurringTransactionsFromContext,
    deleteRecurringTransaction,
    dataLoading,
    processRecurringTransactionAsDone,
    setTransactionToPrefillFromRecurring
  } = useAppData();

  const recurringTransactions = Array.isArray(recurringTransactionsFromContext) ? recurringTransactionsFromContext : [];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<RecurringTransaction | undefined>(undefined);
  const [recordToDelete, setRecordToDelete] = useState<RecurringTransaction | undefined>(undefined);
  const { toast } = useToast();
  const router = useRouter();

  const dialogTitleText = recordToEdit ? "Editar Recordatorio" : "Añadir Nuevo Recordatorio";
  const dialogDescriptionText = recordToEdit
    ? "Actualiza los detalles de tu transacción recurrente."
    : "Define una nueva transacción recurrente.";

  const handleEdit = (record: RecurringTransaction) => {
    setRecordToEdit(record);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (record: RecurringTransaction) => {
    setRecordToDelete(record);
  };

  const executeDelete = async () => {
    if (recordToDelete) {
      await deleteRecurringTransaction(recordToDelete.id);
      toast({ title: "Recordatorio Eliminado", description: `El recordatorio "${recordToDelete.name}" ha sido eliminado.` });
      setRecordToDelete(undefined);
    }
  };

  const handleFormSave = () => {
    setIsFormOpen(false);
    setRecordToEdit(undefined);
  };

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setRecordToEdit(undefined);
  };

  const handleProcessNow = async (record: RecurringTransaction) => {
    console.log("RecurringPage: handleProcessNow initiated for record:", record.id); 

    if (!record.nextDueDate) {
        console.error("RecurringPage: Record has no nextDueDate, cannot process.", record);
        toast({ variant: "destructive", title: "Error", description: "Este recordatorio no tiene una próxima fecha de vencimiento." });
        return;
    }
    console.log("RecurringPage: Calling processRecurringTransactionAsDone for ID:", record.id, "and date:", record.nextDueDate);
    await processRecurringTransactionAsDone(record.id, record.nextDueDate);

    const prefillData = {
        description: record.name,
        amount: record.amount,
        type: record.type,
        categoryId: record.categoryId,
        accountId: record.accountId,
        payee: record.payee,
        date: record.nextDueDate, 
    };
    console.log("RecurringPage: Setting data to context for prefill:", prefillData);
    setTransactionToPrefillFromRecurring(prefillData);

    console.log("RecurringPage: Navigating to home page (/)");
    router.push('/');
    toast({ title: "Recordatorio Procesado", description: `"${record.name}" marcado como procesado. Se ha preparado una nueva transacción.`});
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Recordatorios de Transacciones"
          description="Gestiona tus gastos e ingresos recurrentes."
          actions={<Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Añadir Recordatorio</Button>}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[230px] w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recordatorios de Transacciones"
        description="Gestiona tus gastos e ingresos recurrentes."
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setRecordToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Recordatorio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>{dialogDescriptionText}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
                <RecurringTransactionForm
                  recordToEdit={recordToEdit}
                  onSave={handleFormSave}
                  dialogClose={handleDialogClose}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />

      {recurringTransactions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recurringTransactions.map((record) => (
            <RecurringTransactionListItem
              key={record.id}
              record={record}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
              onProcessNow={handleProcessNow}
            />
          ))}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No has definido ningún recordatorio de transacción. ¡Haz clic en "Añadir Recordatorio" para empezar!
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el recordatorio recurrente "{recordToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecordToDelete(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

