
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { AccountForm } from '@/components/settings/account-form';
import { PageHeader } from '@/components/shared/page-header';
import { useAppData } from '@/contexts/app-data-context';
import type { Account } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { CategoryIcon } from '@/components/expenses/category-icon'; 
// import { formatCurrency } from '@/lib/utils'; // Removed formatCurrency
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { DEFAULT_ACCOUNT_ID } from '@/lib/constants';

export default function AccountsSettingsPage() {
  const { accounts, deleteAccount, isAccountInUse, dataLoading, formatUserCurrency } = useAppData(); // Added formatUserCurrency
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | undefined>(undefined);
  const [accountToDelete, setAccountToDelete] = useState<Account | undefined>(undefined);
  const { toast } = useToast();

  const sortedAccounts = [...accounts].sort((a,b) => {
    if (a.id === DEFAULT_ACCOUNT_ID) return -1; // Always show default first or based on some logic
    if (b.id === DEFAULT_ACCOUNT_ID) return 1;
    return a.name.localeCompare(b.name);
  });

  const dialogTitleText = accountToEdit ? "Editar Cuenta" : "Añadir Nueva Cuenta";
  const dialogDescriptionText = accountToEdit
    ? "Actualiza los detalles de tu cuenta."
    : "Define una nueva cuenta para registrar tus transacciones.";

  const handleEdit = (account: Account) => {
    setAccountToEdit(account);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (account: Account) => {
    if (account.id === DEFAULT_ACCOUNT_ID) {
       toast({ variant: "destructive", title: "Acción no permitida", description: `La cuenta "${account.name}" es la predeterminada y no se puede eliminar.` });
       return;
    }
    setAccountToDelete(account);
  };

  const executeDelete = async () => {
    if (accountToDelete) {
      if (isAccountInUse(accountToDelete.id)) { // This function needs to be implemented in context
         toast({ variant: "destructive", title: "Cuenta en Uso", description: `La cuenta "${accountToDelete.name}" tiene transacciones asociadas y no se puede eliminar.` });
      } else {
        await deleteAccount(accountToDelete.id);
        toast({ title: "Cuenta Eliminada", description: `La cuenta "${accountToDelete.name}" ha sido eliminada.` });
      }
      setAccountToDelete(undefined);
    }
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setAccountToEdit(undefined);
  };

  const handleDialogClose = () => {
    setIsFormOpen(false);
    setAccountToEdit(undefined);
  };

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Gestionar Cuentas"
          description="Crea, edita y organiza tus cuentas (bancarias, efectivo, etc.)."
          actions={<Button><PlusCircle className="mr-2 h-4 w-4" /> Añadir Cuenta</Button>}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-[200px] w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <PageHeader
        title="Gestionar Cuentas"
        description="Crea, edita y organiza tus cuentas (bancarias, efectivo, etc.)."
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setAccountToEdit(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cuenta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={dialogTitleText}>
              <DialogHeader>
                <DialogTitle>{dialogTitleText}</DialogTitle>
                <DialogDescription>{dialogDescriptionText}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
                <AccountForm
                  accountToEdit={accountToEdit} 
                  onSave={handleFormSave} 
                  dialogClose={handleDialogClose} 
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        }
      />

      {sortedAccounts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedAccounts.map((account) => {
            const isDefault = account.id === DEFAULT_ACCOUNT_ID;
            return (
              <Card key={account.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <CategoryIcon iconName={account.icon} color={account.color} size={6} className="flex-shrink-0"/>
                      <div className="flex-grow min-w-0">
                        <CardTitle className="text-lg truncate" title={account.name}>{account.name}</CardTitle>
                        <CardDescription className="text-xs">{account.type} {isDefault && "(Predeterminada)"}</CardDescription>
                      </div>
                    </div>
                     <div className="flex items-center flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(account)}>
                        <Edit3 className="h-4 w-4" /> <span className="sr-only">Editar {account.name}</span>
                      </Button>
                      {!isDefault && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(account)}>
                          <Trash2 className="h-4 w-4" /> <span className="sr-only">Eliminar {account.name}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-grow">
                    <p className="text-2xl font-semibold text-primary">{formatUserCurrency(account.currentBalance)}</p>
                    <p className="text-xs text-muted-foreground">Saldo Actual</p>
                </CardContent>
                <CardFooter className="pt-3 border-t">
                     <p className="text-xs text-muted-foreground">Saldo Inicial: {formatUserCurrency(account.initialBalance)}</p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        !dataLoading && (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay cuentas definidas. Haz clic en "Añadir Cuenta" para empezar.
              </p>
            </CardContent>
          </Card>
        )
      )}

      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {isAccountInUse(accountToDelete?.id || "")
                ? `La cuenta "${accountToDelete?.name || ''}" tiene transacciones asociadas y no se puede eliminar.`
                : `Esta acción no se puede deshacer. Esto eliminará permanentemente la cuenta "${accountToDelete?.name || ''}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(undefined)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} 
              className="bg-destructive hover:bg-destructive/90"
              disabled={isAccountInUse(accountToDelete?.id || "") || accountToDelete?.id === DEFAULT_ACCOUNT_ID}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
