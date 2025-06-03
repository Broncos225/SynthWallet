
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppData } from "@/contexts/app-data-context";
import type { ThemeSettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useCallback } from "react";
import { DEFAULT_THEME_SETTINGS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hslStringToHex, hexToHslString } from "@/lib/utils";

const hexColorStringSchema = z.string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Formato hexadecimal inválido (ej. #RRGGBB)")
  .optional()
  .or(z.literal(''));

const themeFormSchema = z.object({
  background: hexColorStringSchema,
  foreground: hexColorStringSchema,
  card: hexColorStringSchema,
  primary: hexColorStringSchema,
  accent: hexColorStringSchema,
  numberFormatLocale: z.string().min(1, "Por favor selecciona un formato de número."),
});

type ThemeFormValues = z.infer<typeof themeFormSchema>;

const getInitialFormValues = (currentSettings: ThemeSettings | null): ThemeFormValues => {
  const settingsToUse = currentSettings || DEFAULT_THEME_SETTINGS;
  const defaultSettings = DEFAULT_THEME_SETTINGS; // for fallback

  return {
    background: hslStringToHex(settingsToUse.background) || hslStringToHex(defaultSettings.background) || '#000000',
    foreground: hslStringToHex(settingsToUse.foreground) || hslStringToHex(defaultSettings.foreground) || '#000000',
    card: hslStringToHex(settingsToUse.card) || hslStringToHex(defaultSettings.card) || '#000000',
    primary: hslStringToHex(settingsToUse.primary) || hslStringToHex(defaultSettings.primary) || '#000000',
    accent: hslStringToHex(settingsToUse.accent) || hslStringToHex(defaultSettings.accent) || '#000000',
    numberFormatLocale: settingsToUse.numberFormatLocale || defaultSettings.numberFormatLocale,
  };
};


export function ThemeSettingsForm() {
  const { themeSettings, updateThemeSettings, dataLoading } = useAppData();
  const { toast } = useToast();

  const form = useForm<ThemeFormValues>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: getInitialFormValues(themeSettings),
  });
  
  useEffect(() => {
    if (!dataLoading) { 
      form.reset(getInitialFormValues(themeSettings));
    }
  }, [themeSettings, form, dataLoading]);


  async function onSubmit(data: ThemeFormValues) {
    const newSettings: ThemeSettings = {
      background: data.background ? hexToHslString(data.background) : DEFAULT_THEME_SETTINGS.background,
      foreground: data.foreground ? hexToHslString(data.foreground) : DEFAULT_THEME_SETTINGS.foreground,
      card: data.card ? hexToHslString(data.card) : DEFAULT_THEME_SETTINGS.card,
      primary: data.primary ? hexToHslString(data.primary) : DEFAULT_THEME_SETTINGS.primary,
      accent: data.accent ? hexToHslString(data.accent) : DEFAULT_THEME_SETTINGS.accent,
      numberFormatLocale: data.numberFormatLocale || DEFAULT_THEME_SETTINGS.numberFormatLocale,
    };
    await updateThemeSettings(newSettings);
    toast({ title: "Tema Actualizado", description: "La configuración de apariencia ha sido actualizada." });
  }

  const handleResetToDefault = () => {
    form.reset(getInitialFormValues(DEFAULT_THEME_SETTINGS));
    toast({ title: "Formulario Restablecido", description: "La configuración se ha restablecido a los valores predeterminados. Guarda para aplicar." });
  };

  const colorFields: Array<{name: keyof Omit<ThemeFormValues, 'numberFormatLocale'>, label: string, description: string}> = [
    { name: "background", label: "Color de Fondo", description: "Color principal del fondo." },
    { name: "foreground", label: "Color de Texto Principal", description: "Color del texto sobre el fondo." },
    { name: "card", label: "Color de Fondo de Tarjetas", description: "Color de fondo para tarjetas." },
    { name: "primary", label: "Color Primario", description: "Color para botones y elementos destacados." },
    { name: "accent", label: "Color de Acento", description: "Color para indicadores y acentos." },
  ];

  const numberFormatOptions = [
    { value: 'es-ES', label: 'Punto miles, Coma decimal (ej: 1.234,56)' },
    { value: 'es-CO', label: 'Punto miles, Coma decimal (ej: 1.234,56) - CO' },
    { value: 'en-US', label: 'Coma miles, Punto decimal (ej: 1,234.56) - US' },
  ];


  if (dataLoading && !themeSettings) { 
     return <p>Cargando configuración del tema...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalizar Tema y Formato</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {colorFields.map((item) => (
              <FormField
                key={item.name}
                control={form.control}
                name={item.name}
                render={({ field }) => {
                  const defaultColorHex = hslStringToHex(DEFAULT_THEME_SETTINGS[item.name]) || '#000000';
                  const currentColorHex = field.value || defaultColorHex;
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        {item.label}
                        <span 
                          className="ml-2 inline-block h-5 w-5 rounded-full border" 
                          style={{ backgroundColor: currentColorHex }}
                          title={`Valor actual: ${field.value || 'Predeterminado'}`}
                        />
                      </FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                           <input
                            type="color"
                            className="p-0 h-8 w-8 rounded-md border-0 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            value={field.value || hslStringToHex(DEFAULT_THEME_SETTINGS[item.name]) || '#000000'}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <input
                          type="text"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-[120px]"
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value)}
                          placeholder="#RRGGBB"
                        />
                         {field.value && (
                           <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange('')}>Limpiar</Button>
                         )}
                      </div>
                      <FormDescription>{item.description}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            ))}

            <FormField
              control={form.control}
              name="numberFormatLocale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato de Números</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || DEFAULT_THEME_SETTINGS.numberFormatLocale}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un formato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {numberFormatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Elige cómo se mostrarán los números y las monedas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button type="submit">Guardar Cambios</Button>
              <Button type="button" variant="outline" onClick={handleResetToDefault}>
                Restablecer Predeterminado
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
