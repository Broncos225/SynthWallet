
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from '@/components/ui/input';
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
import { cn, formatDate, normalizeString } from "@/lib/utils";
import { CalendarIcon, Star, Info, UserPlus, Loader2 } from "lucide-react";
import { useAppData } from "@/contexts/app-data-context";
import type { Transaction, Category, ExpenseTemplate, Account, TransactionType, SavingGoal, Payee } from "@/types";
import { useState, useEffect } from "react";
import { DEFAULT_CATEGORY_ID, DEFAULT_ACCOUNT_ID, RESERVED_CATEGORY_IDS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { formatISO, parseISO, isValid } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrencyInput } from "@/hooks/use-currency-input";
import { categorizeExpense } from "@/ai/flows/expenseCategorization";

const NONE_SUBCATEGORY_VALUE = "_NONE_SUBCATEGORY_VALUE_";
const NONE_TEMPLATE_VALUE = "_NONE_TEMPLATE_VALUE_";
const NONE_SAVING_GOAL_VALUE = "_NONE_SAVING_GOAL_VALUE_";
const NONE_PAYEE_VALUE = "_NONE_PAYEE_VALUE_";
const ADD_NEW_PAYEE_VALUE = "_ADD_NEW_PAYEE_";

const transactionFormSchemaBase = z.object({
  type: z.enum(['expense', 'income', 'transfer'], { required_error: "Por favor selecciona un tipo de transacción." }),
  description: z.string().min(2, "La descripción debe tener al menos 2 caracteres."),
  amount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).positive("La cantidad debe ser positiva."),
  date: z.date({ required_error: "Por favor selecciona una fecha." }),
  accountId: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  parentCategoryId: z.string().optional(),
  subCategoryId: z.string().optional(),
  payeeId: z.string().optional(),
  newPayeeName: z.string().optional(),
  templateId: z.string().optional(),
  savingGoalId: z.string().optional(),
  imageUrl: z.string().url("Debe ser una URL válida para la imagen.").optional().or(z.literal('')),
  notes: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
});

const transactionFormSchema = transactionFormSchemaBase.superRefine((data, ctx) => {
  if (data.type === 'expense' || data.type === 'income') {
    if (!data.accountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor selecciona una cuenta.",
        path: ["accountId"],
      });
    }
    if (!data.parentCategoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor selecciona una categoría principal.",
        path: ["parentCategoryId"],
      });
    }
  } else if (data.type === 'transfer') {
    if (!data.fromAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor selecciona la cuenta de origen.",
        path: ["fromAccountId"],
      });
    }
    if (!data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor selecciona la cuenta de destino.",
        path: ["toAccountId"],
      });
    }
    if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cuenta de origen y destino no pueden ser la misma.",
        path: ["toAccountId"],
      });
    }
  }

  if (data.payeeId === ADD_NEW_PAYEE_VALUE) {
    if (!data.newPayeeName || data.newPayeeName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre del nuevo beneficiario debe tener al menos 2 caracteres.",
        path: ["newPayeeName"],
      });
    }
  }
});


type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  transactionToEdit?: Transaction;
  initialType?: TransactionType;
  transactionToPrefill?: Partial<Transaction>;
  onSave: () => void;
  dialogClose?: () => void;
}

const createDefaultFormValues = (
  type: TransactionType = 'expense',
  transaction?: Partial<Transaction>,
  getCategoryByIdFn?: (id: string) => Category | undefined
): TransactionFormValues => {
  const category = transaction?.categoryId && getCategoryByIdFn ? getCategoryByIdFn(transaction.categoryId) : undefined;
  // @ts-ignore
  const dateToSet = transaction?.date ? (isValid(parseISO(transaction.date as string)) ? parseISO(transaction.date as string) : new Date()) : new Date();
  const defaultParentCatId = type === 'income' ? 'income' : (type === 'expense' ? DEFAULT_CATEGORY_ID : "");

  return {
    type: transaction?.type || type,
    description: transaction?.description || "",
    amount: transaction?.amount || undefined,
    date: dateToSet,
    accountId: transaction?.type !== 'transfer' ? (transaction?.accountId || DEFAULT_ACCOUNT_ID) : "",
    fromAccountId: transaction?.type === 'transfer' ? (transaction?.fromAccountId || "") : "",
    toAccountId: transaction?.type === 'transfer' ? (transaction?.toAccountId || "") : "",
    parentCategoryId: category ? (category.parentId || category.id) : defaultParentCatId,
    subCategoryId: category?.parentId ? category.id : "",
    payeeId: transaction?.payeeId || NONE_PAYEE_VALUE,
    newPayeeName: "",
    templateId: NONE_TEMPLATE_VALUE,
    savingGoalId: transaction?.savingGoalId || NONE_SAVING_GOAL_VALUE,
    imageUrl: transaction?.imageUrl || "",
    notes: transaction?.notes || "",
  };
};


