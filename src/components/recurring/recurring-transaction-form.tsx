
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
import type { RecurringTransaction, Category, Account, TransactionType } from "@/types";
import { useState, useEffect } from "react";
import { DEFAULT_CATEGORY_ID, DEFAULT_ACCOUNT_ID } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { formatISO, parseISO, isValid, startOfDay } from 'date-fns';
import { useCurrencyInput } from "@/hooks/use-currency-input";
import { Switch } from "@/components/ui/switch";

const NONE_SUBCATEGORY_VALUE = "_NONE_SUBCATEGORY_VALUE_";

const recurringTransactionFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  type: z.enum(['expense', 'income'], { required_error: "Por favor selecciona un tipo." }),
  amount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).positive("La cantidad debe ser positiva."),
  accountId: z.string().min(1, "Por favor selecciona una cuenta."),
  parentCategoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  payee: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'bi-weekly', 'monthly', 'yearly'], { required_error: "Por favor selecciona la frecuencia." }),
  startDate: z.date({ required_error: "Por favor selecciona una fecha de inicio." }),
  endDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if ((data.type === 'expense' || data.type === 'income') && !data.parentCategoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Por favor selecciona una categoría principal.",
      path: ["parentCategoryId"],
    });
  }
  if (data.endDate && data.startDate && data.endDate < data.startDate) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de fin no puede ser anterior a la fecha de inicio.",
        path: ["endDate"],
    });
  }
});

type RecurringTransactionFormValues = z.infer<typeof recurringTransactionFormSchema>;

interface RecurringTransactionFormProps {
  recordToEdit?: RecurringTransaction;
  onSave: () => void;
  dialogClose?: () => void;
}

