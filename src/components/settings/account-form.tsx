
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
import type { Account } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { iconMap, availableIcons, type AvailableIconItem } from "@/lib/icon-map";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/expenses/category-icon"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrencyInput } from "@/hooks/use-currency-input";

const accountFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  type: z.string().min(1, "Por favor selecciona un tipo de cuenta."),
  initialBalance: z.coerce.number({invalid_type_error: "El saldo debe ser un número."}).min(0, "El saldo inicial no puede ser negativo."),
  icon: z.string().min(1, "Por favor selecciona un icono."),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color hexadecimal inválido (ej. #RRGGBB).")
    .or(z.string().length(0).transform(val => val === "" ? undefined : val).optional()),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
  accountToEdit?: Account;
  onSave: () => void;
  dialogClose?: () => void;
}

const accountTypes = [
  { value: "bank", label: "Cuenta Bancaria" },
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta de Crédito" },
  { value: "savings", label: "Ahorros" },
  { value: "investment", label: "Inversión" },
  { value: "ewallet", label: "Billetera Electrónica" },
  { value: "other", label: "Otro" },
];

export function AccountForm({ accountToEdit, onSave, dialogClose }: AccountFormProps) {
  const { addAccount, updateAccount } = useAppData();
  const { toast } = useToast();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: accountToEdit
      ? {
          name: accountToEdit.name,
          type: accountToEdit.type,
          initialBalance: accountToEdit.initialBalance,
          icon: accountToEdit.icon || "Wallet",
          color: accountToEdit.color || "",
        }
      : {
          name: "",
          type: "bank",
          initialBalance: 0,
          icon: "Wallet",
          color: "",
        },
  });

  const watchedColor = form.watch("color");
  const watchedIcon = form.watch("icon");

  useEffect(() => {
    if (accountToEdit) {
      form.reset({
        name: accountToEdit.name,
        type: accountToEdit.type,
        initialBalance: accountToEdit.initialBalance, 
        icon: accountToEdit.icon || "Wallet",
        color: accountToEdit.color || "",
      });
    } else {
      form.reset({
        name: "",
        type: "bank",
        initialBalance: 0,
        icon: "Wallet",
        color: "",
      });
    }
  }, [accountToEdit, form]);

  async function onSubmit(data: AccountFormValues) {
    const accountData = {
      name: data.name,
      type: data.type,
      initialBalance: data.initialBalance, 
      icon: data.icon,
      color: data.color || null, 
    };

    if (accountToEdit) {
      await updateAccount({ ...accountData, id: accountToEdit.id, currentBalance: accountToEdit.currentBalance });
      toast({ title: "Cuenta Actualizada", description: `La cuenta "${data.name}" ha sido actualizada.` });
    } else {
      await addAccount(accountData); 
      toast({ title: "Cuenta Añadida", description: `La cuenta "${data.name}" ha sido añadida.` });
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
              <FormLabel>Nombre de la Cuenta</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Banco Principal, Cartera" {...field} />
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
              <FormLabel>Tipo de Cuenta</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accountTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
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
          name="initialBalance"
          render={({ field: rhfField }) => {
            const { inputProps } = useCurrencyInput({
              initialValue: rhfField.value,
              onChangeRHF: rhfField.onChange,
            });
            return (
              <FormItem>
                <FormLabel>Saldo Inicial</FormLabel>
                <FormControl>
                  <Input 
                    {...inputProps}
                    onBlur={(e) => {
                        inputProps.onBlur(e);
                        rhfField.onBlur();
                    }}
                    ref={rhfField.ref}
                    disabled={!!accountToEdit} 
                  />
                </FormControl>
                {!accountToEdit && <FormMessage />}
                {!!accountToEdit && <p className="text-sm text-muted-foreground">El saldo inicial no se puede modificar después de la creación. Los ajustes se realizan mediante transacciones.</p>}
              </FormItem>
            );
          }}
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
                    onChange={(e) => field.onChange(e.target.value === '#000000' && !accountToEdit?.color ? '' : e.target.value)} 
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
          {accountToEdit ? "Actualizar Cuenta" : "Añadir Cuenta"}
        </Button>
      </form>
    </Form>
  );
}