export function TransactionForm({
  transactionToEdit,
  initialType,
  transactionToPrefill,
  onSave,
  dialogClose
}: TransactionFormProps) {
  const {
    getParentCategories,
    getSubcategories,
    addTransaction,
    updateTransaction,
    getCategoryById,
    getCategoryName,
    getExpenseTemplates,
    accounts,
    payees,
    addPayee,
    getPayeeName,
    savingGoals: allSavingGoals,
    formatUserCurrency,
    categories,
  } = useAppData();
  const { toast } = useToast();
  const [isCategorizing, setIsCategorizing] = useState(false);

  const allParentCategoriesFromContext = getParentCategories();
  const [currentSubcategories, setCurrentSubcategories] = useState<Category[]>([]);
  const [isAddingNewPayee, setIsAddingNewPayee] = useState(false);
  const transactionTemplates = getExpenseTemplates();
  const activeSavingGoals = allSavingGoals.filter(g => g.status === 'active' || g.id === transactionToEdit?.savingGoalId || g.id === transactionToPrefill?.savingGoalId);

  const isDebtRelatedTransaction = !!transactionToEdit?.relatedDebtTransactionId;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: createDefaultFormValues(initialType, transactionToEdit || transactionToPrefill, getCategoryById),
  });

  const selectedParentCategoryId = form.watch("parentCategoryId");
  const selectedTemplateId = form.watch("templateId");
  const transactionType = form.watch("type");
  const selectedPayeeId = form.watch("payeeId");

  useEffect(() => {
    if (transactionToEdit) {
      form.reset(createDefaultFormValues(transactionToEdit.type, transactionToEdit, getCategoryById));
    } else if (transactionToPrefill) {
      form.reset(createDefaultFormValues(transactionToPrefill.type || initialType || 'expense', transactionToPrefill, getCategoryById));
    } else {
      form.reset(createDefaultFormValues(initialType || 'expense', undefined, getCategoryById));
    }
  }, [transactionToEdit, transactionToPrefill, initialType, form, getCategoryById]);

  useEffect(() => {
    if (selectedPayeeId === ADD_NEW_PAYEE_VALUE) {
      setIsAddingNewPayee(true);
    } else {
      setIsAddingNewPayee(false);
      if(form.getValues("newPayeeName")) form.setValue("newPayeeName", "");
    }
  }, [selectedPayeeId, form]);


  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== NONE_TEMPLATE_VALUE && !isDebtRelatedTransaction && !transactionToEdit && !transactionToPrefill) {
      const template = transactionTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        const category = getCategoryById(template.categoryId);
        form.setValue("description", template.description || "");
        form.setValue("amount", template.amount);
        form.setValue("payeeId", template.payeeId || NONE_PAYEE_VALUE);
        if (category) {
          form.setValue("parentCategoryId", category.parentId || category.id);
          form.setValue("subCategoryId", category.parentId ? category.id : "");
        } else {
          form.setValue("parentCategoryId", DEFAULT_CATEGORY_ID);
          form.setValue("subCategoryId", "");
        }
        form.setValue("accountId", template.accountId || DEFAULT_ACCOUNT_ID);
        form.setValue("type", "expense");
        form.setValue("savingGoalId", NONE_SAVING_GOAL_VALUE);
        form.setValue("imageUrl", "");
        form.setValue("notes", "");
        setIsAddingNewPayee(false);
      }
    }
  }, [selectedTemplateId, transactionTemplates, form, getCategoryById, isDebtRelatedTransaction, transactionToEdit, transactionToPrefill]);


  useEffect(() => {
    const currentType = form.getValues("type");
    let parentIdToSet = form.getValues("parentCategoryId");
    let subs: Category[] = [];

    if (currentType === 'transfer') {
      parentIdToSet = "";
      form.setValue('payeeId', NONE_PAYEE_VALUE);
      form.setValue('accountId', "");
      if (!form.getValues('fromAccountId') && accounts.length > 0) form.setValue('fromAccountId', accounts[0]?.id || "");
      if (!form.getValues('toAccountId') && accounts.length > 1) form.setValue('toAccountId', accounts[1]?.id || accounts[0]?.id || "");
      else if (!form.getValues('toAccountId') && accounts.length === 1) form.setValue('toAccountId', accounts[0]?.id || "");
      setIsAddingNewPayee(false);
    } else if (currentType === 'income') {
      parentIdToSet = "income";
      subs = getSubcategories("income");
      if (!form.getValues('accountId')) form.setValue('accountId', DEFAULT_ACCOUNT_ID);
      form.setValue('fromAccountId', "");
      form.setValue('toAccountId', "");
    } else if (currentType === 'expense') {
      if (!parentIdToSet || parentIdToSet === "income") {
        parentIdToSet = DEFAULT_CATEGORY_ID;
      }
      subs = getSubcategories(parentIdToSet);
      if (!form.getValues('accountId')) form.setValue('accountId', DEFAULT_ACCOUNT_ID);
      form.setValue('fromAccountId', "");
      form.setValue('toAccountId', "");
    }

    form.setValue('parentCategoryId', parentIdToSet);
    setCurrentSubcategories(subs);
    const currentSubId = form.getValues("subCategoryId");
    if (currentSubId && !subs.find(s => s.id === currentSubId)) {
       form.setValue("subCategoryId", "");
    }

  }, [transactionType, form, accounts, getSubcategories, DEFAULT_ACCOUNT_ID, DEFAULT_CATEGORY_ID]);


  useEffect(() => {
    if (selectedParentCategoryId && selectedParentCategoryId !== "income") {
      const subs = getSubcategories(selectedParentCategoryId);
      setCurrentSubcategories(subs);
      const currentSubId = form.getValues("subCategoryId");
      if (currentSubId && !subs.find(s => s.id === currentSubId)) {
         form.setValue("subCategoryId", "");
      }
    } else if (selectedParentCategoryId === "income") {
      const subs = getSubcategories("income");
      setCurrentSubcategories(subs);
       const currentSubId = form.getValues("subCategoryId");
      if (currentSubId && !subs.find(s => s.id === currentSubId)) {
         form.setValue("subCategoryId", "");
      }
    } else {
      setCurrentSubcategories([]);
      form.setValue("subCategoryId", "");
    }
  }, [selectedParentCategoryId, getSubcategories, form]);


  async function onSubmit(data: TransactionFormValues) {
    if (isDebtRelatedTransaction && transactionToEdit) {
      toast({
        variant: "destructive",
        title: "Edición no permitida",
        description: "Esta transacción está vinculada a un abono de deuda y no puede editarse directamente aquí. Gestione los abonos desde la sección de Deudas."
      });
      return;
    }

    let finalPayeeIdToSubmit = data.payeeId === NONE_PAYEE_VALUE || data.payeeId === ADD_NEW_PAYEE_VALUE ? null : data.payeeId;

    if (data.payeeId === ADD_NEW_PAYEE_VALUE && data.newPayeeName) {
      const normalizedNewName = normalizeString(data.newPayeeName);
      const existingPayee = payees.find(p => normalizeString(p.name) === normalizedNewName);
      if (existingPayee) {
        toast({ variant: "destructive", title: "Beneficiario Duplicado", description: `El beneficiario "${data.newPayeeName}" ya existe.` });
        form.setError("newPayeeName", { type: "manual", message: "Este beneficiario ya existe." });
        return;
      }
      try {
        const newPayee = await addPayee({ name: data.newPayeeName });
        if (newPayee && newPayee.id) {
          finalPayeeIdToSubmit = newPayee.id;
          toast({ title: "Beneficiario Añadido", description: `"${data.newPayeeName}" ha sido añadido a tu lista.` });
          setIsAddingNewPayee(false);
          form.setValue("payeeId", newPayee.id);
        } else {
          toast({ variant: "destructive", title: "Error", description: "No se pudo añadir el nuevo beneficiario." });
          return;
        }
      } catch (error) {
        console.error("Error adding new payee:", error);
        toast({ variant: "destructive", title: "Error", description: "Ocurrió un problema al añadir el beneficiario." });
        return;
      }
    }


    const actualSubCategoryId = data.subCategoryId === NONE_SUBCATEGORY_VALUE ? undefined : data.subCategoryId;
    let finalCategoryId = (data.type === 'expense' || data.type === 'income') ? (actualSubCategoryId || data.parentCategoryId) : undefined;
    
    const needsAICategorization = data.type === 'expense' && finalCategoryId === DEFAULT_CATEGORY_ID;

    if (needsAICategorization) {
      setIsCategorizing(true);
      try {
        const payeeName = data.payeeId ? getPayeeName(data.payeeId) : undefined;
        const aiInput = {
          description: data.description,
          payee: payeeName,
          categories: categories.map(c => ({
            id: c.id,
            name: getCategoryName(c.id),
            parentId: c.parentId || null,
            isReserved: RESERVED_CATEGORY_IDS.includes(c.id),
          }))
        };
        
        const result = await categorizeExpense(aiInput);
        if (result && result.suggestedCategoryId) {
          finalCategoryId = result.suggestedCategoryId;
          const suggestedCategoryName = getCategoryName(finalCategoryId);
          toast({
            title: "Categoría Sugerida por IA",
            description: `Se ha asignado la categoría: "${suggestedCategoryName}".`
          });
        }
      } catch (error) {
        console.error("AI categorization failed:", error);
        toast({
          variant: "destructive",
          title: "Error de IA",
          description: "No se pudo sugerir una categoría. Se usará 'Sin Categoría'."
        });
      } finally {
        setIsCategorizing(false);
      }
    }

    if (!finalCategoryId && (data.type === 'expense')) {
        finalCategoryId = DEFAULT_CATEGORY_ID;
    } else if (!finalCategoryId && (data.type === 'income')) {
        finalCategoryId = 'income';
    }

    const finalSavingGoalId = data.savingGoalId === NONE_SAVING_GOAL_VALUE ? undefined : data.savingGoalId;

    const transactionPayload: Omit<Transaction, 'id' | 'date' | 'relatedDebtTransactionId' | 'payee'> & { date: Date; payeeId?: string | null } = {
      description: data.description,
      amount: data.amount,
      date: data.date,
      categoryId: finalCategoryId,
      payeeId: finalPayeeIdToSubmit,
      accountId: data.type === 'transfer' ? (data.fromAccountId!) : (data.accountId!),
      type: data.type,
      fromAccountId: data.type === 'transfer' ? (data.fromAccountId || null) : null,
      toAccountId: data.type === 'transfer' ? (data.toAccountId || null) : null,
      savingGoalId: (data.type === 'expense' || data.type === 'income') ? finalSavingGoalId : null,
      imageUrl: data.imageUrl || null,
      notes: data.notes || null,
    };

    if (transactionPayload.payeeId === undefined) {
      delete transactionPayload.payeeId;
    }


    if (transactionToEdit) {
      await updateTransaction({ ...transactionToEdit, ...transactionPayload, date: formatISO(data.date) });
      toast({ title: "¡Transacción Actualizada!", description: `"${data.description}" ha sido actualizada.` });
    } else {
      // @ts-ignore - Omit 'payee' from the type for addTransaction, it's handled by payeeId
      await addTransaction(transactionPayload);
      toast({ title: "¡Transacción Guardada!", description: `"${data.description}" ha sido añadida.` });
    }
    onSave();
    dialogClose?.();
     form.reset(createDefaultFormValues(
        initialType || data.type, // Use the current type for reset
        undefined,
        getCategoryById
      ));
    setIsAddingNewPayee(false);
  }

  const payeeLabel = transactionType === 'income' ? "Pagador / Fuente (Opcional)" : "Beneficiario (Opcional)";

  const isFieldDisabled = (isDebtRelatedTransaction && !!transactionToEdit);
  const isTypeSelectDisabled = (isDebtRelatedTransaction && !!transactionToEdit) || (!transactionToEdit && !!initialType);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isDebtRelatedTransaction && transactionToEdit && (
          <Alert variant="default" className="bg-blue-50 border-blue-300 text-blue-700">
            <Info className="h-4 w-4 !text-blue-700" />
            <AlertTitle>Transacción Vinculada a Deuda</AlertTitle>
            <AlertDescription>
              Esta transacción es un abono de una deuda y sus campos principales no se pueden editar desde aquí. Para modificarla, por favor, gestiona el abono directamente desde la sección de Deudas. La eliminación desde el historial principal sí afectará la deuda.
            </AlertDescription>
          </Alert>
        )}

        {transactionTemplates.length > 0 && !transactionToEdit && transactionType !== 'transfer' && !transactionToPrefill && (
            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" /> Cargar desde Plantilla (Opcional)
                  </FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                    }}
                    value={field.value || NONE_TEMPLATE_VALUE}
                    disabled={isFieldDisabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plantilla"/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_TEMPLATE_VALUE}>-- Ninguna Plantilla --</SelectItem>
                      {transactionTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({formatUserCurrency(template.amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Transacción</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isTypeSelectDisabled}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Compras de supermercado, Salario mensual" {...field} value={field.value || ""} disabled={isFieldDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {(transactionType === 'expense' || transactionType === 'income') && (
          <>
            <FormField
              control={form.control}
              name="payeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{payeeLabel}</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === ADD_NEW_PAYEE_VALUE) {
                        setIsAddingNewPayee(true);
                        form.setValue("newPayeeName", ""); // Clear if user types then changes mind
                      } else {
                        setIsAddingNewPayee(false);
                      }
                    }}
                    value={field.value || NONE_PAYEE_VALUE}
                    disabled={isFieldDisabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un beneficiario (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_PAYEE_VALUE}>-- Ninguno --</SelectItem>
                      {payees.map((payee: Payee) => (
                        <SelectItem key={payee.id} value={payee.id}>
                          {payee.name}
                        </SelectItem>
                      ))}
                      <SelectItem value={ADD_NEW_PAYEE_VALUE}>
                        <span className="flex items-center"><UserPlus className="h-4 w-4 mr-2" />Añadir Nuevo Beneficiario</span>
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
                    <FormLabel className="text-sm">Nombre del Nuevo Beneficiario</FormLabel>
                    <FormControl>
                      <Input placeholder="Escribe el nombre" {...field} autoFocus/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Input
                     {...inputProps}
                     onBlur={(e) => {
                        inputProps.onBlur(e);
                        rhfField.onBlur();
                     }}
                     ref={rhfField.ref}
                     disabled={isFieldDisabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isFieldDisabled}
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
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01") || (isFieldDisabled)
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
        </div>

        {transactionType === 'transfer' && (
          <>
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desde Cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldDisabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona cuenta de origen" />
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
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>A Cuenta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldDisabled}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona cuenta de destino" />
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
          </>
        )}

        {(transactionType === 'expense' || transactionType === 'income') && (
           <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isFieldDisabled}>
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
        )}

        {(transactionType === 'expense' || transactionType === 'income') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="parentCategoryId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel className="flex items-center gap-2">
                    Categoría Principal
                    </FormLabel>
                    <Select
                      onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("subCategoryId", "");
                      }}
                      value={field.value || ""}
                      disabled={isFieldDisabled || transactionType === 'income'}
                    >
                    <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona categoría principal" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionType === 'income' ? (
                        (() => {
                          const incomeCategory = allParentCategoriesFromContext.find(c => c.id === 'income');
                          return incomeCategory ? (
                            <SelectItem key={incomeCategory.id} value={incomeCategory.id}>
                              {incomeCategory.name}
                            </SelectItem>
                          ) : <SelectItem value="" disabled>Cargando...</SelectItem>;
                        })()
                      ) : (
                        allParentCategoriesFromContext
                          .filter(c => c.id !== 'income')
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            {(currentSubcategories.length > 0 || (transactionToEdit && getCategoryById(transactionToEdit.categoryId || "")?.parentId) || (transactionToPrefill && getCategoryById(transactionToPrefill.categoryId || "")?.parentId)) && (
                <FormField
                control={form.control}
                name="subCategoryId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Subcategoría</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={isFieldDisabled}
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
        )}

        {(transactionType === 'expense' || transactionType === 'income') && activeSavingGoals.length > 0 && (
          <FormField
            control={form.control}
            name="savingGoalId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vincular a Objetivo de Ahorro (Opcional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || NONE_SAVING_GOAL_VALUE}
                  disabled={isFieldDisabled}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un objetivo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_SAVING_GOAL_VALUE}>-- Ninguno --</SelectItem>
                    {activeSavingGoals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        {goal.name} (Ahorrado: {formatUserCurrency(goal.currentAmount)} de {formatUserCurrency(goal.targetAmount)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la Imagen (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="https://ejemplo.com/imagen.png" {...field} value={field.value || ""} disabled={isFieldDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalles adicionales, recordatorios, etc." {...field} value={field.value || ""} disabled={isFieldDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isFieldDisabled && (
          <Button type="submit" className="w-full" disabled={isFieldDisabled || isCategorizing}>
            {isCategorizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Categorizando y Guardando...
              </>
            ) : (
              transactionToEdit ? "Actualizar Transacción" : "Añadir Transacción"
            )}
          </Button>
        )}
      </form>
    </Form>
  );
}

