
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
import { CalendarIcon, Star, Info } from "lucide-react";
import { useAppData } from "@/contexts/app-data-context";
import type { Transaction, Category, ExpenseTemplate, Account, TransactionType, SavingGoal } from "@/types";
import { useState, useEffect } from "react";
import { DEFAULT_CATEGORY_ID, DEFAULT_ACCOUNT_ID } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { formatISO, parseISO, isValid } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCurrencyInput } from "@/hooks/use-currency-input";

const NONE_SUBCATEGORY_VALUE = "_NONE_SUBCATEGORY_VALUE_";
const NONE_TEMPLATE_VALUE = "_NONE_TEMPLATE_VALUE_";
const NONE_SAVING_GOAL_VALUE = "_NONE_SAVING_GOAL_VALUE_";

const transactionFormSchemaBase = z.object({
  type: z.enum(['expense', 'income', 'transfer'], { required_error: "Por favor selecciona un tipo de transacción." }),
  description: z.string().min(2, "La descripción debe tener al menos 2 caracteres."),
  amount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).positive("La cantidad debe ser positiva."),
  date: z.date({ required_error: "Por favor selecciona una fecha." }),
  accountId: z.string().optional(), // Requerido para expense/income
  fromAccountId: z.string().optional(), // Requerido para transfer
  toAccountId: z.string().optional(), // Requerido para transfer
  parentCategoryId: z.string().optional(), // Requerido para expense/income
  subCategoryId: z.string().optional(),
  payee: z.string().optional(),
  templateId: z.string().optional(),
  savingGoalId: z.string().optional(),
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

  return {
    type: transaction?.type || type,
    description: transaction?.description || "",
    amount: transaction?.amount || undefined,
    date: dateToSet,
    accountId: transaction?.type !== 'transfer' ? (transaction?.accountId || DEFAULT_ACCOUNT_ID) : "",
    fromAccountId: transaction?.type === 'transfer' ? (transaction?.fromAccountId || "") : "",
    toAccountId: transaction?.type === 'transfer' ? (transaction?.toAccountId || "") : "",
    parentCategoryId: category ? (category.parentId || category.id) : (transaction?.type === 'transfer' ? "" : (transaction?.type === 'income' ? 'income' : DEFAULT_CATEGORY_ID)),
    subCategoryId: category?.parentId ? category.id : "",
    payee: transaction?.payee || "",
    templateId: NONE_TEMPLATE_VALUE,
    savingGoalId: transaction?.savingGoalId || NONE_SAVING_GOAL_VALUE,
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
    getExpenseTemplates, // Kept name for now, as it refers to templates primarily for expenses/incomes
    accounts,
    savingGoals: allSavingGoals,
    formatUserCurrency, // No longer used directly here for formatting inputs
  } = useAppData();
  const { toast } = useToast();

  const parentCategories = getParentCategories();
  const [currentSubcategories, setCurrentSubcategories] = useState<Category[]>([]);
  const transactionTemplates = getExpenseTemplates();
  const activeSavingGoals = allSavingGoals.filter(g => g.status === 'active' || g.id === transactionToEdit?.savingGoalId);

  const isDebtRelatedTransaction = !!transactionToEdit?.relatedDebtTransactionId;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: createDefaultFormValues(initialType, transactionToEdit || transactionToPrefill, getCategoryById),
  });

  const selectedParentCategoryId = form.watch("parentCategoryId");
  const selectedTemplateId = form.watch("templateId");
  const transactionType = form.watch("type");

  console.log("TransactionForm: Initial render/props. transactionToPrefill:", transactionToPrefill, "transactionToEdit:", transactionToEdit, "initialType:", initialType);

  useEffect(() => {
    console.log("TransactionForm: Prefill/Edit useEffect. transactionToPrefill:", transactionToPrefill, "transactionToEdit:", transactionToEdit, "initialType:", initialType);
    if (transactionToEdit) {
      console.log("TransactionForm useEffect: Mode: Editing existing transaction", transactionToEdit.id);
      form.reset(createDefaultFormValues(transactionToEdit.type, transactionToEdit, getCategoryById));
    } else if (transactionToPrefill) {
      console.log("TransactionForm useEffect: Mode: Applying prefill data", transactionToPrefill);
      form.reset(createDefaultFormValues(transactionToPrefill.type || initialType, transactionToPrefill, getCategoryById));
    } else {
      console.log("TransactionForm useEffect: Mode: New transaction, initialType:", initialType);
      form.reset(createDefaultFormValues(initialType));
    }
  }, [transactionToEdit, transactionToPrefill, initialType, form, getCategoryById]);


  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== NONE_TEMPLATE_VALUE && !isDebtRelatedTransaction && !transactionToEdit && !transactionToPrefill) {
      const template = transactionTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        const category = getCategoryById(template.categoryId);
        form.setValue("description", template.description || "");
        form.setValue("amount", template.amount);
        form.setValue("payee", template.payee || "");
        if (category) {
          form.setValue("parentCategoryId", category.parentId || category.id);
          form.setValue("subCategoryId", category.parentId ? category.id : "");
        } else {
          form.setValue("parentCategoryId", DEFAULT_CATEGORY_ID);
          form.setValue("subCategoryId", "");
        }
        form.setValue("accountId", template.accountId || DEFAULT_ACCOUNT_ID);
        form.setValue("type", "expense"); // Templates are assumed to be expenses for now
        form.setValue("savingGoalId", NONE_SAVING_GOAL_VALUE);
      }
    }
  }, [selectedTemplateId, transactionTemplates, form, getCategoryById, isDebtRelatedTransaction, transactionToEdit, transactionToPrefill]);


  useEffect(() => {
    if (selectedParentCategoryId) {
      const subs = getSubcategories(selectedParentCategoryId);
      setCurrentSubcategories(subs);
      const currentSubId = form.getValues("subCategoryId");
      if (currentSubId && !subs.find(s => s.id === currentSubId)) {
         form.setValue("subCategoryId", ""); // Reset to empty string for controlled component
      }
    } else {
      setCurrentSubcategories([]);
      form.setValue("subCategoryId", ""); // Reset to empty string
    }
  }, [selectedParentCategoryId, getSubcategories, form]);


  useEffect(() => {
    const currentType = form.getValues("type");
    if (currentType === 'transfer') {
      form.setValue('parentCategoryId', "");
      form.setValue('subCategoryId', "");
      form.setValue('payee', '');
      form.setValue('accountId', "");
      if (!form.getValues('fromAccountId') && accounts.length > 0) form.setValue('fromAccountId', accounts[0]?.id || "");
      if (!form.getValues('toAccountId') && accounts.length > 1) form.setValue('toAccountId', accounts[1]?.id || accounts[0]?.id || "");
      else if (!form.getValues('toAccountId') && accounts.length === 1) form.setValue('toAccountId', accounts[0]?.id || "");
    } else if (currentType === 'expense' || currentType === 'income') {
      if (!form.getValues('parentCategoryId')) {
          form.setValue('parentCategoryId', currentType === 'income' ? 'income' : DEFAULT_CATEGORY_ID);
      }
      form.setValue('fromAccountId', "");
      form.setValue('toAccountId', "");
      if (!form.getValues('accountId')) {
        form.setValue('accountId', DEFAULT_ACCOUNT_ID);
      }
    }
  }, [transactionType, form, accounts, DEFAULT_ACCOUNT_ID, DEFAULT_CATEGORY_ID]);


  async function onSubmit(data: TransactionFormValues) {
    if (isDebtRelatedTransaction && transactionToEdit) {
      toast({
        variant: "destructive",
        title: "Edición no permitida",
        description: "Esta transacción está vinculada a un abono de deuda y no puede editarse directamente aquí. Gestione los abonos desde la sección de Deudas."
      });
      return;
    }

    const actualSubCategoryId = data.subCategoryId === NONE_SUBCATEGORY_VALUE ? undefined : data.subCategoryId;
    let finalCategoryId = (data.type === 'expense' || data.type === 'income') ? (actualSubCategoryId || data.parentCategoryId) : undefined;

    if (!finalCategoryId && (data.type === 'expense')) {
        finalCategoryId = DEFAULT_CATEGORY_ID;
    } else if (!finalCategoryId && (data.type === 'income')) {
        finalCategoryId = 'income';
    }

    const finalSavingGoalId = data.savingGoalId === NONE_SAVING_GOAL_VALUE ? undefined : data.savingGoalId;

    const transactionPayload: Omit<Transaction, 'id' | 'date' | 'relatedDebtTransactionId'> & {date: Date} = {
      description: data.description,
      amount: data.amount, // RHF ensures this is a number
      date: data.date, // RHF ensures this is a Date object
      categoryId: finalCategoryId,
      payee: data.payee || null,
      accountId: data.type === 'transfer' ? (data.fromAccountId!) : (data.accountId!),
      type: data.type,
      fromAccountId: data.type === 'transfer' ? (data.fromAccountId || null) : null,
      toAccountId: data.type === 'transfer' ? (data.toAccountId || null) : null,
      savingGoalId: (data.type === 'expense' || data.type === 'income') ? finalSavingGoalId : null,
    };

    if (transactionToEdit) {
      await updateTransaction({ ...transactionToEdit, ...transactionPayload, date: formatISO(data.date) });
      toast({ title: "¡Transacción Actualizada!", description: `"${data.description}" ha sido actualizada.` });
    } else {
      await addTransaction(transactionPayload);
      toast({ title: "¡Transacción Guardada!", description: `"${data.description}" ha sido añadida.` });
    }
    onSave();
    dialogClose?.();
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
                          {template.name}
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
                <Input placeholder="Ej: Compras de supermercado, Salario mensual" {...field} disabled={isFieldDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {(transactionType === 'expense' || transactionType === 'income') && (
          <FormField
            control={form.control}
            name="payee"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{payeeLabel}</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Supermercado XYZ / Empresa ABC" {...field} disabled={isFieldDisabled} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                          form.setValue("subCategoryId", ""); // Reset subcategory
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
                        {parentCategories
                          .filter(c => transactionType === 'income' ? c.id === 'income' : c.id !== 'income')
                          .map((category) => (
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
            {(currentSubcategories.length > 0 || (transactionToEdit && getCategoryById(transactionToEdit.categoryId || "")?.parentId)) && transactionType === 'expense' && (
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

        {!isFieldDisabled && (
          <Button type="submit" className="w-full">
            {transactionToEdit ? "Actualizar Transacción" : "Añadir Transacción"}
          </Button>
        )}
      </form>
    </Form>
  );
}

