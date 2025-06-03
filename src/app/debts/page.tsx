
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
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Debt } from '@/types';
import { DebtForm } from '@/components/debts/debt-form';
import { DebtListItem } from '@/components/debts/debt-list-item';
import { DebtTransactionForm } from '@/components/debts/debt-transaction-form';
import { DebtTransactionsList } from '@/components/debts/debt-transactions-list';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
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
import { TransactionFAB } from '@/components/shared/transaction-fab';

export default function DebtsPage() {
  const { debts, deleteDebt, dataLoading, getTransactionsForDebt, accounts } = useAppData();
  const { toast } = useToast();

  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<Debt | undefined>(undefined);

  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [debtForTransaction, setDebtForTransaction] = useState<Debt | undefined>(undefined);

  const [isTransactionsListOpen, setIsTransactionsListOpen] = useState(false);
  const [debtForTransactionsList, setDebtForTransactionsList] = useState<Debt | undefined>(undefined);
  const [transactionsListKey, setTransactionsListKey] = useState(0); // To force re-render of list

  const [debtToDelete, setDebtToDelete] = useState<Debt | undefined>(undefined);


  const debtsIOwe = debts.filter(d => d.type === 'owed_by_me' && d.status !== 'pagada');
  const debtsOwedToMe = debts.filter(d => d.type === 'owed_to_me' && d.status !== 'pagada');
  const paidDebts = debts.filter(d => d.status === 'pagada');

  const handleAddDebt = () => {
    setDebtToEdit(undefined);
    setIsDebtFormOpen(true);
  };

  const handleDebtFormSave = () => {
    setIsDebtFormOpen(false);
    setDebtToEdit(undefined);
  };

  const handleDebtFormClose = () => {
    setIsDebtFormOpen(false);
    setDebtToEdit(undefined);
  };

  const handleRegisterPayment = (debt: Debt) => {
    if (accounts.length === 0) {
      toast({
        variant: "destructive",
        title: "No hay cuentas",
        description: "Por favor, crea una cuenta en Configuración antes de registrar un abono."
      });
      return;
    }
    setDebtForTransaction(debt);
    setIsTransactionFormOpen(true);
  };

  const handleTransactionFormSave = () => {
    setIsTransactionFormOpen(false);
    setDebtForTransaction(undefined);
    // Potentially refresh transactions list if open for this debt
    if (debtForTransactionsList && debtForTransaction && debtForTransactionsList.id === debtForTransaction.id) {
      setTransactionsListKey(prev => prev + 1);
    }
  };

  const handleTransactionFormClose = () => {
    setIsTransactionFormOpen(false);
    setDebtForTransaction(undefined);
  };

  const handleViewTransactions = (debt: Debt) => {
    setDebtForTransactionsList(debt);
    setTransactionsListKey(prev => prev + 1); // Ensure list refreshes
    setIsTransactionsListOpen(true);
  };

  const handleTransactionsListClose = () => {
    setIsTransactionsListOpen(false);
    setDebtForTransactionsList(undefined);
  };

  const handleDeleteRequest = (debt: Debt) => {
    const transactions = getTransactionsForDebt(debt.id);
    if (transactions.length > 0) {
        toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: `La deuda "${debt.name}" tiene abonos asociados. Elimina primero los abonos desde la lista de transacciones de la deuda.`
        });
        return;
    }
    setDebtToDelete(debt);
  };

  const executeDeleteDebt = async () => {
    if (debtToDelete) {
        await deleteDebt(debtToDelete.id);
        toast({ title: "Deuda Eliminada", description: `La deuda "${debtToDelete.name}" ha sido eliminada.` });
        setDebtToDelete(undefined);
    }
  };

  const handleTransactionDeletedInList = () => {
    // This callback can be used to refresh data or UI if needed
    // For example, force a re-render of the transactions list
    if (debtForTransactionsList) {
        setTransactionsListKey(prev => prev + 1);
    }
  };


  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestión de Deudas"
          description="Registra y administra tus deudas y cuentas por cobrar."
          actions={<Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Deuda</Button>}
        />
        <Tabs defaultValue="pending_i_owe" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
            <TabsTrigger value="pending_i_owe" disabled>Debo (...)</TabsTrigger>
            <TabsTrigger value="pending_to_me" disabled>Me Deben (...)</TabsTrigger>
            <TabsTrigger value="paid" disabled>Pagadas/Cobradas (...)</TabsTrigger>
          </TabsList>
          <TabsContent value="pending_i_owe" className="mt-4">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-[230px] w-full" />)}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Deudas"
        description="Registra y administra tus deudas y cuentas por cobrar."
        actions={
            <Dialog open={isDebtFormOpen} onOpenChange={(open) => { if (!open) handleDebtFormClose(); else setIsDebtFormOpen(true); }}>
                <DialogTrigger asChild>
                    <Button onClick={handleAddDebt}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nueva Deuda
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md" aria-label="Añadir Nueva Deuda">
                <DialogHeader>
                    <DialogTitle>{debtToEdit ? 'Editar Deuda' : 'Añadir Nueva Deuda'}</DialogTitle>
                    <DialogDescription>
                    {debtToEdit ? 'Actualiza los detalles de la deuda.' : 'Introduce los detalles de la nueva deuda.'}
                    </DialogDescription>
                </DialogHeader>
                <DebtForm debtToEdit={debtToEdit} onSave={handleDebtFormSave} dialogClose={handleDebtFormClose} />
                </DialogContent>
            </Dialog>
        }
      />

      <Tabs defaultValue="pending_i_owe" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="pending_i_owe">Debo ({debtsIOwe.length})</TabsTrigger>
          <TabsTrigger value="pending_to_me">Me Deben ({debtsOwedToMe.length})</TabsTrigger>
          <TabsTrigger value="paid">Pagadas/Cobradas ({paidDebts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending_i_owe" className="mt-4">
          {debtsIOwe.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {debtsIOwe.map(debt => (
                <DebtListItem
                  key={debt.id}
                  debt={debt}
                  onRegisterPayment={handleRegisterPayment}
                  onViewTransactions={handleViewTransactions}
                  onDelete={() => handleDeleteRequest(debt)}
                />
              ))}
            </div>
          ) : (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No tienes deudas pendientes por pagar.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="pending_to_me" className="mt-4">
          {debtsOwedToMe.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {debtsOwedToMe.map(debt => (
                <DebtListItem
                  key={debt.id}
                  debt={debt}
                  onRegisterPayment={handleRegisterPayment}
                  onViewTransactions={handleViewTransactions}
                  onDelete={() => handleDeleteRequest(debt)}
                />
              ))}
            </div>
          ) : (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No tienes cuentas pendientes por cobrar.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          {paidDebts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paidDebts.map(debt => (
                <DebtListItem
                  key={debt.id}
                  debt={debt}
                  onRegisterPayment={handleRegisterPayment}
                  onViewTransactions={handleViewTransactions}
                  onDelete={() => handleDeleteRequest(debt)}
                />
              ))}
            </div>
          ) : (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No hay deudas pagadas o cobradas registradas.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      <TransactionFAB />

      {/* Debt Transaction Form Dialog */}
      {debtForTransaction && (
        <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) handleTransactionFormClose(); else setIsTransactionFormOpen(true); }}>
          <DialogContent className="sm:max-w-md" aria-label="Registrar Abono/Pago">
            <DialogHeader>
              <DialogTitle>Registrar Abono/Pago para: {debtForTransaction.name}</DialogTitle>
              <DialogDescription>
                Introduce los detalles del abono {debtForTransaction.type === 'owed_by_me' ? 'realizado' : 'recibido'}.
              </DialogDescription>
            </DialogHeader>
            <DebtTransactionForm debt={debtForTransaction} onSave={handleTransactionFormSave} dialogClose={handleTransactionFormClose} />
          </DialogContent>
        </Dialog>
      )}

      {/* Debt Transactions List Dialog */}
      {debtForTransactionsList && (
        <Dialog open={isTransactionsListOpen} onOpenChange={(open) => { if (!open) handleTransactionsListClose(); else setIsTransactionsListOpen(true); }}>
           <DialogContent className="sm:max-w-lg" aria-label={`Abonos para ${debtForTransactionsList.name}`}>
            <DialogHeader>
              <DialogTitle>Abonos para: {debtForTransactionsList.name}</DialogTitle>
            </DialogHeader>
            {/* AlertDialog is managed inside DebtTransactionsList for delete confirmation */}
            <DebtTransactionsList
                key={transactionsListKey} // Force re-render when key changes
                debt={debtForTransactionsList}
                onTransactionDeleted={handleTransactionDeletedInList}
            />
          </DialogContent>
        </Dialog>
      )}

       {/* Delete Debt Confirmation Dialog */}
        <AlertDialog open={!!debtToDelete} onOpenChange={() => setDebtToDelete(undefined)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                {getTransactionsForDebt(debtToDelete?.id || "").length > 0
                    ? `La deuda "${debtToDelete?.name}" tiene abonos asociados. Elimina primero los abonos.`
                    : `Esta acción no se puede deshacer. Esto eliminará permanentemente la deuda "${debtToDelete?.name}".`
                }
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDebtToDelete(undefined)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    onClick={executeDeleteDebt}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={getTransactionsForDebt(debtToDelete?.id || "").length > 0}
                >
                Eliminar
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
}
