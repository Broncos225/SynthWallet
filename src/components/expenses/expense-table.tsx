
"use client";

import type { Expense } from '@/types';
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
// import { formatCurrency, formatDate } from '@/lib/utils'; // Removed formatCurrency
import { formatDate } from '@/lib/utils';
import { CategoryIcon } from './category-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ExpenseTableProps {
  expenses: Expense[]; // This prop might be Transaction[] after rename
  maxItems?: number;
  onEdit: (expense: Expense) => void; // This should be Transaction
  onDelete: (expenseId: string) => void;
  isLoading?: boolean;
}

export function ExpenseTable({ expenses, maxItems, onEdit, onDelete, isLoading }: ExpenseTableProps) {
  const { getCategoryById, getCategoryName, getAccountById, formatUserCurrency } = useAppData(); // Added formatUserCurrency

  // Safely handle the expenses prop
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const displayedExpenses = maxItems ? safeExpenses.slice(0, maxItems) : safeExpenses;

  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{maxItems ? "Gastos Recientes" : "Todos los Gastos"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando gastos...</p>
        </CardContent>
      </Card>
    );
  }

  if (displayedExpenses.length === 0 && !isLoading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{maxItems ? "Gastos Recientes" : "Todos los Gastos"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aún no se han registrado gastos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      {maxItems && (
         <CardHeader>
          <CardTitle>Gastos Recientes</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!maxItems && "pt-6")}>
        <ScrollArea className={cn(maxItems ? "max-h-[400px]" : "max-h-[calc(100vh-22rem)]")}>
          <Table>
            {!maxItems && <TableCaption>Una lista de tus gastos.</TableCaption>}
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px] sm:w-auto">Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="hidden md:table-cell">Cuenta</TableHead> {/* Added Account */}
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="hidden md:table-cell">Fecha</TableHead>
                <TableHead className="hidden lg:table-cell">Beneficiario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedExpenses.map((expense) => {
                const category = getCategoryById(expense.categoryId);
                const categoryDisplayName = getCategoryName(expense.categoryId);
                // @ts-ignore - accountId might not be on Expense type if rename to Transaction hasn't fully propagated
                const account = expense.accountId ? getAccountById(expense.accountId) : undefined;
                return (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {category && <CategoryIcon iconName={category.icon} color={category.color} size={5}/>}
                        <span className="hidden sm:inline-block font-medium truncate max-w-[120px] xl:max-w-[180px]" title={categoryDisplayName}>
                          {categoryDisplayName.split(' / ')[1] || categoryDisplayName.split(' / ')[0]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[150px] sm:max-w-[200px] xl:max-w-[300px]" title={expense.description}>
                        {expense.description}
                    </TableCell>
                    <TableCell className="hidden md:table-cell truncate max-w-[100px]" title={account?.name}>
                      {account?.name || 'N/A'}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      // @ts-ignore - type might not be on Expense type
                      expense.type === 'income' ? 'text-green-600' : expense.type === 'expense' ? 'text-red-600' : ''
                    )}>
                      {formatUserCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(expense.date)}</TableCell>
                    <TableCell className="hidden lg:table-cell truncate max-w-[100px] xl:max-w-[150px]" title={expense.payee}>
                        {expense.payee || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(expense)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(expense.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
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
      </CardContent>
    </Card>
  );
}
