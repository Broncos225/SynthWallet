
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
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { SavingGoal } from '@/types';
import { SavingGoalForm } from '@/components/saving-goals/saving-goal-form';
import { SavingGoalListItem } from '@/components/saving-goals/saving-goal-list-item';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SavingGoalsPage() {
  const { savingGoals, deleteSavingGoal, dataLoading } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<SavingGoal | undefined>(undefined);
  const [goalToDelete, setGoalToDelete] = useState<SavingGoal | undefined>(undefined);
  const { toast } = useToast();

  const dialogTitleText = goalToEdit ? "Editar Objetivo de Ahorro" : "Añadir Nuevo Objetivo de Ahorro";
  const dialogDescriptionText = goalToEdit
    ? "Actualiza los detalles de tu objetivo."
    : "Define un nuevo objetivo para tus ahorros.";

  const handleEdit = (goal: SavingGoal) => {
    setGoalToEdit(goal);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (goal: SavingGoal) => {
    setGoalToDelete(goal);
  };

  const executeDelete = async () => {
    if (goalToDelete) {
      await deleteSavingGoal(goalToDelete.id);
      toast({ title: "Objetivo Eliminado", description: `El objetivo "${goalToDelete.name}" ha sido eliminado.` });
      setGoalToDelete(undefined);
    }
  };

  const handleFormSave = () => {
    setIsFormOpen(false);
    setGoalToEdit(undefined);
  };

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setGoalToEdit(undefined);
  };


  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Objetivos de Ahorro"
          description="Define y sigue el progreso de tus metas financieras."
          actions={<Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Añadir Objetivo</Button>}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[220px] w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Objetivos de Ahorro"
        description="Define y sigue el progreso de tus metas financieras."
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setGoalToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Objetivo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>{dialogDescriptionText}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
                <SavingGoalForm
                  goalToEdit={goalToEdit}
                  onSave={handleFormSave}
                  dialogClose={handleDialogClose}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />

      {savingGoals.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {savingGoals.map((goal) => (
            <SavingGoalListItem
              key={goal.id}
              goal={goal}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No has definido ningún objetivo de ahorro. ¡Haz clic en "Añadir Objetivo" para empezar!
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!goalToDelete} onOpenChange={() => setGoalToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el objetivo de ahorro "{goalToDelete?.name}". Las transacciones vinculadas no se eliminarán, pero se desvincularán de este objetivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setGoalToDelete(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
