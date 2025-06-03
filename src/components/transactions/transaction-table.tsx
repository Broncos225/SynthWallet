
"use client";

import type { Transaction } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, Info, ArrowRightLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CategoryIcon } from '@/components/expenses/category-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';


interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  isLoading?: boolean;
  title?: string;
  itemsPerPage?: number;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  isLoading,
  title = "Historial de Transacciones",
  itemsPerPage = 10,
}: TransactionTableProps) {
  const { getCategoryById, getCategoryName, getAccountById, formatUserCurrency } = useAppData();
  const [currentPage, setCurrentPage] = useState(1);

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = safeTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeTransactions.length / itemsPerPage);

  const paginateNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const paginatePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando transacciones...</p>
        </CardContent>
      </Card>
    );
  }

  if (safeTransactions.length === 0 && !isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Aún no se han registrado transacciones.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="shadow-lg flex flex-col">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 flex flex-col flex-1">
          <ScrollArea className="flex-1 max-h-[550px] sm:max-h-[650px]">
            <Table>
              <TableCaption>
                {safeTransactions.length > 0 ? `Mostrando ${currentItems.length} de ${safeTransactions.length} transacciones.` : 'No hay transacciones para mostrar.'}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-auto px-1 sm:px-2">Tipo</TableHead>
                  <TableHead className="px-1 sm:px-2">Descripción</TableHead>
                  <TableHead className="hidden md:table-cell px-1 sm:px-2">Cuenta</TableHead>
                  <TableHead className="px-1 sm:px-2">Cat.</TableHead>
                  <TableHead className="text-right px-1 sm:px-2">Monto</TableHead>
                  <TableHead className="hidden md:table-cell px-1 sm:px-2">Fecha</TableHead>
                  <TableHead className="hidden lg:table-cell px-1 sm:px-2">Benef./Fuente</TableHead>
                  <TableHead className="text-right px-1 sm:px-2">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentItems.map((transaction) => {
                  const category = transaction.categoryId ? getCategoryById(transaction.categoryId) : undefined;
                  let categoryDisplayName = 'N/A';
                  if (transaction.type !== 'transfer' && transaction.categoryId) {
                    categoryDisplayName = getCategoryName(transaction.categoryId);
                  } else if (transaction.type === 'transfer') {
                    categoryDisplayName = '-';
                  }
                  
                  const account = transaction.accountId ? getAccountById(transaction.accountId) : undefined;
                  const fromAccount = transaction.fromAccountId ? getAccountById(transaction.fromAccountId) : undefined;
                  const toAccount = transaction.toAccountId ? getAccountById(transaction.toAccountId) : undefined;

                  const isIncome = transaction.type === 'income';
                  const isExpense = transaction.type === 'expense';
                  const isTransfer = transaction.type === 'transfer';
                  const isDebtRelated = !!transaction.relatedDebtTransactionId;

                  let accountDisplay = account?.name || 'N/A';
                  if (isTransfer) {
                    accountDisplay = `Desde: ${fromAccount?.name || 'N/A'} → Hacia: ${toAccount?.name || 'N/A'}`;
                  }

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="px-1 sm:px-2">
                        <Badge 
                          variant={isIncome ? "default" : isExpense ? "secondary" : "outline"} 
                          className={cn(
                            isIncome ? "bg-green-600 hover:bg-green-700" : 
                            isExpense ? "bg-red-600 hover:bg-red-700" : 
                            "border-blue-500 text-blue-500", 
                            "text-white text-xs p-1 sm:p-1.5"
                          )}
                        >
                          {isIncome && <ArrowUpCircle className="h-3.5 w-3.5 sm:mr-1 flex-shrink-0" />}
                          {isExpense && <ArrowDownCircle className="h-3.5 w-3.5 sm:mr-1 flex-shrink-0" />}
                          {isTransfer && <ArrowRightLeft className="h-3.5 w-3.5 sm:mr-1 flex-shrink-0" />}
                          <span className="hidden sm:inline">
                            {isIncome ? 'Ingreso' : isExpense ? 'Gasto' : 'Transfer.'}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[80px] xs:max-w-[100px] sm:max-w-[150px] md:max-w-[200px] px-1 sm:px-2" title={transaction.description}>
                        <div className="flex items-center gap-1">
                          {transaction.description}
                          {isDebtRelated && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-blue-500 cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Esta transacción es un abono de deuda.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell truncate max-w-[100px] px-1 sm:px-2" title={accountDisplay}>
                        {accountDisplay}
                      </TableCell>
                      <TableCell className="px-1 sm:px-2">
                        <div className="flex items-center gap-1">
                          {category && transaction.type !== 'transfer' && <CategoryIcon iconName={category.icon} color={category.color} size={4} className="p-0.5"/>}
                          <span className="hidden sm:inline-block font-medium truncate max-w-[70px] sm:max-w-[120px]" title={categoryDisplayName}>
                            {transaction.type !== 'transfer' ? (categoryDisplayName.split(' / ')[1] || categoryDisplayName.split(' / ')[0]) : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-semibold px-1 sm:px-2",
                        isIncome ? 'text-green-600' : isExpense ? 'text-red-600' : 'text-foreground'
                      )}>
                        {formatUserCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell px-1 sm:px-2">{formatDate(transaction.date)}</TableCell>
                      <TableCell className="hidden lg:table-cell truncate max-w-[100px] xl:max-w-[150px] px-1 sm:px-2" title={transaction.payee || undefined}>
                          {transaction.payee || '-'}
                      </TableCell>
                      <TableCell className="text-right px-1 sm:px-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => onEdit(transaction)} 
                              disabled={isDebtRelated && transaction.type !== 'transfer'} 
                              title={isDebtRelated && transaction.type !== 'transfer' ? "Editar abonos desde sección Deudas" : undefined}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(transaction.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-2 py-4">
              <span className="text-xs sm:text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={paginatePrev}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={paginateNext}
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
