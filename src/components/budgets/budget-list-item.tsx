
"use client";

import type { Budget, Transaction } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
// import { formatCurrency } from '@/lib/utils'; // Replaced by formatUserCurrency from context
import { CategoryIcon } from '@/components/expenses/category-icon';
import { cn } from '@/lib/utils';
import { format, parse as parseDateFns } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BudgetListItemProps {
  budget: Budget;
  transactions: Transaction[];
  onEdit: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
}

export function BudgetListItem({ budget, transactions, onEdit, onDelete }: BudgetListItemProps) {
  const { getCategoryById, formatUserCurrency } = useAppData();
  const category = getCategoryById(budget.categoryId);
  const categoryDisplayName = category?.name || 'Presupuesto Desconocido';

  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const relevantExpenses = safeTransactions.filter(t => t.type === 'expense' && t.date.startsWith(budget.month));

  const spentAmount = relevantExpenses
    .filter(e => {
      const expenseCategory = getCategoryById(e.categoryId || "");
      if (category && !category.parentId) { 
        return (e.categoryId === budget.categoryId || expenseCategory?.parentId === budget.categoryId);
      }
      return e.categoryId === budget.categoryId;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const progressPercentage = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
  const remainingAmount = budget.amount - spentAmount;

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 flex-grow min-w-0">
          {category && <CategoryIcon iconName={category.icon} className="h-7 w-7 p-1 sm:h-8 sm:p-1.5" size={4} color={category.color} />}
          <div className="flex-grow min-w-0">
            <CardTitle className="text-sm font-semibold truncate" title={categoryDisplayName}>
              {categoryDisplayName}
            </CardTitle>
            <CardDescription className="text-xs">
              {format(parseDateFns(budget.month, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
            <div className="text-sm font-bold text-primary">{formatUserCurrency(budget.amount)}</div>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 data-[state=open]:bg-muted mt-1">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(budget)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(budget.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Gastado: {formatUserCurrency(spentAmount)}</span>
            <span className={cn(remainingAmount < 0 ? "text-destructive" : "text-muted-foreground")}>
              {remainingAmount >= 0 
                ? `${formatUserCurrency(remainingAmount)} restante`
                : `${formatUserCurrency(Math.abs(remainingAmount))} excedido`}
            </span>
          </div>
          <Progress value={Math.min(progressPercentage, 100)} aria-label={`${categoryDisplayName} progreso del presupuesto`} className="h-2"/>
        </div>
         {progressPercentage > 100 && (
          <p className="text-xs text-destructive text-center">¡Has excedido este presupuesto!</p>
        )}
      </CardContent>
    </Card>
  );
}