export function RecurringTransactionForm({ recordToEdit, onSave, dialogClose }: RecurringTransactionFormProps) {
  const {
    getParentCategories,
    getSubcategories,
    addRecurringTransaction,
    updateRecurringTransaction,
    getCategoryById,
    accounts,
    formatUserCurrency,
  } = useAppData();
  const { toast } = useToast();

  const parentCategories = getParentCategories();
  const [currentSubcategories, setCurrentSubcategories] = useState<Category[]>([]);

  const form = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(recurringTransactionFormSchema),
    defaultValues: recordToEdit
      ? {
          ...recordToEdit,
          amount: Number(recordToEdit.amount),
          startDate: isValid(parseISO(recordToEdit.startDate)) ? parseISO(recordToEdit.startDate) : new Date(),
          endDate: recordToEdit.endDate && isValid(parseISO(recordToEdit.endDate)) ? parseISO(recordToEdit.endDate) : null,
          parentCategoryId: recordToEdit.categoryId ? (getCategoryById(recordToEdit.categoryId)?.parentId || recordToEdit.categoryId) : undefined,
          subCategoryId: recordToEdit.categoryId ? (getCategoryById(recordToEdit.categoryId)?.parentId ? recordToEdit.categoryId : undefined) : undefined,
          accountId: recordToEdit.accountId || DEFAULT_ACCOUNT_ID,
          isActive: recordToEdit.isActive !== undefined ? recordToEdit.isActive : true,
        }
      : {
          name: "",
          type: 'expense',
          amount: undefined,
          accountId: DEFAULT_ACCOUNT_ID,
          parentCategoryId: DEFAULT_CATEGORY_ID,
          subCategoryId: undefined,
          payee: "",
          frequency: 'monthly',
          startDate: startOfDay(new Date()),
          endDate: null,
          notes: "",
          isActive: true,
        },
  });

  const selectedParentCategoryId = form.watch("parentCategoryId");
  const transactionType = form.watch("type");

  useEffect(() => {
    if (selectedParentCategoryId) {
      const subs = getSubcategories(selectedParentCategoryId);
      setCurrentSubcategories(subs);
      const currentSubId = form.getValues("subCategoryId");
      if (currentSubId && !subs.find(s => s.id === currentSubId)) {
         form.setValue("subCategoryId", undefined);
      }
    } else {
      setCurrentSubcategories([]);
      form.setValue("subCategoryId", undefined);
    }
  }, [selectedParentCategoryId, getSubcategories, form]);

   useEffect(() => {
    if (recordToEdit) {
      const category = recordToEdit.categoryId ? getCategoryById(recordToEdit.categoryId) : undefined;
      form.reset({
        ...recordToEdit,
        amount: Number(recordToEdit.amount),
        startDate: isValid(parseISO(recordToEdit.startDate)) ? parseISO(recordToEdit.startDate) : new Date(),
        endDate: recordToEdit.endDate && isValid(parseISO(recordToEdit.endDate)) ? parseISO(recordToEdit.endDate) : null,
        parentCategoryId: category ? (category.parentId || category.id) : undefined,
        subCategoryId: category?.parentId ? category.id : undefined,
        accountId: recordToEdit.accountId || DEFAULT_ACCOUNT_ID,
        isActive: recordToEdit.isActive !== undefined ? recordToEdit.isActive : true,
      });
    } else {
      form.reset({
        name: "",
        type: 'expense',
        amount: undefined,
        accountId: DEFAULT_ACCOUNT_ID,
        parentCategoryId: DEFAULT_CATEGORY_ID,
        subCategoryId: undefined,
        payee: "",
        frequency: 'monthly',
        startDate: startOfDay(new Date()),
        endDate: null,
        notes: "",
        isActive: true,
      });
    }
  }, [recordToEdit, form, getCategoryById]);


  async function onSubmit(data: RecurringTransactionFormValues) {
    const actualSubCategoryId = data.subCategoryId === NONE_SUBCATEGORY_VALUE ? undefined : data.subCategoryId;
    const finalCategoryId = (data.type === 'expense' || data.type === 'income') ? (actualSubCategoryId || data.parentCategoryId) : undefined;

    if ((data.type === 'expense' || data.type === 'income') && !finalCategoryId) {
        toast({variant: "destructive", title: "Error", description: "Se requiere una categoría para gastos o ingresos."});
        return;
    }

    const recordData = {
      name: data.name,
      type: data.type as 'expense' | 'income',
      amount: data.amount,
      accountId: data.accountId,
      categoryId: finalCategoryId,
      payee: data.payee,
      frequency: data.frequency as RecurringTransaction['frequency'],
      startDate: formatISO(data.startDate),
      endDate: data.endDate ? formatISO(data.endDate) : null,
      notes: data.notes,
      isActive: data.isActive,
    };

    if (recordToEdit) {
      await updateRecurringTransaction({ ...recordToEdit, ...recordData });
      toast({ title: "Recordatorio Actualizado", description: `"${data.name}" ha sido actualizado.` });
    } else {
      await addRecurringTransaction(recordData as Omit<RecurringTransaction, 'id' | 'nextDueDate' | 'lastProcessedDate'>);
      toast({ title: "Recordatorio Guardado", description: `"${data.name}" ha sido añadido.` });
    }
    onSave();
    dialogClose?.();
  }

  const payeeLabel = transactionType === 'income' ? "Pagador / Fuente (Opcional)" : "Beneficiario (Opcional)";

  const frequencyOptions = [
    { value: 'daily', label: 'Diariamente' },
    { value: 'weekly', label: 'Semanalmente' },
    { value: 'bi-weekly', label: 'Quincenalmente' },
    { value: 'monthly', label: 'Mensualmente' },
    { value: 'yearly', label: 'Anualmente' },
  ];


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Recordatorio</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Pago Netflix, Salario" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="expense">Gasto</SelectItem>
                    <SelectItem value="income">Ingreso</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
                  <FormLabel>Monto</FormLabel>
                  <FormControl>
                    <Input {...inputProps} ref={rhfField.ref} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta por Defecto</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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

        {(transactionType === 'expense' || transactionType === 'income') && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
                  name="parentCategoryId"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Categoría Principal</FormLabel>
                      <Select
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("subCategoryId", undefined);
                        }}
                        value={field.value || ""}
                      >
                      <FormControl>
                          <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría principal" />
                          </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          {parentCategories.filter(c=> c.id !== 'income').map((category) => ( 
                            (transactionType === 'expense' && category.id === 'income') ? null :
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                      </Select>
                      <FormMessage />
                  </FormItem>
                  )}
              />
              {(currentSubcategories.length > 0 || (recordToEdit && getCategoryById(recordToEdit.categoryId || "")?.parentId)) && (
                  <FormField
                  control={form.control}
                  name="subCategoryId"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Subcategoría</FormLabel>
                      <Select
                          onValueChange={field.onChange}
                          value={field.value || ""}
                      >
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Selecciona subcategoría (opcional)" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          <SelectItem value={NONE_SUBCATEGORY_VALUE}>-- Ninguna --</SelectItem>
                          {currentSubcategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                              {category.name}
                              </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              )}
            </div>
            <FormField
              control={form.control}
              name="payee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{payeeLabel}</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Supermercado XYZ / Empresa ABC" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {frequencyOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Inicio</FormLabel>
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
                        {field.value && isValid(field.value) ? (
                          formatDate(formatISO(field.value))
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
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Fin (Opcional)</FormLabel>
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
                        {field.value && isValid(field.value) ? (
                          formatDate(formatISO(field.value))
                        ) : (
                          <span>Elige una fecha (o dejar vacío)</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined} 
                      onSelect={(date) => field.onChange(date || null)} 
                      initialFocus
                      locale={es}
                      disabled={(date) => form.getValues("startDate") && date < form.getValues("startDate")}
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
                    Limpiar fecha de fin
                </Button>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Anotaciones adicionales sobre esta recurrencia." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Activo</FormLabel>
                <FormMessage />
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />


        <Button type="submit" className="w-full">
           {recordToEdit ? "Actualizar Recordatorio" : "Añadir Recordatorio"}
        </Button>
      </form>
    </Form>
  );
}

    