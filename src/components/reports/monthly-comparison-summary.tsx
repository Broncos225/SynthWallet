
"use client";

import type { Transaction, Budget, Category } from '@/types';
import { useAppData } from '@/contexts/app-data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, isValid as dateFnsIsValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Scale, ListTree, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MonthlyComparisonSummaryProps {
  allTransactions: Transaction[];
  allBudgets: Budget[];
  month1: string; // YYYY-MM format
  month2: string; // YYYY-MM format
}

interface MonthlyData {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  expensesByCategory: Record<string, number>;
}

export function MonthlyComparisonSummary({ allTransactions, allBudgets, month1, month2 }: MonthlyComparisonSummaryProps) {
  const { getParentCategories, getCategoryById, getCategoryName, formatUserCurrency } = useAppData();

  const calculateMonthlyData = (transactions: Transaction[], targetMonth: string): MonthlyData => {
    const monthTransactions = transactions.filter(t => t.date.startsWith(targetMonth));
    const parentCategories = getParentCategories();

    const data: MonthlyData = {
      totalExpenses: 0,
      totalIncome: 0,
      balance: 0,
      expensesByCategory: {},
    };

    parentCategories.forEach(pc => data.expensesByCategory[pc.id] = 0);
    data.expensesByCategory['uncategorized'] = 0;

    monthTransactions.forEach(t => {
      if (t.type === 'expense') {
        data.totalExpenses += t.amount;
        let parentCatId = t.categoryId ? getCategoryById(t.categoryId)?.parentId : null;
        if (!parentCatId && t.categoryId) parentCatId = t.categoryId;
        
        const validParentCat = parentCategories.find(pc => pc.id === parentCatId);
        if (validParentCat) {
          data.expensesByCategory[validParentCat.id] = (data.expensesByCategory[validParentCat.id] || 0) + t.amount;
        } else if (t.categoryId) {
          data.expensesByCategory['uncategorized'] = (data.expensesByCategory['uncategorized'] || 0) + t.amount;
        }

      } else if (t.type === 'income') {
        data.totalIncome += t.amount;
      }
    });
    data.balance = data.totalIncome - data.totalExpenses;
    return data;
  };

  const dataMonth1 = calculateMonthlyData(allTransactions, month1);
  const dataMonth2 = calculateMonthlyData(allTransactions, month2);

  const budgetsMonth1 = allBudgets.filter(b => b.month === month1);

  const formatMonthDisplay = (yyyyMm: string) => {
    if (!yyyyMm || !dateFnsIsValid(parseISO(`${yyyyMm}-01`))) return "Mes Inválido";
    return format(parseISO(`${yyyyMm}-01`), 'MMMM yyyy', { locale: es });
  };

  const calculatePercentageChange = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? Infinity : (current === 0 ? 0 : -Infinity);
    return ((current - previous) / previous) * 100;
  };

  const renderChange = (current: number, previous: number, isCurrency: boolean = true, invertColors: boolean = false) => {
    const diff = current - previous;
    const percentageChange = calculatePercentageChange(current, previous);
    const formattedDiff = isCurrency ? formatUserCurrency(Math.abs(diff)) : Math.abs(diff).toFixed(0);
    const formattedPercentage = isFinite(percentageChange ?? 0) ? Math.abs(percentageChange ?? 0).toFixed(0) + '%' : "N/A";

    let Icon = diff === 0 ? TrendingDown : diff > 0 ? ArrowUpRight : ArrowDownRight;
    let colorClass = 'text-muted-foreground';
    if (diff !== 0) {
      colorClass = diff > 0 ? (invertColors ? 'text-green-600' : 'text-red-600') : (invertColors ? 'text-red-600' : 'text-green-600');
    }
    if (percentageChange === Infinity) Icon = ArrowUpRight;
    if (percentageChange === -Infinity) Icon = ArrowDownRight;

    return (
      <span className={cn("text-xs flex items-center", colorClass)}>
        <Icon className="h-3 w-3 mr-0.5" />
        {diff !== 0 ? `${formattedDiff} (${formattedPercentage})` : 'Sin cambios'}
        {diff > 0 ? ' más' : (diff < 0 ? ' menos' : '')}
      </span>
    );
  };
  
  const budgetAnalysis = budgetsMonth1.map(budget => {
    const categoryName = getCategoryName(budget.categoryId);
    const spent = dataMonth1.expensesByCategory[budget.categoryId] || 0;
    return {
      id: budget.id,
      categoryName,
      budgeted: budget.amount,
      spent,
      difference: budget.amount - spent,
      isOverspent: spent > budget.amount,
      percentageSpent: budget.amount > 0 ? (spent / budget.amount) * 100 : (spent > 0 ? Infinity : 0),
    };
  });

  const overspentBudgets = budgetAnalysis.filter(b => b.isOverspent).sort((a,b) => b.difference - a.difference);
  const underspentBudgets = budgetAnalysis.filter(b => !b.isOverspent && b.difference > 0).sort((a,b) => b.difference - a.difference);

  const parentCategories = getParentCategories().filter(pc => pc.id !== 'income');

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Análisis Comparativo Mensual</CardTitle>
        <CardDescription>
          {formatMonthDisplay(month1)} vs. {formatMonthDisplay(month2)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold mb-2 flex items-center"><Scale className="mr-2 h-5 w-5 text-primary" />Resumen General</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 border rounded-md bg-card">
              <p className="text-sm font-medium text-muted-foreground">Gastos Totales ({formatMonthDisplay(month1)})</p>
              <p className="text-xl font-bold">{formatUserCurrency(dataMonth1.totalExpenses)}</p>
              {renderChange(dataMonth1.totalExpenses, dataMonth2.totalExpenses, true, false)}
            </div>
            <div className="p-3 border rounded-md bg-card">
              <p className="text-sm font-medium text-muted-foreground">Ingresos Totales ({formatMonthDisplay(month1)})</p>
              <p className="text-xl font-bold">{formatUserCurrency(dataMonth1.totalIncome)}</p>
              {renderChange(dataMonth1.totalIncome, dataMonth2.totalIncome, true, true)}
            </div>
            <div className="p-3 border rounded-md bg-card">
              <p className="text-sm font-medium text-muted-foreground">Balance Mensual ({formatMonthDisplay(month1)})</p>
              <p className={cn("text-xl font-bold", dataMonth1.balance >= 0 ? "text-green-600" : "text-red-600")}>{formatUserCurrency(dataMonth1.balance)}</p>
              {renderChange(dataMonth1.balance, dataMonth2.balance, true, dataMonth1.balance >= 0)}
            </div>
          </div>
        </section>

        <Separator />

        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center"><ListTree className="mr-2 h-5 w-5 text-primary" />Gastos por Categoría Principal ({formatMonthDisplay(month1)} vs {formatMonthDisplay(month2)})</h3>
          <div className="space-y-2">
            {parentCategories.map(category => {
              const currentSpent = dataMonth1.expensesByCategory[category.id] || 0;
              const previousSpent = dataMonth2.expensesByCategory[category.id] || 0;
              if (currentSpent === 0 && previousSpent === 0) return null;
              return (
                <div key={category.id} className="p-3 border rounded-md flex justify-between items-center bg-card">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-lg font-semibold">{formatUserCurrency(currentSpent)}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-muted-foreground">{formatMonthDisplay(month2)}: {formatUserCurrency(previousSpent)}</p>
                     {renderChange(currentSpent, previousSpent)}
                  </div>
                </div>
              );
            })}
            {(dataMonth1.expensesByCategory['uncategorized'] > 0 || dataMonth2.expensesByCategory['uncategorized'] > 0) && (
                 <div className="p-3 border rounded-md flex justify-between items-center bg-card">
                  <div>
                    <p className="font-medium">Sin Categoría</p>
                    <p className="text-lg font-semibold">{formatUserCurrency(dataMonth1.expensesByCategory['uncategorized'])}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-muted-foreground">{formatMonthDisplay(month2)}: {formatUserCurrency(dataMonth2.expensesByCategory['uncategorized'])}</p>
                     {renderChange(dataMonth1.expensesByCategory['uncategorized'], dataMonth2.expensesByCategory['uncategorized'])}
                  </div>
                </div>
            )}
          </div>
        </section>
        
        <Separator />

        <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center"><Info className="mr-2 h-5 w-5 text-primary" />Análisis de Presupuestos ({formatMonthDisplay(month1)})</h3>
            {budgetsMonth1.length === 0 ? (
                <p className="text-muted-foreground">No hay presupuestos definidos para {formatMonthDisplay(month1)}.</p>
            ) : (
                <>
                    {overspentBudgets.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-md font-semibold mb-2 flex items-center text-red-600"><AlertCircle className="mr-2 h-4 w-4"/>Presupuestos Excedidos</h4>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                        {overspentBudgets.map(b => (
                            <li key={b.id} className="text-sm">
                            <strong>{b.categoryName}:</strong> Gastado {formatUserCurrency(b.spent)} de {formatUserCurrency(b.budgeted)}
                            <Badge variant="destructive" className="ml-2">Excedido por {formatUserCurrency(Math.abs(b.difference))}</Badge>
                            </li>
                        ))}
                        </ul>
                    </div>
                    )}

                    {underspentBudgets.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-md font-semibold mb-2 flex items-center text-green-600"><CheckCircle2 className="mr-2 h-4 w-4"/>Presupuestos con Sobrante</h4>
                         <ul className="list-disc list-inside space-y-1 pl-2">
                        {underspentBudgets.slice(0,3).map(b => (
                            <li key={b.id} className="text-sm">
                            <strong>{b.categoryName}:</strong> Gastado {formatUserCurrency(b.spent)} de {formatUserCurrency(b.budgeted)}
                            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 border-green-300">Sobrante de {formatUserCurrency(b.difference)}</Badge>
                            </li>
                        ))}
                        </ul>
                    </div>
                    )}
                    
                    {overspentBudgets.length === 0 && underspentBudgets.length > 0 && (
                        <p className="text-green-600 flex items-center text-sm"><CheckCircle2 className="mr-2 h-4 w-4"/>¡Excelente! Todos tus presupuestos están bajo control o con sobrante para {formatMonthDisplay(month1)}.</p>
                    )}
                     {overspentBudgets.length === 0 && underspentBudgets.length === 0 && (
                        <p className="text-muted-foreground text-sm">No hay datos significativos de cumplimiento de presupuestos para {formatMonthDisplay(month1)}.</p>
                    )}
                </>
            )}
        </section>
      </CardContent>
    </Card>
  );
}
