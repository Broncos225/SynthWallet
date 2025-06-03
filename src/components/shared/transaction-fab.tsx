
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { useAppData } from '@/contexts/app-data-context';
import type { TransactionType, Transaction } from '@/types';
import { Plus, X as CloseIcon, TrendingDown, TrendingUp, ArrowRightLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TransactionFAB() {
  const {
    transactionToPrefillFromRecurring,
    setTransactionToPrefillFromRecurring,
  } = useAppData();

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<TransactionType | undefined>(undefined);
  // FAB is for new transactions, so transactionToEdit is not needed here.
  // transactionToPrefill will come from context.

  useEffect(() => {
    if (transactionToPrefillFromRecurring) {
      console.log("TransactionFAB: useEffect detected transactionToPrefillFromRecurring:", transactionToPrefillFromRecurring);
      setTransactionTypeForModal(transactionToPrefillFromRecurring.type);
      setIsTransactionFormOpen(true);
    }
  }, [transactionToPrefillFromRecurring]);

  const handleFabOptionClick = (type: TransactionType) => {
    console.log("TransactionFAB: FAB option clicked for type:", type);
    setTransactionTypeForModal(type);
    setIsTransactionFormOpen(true);
    setIsFabMenuOpen(false);
  };

  const handleTransactionFormSave = () => {
    setIsTransactionFormOpen(false);
    setTransactionTypeForModal(undefined);
    if (transactionToPrefillFromRecurring) {
      console.log("TransactionFAB: Clearing prefill data on transaction form save.");
      setTransactionToPrefillFromRecurring(null);
    }
  };

  const handleTransactionDialogClose = () => {
    setIsTransactionFormOpen(false);
    setTransactionTypeForModal(undefined);
    if (transactionToPrefillFromRecurring) {
      console.log("TransactionFAB: Clearing prefill data on transaction dialog close.");
      setTransactionToPrefillFromRecurring(null);
    }
  };

  const transactionDialogTitleText = 
    transactionTypeForModal === 'expense' ? "Añadir Nuevo Gasto" :
    transactionTypeForModal === 'income' ? "Añadir Nuevo Ingreso" :
    transactionTypeForModal === 'transfer' ? "Añadir Nueva Transferencia" : "Añadir Nueva Transacción";

  const transactionDialogDescriptionText = 
    transactionTypeForModal === 'expense' ? "Introduce los detalles de tu nuevo gasto." :
    transactionTypeForModal === 'income' ? "Introduce los detalles de tu nuevo ingreso." :
    transactionTypeForModal === 'transfer' ? "Introduce los detalles de tu nueva transferencia." :
    "Introduce los detalles de tu nueva transacción.";

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isFabMenuOpen && (
          <div className="flex flex-col items-end gap-3 mb-2 transition-all duration-300 ease-in-out">
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full shadow-lg w-auto pl-4 pr-5 py-3 h-auto bg-background hover:bg-muted text-foreground"
              onClick={() => handleFabOptionClick('transfer')}
              aria-label="Añadir nueva transferencia"
            >
              <ArrowRightLeft className="mr-2 h-5 w-5 text-blue-500" />
              Transferencia
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full shadow-lg w-auto pl-4 pr-5 py-3 h-auto bg-background hover:bg-muted text-foreground"
              onClick={() => handleFabOptionClick('income')}
              aria-label="Añadir nuevo ingreso"
            >
              <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
              Ingreso
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full shadow-lg w-auto pl-4 pr-5 py-3 h-auto bg-background hover:bg-muted text-foreground"
              onClick={() => handleFabOptionClick('expense')}
              aria-label="Añadir nuevo gasto"
            >
              <TrendingDown className="mr-2 h-5 w-5 text-red-500" />
              Gasto
            </Button>
          </div>
        )}
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          aria-label={isFabMenuOpen ? "Cerrar menú de acciones" : "Abrir menú de acciones"}
        >
          {isFabMenuOpen ? <CloseIcon className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
        </Button>
      </div>

      <Dialog open={isTransactionFormOpen} onOpenChange={(open) => {
        if (!open) handleTransactionDialogClose();
        else setIsTransactionFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={transactionDialogTitleText}>
          <DialogHeader>
            <DialogTitle>{transactionDialogTitleText}</DialogTitle>
            <DialogDescription>{transactionDialogDescriptionText}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
            <TransactionForm
              initialType={transactionTypeForModal}
              transactionToPrefill={transactionToPrefillFromRecurring || undefined}
              onSave={handleTransactionFormSave}
              dialogClose={handleTransactionDialogClose}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
