
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, Star } from 'lucide-react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseTemplateForm } from '@/components/settings/expense-template-form';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { ExpenseTemplate } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from '@/lib/utils';
import { CategoryIcon } from '@/components/expenses/category-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpenseTemplatesSettingsPage() {
  const { expenseTemplates, deleteExpenseTemplate, getCategoryById, getCategoryName, dataLoading } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ExpenseTemplate | undefined>(undefined);
  const [templateToDelete, setTemplateToDelete] = useState<ExpenseTemplate | undefined>(undefined);
  const { toast } = useToast();

  const dialogTitleText = templateToEdit ? "Editar Plantilla de Gasto" : "Añadir Nueva Plantilla de Gasto";
  const dialogDescriptionText = templateToEdit
    ? "Actualiza los detalles de tu plantilla de gasto."
    : "Define una nueva plantilla para gastos recurrentes.";

  const handleEdit = (template: ExpenseTemplate) => {
    setTemplateToEdit(template);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (template: ExpenseTemplate) => {
    setTemplateToDelete(template);
  };

  const executeDelete = async () => {
    if (templateToDelete) {
      await deleteExpenseTemplate(templateToDelete.id);
      toast({ title: "Plantilla Eliminada", description: `La plantilla "${templateToDelete.name}" ha sido eliminada.` });
      setTemplateToDelete(undefined);
    }
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setTemplateToEdit(undefined);
  };

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setTemplateToEdit(undefined);
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestionar Plantillas de Gastos"
          description="Crea y edita plantillas para registrar tus gastos frecuentes más rápidamente."
          actions={<Button><PlusCircle className="mr-2 h-4 w-4" /> Añadir Plantilla</Button>}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-[200px] w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <PageHeader
        title="Gestionar Plantillas de Gastos"
        description="Crea y edita plantillas para registrar tus gastos frecuentes más rápidamente."
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setTemplateToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>{dialogDescriptionText}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
                <ExpenseTemplateForm
                  templateToEdit={templateToEdit} 
                  onSave={handleFormSave} 
                  dialogClose={handleDialogClose} 
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />

      {expenseTemplates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {expenseTemplates.map((template) => {
            const category = getCategoryById(template.categoryId);
            return (
              <Card key={template.id} className="shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                        <Star className="h-6 w-6 text-amber-500" />
                        <div>
                            <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                            <CardDescription>{template.description || "Sin descripción"}</CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                         <Button variant="ghost" size="sm" className="h-8 w-8 p-0 data-[state=open]:bg-muted mt-1" onClick={() => handleEdit(template)}>
                            <Edit3 className="h-4 w-4" />
                            <span className="sr-only">Editar plantilla</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xl font-bold text-primary">{formatCurrency(template.amount)}</div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    {category && <CategoryIcon iconName={category.icon} color={category.color} size={4} className="mr-2"/>}
                    {getCategoryName(template.categoryId)}
                  </div>
                  {template.payee && <p className="text-sm text-muted-foreground">Beneficiario: {template.payee}</p>}
                   <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 text-destructive hover:text-destructive border-destructive/50 hover:bg-destructive/10" 
                        onClick={() => handleDeleteRequest(template)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Eliminar Plantilla
                    </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No hay plantillas de gastos definidas. Haz clic en "Añadir Plantilla" para empezar.
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la plantilla de gasto "{templateToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
