
"use client";

import type { Debt, DebtTransaction } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

interface DebtTransactionsListProps {
  debt: Debt;
  onTransactionDeleted?: () => void;
}

export function DebtTransactionsList({ debt, onTransactionDeleted }: DebtTransactionsListProps) {
  const { getTransactionsForDebt, deleteDebtTransaction, getAccountById, formatUserCurrency } = useAppData(); 
  const { toast } = useToast();
  const [transactionToDelete, setTransactionToDelete] = useState<DebtTransaction | null>(null);

  const transactions = getTransactionsForDebt(debt.id);

  const handleDeleteRequest = (transaction: DebtTransaction) => {
    setTransactionToDelete(transaction);
  };

  const executeDelete = async () => {
    if (transactionToDelete) {
      await deleteDebtTransaction(transactionToDelete.id, debt.id);
      toast({ title: "Abono Eliminado", description: "El abono ha sido eliminado de la deuda." });
      setTransactionToDelete(null);
      onTransactionDeleted?.();
    }
  };

  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No hay abonos registrados para esta deuda.</p>;
  }

  return (
    <AlertDialog open={!!transactionToDelete} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setTransactionToDelete(null);
      }
    }}>
      <ScrollArea className="max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const account = transaction.accountId ? getAccountById(transaction.accountId) : null;
              return (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'abono_realizado' ? "secondary" : "default"}>
                      {transaction.type === 'abono_realizado' ? 'Abono Realizado' : 'Abono Recibido'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatUserCurrency(transaction.amount)}</TableCell>
                  <TableCell className="truncate max-w-[100px]" title={account?.name || transaction.accountId}>
                    {account?.name || transaction.accountId || '-'}
                  </TableCell>
                  <TableCell className="truncate max-w-[100px]" title={transaction.notes || undefined}>{transaction.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(transaction)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar abono</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>

      {transactionToDelete && (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                Esta acción eliminará permanentemente el abono de {formatUserCurrency(transactionToDelete.amount)} del {formatDate(transactionToDelete.transactionDate)}. Esto también afectará el saldo de la deuda y la transacción general asociada.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
                Eliminar Abono
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}
