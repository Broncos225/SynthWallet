
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit3, Trash2, Search as SearchIcon } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card'; // Removed CardDescription, CardHeader, CardTitle, CardFooter
import { Input } from '@/components/ui/input';
import { PayeeForm } from '@/components/settings/payee-form';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Payee } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeString } from '@/lib/utils';

export default function PayeesSettingsPage() {
  const { payees, deletePayee, isPayeeInUse, dataLoading } = useAppData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [payeeToEdit, setPayeeToEdit] = useState<Payee | undefined>(undefined);
  const [payeeToDelete, setPayeeToDelete] = useState<Payee | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const filteredPayees = payees
    .filter(p => normalizeString(p.name).includes(normalizeString(searchTerm)))
    .sort((a, b) => a.name.localeCompare(b.name));

  const dialogTitleText = payeeToEdit ? "Editar Beneficiario/Pagador" : "Añadir Nuevo Beneficiario/Pagador";
  const dialogDescriptionText = payeeToEdit
    ? "Actualiza el nombre de este beneficiario/pagador."
    : "Define un nuevo beneficiario o pagador para tus transacciones.";

  const handleEdit = (payee: Payee) => {
    setPayeeToEdit(payee);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (payee: Payee) => {
    setPayeeToDelete(payee);
  };

  const executeDelete = async () => {
    if (payeeToDelete) {
      if (isPayeeInUse(payeeToDelete.id)) {
         toast({ variant: "destructive", title: "Beneficiario en Uso", description: `"${payeeToDelete.name}" está en uso y no se puede eliminar.` });
      } else {
        await deletePayee(payeeToDelete.id);
        toast({ title: "Beneficiario Eliminado", description: `"${payeeToDelete.name}" ha sido eliminado.` });
      }
      setPayeeToDelete(undefined);
    }
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setPayeeToEdit(undefined);
  };

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setPayeeToEdit(undefined);
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestionar Beneficiarios/Pagadores"
          description="Crea, edita y organiza tu lista de beneficiarios y pagadores frecuentes."
          actions={<Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Añadir</Button>}
        />
        <Skeleton className="h-10 w-full max-w-sm mb-4" />
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-[60px] w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <PageHeader
        title="Gestionar Beneficiarios/Pagadores"
        description="Crea, edita y organiza tu lista de beneficiarios y pagadores frecuentes."
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setPayeeToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Beneficiario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>{dialogDescriptionText}</DialogDescription>
              </DialogHeader>
                <PayeeForm
                  payeeToEdit={payeeToEdit} 
                  onSave={handleFormSave} 
                  dialogClose={handleDialogClose} 
                />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
            type="text"
            placeholder="Buscar beneficiario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm pl-8 mb-4"
        />
      </div>

      {filteredPayees.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPayees.map((payee) => (
              <Card key={payee.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center justify-between">
                    <span className="font-medium truncate flex-1 mr-2" title={payee.name}>{payee.name}</span>
                    <div className="flex items-center flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(payee)} aria-label={`Editar ${payee.name}`}>
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(payee)} aria-label={`Eliminar ${payee.name}`}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      ) : (
        !dataLoading && (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? `No se encontraron beneficiarios para "${searchTerm}".` : 'No hay beneficiarios definidos. Haz clic en "Añadir Beneficiario" para empezar.'}
              </p>
            </CardContent>
          </Card>
        )
      )}

      <AlertDialog open={!!payeeToDelete} onOpenChange={() => setPayeeToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {isPayeeInUse(payeeToDelete?.id || "")
                ? `El beneficiario/pagador "${payeeToDelete?.name || ''}" está en uso y no se puede eliminar.`
                : `Esta acción no se puede deshacer. Esto eliminará permanentemente a "${payeeToDelete?.name || ''}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPayeeToDelete(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={isPayeeInUse(payeeToDelete?.id || "")}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
