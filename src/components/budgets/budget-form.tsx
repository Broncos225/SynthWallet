
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
import { useAppData } from "@/contexts/app-data-context";
import type { Budget, Category } from "@/types";
import { format, parse as parseDateFns, startOfMonth, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useMemo } from "react";
import { DEFAULT_CATEGORY_ID } from "@/lib/constants";
import { useCurrencyInput } from "@/hooks/use-currency-input";

const NONE_SUBCATEGORY_VALUE = "_NONE_SUBCATEGORY_VALUE_";

const budgetFormSchema = z.object({
  parentCategoryId: z.string().min(1, "Por favor selecciona una categoría principal."),
  subCategoryId: z.string().optional(),
  amount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).positive("La cantidad debe ser positiva."),
  month: z.string().regex(/^\d{4}-\d{2}$/, "El mes debe estar en formato YYYY-MM."),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  budgetToEdit?: Budget;
  onSave: () => void;
  dialogClose?: () => void;
}

export function BudgetForm({ budgetToEdit, onSave, dialogClose }: BudgetFormProps) {
  const {
    getParentCategories,
    getSubcategories,
    addBudget,
    updateBudget,
    getCategoryById,
    getCategoryName
  } = useAppData();
  const { toast } = useToast();

  const initialMonthYYYYMM = useMemo(() => {
    const date = new Date();
    return isValid(date) ? format(startOfMonth(date), 'yyyy-MM') : format(startOfMonth(new Date()), 'yyyy-MM');
  }, []);

  const parentCategories = getParentCategories().filter(c => c.id !== DEFAULT_CATEGORY_ID);
  const [currentSubcategories, setCurrentSubcategories] = useState<Category[]>([]);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: budgetToEdit
      ? {
          parentCategoryId: getCategoryById(budgetToEdit.categoryId)?.parentId || budgetToEdit.categoryId,
          subCategoryId: getCategoryById(budgetToEdit.categoryId)?.parentId ? budgetToEdit.categoryId : undefined,
          amount: Number(budgetToEdit.amount),
          month: budgetToEdit.month,
        }
      : {
          parentCategoryId: "",
          subCategoryId: undefined,
          amount: undefined,
          month: initialMonthYYYYMM,
        },
  });

  const selectedParentCategoryId = form.watch("parentCategoryId");

  useEffect(() => {
    if (selectedParentCategoryId) {
      const subs = getSubcategories(selectedParentCategoryId);
      setCurrentSubcategories(subs);
      const currentSubValue = form.getValues("subCategoryId");
      if (budgetToEdit && getCategoryById(budgetToEdit.categoryId)?.parentId === selectedParentCategoryId) {
        if (currentSubValue !== budgetToEdit.categoryId) {
          form.setValue("subCategoryId", budgetToEdit.categoryId);
        }
      } else if (subs.length === 0 || (currentSubValue && !subs.find(s => s.id === currentSubValue))) {
        // if (currentSubValue !== undefined && currentSubValue !== NONE_SUBCATEGORY_VALUE) {
        //   form.setValue("subCategoryId", undefined); // Reset if current sub is not in new subs or no subs
        // }
      }
    } else {
      setCurrentSubcategories([]);
      if (form.getValues("subCategoryId") !== undefined && form.getValues("subCategoryId") !== NONE_SUBCATEGORY_VALUE) {
        form.setValue("subCategoryId", undefined);
      }
    }
  }, [selectedParentCategoryId, getSubcategories, budgetToEdit, form, getCategoryById]);

  useEffect(() => {
    if (budgetToEdit) {
      const category = getCategoryById(budgetToEdit.categoryId);
      if (category) {
        form.reset({
          parentCategoryId: category.parentId || category.id,
          subCategoryId: category.parentId ? category.id : undefined,
          amount: Number(budgetToEdit.amount),
          month: budgetToEdit.month,
        });
      }
    } else {
        form.reset({
          parentCategoryId: "",
          subCategoryId: undefined,
          amount: undefined,
          month: initialMonthYYYYMM,
        });
    }
  }, [budgetToEdit, form, getCategoryById, initialMonthYYYYMM]);


  async function onSubmit(data: BudgetFormValues) {
    const actualSubCategoryId = data.subCategoryId === NONE_SUBCATEGORY_VALUE ? undefined : data.subCategoryId;
    const finalCategoryId = actualSubCategoryId || data.parentCategoryId;

    const budgetData = {
      categoryId: finalCategoryId,
      amount: data.amount, // RHF data.amount is already a number
      month: data.month,
    };

    const categoryDisplayName = getCategoryName(finalCategoryId);
    const monthDate = parseDateFns(data.month, 'yyyy-MM', new Date());
    const monthDisplay = isValid(monthDate) ? format(monthDate, 'MMMM yyyy', { locale: es }) : "Mes Inválido";

    if (budgetToEdit) {
      await updateBudget({ ...budgetData, id: budgetToEdit.id });
      toast({ title: "¡Presupuesto Actualizado!", description: `El presupuesto para ${categoryDisplayName} en ${monthDisplay} ha sido actualizado.` });
    } else {
      await addBudget(budgetData);
      toast({ title: "¡Presupuesto Guardado!", description: `El presupuesto para ${categoryDisplayName} en ${monthDisplay} ha sido establecido.` });
    }

    onSave();
    dialogClose?.();
    form.reset({ parentCategoryId: "", subCategoryId: undefined, amount: undefined, month: initialMonthYYYYMM });
  }

  const monthOptions = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      return isValid(date) ? format(startOfMonth(date), 'yyyy-MM') : format(startOfMonth(new Date()), 'yyyy-MM') ;
    }),
  []);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  value={field.value}
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
          {(currentSubcategories.length > 0 || (budgetToEdit && getCategoryById(budgetToEdit.categoryId)?.parentId)) && (
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
                        <SelectValue placeholder="Subcategoría (opcional)" />
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
          name="amount"
          render={({ field }) => {
            const { inputProps } = useCurrencyInput({
              initialValue: field.value,
              onChangeRHF: field.onChange,
            });
            return (
              <FormItem>
                <FormLabel>Monto del Presupuesto</FormLabel>
                <FormControl>
                  <Input 
                    {...inputProps}
                    onBlur={(e) => {
                        inputProps.onBlur(e);
                        field.onBlur();
                    }}
                    ref={field.ref}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={form.control}
          name="month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mes</FormLabel>
               <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un mes" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {monthOptions.map((monthVal) => {
                    const monthDate = parseDateFns(monthVal, 'yyyy-MM', new Date());
                    return (
                      <SelectItem key={monthVal} value={monthVal}>
                        {isValid(monthDate) ? format(monthDate, 'MMMM yyyy', { locale: es }) : "Mes Inválido"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {budgetToEdit ? "Actualizar Presupuesto" : "Establecer Presupuesto"}
        </Button>
      </form>
    </Form>
  );
}
