
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
import type { ExpenseTemplate, Category } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { DEFAULT_CATEGORY_ID } from "@/lib/constants";

const NONE_SUBCATEGORY_VALUE = "_NONE_SUBCATEGORY_VALUE_";

const templateFormSchema = z.object({
  name: z.string().min(2, "El nombre de la plantilla debe tener al menos 2 caracteres."),
  description: z.string().optional(),
  amount: z.coerce.number().positive("La cantidad debe ser positiva."),
  parentCategoryId: z.string().min(1, "Por favor selecciona una categoría principal."),
  subCategoryId: z.string().optional(),
  payee: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ExpenseTemplateFormProps {
  templateToEdit?: ExpenseTemplate;
  onSave: () => void;
  dialogClose?: () => void;
}

export function ExpenseTemplateForm({ templateToEdit, onSave, dialogClose }: ExpenseTemplateFormProps) {
  const { 
    getParentCategories, 
    getSubcategories, 
    addExpenseTemplate, 
    updateExpenseTemplate, 
    getCategoryById 
  } = useAppData();
  const { toast } = useToast();
  
  const parentCategories = getParentCategories();
  const [currentSubcategories, setCurrentSubcategories] = useState<Category[]>([]);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: templateToEdit
      ? {
          name: templateToEdit.name,
          description: templateToEdit.description || "",
          amount: Number(templateToEdit.amount),
          parentCategoryId: getCategoryById(templateToEdit.categoryId)?.parentId || templateToEdit.categoryId,
          subCategoryId: getCategoryById(templateToEdit.categoryId)?.parentId ? templateToEdit.categoryId : undefined,
          payee: templateToEdit.payee || "",
        }
      : {
          name: "",
          description: "",
          amount: undefined,
          parentCategoryId: DEFAULT_CATEGORY_ID,
          subCategoryId: undefined,
          payee: "",
        },
  });

  const selectedParentCategoryId = form.watch("parentCategoryId");

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
    if (templateToEdit) {
      const category = getCategoryById(templateToEdit.categoryId);
      form.reset({
        name: templateToEdit.name,
        description: templateToEdit.description || "",
        amount: Number(templateToEdit.amount),
        parentCategoryId: category?.parentId || category?.id || DEFAULT_CATEGORY_ID,
        subCategoryId: category?.parentId ? category.id : undefined,
        payee: templateToEdit.payee || "",
      });
    } else {
        form.reset({
          name: "",
          description: "",
          amount: undefined,
          parentCategoryId: DEFAULT_CATEGORY_ID,
          subCategoryId: undefined,
          payee: "",
        })
    }
  }, [templateToEdit, form, getCategoryById]);

  async function onSubmit(data: TemplateFormValues) {
    const actualSubCategoryId = data.subCategoryId === NONE_SUBCATEGORY_VALUE ? undefined : data.subCategoryId;
    const finalCategoryId = actualSubCategoryId || data.parentCategoryId;

    const templateData = { 
      name: data.name,
      description: data.description,
      amount: data.amount,
      categoryId: finalCategoryId,
      payee: data.payee
    };

    if (templateToEdit) {
      updateExpenseTemplate({ ...templateData, id: templateToEdit.id });
      toast({ title: "¡Plantilla Actualizada!", description: `La plantilla "${data.name}" ha sido actualizada.` });
    } else {
      addExpenseTemplate(templateData);
      toast({ title: "¡Plantilla Guardada!", description: `La plantilla "${data.name}" ha sido añadida.` });
    }
    onSave();
    dialogClose?.();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Plantilla</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Café diario" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción por Defecto (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Café con leche" {...field} />
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
              <FormLabel>Beneficiario por Defecto (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Starbucks" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad por Defecto</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} step="0.01" value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="parentCategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría Principal por Defecto</FormLabel>
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
                  <FormLabel>Subcategoría por Defecto</FormLabel>
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
           {templateToEdit ? "Actualizar Plantilla" : "Añadir Plantilla"}
        </Button>
      </form>
    </Form>
  );
}
