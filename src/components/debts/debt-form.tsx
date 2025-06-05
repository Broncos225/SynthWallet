
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
import { CalendarIcon, UserPlus } from "lucide-react"; // Added UserPlus
import { useAppData } from "@/contexts/app-data-context";
import type { Debt, Payee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { formatISO, parseISO, isValid } from 'date-fns';
import { useCurrencyInput } from "@/hooks/use-currency-input";
import { useEffect, useState } from "react"; // Added useState

const ADD_NEW_PAYEE_VALUE = "_ADD_NEW_PAYEE_";

const debtFormSchema = z.object({
  name: z.string().min(2, "La descripción debe tener al menos 2 caracteres."),
  type: z.enum(['owed_by_me', 'owed_to_me'], { required_error: "Por favor selecciona un tipo de deuda." }),
  payeeId: z.string().min(1, "La persona/entidad es requerida."),
  newPayeeName: z.string().optional(),
  initialAmount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).min(0, "El monto inicial no puede ser negativo."),
  dueDate: z.date().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.payeeId === ADD_NEW_PAYEE_VALUE) {
    if (!data.newPayeeName || data.newPayeeName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre de la nueva persona/entidad debe tener al menos 2 caracteres.",
        path: ["newPayeeName"],
      });
    }
  }
});

type DebtFormValues = z.infer<typeof debtFormSchema>;

interface DebtFormProps {
  debtToEdit?: Debt;
  onSave: () => void;
  dialogClose?: () => void;
}

export function DebtForm({ debtToEdit, onSave, dialogClose }: DebtFormProps) {
  const { addDebt, updateDebt, getTransactionsForDebt, payees, getPayeeById, getPayeeByName, addPayee } = useAppData();
  const { toast } = useToast();
  const [isAddingNewPayee, setIsAddingNewPayee] = useState(false);

  const isInitialAmountEditable = !debtToEdit || getTransactionsForDebt(debtToEdit.id).length === 0;

  const getDefaultPayeeId = () => {
    if (debtToEdit) {
      if (debtToEdit.payeeId) return debtToEdit.payeeId;
      const existingPayee = getPayeeByName(debtToEdit.debtorOrCreditor);
      if (existingPayee) return existingPayee.id;
    }
    return "";
  }

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      name: debtToEdit?.name || "",
      type: debtToEdit?.type || undefined,
      payeeId: getDefaultPayeeId(),
      newPayeeName: "",
      initialAmount: debtToEdit ? Number(debtToEdit.initialAmount) : undefined,
      dueDate: debtToEdit?.dueDate && isValid(parseISO(debtToEdit.dueDate)) ? parseISO(debtToEdit.dueDate) : null,
    },
  });

  const selectedPayeeId = form.watch("payeeId");

  useEffect(() => {
    if (selectedPayeeId === ADD_NEW_PAYEE_VALUE) {
      setIsAddingNewPayee(true);
    } else {
      setIsAddingNewPayee(false);
      if(form.getValues("newPayeeName")) form.setValue("newPayeeName", "");
    }
  }, [selectedPayeeId, form]);


  useEffect(() => {
    if (debtToEdit) {
      form.reset({
        name: debtToEdit.name,
        type: debtToEdit.type,
        payeeId: getDefaultPayeeId(),
        newPayeeName: "",
        initialAmount: Number(debtToEdit.initialAmount),
        dueDate: debtToEdit.dueDate && isValid(parseISO(debtToEdit.dueDate)) ? parseISO(debtToEdit.dueDate) : null,
      });
    } else {
      form.reset({
        name: "",
        type: undefined,
        payeeId: "",
        newPayeeName: "",
        initialAmount: undefined,
        dueDate: null,
      });
    }
    setIsAddingNewPayee(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtToEdit, form]);


  async function onSubmit(data: DebtFormValues) {
    let finalPayeeId = data.payeeId;
    let finalPayeeName = "";

    if (data.payeeId === ADD_NEW_PAYEE_VALUE) {
      if (!data.newPayeeName || data.newPayeeName.trim().length < 2) {
        form.setError("newPayeeName", { type: "manual", message: "El nombre es requerido." });
        return;
      }
      const normalizedNewName = normalizeString(data.newPayeeName);
      const existingPayee = payees.find(p => normalizeString(p.name) === normalizedNewName);
      if (existingPayee) {
        form.setError("newPayeeName", { type: "manual", message: "Esta persona/entidad ya existe." });
        return;
      }
      try {
        const newPayee = await addPayee({ name: data.newPayeeName.trim() });
        if (newPayee && newPayee.id) {
          finalPayeeId = newPayee.id;
          finalPayeeName = newPayee.name;
          toast({ title: "Persona/Entidad Añadida", description: `"${newPayee.name}" ha sido añadido(a) a tu lista.` });
          form.setValue("payeeId", newPayee.id); // Update select with new payee
          setIsAddingNewPayee(false);
        } else {
          toast({ variant: "destructive", title: "Error", description: "No se pudo añadir la nueva persona/entidad." });
          return;
        }
      } catch (error) {
        console.error("Error adding new payee:", error);
        toast({ variant: "destructive", title: "Error", description: "Ocurrió un problema al añadir la persona/entidad." });
        return;
      }
    } else {
      const selectedPayee = getPayeeById(finalPayeeId);
      finalPayeeName = selectedPayee?.name || "Desconocido";
    }


    if (debtToEdit) {
      const payloadForUpdate: Partial<Debt> & { id: string } = {
        id: debtToEdit.id,
        name: data.name,
        type: data.type,
        payeeId: finalPayeeId,
        debtorOrCreditor: finalPayeeName,
        initialAmount: isInitialAmountEditable ? data.initialAmount : debtToEdit.initialAmount,
        dueDate: data.dueDate ? data.dueDate : null,
      };
      await updateDebt(payloadForUpdate);
      toast({ title: "¡Deuda Actualizada!", description: `"${data.name}" ha sido actualizada.` });
    } else {
      const newDebtData = {
        name: data.name,
        type: data.type,
        payeeId: finalPayeeId,
        debtorOrCreditor: finalPayeeName,
        initialAmount: data.initialAmount,
        dueDate: data.dueDate,
      };
      // @ts-ignore - addDebt expects payeeId in the input object for the second arg.
      await addDebt(newDebtData);
      toast({ title: "¡Deuda Añadida!", description: `"${data.name}" ha sido añadida.` });
    }
    onSave();
    dialogClose?.();
    form.reset({ name: "", type: undefined, payeeId: "", newPayeeName: "", initialAmount: undefined, dueDate: null });
    setIsAddingNewPayee(false);
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
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  if (value === ADD_NEW_PAYEE_VALUE) {
                    setIsAddingNewPayee(true);
                  } else {
                    setIsAddingNewPayee(false);
                  }
                }}
                value={field.value}
                defaultValue={field.value}
              >
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
                  <SelectItem value={ADD_NEW_PAYEE_VALUE}>
                    <span className="flex items-center"><UserPlus className="h-4 w-4 mr-2" />Añadir Nueva Persona/Entidad</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isAddingNewPayee && (
          <FormField
            control={form.control}
            name="newPayeeName"
            render={({ field }) => (
              <FormItem className="pl-2 border-l-2 border-primary ml-1">
                <FormLabel className="text-sm">Nombre de la Nueva Persona/Entidad</FormLabel>
                <FormControl>
                  <Input placeholder="Escribe el nombre" {...field} autoFocus />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
                        formatDate(field.value instanceof Date ? field.value : parseISO(field.value as string))
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
                    selected={field.value instanceof Date ? field.value : (field.value ? parseISO(field.value as string) : undefined)}
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

    