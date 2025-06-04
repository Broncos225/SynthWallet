
import type { Transaction } from '@/types';
import { format, parseISO } from 'date-fns';

function escapeCSVField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  getCategoryName: (categoryId: string | null | undefined) => string,
  getAccountName: (accountId: string | null | undefined) => string,
  getSavingGoalName: (goalId: string | null | undefined) => string
): void {
  if (!transactions || transactions.length === 0) {
    alert('No hay transacciones para exportar.');
    return;
  }

  const headers = [
    'Fecha', 'Tipo', 'Descripción', 'Categoría', 'Cuenta', 
    'Desde Cuenta', 'A Cuenta', 'Beneficiario/Pagador', 'Monto', 
    'Objetivo de Ahorro', 'Imagen URL', 'Notas', 
    'ID Transacción Deuda Relacionada', 'ID Transacción'
  ];

  const csvRows = [headers.join(',')];

  transactions.forEach(t => {
    const row = [
      format(parseISO(t.date), 'yyyy-MM-dd'),
      escapeCSVField(t.type),
      escapeCSVField(t.description),
      escapeCSVField(getCategoryName(t.categoryId)),
      escapeCSVField(t.type === 'transfer' ? '' : getAccountName(t.accountId)),
      escapeCSVField(t.type === 'transfer' ? getAccountName(t.fromAccountId) : ''),
      escapeCSVField(t.type === 'transfer' ? getAccountName(t.toAccountId) : ''),
      escapeCSVField(t.payee),
      t.amount.toFixed(2), 
      escapeCSVField(getSavingGoalName(t.savingGoalId)),
      escapeCSVField(t.imageUrl),
      escapeCSVField(t.notes),
      escapeCSVField(t.relatedDebtTransactionId),
      escapeCSVField(t.id)
    ];
    csvRows.push(row.join(','));
  });

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    link.setAttribute('href', url);
    link.setAttribute('download', `synthwallet_transacciones_${todayDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    alert('La exportación a CSV no es soportada por tu navegador.');
  }
}

    