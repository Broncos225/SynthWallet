
"use client";

import type { Debt } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { HandCoins, FileText, Trash2, MoreVertical, Edit3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppData } from '@/contexts/app-data-context';

interface DebtListItemProps {
  debt: Debt;
  onRegisterPayment: (debt: Debt) => void;
  onViewTransactions: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
}

export function DebtListItem({ debt, onRegisterPayment, onViewTransactions, onDelete, onEdit }: DebtListItemProps) {
  const { formatUserCurrency, getPayeeName } = useAppData();
  const progressPercentage = debt.initialAmount > 0 ? ((debt.initialAmount - debt.currentBalance) / debt.initialAmount) * 100 : (debt.currentBalance === 0 ? 100 : 0);
  const isPaid = debt.status === 'pagada';

  const debtorCreditorName = debt.payeeId ? getPayeeName(debt.payeeId) : debt.debtorOrCreditor;

  const getStatusBadgeVariant = (status: Debt['status']) => {
    switch (status) {
      case 'pagada': return 'default';
      case 'parcial': return 'secondary';
      case 'pendiente': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeText = (status: Debt['status']) => {
    switch (status) {
      case 'pagada': return 'Pagada/Cobrada';
      case 'parcial': return 'Parcial';
      case 'pendiente': return 'Pendiente';
      default: return 'Desconocido';
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold mb-1">{debt.name}</CardTitle>
            <CardDescription>
              {debt.type === 'owed_by_me' ? 'Debes a: ' : 'Te debe: '} <strong>{debtorCreditorName}</strong>
            </CardDescription>
          </div>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Más opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(debt)}>
                <Edit3 className="mr-2 h-4 w-4" /> Editar Deuda
              </DropdownMenuItem>
              {!isPaid && (
                <DropdownMenuItem onClick={() => onRegisterPayment(debt)}>
                  <HandCoins className="mr-2 h-4 w-4" /> Registrar Abono
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onViewTransactions(debt)}>
                <FileText className="mr-2 h-4 w-4" /> Ver Transacciones
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(debt)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar Deuda
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
         <Badge variant={getStatusBadgeVariant(debt.status)} className="mt-2 w-fit">
            {getStatusBadgeText(debt.status)}
          </Badge>
      </CardHeader>
      <CardContent className="space-y-2 flex-grow">
        <div className="text-sm">
          Monto Inicial: <span className="font-medium">{formatUserCurrency(debt.initialAmount)}</span>
        </div>
        <div className="text-sm">
          Saldo Actual: <span className="font-bold text-primary">{formatUserCurrency(debt.currentBalance)}</span>
        </div>
        {debt.dueDate && (
          <div className="text-xs text-muted-foreground">
            Vence: {formatDate(debt.dueDate)}
          </div>
        )}
        <Progress value={progressPercentage} aria-label={`Progreso de la deuda ${debt.name}`} className="h-2 mt-2" />
        <div className="text-xs text-muted-foreground text-right">
          {Math.round(progressPercentage)}% {debt.type === 'owed_by_me' ? 'pagado' : 'cobrado'}
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t ">
        <div className="flex w-full justify-between items-center text-xs text-muted-foreground">
            <span>Creada: {formatDate(debt.creationDate)}</span>
            {isPaid && <span className="font-semibold text-primary">¡Completada!</span>}
        </div>
      </CardFooter>
    </Card>
  );
}
