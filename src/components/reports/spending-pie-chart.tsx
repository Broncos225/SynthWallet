
"use client";

import type { Transaction, ChartDataPoint } from '@/types';
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
import { PieChart, Pie, Cell } from 'recharts';
import { useMemo } from 'react';

interface SpendingPieChartProps {
  transactions: Transaction[];
  title?: string;
  description?: string;
}

const PIE_CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-6))',
  'hsl(var(--chart-7))', 'hsl(var(--chart-8))', 'hsl(var(--chart-9))',
  'hsl(var(--chart-10))', 'hsl(var(--chart-11))', 'hsl(var(--chart-12))',
];

export function SpendingPieChart({ transactions, title = "Desglose de Gastos Mensuales (Categorías Principales)", description }: SpendingPieChartProps) {
  const { getCategoryById, formatUserCurrency } = useAppData();

  const chartData = useMemo(() => {
    const spendingByParentCategory: { [key: string]: { name: string; value: number; categoryOriginalColor?: string | null, id: string } } = {};
    const filteredTransactions = Array.isArray(transactions) ? transactions.filter(t => t.type === 'expense') : [];

    filteredTransactions.forEach(transaction => {
      let category = transaction.categoryId ? getCategoryById(transaction.categoryId) : undefined;
      let parentCategoryIdToUse = category?.parentId || category?.id || 'uncategorized';
      let parentCategoryForColor = getCategoryById(parentCategoryIdToUse);

      if (!parentCategoryForColor) parentCategoryForColor = getCategoryById('uncategorized');

      if (parentCategoryForColor) {
        if (!spendingByParentCategory[parentCategoryIdToUse]) {
          spendingByParentCategory[parentCategoryIdToUse] = {
            id: parentCategoryForColor.id,
            name: parentCategoryForColor.name,
            value: 0,
            categoryOriginalColor: parentCategoryForColor.color,
          };
        }
        spendingByParentCategory[parentCategoryIdToUse].value += transaction.amount;
      }
    });

    const sortedData = Object.values(spendingByParentCategory).sort((a, b) => b.value - a.value);

    return sortedData.map((item, index) => ({
      ...item,
      fill: item.categoryOriginalColor || PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
    }));

  }, [transactions, getCategoryById]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach(item => {
        config[item.name] = { label: item.name, color: item.fill };
    });
    return config;
  }, [chartData]);


  if (chartData.length === 0) {
    return (
      <Card className="shadow-md h-full">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
          {description && <CardDescription className="text-xs md:text-sm">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="h-[240px] sm:h-[280px] md:h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No hay datos de gastos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
        {description && <CardDescription className="text-xs md:text-sm">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer config={chartConfig} className="mx-auto w-full h-[240px] sm:h-[280px] md:h-[300px]">
            <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="name" formatter={(value, name, props) => {
                  const categoryName = props.payload?.name;
                  return `${categoryName}: ${formatUserCurrency(value as number)}`;
                }} />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60} 
                innerRadius={30} 
                strokeWidth={1.5}
                labelLine={false}
              >
                {chartData.map((entry) => (
                  <Cell key={`cell-expense-${entry.id}`} fill={entry.fill} name={entry.name} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" className="flex-wrap justify-center text-xs gap-x-1 gap-y-0.5" />} />
            </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
