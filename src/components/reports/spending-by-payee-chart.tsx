
"use client";

import type { Transaction } from '@/types';
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
// import { formatCurrency } from '@/lib/utils'; // Replaced by formatUserCurrency
import { useAppData } from '@/contexts/app-data-context';
import { useMemo } from 'react';

interface SpendingByPayeeChartProps {
  transactions: Transaction[];
  title?: string;
  topN?: number;
}

export function SpendingByPayeeChart({ 
  transactions, 
  title = "Principales Beneficiarios (Gastos)", 
  topN = 5 
}: SpendingByPayeeChartProps) {
  const { formatUserCurrency } = useAppData();
  const chartData = useMemo(() => {
    const expensesByPayee: { [payee: string]: number } = {};
    const filteredTransactions = Array.isArray(transactions) ? transactions.filter(t => t.type === 'expense' && t.payee && t.payee.trim() !== '') : [];

    filteredTransactions.forEach(transaction => {
      const payee = transaction.payee!; 
      expensesByPayee[payee] = (expensesByPayee[payee] || 0) + transaction.amount;
    });

    return Object.entries(expensesByPayee)
      .map(([name, total]) => ({ name, "Monto": total }))
      .sort((a, b) => b["Monto"] - a["Monto"])
      .slice(0, topN);
  }, [transactions, topN]);

  const chartConfig = {
    "Monto": { label: "Monto Gastado", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  if (chartData.length === 0) {
    return (
      <Card className="shadow-md h-full">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
          <CardDescription className="text-xs md:text-sm">Top {topN} beneficiarios este mes</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No hay gastos con beneficiarios definidos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }
  
  const barHeight = 30;
  const chartHeight = Math.max(300, chartData.length * barHeight + 100); 

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
        <CardDescription className="text-xs md:text-sm">Top {topN} beneficiarios este mes</CardDescription>
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
                            formatter={(value) => formatUserCurrency(value as number)}
                            indicator="dot" 
                         />}
              />
              <Bar dataKey="Monto" fill="var(--color-Monto)" radius={4} name="Monto Gastado" barSize={barHeight * 0.6} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
