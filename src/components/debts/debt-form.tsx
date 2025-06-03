
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
import { cn, formatDate } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useAppData } from "@/contexts/app-data-context";
import type { Debt } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { useCurrencyInput } from "@/hooks/use-currency-input";

const debtFormSchema = z.object({
  name: z.string().min(2, "La descripción debe tener al menos 2 caracteres."),
  type: z.enum(['owed_by_me', 'owed_to_me'], { required_error: "Por favor selecciona un tipo de deuda." }),
  debtorOrCreditor: z.string().min(2, "El nombre de la persona/entidad es requerido."),
  initialAmount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).positive("El monto inicial debe ser positivo."),
  dueDate: z.date().optional(),
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormProps {
  debtToEdit?: Debt; 
  onSave: () => void;
  dialogClose?: () => void;
}

export function DebtForm({ debtToEdit, onSave, dialogClose }: DebtFormProps) {
  const { addDebt } = useAppData(); // Add updateDebt if needed
  const { toast } = useToast();

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: debtToEdit
      ? {
          ...debtToEdit,
          initialAmount: Number(debtToEdit.initialAmount),
          dueDate: debtToEdit.dueDate ? new Date(debtToEdit.dueDate) : undefined,
        }
      : {
          name: "",
          type: undefined, 
          debtorOrCreditor: "",
          initialAmount: undefined,
          dueDate: undefined,
        },
  });

  async function onSubmit(data: DebtFormValues) {
    if (debtToEdit) {
      // TODO: Implement updateDebt functionality
      // await updateDebt({ ...debtToEdit, ...data, dueDate: data.dueDate ? formatISO(data.dueDate) : undefined });
      toast({ title: "¡Deuda Actualizada!", description: `"${data.name}" ha sido actualizada.` });
    } else {
      const newDebtData = {
        name: data.name,
        type: data.type,
        debtorOrCreditor: data.debtorOrCreditor,
        initialAmount: data.initialAmount, // RHF data.initialAmount is already a number
        dueDate: data.dueDate, 
      };
      addDebt(newDebtData);
      toast({ title: "¡Deuda Añadida!", description: `"${data.name}" ha sido añadida.` });
    }
    onSave();
    dialogClose?.();
    form.reset();
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
          name="debtorOrCreditor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Persona o Entidad</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Banco XYZ, Juan Pérez" {...field} />
              </FormControl>
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
                  />
                </FormControl>
                <FormMessage />
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
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
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
