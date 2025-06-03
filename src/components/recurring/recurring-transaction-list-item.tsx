
"use client";

import type { RecurringTransaction } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { useAppData } from '@/contexts/app-data-context';
import { TrendingUp, TrendingDown, Edit3, Trash2, MoreVertical, CalendarClock, CheckCircle, CircleOff, Repeat } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface RecurringTransactionListItemProps {
  record: RecurringTransaction;
  onEdit: (record: RecurringTransaction) => void;
  onDelete: (record: RecurringTransaction) => void;
  onProcessNow: (record: RecurringTransaction) => void;
}

export function RecurringTransactionListItem({ record, onEdit, onDelete, onProcessNow }: RecurringTransactionListItemProps) {
  const { getCategoryName, getAccountById, formatUserCurrency } = useAppData();

  const account = record.accountId ? getAccountById(record.accountId) : null;
  const categoryDisplay = record.categoryId ? getCategoryName(record.categoryId) : 'N/A';

  const frequencyMap: Record<RecurringTransaction['frequency'], string> = {
    daily: 'Diario',
    weekly: 'Semanal',
    'bi-weekly': 'Quincenal',
    monthly: 'Mensual',
    yearly: 'Anual',
  };

  const handleProcessNowClick = () => {
    console.log("ListItem: 'Registrar Ahora' button clicked for record ID:", record.id);
    onProcessNow(record);
  };

  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow flex flex-col", !record.isActive && "opacity-60 bg-muted/30")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-grow min-w-0">
            <CardTitle className="text-lg font-semibold mb-1 truncate" title={record.name}>
              {record.name}
            </CardTitle>
            <div className="flex items-center gap-2">
                <Badge variant={record.type === 'income' ? 'default' : 'secondary'} className={cn(record.type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700', 'text-white')}>
                {record.type === 'income' ? <TrendingUp className="mr-1 h-3.5 w-3.5" /> : <TrendingDown className="mr-1 h-3.5 w-3.5" />}
                {record.type === 'income' ? 'Ingreso' : 'Gasto'}
                </Badge>
                <Badge variant={record.isActive ? "outline" : "destructive"} className="border-dashed">
                    {record.isActive ? <CheckCircle className="mr-1 h-3.5 w-3.5 text-green-600"/> : <CircleOff className="mr-1 h-3.5 w-3.5"/>}
                    {record.isActive ? "Activo" : "Inactivo"}
                </Badge>
            </div>
          </div>
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-muted">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Más opciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(record)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleProcessNowClick} disabled={!record.isActive}>
                  <CalendarClock className="mr-2 h-4 w-4" /> Registrar Ahora
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(record)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 flex-grow pt-2">
        <div className="text-xl font-bold text-primary">{formatUserCurrency(record.amount)}</div>
        
        {record.nextDueDate && (
          <p className="text-sm text-muted-foreground flex items-center">
            <CalendarClock className="mr-2 h-4 w-4 text-primary" />
            Próximo: {formatDate(record.nextDueDate, 'dd/MM/yyyy')}
          </p>
        )}
        <p className="text-sm text-muted-foreground flex items-center">
            <Repeat className="mr-2 h-4 w-4 text-primary/80" />
            Frecuencia: {frequencyMap[record.frequency]}
        </p>
        {account && (
          <p className="text-sm text-muted-foreground truncate" title={`Cuenta: ${account.name}`}>
            Cuenta: {account.name}
          </p>
        )}
        {(record.type === 'expense' || record.type === 'income') && record.categoryId && (
          <p className="text-sm text-muted-foreground truncate" title={`Categoría: ${categoryDisplay}`}>
            Categoría: {categoryDisplay}
          </p>
        )}
        {record.payee && (
          <p className="text-sm text-muted-foreground truncate" title={`Benef./Pagador: ${record.payee}`}>
            Benef./Pagador: {record.payee}
          </p>
        )}
      </CardContent>
      <CardFooter className="pt-3 border-t text-xs text-muted-foreground">
        <div className="flex justify-between w-full">
            <span>Inicia: {formatDate(record.startDate, 'dd/MM/yy')}</span>
            {record.endDate && <span>Termina: {formatDate(record.endDate, 'dd/MM/yy')}</span>}
        </div>
      </CardFooter>
    </Card>
  );
}
    
