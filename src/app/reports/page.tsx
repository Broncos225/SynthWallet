
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { SpendingPieChart } from '@/components/reports/spending-pie-chart';
import { BudgetComparisonChart } from '@/components/reports/budget-comparison-chart';
import { IncomeByCategoryPieChart } from '@/components/reports/income-by-category-pie-chart';
import { IncomeExpenseTrendChart } from '@/components/reports/income-expense-trend-chart';
import { SpendingByPayeeChart } from '@/components/reports/spending-by-payee-chart';
import { SummaryCard } from '@/components/dashboard/summary-card';
import { MonthlyComparisonSummary } from '@/components/reports/monthly-comparison-summary';
import { useAppData } from '@/contexts/app-data-context';
import { format, startOfMonth, subMonths, parse as parseDateFns, parseISO, isValid as dateFnsIsValid, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Scale, ListTree, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  const { transactions: allTransactions, budgets, dataLoading, formatUserCurrency } = useAppData();
  
  const currentMonthDate = new Date();
  const currentMonthYYYYMM = format(startOfMonth(currentMonthDate), 'yyyy-MM');
  const lastMonthYYYYMM = format(startOfMonth(subMonths(currentMonthDate, 1)), 'yyyy-MM');
  
  const [selectedMonthForCharts, setSelectedMonthForCharts] = useState(currentMonthYYYYMM);
  const [comparisonMonth1, setComparisonMonth1] = useState(currentMonthYYYYMM);
  const [comparisonMonth2, setComparisonMonth2] = useState(lastMonthYYYYMM);

  const safeTransactions = Array.isArray(allTransactions) ? allTransactions : [];
  
  const transactionsForSelectedMonthCharts = safeTransactions.filter(t => t.date.startsWith(selectedMonthForCharts));
  const expensesForSelectedMonthCharts = transactionsForSelectedMonthCharts.filter(t => t.type === 'expense');
  const incomeForSelectedMonthCharts = transactionsForSelectedMonthCharts.filter(t => t.type === 'income');

  const totalExpensesSelectedMonth = expensesForSelectedMonthCharts.reduce((sum, t) => sum + t.amount, 0);
  const totalIncomeSelectedMonth = incomeForSelectedMonthCharts.reduce((sum, t) => sum + t.amount, 0);
  const monthlyBalanceSelectedMonth = totalIncomeSelectedMonth - totalExpensesSelectedMonth;
  const totalTransactionsSelectedMonth = transactionsForSelectedMonthCharts.filter(t => t.type === 'expense' || t.type === 'income').length; 
  
  const formatMonthForDisplay = (monthString: string) => {
    if (!monthString || !dateFnsIsValid(parseISO(`${monthString}-01`))) return "Mes Inválido";
    return format(parseDateFns(monthString, 'yyyy-MM', new Date()), "MMMM", { locale: es });
  };
  
  const formatMonthYearForDisplay = (monthString: string) => {
     if (!monthString || !dateFnsIsValid(parseISO(`${monthString}-01`))) return "Mes Inválido";
    return format(parseDateFns(monthString, 'yyyy-MM', new Date()), "MMMM yyyy", { locale: es });
  };

  const availableMonthsForComparison = useMemo(() => {
    if (dataLoading) return [];
    const months = new Set<string>();
    safeTransactions.forEach(t => {
        if (t.date) {
            months.add(t.date.substring(0, 7)); // YYYY-MM
        }
    });
    budgets.forEach(b => {
        if(b.month) {
            months.add(b.month);
        }
    });

    // Add current and last month if not present
    months.add(currentMonthYYYYMM);
    months.add(lastMonthYYYYMM);
    
    // Add several past and future months for broader selection
    for(let i=1; i<=12; i++) {
        months.add(format(subMonths(currentMonthDate, i), 'yyyy-MM'));
    }
     for(let i=1; i<=3; i++) { // A few future months for budgeting ahead
        months.add(format(startOfMonth(addMonths(currentMonthDate, i)), 'yyyy-MM'));
    }


    return Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // Sort descending (most recent first)
      .map(month => ({
        value: month,
        label: formatMonthYearForDisplay(month),
      }));
  }, [safeTransactions, budgets, dataLoading, currentMonthYYYYMM, lastMonthYYYYMM, currentMonthDate]);

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reportes"
          description="Visualiza tus hábitos de gasto y el rendimiento de tu presupuesto."
        />
        <div className="grid gap-2 grid-cols-1 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[100px] w-full" />
          <Skeleton className="h-[100px] w-full" />
        </div>
        <Skeleton className="h-[80px] w-full" /> {/* Skeleton for month selectors */}
        <Skeleton className="h-[400px] w-full" /> {/* Skeleton for MonthlyComparisonSummary */}
        <Tabs defaultValue={currentMonthYYYYMM} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
            <TabsTrigger value={currentMonthYYYYMM}>Este Mes ({formatMonthForDisplay(currentMonthYYYYMM)})</TabsTrigger>
            <TabsTrigger value={lastMonthYYYYMM}>Mes Pasado ({formatMonthForDisplay(lastMonthYYYYMM)})</TabsTrigger>
          </TabsList>
          <TabsContent value={currentMonthYYYYMM} className="mt-0">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Skeleton className="h-[350px] w-full" />
              <Skeleton className="h-[350px] w-full" />
              <Skeleton className="h-[350px] w-full" />
              <Skeleton className="h-[350px] w-full" />
            </div>
          </TabsContent>
        </Tabs>
        <Skeleton className="h-[350px] w-full md:col-span-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Visualiza tus hábitos de gasto y el rendimiento de tu presupuesto."
      />

      <div className="grid gap-2 grid-cols-1 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={`Ingresos (${formatMonthForDisplay(selectedMonthForCharts)})`}
          value={formatUserCurrency(totalIncomeSelectedMonth)}
          icon={TrendingUp}
          iconColor="text-green-500"
        />
        <SummaryCard
          title={`Gastos (${formatMonthForDisplay(selectedMonthForCharts)})`}
          value={formatUserCurrency(totalExpensesSelectedMonth)}
          icon={TrendingDown}
          iconColor="text-red-500"
        />
        <SummaryCard
          title={`Balance (${formatMonthForDisplay(selectedMonthForCharts)})`}
          value={formatUserCurrency(monthlyBalanceSelectedMonth)}
          icon={Scale}
          iconColor={monthlyBalanceSelectedMonth >= 0 ? "text-green-500" : "text-red-500"}
        />
        <SummaryCard
          title={`Transacciones (${formatMonthForDisplay(selectedMonthForCharts)})`}
          value={String(totalTransactionsSelectedMonth)}
          icon={ListTree}
        />
      </div>
      
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-primary"/> Selección de Períodos para Comparación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full sm:w-auto">
                <Label htmlFor="comparisonMonth1">Mes 1 (Principal)</Label>
                <Select value={comparisonMonth1} onValueChange={setComparisonMonth1}>
                    <SelectTrigger id="comparisonMonth1">
                        <SelectValue placeholder="Seleccionar Mes 1" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableMonthsForComparison.map(month => (
                            <SelectItem key={`m1-${month.value}`} value={month.value}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex-1 w-full sm:w-auto">
                <Label htmlFor="comparisonMonth2">Mes 2 (Comparar con)</Label>
                <Select value={comparisonMonth2} onValueChange={setComparisonMonth2}>
                    <SelectTrigger id="comparisonMonth2">
                        <SelectValue placeholder="Seleccionar Mes 2" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableMonthsForComparison.map(month => (
                            <SelectItem key={`m2-${month.value}`} value={month.value}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>

      <MonthlyComparisonSummary 
        allTransactions={safeTransactions} 
        allBudgets={budgets} 
        month1={comparisonMonth1}
        month2={comparisonMonth2}
      />
      
      <Tabs defaultValue={currentMonthYYYYMM} onValueChange={setSelectedMonthForCharts} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px] mb-4">
          <TabsTrigger value={currentMonthYYYYMM}>Gráficos de Este Mes ({formatMonthForDisplay(currentMonthYYYYMM)})</TabsTrigger>
          <TabsTrigger value={lastMonthYYYYMM}>Gráficos Mes Pasado ({formatMonthForDisplay(lastMonthYYYYMM)})</TabsTrigger>
        </TabsList>
        <TabsContent value={selectedMonthForCharts} className="mt-0">
           <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SpendingPieChart transactions={expensesForSelectedMonthCharts} title={`Distribución de Gastos - ${formatMonthYearForDisplay(selectedMonthForCharts)}`} />
            <IncomeByCategoryPieChart transactions={incomeForSelectedMonthCharts} title={`Distribución de Ingresos - ${formatMonthYearForDisplay(selectedMonthForCharts)}`} />
            <BudgetComparisonChart budgets={budgets} transactions={transactionsForSelectedMonthCharts} month={selectedMonthForCharts} />
            <SpendingByPayeeChart transactions={expensesForSelectedMonthCharts} title={`Principales Beneficiarios - ${formatMonthYearForDisplay(selectedMonthForCharts)}`} />
          </div>
        </TabsContent>
      </Tabs>

      <IncomeExpenseTrendChart transactions={safeTransactions} />
    </div>
  );
}

