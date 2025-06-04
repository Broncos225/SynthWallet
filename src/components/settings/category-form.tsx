
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppData } from "@/contexts/app-data-context";
import type { Category } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useMemo } from "react";
import { financeAndGeneralIcons, type AvailableIconItem, iconMap } from "@/lib/icon-map";
import { RESERVED_CATEGORY_IDS } from "@/lib/constants";
import { Palette, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/expenses/category-icon";


const NO_PARENT_VALUE = "_NO_PARENT_";

const categoryFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  parentId: z.string().optional(),
  icon: z.string().min(1, "Por favor selecciona un icono."),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Por favor introduce un color hexadecimal válido (ej. #RRGGBB).")
    .or(z.string().length(0).transform(val => val === "" ? undefined : val).optional()),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  categoryToEdit?: Category;
  onSave: () => void;
  dialogClose?: () => void;
}

export function CategoryForm({ categoryToEdit, onSave, dialogClose }: CategoryFormProps) {
  const { addCategory, updateCategory, getParentCategories: getAllParentCategories, getCategoryById } = useAppData();
  const { toast } = useToast();
  const [iconSearchTerm, setIconSearchTerm] = useState("");

  const parentCategoryOptions = getAllParentCategories().filter(pc => {
    if (categoryToEdit && categoryToEdit.id === pc.id) return false;
    if (pc.id === 'uncategorized' || pc.id === 'other') return false;
    return true;
  });


  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: categoryToEdit
      ? {
          name: categoryToEdit.name,
          parentId: categoryToEdit.parentId || NO_PARENT_VALUE,
          icon: categoryToEdit.icon,
          color: categoryToEdit.color || "",
        }
      : {
          name: "",
          parentId: NO_PARENT_VALUE,
          icon: "Shapes",
          color: "",
        },
  });

  const isReservedForParenting = categoryToEdit && (RESERVED_CATEGORY_IDS.includes(categoryToEdit.id) && categoryToEdit.id !== 'income');
  const watchedColor = form.watch("color");
  const watchedIcon = form.watch("icon");

  useEffect(() => {
    if (categoryToEdit) {
      form.reset({
        name: categoryToEdit.name,
        parentId: categoryToEdit.parentId || NO_PARENT_VALUE,
        icon: categoryToEdit.icon,
        color: categoryToEdit.color || "",
      });
    } else {
      form.reset({
        name: "",
        parentId: NO_PARENT_VALUE,
        icon: "Shapes",
        color: "",
      });
    }
  }, [categoryToEdit, form]);

  async function onSubmit(data: CategoryFormValues) {
    const finalParentId = data.parentId === NO_PARENT_VALUE ? undefined : data.parentId;

    if (categoryToEdit && RESERVED_CATEGORY_IDS.includes(categoryToEdit.id) && categoryToEdit.id !== 'income' && finalParentId) {
        toast({ variant: "destructive", title: "Acción no permitida", description: `La categoría reservada "${categoryToEdit.name}" no puede ser una subcategoría.`});
        form.setValue("parentId", NO_PARENT_VALUE);
        return;
    }
    if (categoryToEdit && finalParentId === categoryToEdit.id) {
        toast({ variant: "destructive", title: "Error de Jerarquía", description: "Una categoría no puede ser subcategoría de sí misma."});
        return;
    }

    const categoryData = {
      name: data.name,
      parentId: finalParentId,
      icon: data.icon,
      color: data.color || null,
    };

    if (categoryToEdit) {
      if (RESERVED_CATEGORY_IDS.includes(categoryToEdit.id) && categoryToEdit.id !== 'income') {
        const reservedSafeData = {
            name: data.name,
            icon: data.icon,
            color: data.color || null,
            parentId: categoryToEdit.parentId,
        }
        await updateCategory({ ...reservedSafeData, id: categoryToEdit.id });
        toast({ title: `Categoría "${categoryToEdit.name}" Actualizada`, description: `Sus detalles (excepto ser subcategoría) han sido actualizados.` });
      } else {
        await updateCategory({ ...categoryData, id: categoryToEdit.id });
        toast({ title: "Categoría Actualizada", description: `"${data.name}" ha sido actualizada.` });
      }
    } else {
      await addCategory(categoryData);
      toast({ title: "Categoría Añadida", description: `"${data.name}" ha sido añadida.` });
    }

    onSave();
    dialogClose?.();
  }

  const filteredIcons = useMemo(() => {
    if (!iconSearchTerm) return financeAndGeneralIcons;
    return financeAndGeneralIcons.filter(iconItem =>
      iconItem.name.toLowerCase().includes(iconSearchTerm.toLowerCase())
    );
  }, [iconSearchTerm]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Categoría</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Comida rápida" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!(categoryToEdit && (categoryToEdit.id === 'uncategorized' || categoryToEdit.id === 'other')) && (
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría Principal (Opcional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  defaultValue={field.value}
                  disabled={isReservedForParenting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría principal si es subcategoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_VALUE}>-- Ninguna (Es Categoría Principal) --</SelectItem>
                    {parentCategoryOptions.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isReservedForParenting && <FormMessage>Las categorías reservadas (excepto Ingresos) no pueden ser subcategorías.</FormMessage>}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icono</FormLabel>
              <div className="flex items-center gap-3 mb-2">
                <span>Seleccionado:</span>
                <CategoryIcon iconName={watchedIcon} color={watchedColor} size={6} />
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="text"
                    placeholder="Buscar icono..."
                    value={iconSearchTerm}
                    onChange={(e) => setIconSearchTerm(e.target.value)}
                    className="mb-2 pl-8"
                />
              </div>
              <FormControl>
                <ScrollArea className="h-[200px] w-full rounded-md border p-2 bg-background">
                  {filteredIcons.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">No se encontraron iconos.</p>
                  )}
                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                    {filteredIcons.map((iconItem: AvailableIconItem) => {
                      const IconComp = iconItem.component || Palette;
                      const isSelected = field.value === iconItem.name;
                      return (
                        <Button
                          key={iconItem.name}
                          variant={isSelected ? "default" : "outline"}
                          size="icon"
                          type="button"
                          onClick={() => field.onChange(iconItem.name)}
                          className={cn(
                            "p-2 flex justify-center items-center h-10 w-10",
                            isSelected && "ring-2 ring-ring ring-offset-2"
                          )}
                          aria-label={iconItem.name}
                          title={iconItem.name}
                        >
                          <IconComp className="h-5 w-5" />
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color (Opcional)</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    type="color"
                    {...field}
                    className="p-1 h-10 w-16"
                    value={field.value || '#000000'}
                    onChange={(e) => field.onChange(e.target.value === '#000000' && !categoryToEdit?.color ? '' : e.target.value)}
                  />
                </FormControl>
                <Input
                    type="text"
                    placeholder="#RRGGBB"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="max-w-[120px]"
                />
                {field.value && (
                    <div className="w-6 h-6 rounded-full border" style={{backgroundColor: field.value}} />
                )}
                 <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange('')}>Limpiar</Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {categoryToEdit ? "Actualizar Categoría" : "Añadir Categoría"}
        </Button>
      </form>
    </Form>
  );
}
