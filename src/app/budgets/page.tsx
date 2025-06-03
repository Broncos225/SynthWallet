
"use client";

import { useState } from 'react';
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
import { BudgetForm } from '@/components/budgets/budget-form';
import { BudgetListItem } from '@/components/budgets/budget-list-item';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Budget } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { format, parse as parseDateFns } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

export default function BudgetsPage() {
  const { budgets, expenses, deleteBudget, getCategoryName, dataLoading } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | undefined>(undefined);
  const [budgetToDeleteId, setBudgetToDeleteId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  
  const currentMonthYYYYMM = format(parseDateFns(new Date().toISOString(), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", new Date()), 'yyyy-MM');
  const currentMonthBudgets = budgets
    .filter(b => b.month === currentMonthYYYYMM)
    .sort((a, b) => {
        const catA = getCategoryName(a.categoryId);
        const catB = getCategoryName(b.categoryId);
        if (catA.includes('/') && !catB.includes('/')) return 1;
        if (!catA.includes('/') && catB.includes('/')) return -1;
        return catA.localeCompare(catB);
    });


  const pageDescription = `Gestiona tus metas financieras para ${format(parseDateFns(currentMonthYYYYMM, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: es })}.`;
  const dialogTitleText = budgetToEdit ? "Editar Presupuesto" : "Establecer Nuevo Presupuesto";
  const dialogDescriptionText = budgetToEdit
    ? "Actualiza los detalles de tu presupuesto."
    : "Define un presupuesto para una categoría y mes específicos.";

  const handleEdit = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = (budgetId: string) => {
    setBudgetToDeleteId(budgetId);
  };

  const executeDelete = async () => {
    if (budgetToDeleteId) {
      await deleteBudget(budgetToDeleteId);
      toast({ title: "Presupuesto Eliminado", description: "El presupuesto ha sido eliminado exitosamente."});
      setBudgetToDeleteId(undefined);
    }
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setBudgetToEdit(undefined);
  };

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setBudgetToEdit(undefined);
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Presupuestos"
          description={pageDescription}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-[170px] w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuestos"
        description={pageDescription}
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setBudgetToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Presupuesto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>
                  {dialogDescriptionText}
                </DialogDescription>
              </DialogHeader>
              <BudgetForm 
                budgetToEdit={budgetToEdit} 
                onSave={handleFormSave} 
                dialogClose={handleDialogClose} 
              />
            </DialogContent>
          </Dialog>
        }
      />

      {currentMonthBudgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentMonthBudgets.map((budget) => (
            <BudgetListItem 
              key={budget.id} 
              budget={budget} 
              expenses={expenses}
              onEdit={handleEdit}
              onDelete={handleDeleteConfirm}
            />
          ))}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No hay presupuestos establecidos para el mes actual. Haz clic en "Añadir Presupuesto" para empezar.
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!budgetToDeleteId} onOpenChange={() => setBudgetToDeleteId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el presupuesto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBudgetToDeleteId(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
