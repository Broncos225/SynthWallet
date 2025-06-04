
"use client";

import type { Debt } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useAppData } from '@/contexts/app-data-context';
import { useMemo } from 'react';

interface DebtByPayeeChartProps {
  debts: Debt[];
  debtType: 'owed_by_me' | 'owed_to_me';
  title?: string;
  topN?: number;
}

export function DebtByPayeeChart({ 
  debts, 
  debtType,
  title, 
  topN = 7 
}: DebtByPayeeChartProps) {
  const { formatUserCurrency, getPayeeName } = useAppData();

  const chartData = useMemo(() => {
    const debtsByType = debts.filter(d => d.type === debtType && d.status !== 'pagada');
    const amountByPayee: { [payeeName: string]: number } = {};

    debtsByType.forEach(debt => {
      const payeeName = debt.payeeId ? getPayeeName(debt.payeeId) : debt.debtorOrCreditor;
      if (payeeName && payeeName !== 'N/A' && payeeName !== 'Desconocido') {
        amountByPayee[payeeName] = (amountByPayee[payeeName] || 0) + debt.currentBalance;
      }
    });

    return Object.entries(amountByPayee)
      .map(([name, total]) => ({ name, "Saldo": total }))
      .filter(item => item.Saldo > 0) // Only show if there's a balance
      .sort((a, b) => b["Saldo"] - a["Saldo"])
      .slice(0, topN);
  }, [debts, debtType, topN, getPayeeName]);

  const chartConfig = {
    "Saldo": { label: "Saldo Actual", color: debtType === 'owed_by_me' ? "hsl(var(--chart-8))" : "hsl(var(--chart-6))" },
  } satisfies ChartConfig;
  
  const defaultTitle = debtType === 'owed_by_me' 
    ? "Deudas Pendientes Por Pagar" 
    : "Cuentas Pendientes Por Cobrar";

  if (chartData.length === 0) {
    return (
      <Card className="shadow-md h-full">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{title || defaultTitle}</CardTitle>
          <CardDescription className="text-xs md:text-sm">Top {topN} entidades por saldo actual.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No hay deudas activas de este tipo para mostrar.</p>
        </CardContent>
      </Card>
    );
  }
  
  const barHeight = 30;
  const chartHeight = Math.max(300, chartData.length * barHeight + 100); 

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{title || defaultTitle}</CardTitle>
        <CardDescription className="text-xs md:text-sm">Top {topN} entidades por saldo actual.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full" style={{ height: `${chartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barCategoryGap="20%" margin={{ right: 20, left: 10, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis 
                type="number" 
                tickFormatter={(value) => formatUserCurrency(value as number).replace(/[^0-9,.]/g, '').split(/[.,]/)[0]} 
                tick={{fontSize: 10}} 
              />
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
              <Bar dataKey="Saldo" fill="var(--color-Saldo)" radius={4} name="Saldo Actual" barSize={barHeight * 0.6} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
