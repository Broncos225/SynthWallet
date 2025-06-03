
"use client";

import type { Transaction } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { getMonthYear } from '@/lib/utils'; // formatUserCurrency will come from context
import { useMemo } from 'react';
import { format, parse as parseDateFns, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncomeExpenseTrendChartProps {
  transactions: Transaction[];
  numberOfMonths?: number;
}

export function IncomeExpenseTrendChart({ transactions, numberOfMonths = 6 }: IncomeExpenseTrendChartProps) {
  const { formatUserCurrency } = useAppData();
  const chartData = useMemo(() => {
    const monthlyData: { [month: string]: { income: number; expenses: number } } = {};
    const today = new Date();

    for (let i = 0; i < numberOfMonths; i++) {
      const monthDate = startOfMonth(subMonths(today, i));
      const monthKey = format(monthDate, 'yyyy-MM');
      monthlyData[monthKey] = { income: 0, expenses: 0 };
    }
    
    const safeTransactions = Array.isArray(transactions) ? transactions : [];

    safeTransactions.forEach(transaction => {
      const transactionMonth = getMonthYear(transaction.date);
      if (monthlyData[transactionMonth]) {
        if (transaction.type === 'income') {
          monthlyData[transactionMonth].income += transaction.amount;
        } else if (transaction.type === 'expense') {
          monthlyData[transactionMonth].expenses += transaction.amount;
        }
      }
    });

    return Object.keys(monthlyData)
      .map(monthKey => ({
        name: format(parseDateFns(monthKey, 'yyyy-MM', new Date()), 'MMM yy', { locale: es }),
        Ingresos: monthlyData[monthKey].income,
        Gastos: monthlyData[monthKey].expenses,
      }))
      .reverse(); 

  }, [transactions, numberOfMonths]);

  const chartConfig = {
    "Ingresos": { label: "Ingresos", color: "hsl(var(--chart-2))" }, 
    "Gastos": { label: "Gastos", color: "hsl(var(--chart-1))" },   
  } satisfies ChartConfig;
  
  const yAxisTickFormatter = (value: number) => {
    if (value === 0) return '0';
    if (Math.abs(value) >= 1000000) return `${formatUserCurrency(value / 1000000).replace(/[^0-9,.]/g, '').split(/[.,]/)[0]}M`; 
    if (Math.abs(value) >= 1000) return `${formatUserCurrency(value / 1000).replace(/[^0-9,.]/g, '').split(/[.,]/)[0]}K`;
    return formatUserCurrency(value).replace(/[^0-9,.]/g, '').split(/[.,]/)[0];
  };


  if (chartData.length === 0) {
    return (
      <Card className="shadow-md col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Tendencia de Ingresos vs. Gastos</CardTitle>
          <CardDescription className="text-xs md:text-sm">Últimos {numberOfMonths} meses</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos suficientes para mostrar la tendencia.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Tendencia de Ingresos vs. Gastos</CardTitle>
        <CardDescription className="text-xs md:text-sm">Últimos {numberOfMonths} meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] sm:min-h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}> 
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" tick={{fontSize: 10}} />
              <YAxis tickFormatter={yAxisTickFormatter} tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" tick={{fontSize: 10}} />
              <ChartTooltip
                cursor={true}
                content={<ChartTooltipContent 
                            formatter={(value, name) => `${name}: ${formatUserCurrency(value as number)}`}
                            indicator="dot" 
                         />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="Ingresos" fill="var(--color-Ingresos)" radius={[4, 4, 0, 0]} name="Ingresos" />
              <Bar dataKey="Gastos" fill="var(--color-Gastos)" radius={[4, 4, 0, 0]} name="Gastos" />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
