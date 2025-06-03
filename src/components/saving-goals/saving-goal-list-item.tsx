
"use client";

import type { SavingGoal, Transaction } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/expenses/category-icon';
import { cn, formatDate } from '@/lib/utils';
import { Pencil, Trash2, MoreVertical, CheckCircle, Clock, TrendingDown, PackageOpen, Banknote } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SavingGoalListItemProps {
  goal: SavingGoal;
  onEdit: (goal: SavingGoal) => void;
  onDelete: (goal: SavingGoal) => void;
}

export function SavingGoalListItem({ goal, onEdit, onDelete }: SavingGoalListItemProps) {
  const { formatUserCurrency, getTransactionsForSavingGoal } = useAppData();

  const savingsProgressPercentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : (goal.currentAmount > 0 ? 100 : 0);
  const isCompleted = goal.status === 'completed';

  const linkedExpenses = getTransactionsForSavingGoal(goal.id).filter(t => t.type === 'expense');
  const totalSpentOnPlan = linkedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  const budgetRemaining = goal.targetAmount - totalSpentOnPlan;
  const spendingProgressPercentage = goal.targetAmount > 0 ? (totalSpentOnPlan / goal.targetAmount) * 100 : (totalSpentOnPlan > 0 ? 100 : 0);


  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow flex flex-col", isCompleted && goal.currentAmount >= goal.targetAmount && "bg-green-50 border-green-200")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-grow min-w-0">
            <CategoryIcon iconName={goal.icon} color={goal.color} size={6} className="flex-shrink-0"/>
            <div className="flex-grow min-w-0">
              <CardTitle className="text-lg truncate" title={goal.name}>{goal.name}</CardTitle>
              {goal.status === 'completed' && goal.currentAmount >= goal.targetAmount ? (
                <Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-1 h-3.5 w-3.5" />
                  Ahorro Completado
                </Badge>
              ) : (
                 <Badge variant="outline" className="mt-1">
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  Ahorro Activo
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center flex-shrink-0">
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(goal)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(goal)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2 flex-grow space-y-3">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-0.5">Progreso de Ahorro:</div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">{formatUserCurrency(goal.currentAmount)}</span> / {formatUserCurrency(goal.targetAmount)}
          </div>
          <Progress value={Math.min(savingsProgressPercentage, 100)} aria-label={`${goal.name} progreso del ahorro`} className="h-2 mt-1"/>
           <p className="text-xs text-muted-foreground text-right mt-0.5">{Math.min(savingsProgressPercentage, 100).toFixed(0)}% ahorrado</p>
        </div>
        
        <Separator />

        <div>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">Presupuesto del Plan:</div>
            <div className="flex justify-between items-baseline text-sm mb-1">
                <span className="font-semibold text-accent-foreground">{formatUserCurrency(goal.targetAmount)}</span>
                {totalSpentOnPlan > goal.targetAmount && (
                    <Badge variant="destructive" className="text-xs">Excedido</Badge>
                )}
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
                <span><TrendingDown className="inline h-3 w-3 mr-1 text-red-500" />Gastado: {formatUserCurrency(totalSpentOnPlan)}</span>
                <span><PackageOpen className="inline h-3 w-3 mr-1 text-blue-500" />Restante: {formatUserCurrency(budgetRemaining)}</span>
            </div>
            <Progress 
                value={Math.min(spendingProgressPercentage, 100)} 
                aria-label={`${goal.name} progreso del gasto del plan`} 
                className={cn("h-2 mt-1", spendingProgressPercentage > 100 && "bg-red-200 [&>div]:bg-red-500")}
            />
            <p className="text-xs text-muted-foreground text-right mt-0.5">{Math.min(spendingProgressPercentage, 100).toFixed(0)}% gastado</p>
        </div>

      </CardContent>
       <CardFooter className="pt-3 border-t text-xs text-muted-foreground">
          <div className="flex justify-between w-full">
            <span>Creado: {formatDate(goal.creationDate, 'dd/MM/yy')}</span>
            {goal.targetDate && <span>Meta: {formatDate(goal.targetDate, 'dd/MM/yy')}</span>}
          </div>
      </CardFooter>
    </Card>
  );
}
