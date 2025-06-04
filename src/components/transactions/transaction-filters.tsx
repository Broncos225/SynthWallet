
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Account, Category, TransactionType } from '@/types';
import { cn, formatDate } from "@/lib/utils";
import { CalendarIcon, RotateCcw, Search } from "lucide-react";
import { es } from 'date-fns/locale';
import { DEFAULT_CATEGORY_ID } from '@/lib/constants';

export interface FilterState {
  startDate: Date | null;
  endDate: Date | null;
  type: 'all' | TransactionType;
  categoryId: string; // 'all' or category ID
  accountId: string;  // 'all' or account ID
  description: string;
}

interface TransactionFiltersProps {
  filterValues: FilterState;
  setFilterValues: Dispatch<SetStateAction<FilterState>>;
  accounts: Account[];
  categories: Category[]; // Expecting parent categories
  onApply: () => void;
  onReset: () => void;
}

export function TransactionFilters({
  filterValues,
  setFilterValues,
  accounts,
  categories,
  onApply,
  onReset,
}: TransactionFiltersProps) {
  const handleInputChange = (field: keyof FilterState, value: any) => {
    setFilterValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Filtrar Transacciones</CardTitle>
        <CardDescription>Aplica filtros para refinar la lista de transacciones mostradas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Start Date */}
          <div className="space-y-1">
            <Label htmlFor="startDate">Desde Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filterValues.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterValues.startDate ? formatDate(filterValues.startDate) : <span>Elige una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterValues.startDate || undefined}
                  onSelect={(date) => handleInputChange('startDate', date || null)}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <Label htmlFor="endDate">Hasta Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filterValues.endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterValues.endDate ? formatDate(filterValues.endDate) : <span>Elige una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterValues.endDate || undefined}
                  onSelect={(date) => handleInputChange('endDate', date || null)}
                  disabled={(date) =>
                    filterValues.startDate ? date < filterValues.startDate : false
                  }
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={filterValues.type}
              onValueChange={(value) => handleInputChange('type', value)}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Tipos</SelectItem>
                <SelectItem value="expense">Gasto</SelectItem>
                <SelectItem value="income">Ingreso</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="category">Categoría (Principal)</Label>
            <Select
              value={filterValues.categoryId}
              onValueChange={(value) => handleInputChange('categoryId', value)}
              disabled={filterValues.type === 'transfer'}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
                <SelectItem value={DEFAULT_CATEGORY_ID}>Sin Categoría</SelectItem> 
              </SelectContent>
            </Select>
          </div>

          {/* Account */}
          <div className="space-y-1">
            <Label htmlFor="account">Cuenta</Label>
            <Select
              value={filterValues.accountId}
              onValueChange={(value) => handleInputChange('accountId', value)}
            >
              <SelectTrigger id="account">
                <SelectValue placeholder="Todas las cuentas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Cuentas</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1 xl:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              type="text"
              placeholder="Buscar por descripción..."
              value={filterValues.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onReset} className="w-full sm:w-auto">
          <RotateCcw className="mr-2 h-4 w-4" /> Limpiar Filtros
        </Button>
        <Button onClick={onApply} className="w-full sm:w-auto">
          <Search className="mr-2 h-4 w-4" /> Aplicar Filtros
        </Button>
      </CardFooter>
    </Card>
  );
}
