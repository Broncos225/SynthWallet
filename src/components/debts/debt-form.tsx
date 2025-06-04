
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
import { cn, formatDate, normalizeString } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useAppData } from "@/contexts/app-data-context";
import type { Debt, Payee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { formatISO, parseISO, isValid } from 'date-fns';
import { useCurrencyInput } from "@/hooks/use-currency-input";
import { useEffect } from "react";

const debtFormSchema = z.object({
  name: z.string().min(2, "La descripción debe tener al menos 2 caracteres."),
  type: z.enum(['owed_by_me', 'owed_to_me'], { required_error: "Por favor selecciona un tipo de deuda." }),
  payeeId: z.string().min(1, "La persona/entidad es requerida."),
  initialAmount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).min(0, "El monto inicial no puede ser negativo."),
  dueDate: z.date().optional().nullable(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormProps {
  debtToEdit?: Debt;
  onSave: () => void;
  dialogClose?: () => void;
}

export function DebtForm({ debtToEdit, onSave, dialogClose }: DebtFormProps) {
  const { addDebt, updateDebt, getTransactionsForDebt, payees, getPayeeById, getPayeeByName } = useAppData();
  const { toast } = useToast();

  const isInitialAmountEditable = !debtToEdit || getTransactionsForDebt(debtToEdit.id).length === 0;

  const getDefaultPayeeId = () => {
    if (debtToEdit) {
      if (debtToEdit.payeeId) return debtToEdit.payeeId;
      // Try to find a payee matching the old debtorOrCreditor string
      const existingPayee = getPayeeByName(debtToEdit.debtorOrCreditor);
      if (existingPayee) return existingPayee.id;
    }
    return ""; // Default to empty if no match or not editing
  }

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      name: debtToEdit?.name || "",
      type: debtToEdit?.type || undefined,
      payeeId: getDefaultPayeeId(),
      initialAmount: debtToEdit ? Number(debtToEdit.initialAmount) : undefined,
      dueDate: debtToEdit?.dueDate && isValid(parseISO(debtToEdit.dueDate)) ? parseISO(debtToEdit.dueDate) : null,
    },
  });

  useEffect(() => {
    if (debtToEdit) {
      form.reset({
        name: debtToEdit.name,
        type: debtToEdit.type,
        payeeId: getDefaultPayeeId(),
        initialAmount: Number(debtToEdit.initialAmount),
        dueDate: debtToEdit.dueDate && isValid(parseISO(debtToEdit.dueDate)) ? parseISO(debtToEdit.dueDate) : null,
      });
    } else {
      form.reset({
        name: "",
        type: undefined,
        payeeId: "",
        initialAmount: undefined,
        dueDate: null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtToEdit, form]);


  async function onSubmit(data: DebtFormValues) {
    const selectedPayee = getPayeeById(data.payeeId);
    const debtorOrCreditorName = selectedPayee?.name || "Desconocido";

    if (debtToEdit) {
      const payloadForUpdate: Partial<Debt> & { id: string } = {
        id: debtToEdit.id,
        name: data.name,
        type: data.type,
        payeeId: data.payeeId,
        debtorOrCreditor: debtorOrCreditorName, // Update this for display consistency
        initialAmount: isInitialAmountEditable ? data.initialAmount : debtToEdit.initialAmount,
        dueDate: data.dueDate ? data.dueDate : null,
      };
      await updateDebt(payloadForUpdate);
      toast({ title: "¡Deuda Actualizada!", description: `"${data.name}" ha sido actualizada.` });
    } else {
      const newDebtData = {
        name: data.name,
        type: data.type,
        payeeId: data.payeeId,
        debtorOrCreditor: debtorOrCreditorName, // Set this for display consistency
        initialAmount: data.initialAmount,
        dueDate: data.dueDate,
      };
      await addDebt(newDebtData);
      toast({ title: "¡Deuda Añadida!", description: `"${data.name}" ha sido añadida.` });
    }
    onSave();
    dialogClose?.();
    form.reset({ name: "", type: undefined, payeeId: "", initialAmount: undefined, dueDate: null });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción de la Deuda</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Préstamo para el coche" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Deuda</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de deuda" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="owed_by_me">Yo Debo (Gasto/Pasivo)</SelectItem>
                  <SelectItem value="owed_to_me">Me Deben a Mí (Ingreso/Activo)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="payeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona o Entidad</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona persona/entidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {payees.map((payee: Payee) => (
                    <SelectItem key={payee.id} value={payee.id}>
                      {payee.name}
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
          name="initialAmount"
          render={({ field: rhfField }) => {
            const { inputProps } = useCurrencyInput({
              initialValue: rhfField.value,
              onChangeRHF: rhfField.onChange,
            });
            return (
              <FormItem>
                <FormLabel>Monto Inicial</FormLabel>
                <FormControl>
                  <Input
                    {...inputProps}
                    onBlur={(e) => {
                        inputProps.onBlur(e);
                        rhfField.onBlur();
                    }}
                    ref={rhfField.ref}
                    disabled={!isInitialAmountEditable && !!debtToEdit}
                  />
                </FormControl>
                <FormMessage />
                {!isInitialAmountEditable && !!debtToEdit && (
                  <p className="text-xs text-muted-foreground">
                    El monto inicial no se puede editar si la deuda ya tiene abonos.
                  </p>
                )}
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha de Vencimiento (Opcional)</FormLabel>
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
                        formatDate(field.value)
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
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
               <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => field.onChange(null)}
                  className="mt-1 text-xs self-start"
                  disabled={!field.value}
                >
                  Limpiar fecha
              </Button>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {debtToEdit ? "Actualizar Deuda" : "Añadir Deuda"}
        </Button>
      </form>
    </Form>
  );
}
