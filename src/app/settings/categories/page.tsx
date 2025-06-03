
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2 } from 'lucide-react';
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
import { CategoryForm } from '@/components/settings/category-form';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Category } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from '@/components/expenses/category-icon';
import { cn } from '@/lib/utils';
import { RESERVED_CATEGORY_IDS } from '@/lib/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesSettingsPage() {
  const { categories, getSubcategories, deleteCategory, isCategoryInUse, dataLoading } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | undefined>(undefined);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | undefined>(undefined);
  const { toast } = useToast();

  const parentCategories = categories.filter(c => !c.parentId).sort((a,b) => a.name.localeCompare(b.name));

  const dialogTitleText = categoryToEdit ? "Editar Categoría" : "Añadir Nueva Categoría";
  const dialogDescriptionText = categoryToEdit
    ? "Actualiza los detalles de tu categoría."
    : "Define una nueva categoría o subcategoría.";

  const handleEdit = (category: Category) => {
    setCategoryToEdit(category);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (category: Category) => {
    setCategoryToDelete(category);
  };

  const executeDelete = async () => {
    if (categoryToDelete) {
      if (RESERVED_CATEGORY_IDS.includes(categoryToDelete.id)) {
        toast({ variant: "destructive", title: "Acción no permitida", description: `La categoría "${categoryToDelete.name}" es reservada y no se puede eliminar.` });
        setCategoryToDelete(undefined);
        return;
      }
      if (isCategoryInUse(categoryToDelete.id)) {
         toast({ variant: "destructive", title: "Categoría en Uso", description: `La categoría "${categoryToDelete.name}" está en uso o tiene subcategorías. No se puede eliminar.` });
      } else {
        await deleteCategory(categoryToDelete.id);
        toast({ title: "Categoría Eliminada", description: `La categoría "${categoryToDelete.name}" ha sido eliminada.` });
      }
      setCategoryToDelete(undefined);
    }
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setCategoryToEdit(undefined);
  };

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setCategoryToEdit(undefined);
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestionar Categorías"
          description="Crea, edita y organiza tus categorías y subcategorías."
          actions={<Button><PlusCircle className="mr-2 h-4 w-4" /> Añadir Categoría</Button>}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-[250px] w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <PageHeader
        title="Gestionar Categorías"
        description="Crea, edita y organiza tus categorías y subcategorías."
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setCategoryToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>{dialogDescriptionText}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
                <CategoryForm 
                  categoryToEdit={categoryToEdit} 
                  onSave={handleFormSave} 
                  dialogClose={handleDialogClose} 
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />

      {parentCategories.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          {parentCategories.map((parentCat) => {
            const subCats = getSubcategories(parentCat.id).sort((a,b)=>a.name.localeCompare(b.name));
            const isParentReserved = RESERVED_CATEGORY_IDS.includes(parentCat.id);

            return (
              <Card key={parentCat.id} className="shadow-lg flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <CategoryIcon iconName={parentCat.icon} color={parentCat.color} size={6} className="flex-shrink-0"/>
                      <div className="flex-grow min-w-0">
                        <CardTitle className="text-lg truncate" title={parentCat.name}>{parentCat.name}</CardTitle>
                        {isParentReserved && <CardDescription className="text-xs text-muted-foreground">(Reservada)</CardDescription>}
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(parentCat)}>
                        <Edit3 className="h-4 w-4" /> <span className="sr-only">Editar {parentCat.name}</span>
                      </Button>
                      {!isParentReserved && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(parentCat)}>
                          <Trash2 className="h-4 w-4" /> <span className="sr-only">Eliminar {parentCat.name}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-grow">
                  {subCats.length > 0 && (
                    <>
                      <Separator className="mb-3" />
                      <h4 className="mb-2 text-sm font-medium text-muted-foreground">Subcategorías:</h4>
                      <ScrollArea className="max-h-48 pr-3"> 
                        <div className="space-y-2">
                          {subCats.map(subCat => (
                            <div key={subCat.id} className="flex items-center justify-between p-1.5 rounded hover:bg-muted/30">
                              <div className="flex items-center gap-2 flex-grow min-w-0">
                                <CategoryIcon iconName={subCat.icon} color={subCat.color} size={4} className="flex-shrink-0" />
                                <span className="text-sm truncate" title={subCat.name}>{subCat.name}</span>
                              </div>
                              <div className="flex items-center flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(subCat)}>
                                  <Edit3 className="h-3 w-3" /> <span className="sr-only">Editar {subCat.name}</span>
                                </Button>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(subCat)}>
                                  <Trash2 className="h-3 w-3" /> <span className="sr-only">Eliminar {subCat.name}</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                  {subCats.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin subcategorías.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No hay categorías definidas. Haz clic en "Añadir Categoría" para empezar.
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {isCategoryInUse(categoryToDelete?.id || "")
                ? `La categoría "${categoryToDelete?.name || ''}" está actualmente en uso por gastos/presupuestos o tiene subcategorías. Eliminarla podría causar inconsistencias. Si es una categoría principal con subcategorías, primero debes eliminar o reasignar sus subcategorías.`
                : `Esta acción no se puede deshacer. Esto eliminará permanentemente la categoría "${categoryToDelete?.name || ''}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCategoryToDelete(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} 
              className={cn(isCategoryInUse(categoryToDelete?.id || "") && "bg-gray-500 hover:bg-gray-600", "bg-destructive hover:bg-destructive/90")}
              disabled={RESERVED_CATEGORY_IDS.includes(categoryToDelete?.id || "")}
            >
              {RESERVED_CATEGORY_IDS.includes(categoryToDelete?.id || "") ? "No se puede eliminar" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
