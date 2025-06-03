
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
import { CalendarIcon, Star } from "lucide-react"; // Removed Loader2, Sparkles
import { useAppData } from "@/contexts/app-data-context";
import type { Expense, Category, ExpenseTemplate } from "@/types"; // Removed CategorizationResult
import { useState, useEffect } from "react";
import { DEFAULT_CATEGORY_ID } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { es } from 'date-fns/locale';
import { formatISO, parseISO, isValid } from 'date-fns';

const NONE_SUBCATEGORY_VALUE = "_NONE_SUBCATEGORY_VALUE_";
const NONE_TEMPLATE_VALUE = "_NONE_TEMPLATE_VALUE_";

const expenseFormSchema = z.object({
  description: z.string().min(2, "La descripción debe tener al menos 2 caracteres."),
  amount: z.coerce.number().positive("La cantidad debe ser positiva."),
  date: z.date({ required_error: "Por favor selecciona una fecha." }),
  parentCategoryId: z.string().min(1, "Por favor selecciona una categoría principal."),
  subCategoryId: z.string().optional(),
  payee: z.string().optional(),
  templateId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  expenseToEdit?: Expense;
  onSave: () => void;
  dialogClose?: () => void;
}

export function ExpenseForm({ expenseToEdit, onSave, dialogClose }: ExpenseFormProps) {
  const {
    getParentCategories,
    getSubcategories,
    addExpense,
    updateExpense,
    getCategoryById,
    getExpenseTemplates
  } = useAppData();
  const { toast } = useToast();

  const parentCategories = getParentCategories();
  const [currentSubcategories, setCurrentSubcategories] = useState<Category[]>([]);
  const expenseTemplates = getExpenseTemplates();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expenseToEdit
      ? {
          ...expenseToEdit,
          amount: Number(expenseToEdit.amount),
          date: isValid(parseISO(expenseToEdit.date)) ? parseISO(expenseToEdit.date) : new Date(),
          parentCategoryId: getCategoryById(expenseToEdit.categoryId)?.parentId || expenseToEdit.categoryId,
          subCategoryId: getCategoryById(expenseToEdit.categoryId)?.parentId ? expenseToEdit.categoryId : undefined,
          payee: expenseToEdit.payee || "",
          templateId: NONE_TEMPLATE_VALUE,
        }
      : {
          description: "",
          amount: undefined,
          date: new Date(),
          parentCategoryId: DEFAULT_CATEGORY_ID,
          subCategoryId: undefined,
          payee: "",
          templateId: NONE_TEMPLATE_VALUE,
        },
  });

  const selectedParentCategoryId = form.watch("parentCategoryId");
  const selectedTemplateId = form.watch("templateId");

  useEffect(() => {
    if (selectedTemplateId && selectedTemplateId !== NONE_TEMPLATE_VALUE) {
      const template = expenseTemplates.find(t => t.id === selectedTemplateId);
      if (template) {
        const category = getCategoryById(template.categoryId);
        form.setValue("description", template.description || "");
        form.setValue("amount", template.amount);
        form.setValue("payee", template.payee || "");
        if (category) {
          form.setValue("parentCategoryId", category.parentId || category.id);
          form.setValue("subCategoryId", category.parentId ? category.id : undefined);
        } else {
          form.setValue("parentCategoryId", DEFAULT_CATEGORY_ID);
          form.setValue("subCategoryId", undefined);
        }
      }
    }
  }, [selectedTemplateId, expenseTemplates, form, getCategoryById]);


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
    if (expenseToEdit) {
      const category = getCategoryById(expenseToEdit.categoryId);
      if (category) {
        form.reset({
            ...expenseToEdit,
            amount: Number(expenseToEdit.amount),
            date: isValid(parseISO(expenseToEdit.date)) ? parseISO(expenseToEdit.date) : new Date(),
            parentCategoryId: category.parentId || category.id,
            subCategoryId: category.parentId ? category.id : undefined,
            payee: expenseToEdit.payee || "",
            templateId: NONE_TEMPLATE_VALUE,
          });
      }
    } else {
        const currentTemplateId = form.getValues("templateId");
        form.reset({
          description: "",
          amount: undefined,
          date: new Date(),
          parentCategoryId: DEFAULT_CATEGORY_ID,
          subCategoryId: undefined,
          payee: "",
          templateId: currentTemplateId && currentTemplateId !== NONE_TEMPLATE_VALUE ? currentTemplateId : NONE_TEMPLATE_VALUE,
        })
    }
  }, [expenseToEdit, form, getCategoryById]);


  async function onSubmit(data: ExpenseFormValues) {
    const actualSubCategoryId = data.subCategoryId === NONE_SUBCATEGORY_VALUE ? undefined : data.subCategoryId;
    const finalCategoryId = actualSubCategoryId || data.parentCategoryId;

    const expenseData = {
      description: data.description,
      amount: data.amount,
      date: data.date,
      categoryId: finalCategoryId,
      payee: data.payee
    };

    if (expenseToEdit) {
      const dateToSave = data.date instanceof Date ? data.date : parseISO(data.date as unknown as string);
      await updateExpense({ ...expenseToEdit, ...expenseData, date: formatISO(dateToSave) });
      toast({ title: "¡Gasto Actualizado!", description: `"${data.description}" ha sido actualizado.` });
    } else {
      await addExpense(expenseData);
      toast({ title: "¡Gasto Guardado!", description: `"${data.description}" ha sido añadido.` });
    }
    onSave();
    dialogClose?.();
    form.reset({
        description: "",
        amount: undefined,
        date: new Date(),
        parentCategoryId: DEFAULT_CATEGORY_ID,
        subCategoryId: undefined,
        payee: "",
        templateId: NONE_TEMPLATE_VALUE,
      });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {expenseTemplates.length > 0 && !expenseToEdit && (
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
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plantilla"/>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_TEMPLATE_VALUE}>-- Ninguna Plantilla --</SelectItem>
                      {expenseTemplates.map((template) => (
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Café con amigos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="payee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beneficiario (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Starbucks" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} step="0.01" value={field.value === undefined ? '' : field.value}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
                        date > new Date() || date < new Date("1900-01-01")
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
                    form.setValue("subCategoryId", undefined);
                  }}
                  value={field.value}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría principal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parentCategories.map((category) => (
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
          {currentSubcategories.length > 0 && (
            <FormField
              control={form.control}
              name="subCategoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategoría</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    defaultValue={field.value}
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

        <Button type="submit" className="w-full">
           {expenseToEdit ? "Actualizar Gasto" : "Añadir Gasto"}
        </Button>
      </form>
    </Form>
  );
}
