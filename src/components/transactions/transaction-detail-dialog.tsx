
"use client";

import type { Transaction } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { CategoryIcon } from '@/components/expenses/category-icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, ExternalLink, Wallet, Landmark, Tag, StickyNote, PiggyBank, Image as ImageIconLucide, ReceiptText, UserCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDetailDialog({ transaction, isOpen, onClose }: TransactionDetailDialogProps) {
  const { getCategoryById, getCategoryName: getCategoryNameFromContext, getAccountById, getSavingGoalById, getPayeeName, formatUserCurrency } = useAppData();

  if (!transaction) return null;

  const category = transaction.categoryId ? getCategoryById(transaction.categoryId) : null;
  const categoryName = transaction.categoryId ? getCategoryNameFromContext(transaction.categoryId) : 'Sin Categoría';
  
  const account = transaction.accountId ? getAccountById(transaction.accountId) : null;
  const fromAccount = transaction.fromAccountId ? getAccountById(transaction.fromAccountId) : null;
  const toAccount = transaction.toAccountId ? getAccountById(transaction.toAccountId) : null;
  const savingGoal = transaction.savingGoalId ? getSavingGoalById(transaction.savingGoalId) : null;
  const payeeName = transaction.payeeId ? getPayeeName(transaction.payeeId) : (transaction.payeeId === null && transaction.type !== 'transfer' ? '-' : (transaction.payeeId === undefined && transaction.type !== 'transfer' ? '-' : null));


  const typeDetails = {
    expense: { label: "Gasto", Icon: ArrowDownCircle, color: "text-red-500" },
    income: { label: "Ingreso", Icon: ArrowUpCircle, color: "text-green-500" },
    transfer: { label: "Transferencia", Icon: ArrowRightLeft, color: "text-blue-500" },
  };
  const currentType = typeDetails[transaction.type];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Detalles de la Transacción</DialogTitle>
          <DialogDescription>
            Información completa de la transacción seleccionada.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow overflow-y-auto pr-4 -mr-4 pl-1 -ml-1 py-1">
          <div className="space-y-4 text-sm">
            
            <div className="flex items-start space-x-3">
              <currentType.Icon className={`h-8 w-8 ${currentType.color} flex-shrink-0 mt-0.5`} />
              <div>
                <p className="text-xl font-semibold break-words">{transaction.description}</p>
                <Badge 
                    variant={transaction.type === 'transfer' ? 'outline' : 'default'} 
                    className={
                        transaction.type === 'expense' ? 'bg-red-600 hover:bg-red-700 text-primary-foreground' :
                        transaction.type === 'income' ? 'bg-green-600 hover:bg-green-700 text-primary-foreground' :
                        'border-blue-500 text-blue-500'
                    }
                >
                    {currentType.label}
                </Badge>
              </div>
            </div>
            
            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="font-medium text-muted-foreground">Monto:</p>
                <p className={`text-xl font-bold ${currentType.color}`}>{formatUserCurrency(transaction.amount)}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Fecha:</p>
                <p>{formatDate(transaction.date, 'PPPp')}</p> {/* More detailed date */}
              </div>
            </div>
            
            {transaction.type !== 'transfer' && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center"><Tag className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />Categoría:</p>
                <div className="flex items-center gap-2 mt-1">
                  {category && <CategoryIcon iconName={category.icon} color={category.color} size={5} />}
                  <p className="break-words">{categoryName}</p>
                </div>
              </div>
            )}

            {transaction.type === 'transfer' ? (
              <>
                <div>
                  <p className="font-medium text-muted-foreground flex items-center"><Landmark className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />Desde Cuenta:</p>
                  <div className="flex items-center gap-1">
                    {fromAccount?.icon && <CategoryIcon iconName={fromAccount.icon} color={fromAccount.color} size={4} />}
                    {fromAccount?.name || 'N/A'} 
                    {fromAccount && <span className="text-xs text-muted-foreground">({formatUserCurrency(fromAccount.currentBalance)})</span>}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground flex items-center"><Landmark className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />A Cuenta:</p>
                   <div className="flex items-center gap-1">
                    {toAccount?.icon && <CategoryIcon iconName={toAccount.icon} color={toAccount.color} size={4} />}
                    {toAccount?.name || 'N/A'} 
                    {toAccount && <span className="text-xs text-muted-foreground">({formatUserCurrency(toAccount.currentBalance)})</span>}
                  </div>
                </div>
              </>
            ) : account && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center"><Wallet className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />Cuenta:</p>
                 <div className="flex items-center gap-1">
                  {account.icon && <CategoryIcon iconName={account.icon} color={account.color} size={4} />}
                  {account.name} 
                  <span className="text-xs text-muted-foreground">({formatUserCurrency(account.currentBalance)})</span>
                </div>
              </div>
            )}

            {payeeName !== null && transaction.type !== 'transfer' && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center"><UserCircle2 className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />{transaction.type === 'expense' ? 'Beneficiario:' : 'Fuente:'}</p>
                <p className="break-words">{payeeName}</p>
              </div>
            )}

            {savingGoal && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center"><PiggyBank className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />Objetivo de Ahorro Vinculado:</p>
                <div className="flex items-center gap-2 mt-1">
                  <CategoryIcon iconName={savingGoal.icon} color={savingGoal.color} size={5} />
                  <p className="break-words">{savingGoal.name}</p>
                </div>
              </div>
            )}
            
            {transaction.relatedDebtTransactionId && (
               <div className="p-3 border rounded-md bg-blue-50 border-blue-200 text-blue-700">
                <p className="font-medium flex items-center"><ReceiptText className="h-4 w-4 mr-1.5 flex-shrink-0" />Deuda Vinculada:</p>
                <p className="text-xs">Esta transacción está asociada a un abono de deuda.</p>
              </div>
            )}
            
            {transaction.imageUrl && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center"><ImageIconLucide className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />Imagen Adjunta:</p>
                <a href={transaction.imageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 break-all">
                  Ver Imagen <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>
            )}

            {transaction.notes && (
              <div>
                <p className="font-medium text-muted-foreground flex items-center"><StickyNote className="h-4 w-4 mr-1.5 flex-shrink-0 text-primary" />Notas:</p>
                <p className="whitespace-pre-wrap bg-muted/30 p-3 rounded-md text-foreground break-words">{transaction.notes}</p>
              </div>
            )}

            {!transaction.imageUrl && !transaction.notes && !savingGoal && !transaction.relatedDebtTransactionId && transaction.type !== 'transfer' && payeeName === '-' && (
              <p className="text-muted-foreground italic text-center py-2">No hay detalles adicionales para esta transacción.</p>
            )}

          </div>
        </ScrollArea>
        <DialogFooter className="pt-4 mt-auto border-t border-border">
          <Button onClick={onClose} variant="outline">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

