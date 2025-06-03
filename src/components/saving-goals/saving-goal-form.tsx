
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppData } from "@/contexts/app-data-context";
import type { SavingGoal } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { availableIcons, type AvailableIconItem, iconMap } from "@/lib/icon-map";
import { Palette, CalendarIcon } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { CategoryIcon } from "@/components/expenses/category-icon";
import { useCurrencyInput } from "@/hooks/use-currency-input";
import { parseISO, isValid, formatISO } from 'date-fns';
import { es } from 'date-fns/locale';


const savingGoalFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  targetAmount: z.coerce.number({invalid_type_error: "El monto debe ser un número."}).positive("El monto objetivo debe ser positivo."),
  targetDate: z.date().optional(),
  icon: z.string().min(1, "Por favor selecciona un icono."),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color hexadecimal inválido (ej. #RRGGBB).")
    .or(z.string().length(0).transform(val => val === "" ? undefined : val).optional()),
});

type SavingGoalFormValues = z.infer<typeof savingGoalFormSchema>;

interface SavingGoalFormProps {
  goalToEdit?: SavingGoal;
  onSave: () => void;
  dialogClose?: () => void;
}

export function SavingGoalForm({ goalToEdit, onSave, dialogClose }: SavingGoalFormProps) {
  const { addSavingGoal, updateSavingGoal } = useAppData();
  const { toast } = useToast();

  const form = useForm<SavingGoalFormValues>({
    resolver: zodResolver(savingGoalFormSchema),
    defaultValues: goalToEdit
      ? {
          name: goalToEdit.name,
          targetAmount: Number(goalToEdit.targetAmount),
          targetDate: goalToEdit.targetDate && isValid(parseISO(goalToEdit.targetDate)) ? parseISO(goalToEdit.targetDate) : undefined,
          icon: goalToEdit.icon,
          color: goalToEdit.color || "",
        }
      : {
          name: "",
          targetAmount: undefined,
          targetDate: undefined,
          icon: "PiggyBank",
          color: "",
        },
  });

  const watchedColor = form.watch("color");
  const watchedIcon = form.watch("icon");

  useEffect(() => {
    if (goalToEdit) {
      form.reset({
        name: goalToEdit.name,
        targetAmount: Number(goalToEdit.targetAmount),
        targetDate: goalToEdit.targetDate && isValid(parseISO(goalToEdit.targetDate)) ? parseISO(goalToEdit.targetDate) : undefined,
        icon: goalToEdit.icon,
        color: goalToEdit.color || "",
      });
    } else {
      form.reset({
        name: "",
        targetAmount: undefined,
        targetDate: undefined,
        icon: "PiggyBank",
        color: "",
      });
    }
  }, [goalToEdit, form]);

  async function onSubmit(data: SavingGoalFormValues) {
    const goalData = {
      name: data.name,
      targetAmount: data.targetAmount,
      targetDate: data.targetDate, 
      icon: data.icon,
      color: data.color || null,
    };

    if (goalToEdit) {
      await updateSavingGoal({
        ...goalToEdit, // Includes id, currentAmount, creationDate, status
        ...goalData, // Overwrites with new form data where applicable
        targetDate: data.targetDate ? formatISO(data.targetDate, { representation: 'date' }) : null,
      });
      toast({ title: "Objetivo Actualizado", description: `El objetivo "${data.name}" ha sido actualizado.` });
    } else {
      await addSavingGoal({ // currentAmount, creationDate, status handled by context
        ...goalData,
        targetDate: data.targetDate,
      });
      toast({ title: "Objetivo Añadido", description: `El objetivo "${data.name}" ha sido añadido.` });
    }

    onSave();
    dialogClose?.();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Objetivo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Vacaciones de Verano" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetAmount"
          render={({ field: rhfField }) => {
            const { inputProps } = useCurrencyInput({
              initialValue: rhfField.value,
              onChangeRHF: rhfField.onChange,
            });
            return (
              <FormItem>
                <FormLabel>Monto Objetivo</FormLabel>
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
          name="targetDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha Objetivo (Opcional)</FormLabel>
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
              <FormControl>
                <ScrollArea className="h-[200px] w-full rounded-md border p-2 bg-background">
                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                    {availableIcons.map((iconItem: AvailableIconItem) => {
                      const IconComp = iconMap[iconItem.name] || Palette;
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
                  <input
                    type="color"
                    className="p-0 h-8 w-8 rounded-md border-0 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={field.value || '#000000'}
                    onChange={(e) => field.onChange(e.target.value === '#000000' && !goalToEdit?.color ? '' : e.target.value)}
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
          {goalToEdit ? "Actualizar Objetivo" : "Añadir Objetivo"}
        </Button>
      </form>
    </Form>
  );
}

