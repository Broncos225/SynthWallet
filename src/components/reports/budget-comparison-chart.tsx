
"use client";

import type { Budget, Transaction, Category, ChartDataPoint } from '@/types'; 
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
// import { formatCurrency } from '@/lib/utils'; // Replaced by formatUserCurrency
import { useMemo } from 'react';
import { format, parse as parseDateFns } from 'date-fns';
import { es } from 'date-fns/locale';

interface BudgetComparisonChartProps {
  budgets: Budget[];
  transactions: Transaction[]; 
  month: string; // YYYY-MM
}

export function BudgetComparisonChart({ budgets, transactions, month }: BudgetComparisonChartProps) {
  const { getCategoryById, getCategoryName, formatUserCurrency } = useAppData();

  const chartData = useMemo(() => {
    const monthBudgets = budgets.filter(b => b.month === month);
    const safeTransactions = Array.isArray(transactions) ? transactions : [];
    const monthExpenses = safeTransactions.filter(t => t.type === 'expense' && t.date.startsWith(month));
    
    return monthBudgets.map(budget => {
      const category = getCategoryById(budget.categoryId);
      const categoryDisplayName = getCategoryName(budget.categoryId);
      
      const spentAmount = monthExpenses
        .filter(e => {
          const expenseCategory = getCategoryById(e.categoryId || "");
          if (category && !category.parentId) { 
             return (e.categoryId === budget.categoryId || expenseCategory?.parentId === budget.categoryId);
          }
          return e.categoryId === budget.categoryId;
        })
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        name: categoryDisplayName, 
        "Presupuestado": budget.amount,
        "Gastado": spentAmount,
      };
    }).filter(d => d.Presupuestado > 0 || d.Gastado > 0) 
      .sort((a,b) => { 
        if (a.name.includes('/') && !b.name.includes('/')) return 1;
        if (!a.name.includes('/') && b.name.includes('/')) return -1;
        return a.name.localeCompare(b.name);
      }); 
  }, [budgets, transactions, month, getCategoryById, getCategoryName]);

  const chartConfig = {
    "Presupuestado": { label: "Presupuestado", color: "hsl(var(--secondary))" },
    "Gastado": { label: "Gastado", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  const monthDisplay = format(parseDateFns(month, 'yyyy-MM', new Date()), 'MMMM yyyy', { locale: es });

  if (chartData.length === 0) {
    return (
      <Card className="shadow-md h-full">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Presupuesto vs. Gasto</CardTitle>
          <CardDescription className="text-xs md:text-sm">Comparación para {monthDisplay}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos de presupuesto para mostrar para este mes.</p>
        </CardContent>
      </Card>
    );
  }
  
  const barHeight = 30;
  const chartHeight = Math.max(300, chartData.length * barHeight + 100); 

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">Presupuesto vs. Gasto</CardTitle>
        <CardDescription className="text-xs md:text-sm">Comparación para {monthDisplay}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barCategoryGap="20%" margin={{ right: 20, left: 10, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tickFormatter={(value) => formatUserCurrency(value as number).replace(/[^0-9,.]/g, '').split(/[.,]/)[0]} tick={{fontSize: 10}} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                stroke="hsl(var(--foreground))" 
                width={110} 
                interval={0} 
                tick={{fontSize: 10, width: 100}} 
                tickFormatter={(value: string) => value.length > 15 ? `${value.substring(0,13)}...` : value} 
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent 
                            formatter={(value, name) => {
                                const configKey = name as keyof typeof chartConfig;
                                const configItem = chartConfig[configKey]; 
                                return `${configItem ? configItem.label : name}: ${formatUserCurrency(value as number)}`;
                            }}
                            indicator="dot" 
                         />}
              />
              <Legend content={<ChartLegendContent />} />
              <Bar dataKey="Presupuestado" fill="var(--color-Presupuestado)" radius={4} name="Presupuestado" barSize={barHeight * 0.4} />
              <Bar dataKey="Gastado" fill="var(--color-Gastado)" radius={4} name="Gastado" barSize={barHeight * 0.4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
