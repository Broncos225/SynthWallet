
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useAppData } from "@/contexts/app-data-context";
import type { Debt, DebtTransaction, Account } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { DEFAULT_ACCOUNT_ID } from "@/lib/constants";
import { useCurrencyInput } from "@/hooks/use-currency-input";

const transactionFormSchema = z.object({
  amount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).positive("El monto del abono debe ser positivo."),
  transactionDate: z.date({ required_error: "Por favor selecciona una fecha." }),
  accountId: z.string().min(1, "Por favor selecciona una cuenta."),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface DebtTransactionFormProps {
  debt: Debt;
  onSave: () => void;
  dialogClose?: () => void;
}

export function DebtTransactionForm({ debt, onSave, dialogClose }: DebtTransactionFormProps) {
  const { addDebtTransaction, accounts, formatUserCurrency } = useAppData(); 
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      amount: undefined,
      transactionDate: new Date(),
      accountId: accounts.find(acc => acc.id === DEFAULT_ACCOUNT_ID) ? DEFAULT_ACCOUNT_ID : (accounts[0]?.id || ""),
      notes: "",
    },
  });

  async function onSubmit(data: TransactionFormValues) {
    const transactionType: DebtTransaction['type'] = debt.type === 'owed_by_me' ? 'abono_realizado' : 'abono_recibido';

    const newTransaction = await addDebtTransaction({
      debtId: debt.id,
      type: transactionType,
      amount: data.amount, 
      transactionDate: data.transactionDate,
      accountId: data.accountId,
      notes: data.notes,
    });

    if (newTransaction) {
      toast({
        title: `¡Abono ${transactionType === 'abono_realizado' ? 'Realizado' : 'Recibido'}!`,
        description: `Se registró un abono de ${formatUserCurrency(data.amount)} para "${debt.name}".`
      });
      onSave();
      dialogClose?.();
      form.reset({
        amount: undefined,
        transactionDate: new Date(),
        accountId: accounts.find(acc => acc.id === DEFAULT_ACCOUNT_ID) ? DEFAULT_ACCOUNT_ID : (accounts[0]?.id || ""),
        notes: ""
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el abono. Deuda no encontrada o error al actualizar."
      });
    }
  }

  const accountLabel = debt.type === 'owed_by_me' ? "Pagar Desde Cuenta" : "Recibir en Cuenta";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field: rhfField }) => {
            const { inputProps } = useCurrencyInput({
              initialValue: rhfField.value,
              onChangeRHF: rhfField.onChange,
            });
            return (
              <FormItem>
                <FormLabel>Monto del Abono</FormLabel>
                <FormControl>
                  <Input 
                    {...inputProps}
                    onBlur={(e) => {
                        inputProps.onBlur(e);
                        rhfField.onBlur();
                    }}
                    ref={rhfField.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="transactionDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha del Abono</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        formatDate(field.value.toISOString())
                      ) : (
                        <span>Elige una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("2000-01-01")
                    }
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{accountLabel}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una cuenta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({formatUserCurrency(account.currentBalance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Transferencia bancaria" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Registrar Abono
        </Button>
      </form>
    </Form>
  );
}

