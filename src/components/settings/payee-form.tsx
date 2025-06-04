
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
import { useAppData } from "@/contexts/app-data-context";
import type { Payee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { normalizeString } from "@/lib/utils";

interface PayeeFormProps {
  payeeToEdit?: Payee;
  onSave: () => void;
  dialogClose?: () => void;
}

export function PayeeForm({ payeeToEdit, onSave, dialogClose }: PayeeFormProps) {
  const { addPayee, updatePayee, payees } = useAppData();
  const { toast } = useToast();

  const payeeFormSchema = z.object({
    name: z.string().min(2, "El nombre debe tener al menos 2 caracteres.")
      .refine(value => {
        const normalizedValue = normalizeString(value);
        const existingPayee = payees.find(p => normalizeString(p.name) === normalizedValue);
        // If editing, allow saving if the name hasn't changed or if it's changed to another unique name
        // If adding, ensure the name is unique
        return payeeToEdit ? (normalizeString(payeeToEdit.name) === normalizedValue || !existingPayee || existingPayee.id === payeeToEdit.id) : !existingPayee;
      }, { message: "Este beneficiario/pagador ya existe." })
  });
  
  type PayeeFormValues = z.infer<typeof payeeFormSchema>;

  const form = useForm<PayeeFormValues>({
    resolver: zodResolver(payeeFormSchema),
    defaultValues: {
      name: payeeToEdit?.name || "",
    },
  });

  async function onSubmit(data: PayeeFormValues) {
    if (payeeToEdit) {
      await updatePayee({ ...payeeToEdit, name: data.name });
      toast({ title: "Beneficiario Actualizado", description: `"${data.name}" ha sido actualizado.` });
    } else {
      await addPayee({ name: data.name });
      toast({ title: "Beneficiario Añadido", description: `"${data.name}" ha sido añadido.` });
    }
    onSave();
    dialogClose?.();
    form.reset({ name: "" });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Beneficiario/Pagador</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Supermercado Éxito, Juan Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          {payeeToEdit ? "Actualizar Beneficiario" : "Añadir Beneficiario"}
        </Button>
      </form>
    </Form>
  );
}

    