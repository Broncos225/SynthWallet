
"use client";

import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppData } from '@/contexts/app-data-context';
import { useToast } from '@/hooks/use-toast';
import { exportTransactionsToCSV } from '@/lib/csv-utils';
import type { Transaction, TransactionType } from '@/types';
import { parseISO, isValid as dateIsValid } from 'date-fns'; 
import { DEFAULT_CATEGORY_ID, DEFAULT_ACCOUNT_ID } from '@/lib/constants';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, Download, AlertTriangle, Upload } from "lucide-react"; 

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        currentField += '"'; 
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }
  result.push(currentField); 
  return result.map(field => field.trim());
}

export function DataImportExport() {
  const {
    transactions,
    addTransaction,
    getCategoryName,
    getAccountName,
    getSavingGoalName,
    getCategoryByName,
    getAccountByName,
    getSavingGoalByName
  } = useAppData();
  const { toast } = useToast();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setCsvFile(event.target.files[0]);
      setImportErrors([]);
    } else {
      setCsvFile(null);
    }
  };

  const handleExport = () => {
    exportTransactionsToCSV(transactions, getCategoryName, getAccountName, getSavingGoalName);
    toast({ title: "Exportación Iniciada", description: "Se está generando el archivo CSV." });
  };

  const handleImport = async () => {
    if (!csvFile) {
      toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo CSV." });
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const csvContent = event.target?.result as string;
      if (!csvContent) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo leer el archivo." });
        setIsImporting(false);
        return;
      }

      const lines = csvContent.split(/\r\n|\n/).filter(line => line.trim() !== '');
      if (lines.length <= 1) {
        toast({ variant: "destructive", title: "Error", description: "El archivo CSV está vacío o no contiene datos." });
        setIsImporting(false);
        return;
      }

      const headers = parseCSVLine(lines[0]);
      const expectedHeaders = ['Fecha','Tipo','Descripción','Categoría','Cuenta','Desde Cuenta','A Cuenta','Beneficiario/Pagador','Monto','Objetivo de Ahorro', 'Imagen URL', 'Notas', 'ID Transacción Deuda Relacionada', 'ID Transacción'];
      // Check only the first N headers we care about for import
      const headersToValidate = expectedHeaders.slice(0, 12);


      if(!headersToValidate.every((h, i) => headers[i]?.trim().toLowerCase() === h.toLowerCase())) {
        setImportErrors(prev => [...prev, `Encabezados CSV inválidos. Esperado (primeros 12): ${headersToValidate.join(', ')}. Encontrado: ${headers.slice(0,12).join(', ')}`]);
        setIsImporting(false);
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const localImportErrors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        // Allow more fields than expected for flexibility, but require at least the ones we process
        if (fields.length < headersToValidate.length) { 
          localImportErrors.push(`Fila ${i + 1}: Número incorrecto de campos. Se esperaban al menos ${headersToValidate.length}, se encontraron ${fields.length}.`);
          errorCount++;
          continue;
        }

        const [
          dateStr, typeStr, description, categoryName, accountName,
          fromAccountName, toAccountName, payee, amountStr, savingGoalNameStr,
          imageUrlStr, notesStr 
        ] = fields;

        const date = parseISO(dateStr);
        if (!dateIsValid(date)) {
          localImportErrors.push(`Fila ${i + 1}: Fecha inválida "${dateStr}". Formato esperado YYYY-MM-DD.`);
          errorCount++;
          continue;
        }

        const type = typeStr.toLowerCase() as TransactionType;
        if (!['expense', 'income', 'transfer'].includes(type)) {
          localImportErrors.push(`Fila ${i + 1}: Tipo de transacción inválido "${typeStr}". Debe ser 'expense', 'income', o 'transfer'.`);
          errorCount++;
          continue;
        }

        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
          localImportErrors.push(`Fila ${i + 1}: Monto inválido "${amountStr}". Debe ser un número positivo.`);
          errorCount++;
          continue;
        }

        let categoryId: string | undefined | null = null;
        if (type === 'expense' || type === 'income') {
            const foundCategory = getCategoryByName(categoryName);
            categoryId = foundCategory ? foundCategory.id : (type === 'income' ? 'income' : DEFAULT_CATEGORY_ID);
        }

        let accId: string | undefined | null = null;
        let fromAccId: string | undefined | null = null;
        let toAccId: string | undefined | null = null;

        if (type === 'transfer') {
            const foundFromAccount = getAccountByName(fromAccountName);
            fromAccId = foundFromAccount ? foundFromAccount.id : DEFAULT_ACCOUNT_ID;
            const foundToAccount = getAccountByName(toAccountName);
            toAccId = foundToAccount ? foundToAccount.id : DEFAULT_ACCOUNT_ID;
            if (fromAccId === toAccId) {
                 localImportErrors.push(`Fila ${i + 1}: En transferencias, la cuenta de origen y destino no pueden ser la misma "${fromAccountName}".`);
                 errorCount++;
                 continue;
            }
        } else {
            const foundAccount = getAccountByName(accountName);
            accId = foundAccount ? foundAccount.id : DEFAULT_ACCOUNT_ID;
        }

        const savingGoal = savingGoalNameStr ? getSavingGoalByName(savingGoalNameStr) : undefined;

        try {
          await addTransaction({
            date,
            type,
            description,
            amount,
            categoryId: categoryId,
            accountId: accId,
            fromAccountId: fromAccId,
            toAccountId: toAccId,
            payee: payee || null,
            savingGoalId: savingGoal?.id || null,
            imageUrl: imageUrlStr || null,
            notes: notesStr || null,
          });
          successCount++;
        } catch (e: any) {
          localImportErrors.push(`Fila ${i + 1}: Error al guardar - ${e.message || 'Error desconocido'}. Datos: ${fields.join('|')}`);
          errorCount++;
        }
      }
      setImportErrors(localImportErrors);
      toast({
        title: "Importación Completada",
        description: `${successCount} transacciones importadas. ${errorCount > 0 ? `${errorCount} filas con errores.` : ''}`,
        duration: errorCount > 0 ? 10000 : 5000,
      });
      setIsImporting(false);
      setCsvFile(null);
      const fileInput = document.getElementById('csvFile') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    };

    reader.onerror = () => {
      toast({ variant: "destructive", title: "Error", description: "Error al leer el archivo." });
      setIsImporting(false);
    };

    reader.readAsText(csvFile);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><UploadCloud className="mr-2 h-5 w-5 text-primary" /> Importar Transacciones desde CSV</CardTitle>
          <CardDescription>
            Sube un archivo CSV para importar transacciones. Asegúrate de que el archivo siga el formato de exportación:
            <br />
            <code className="text-xs bg-muted p-1 rounded">Fecha,Tipo,Descripción,Categoría,Cuenta,Desde Cuenta,A Cuenta,Beneficiario/Pagador,Monto,Objetivo de Ahorro,Imagen URL,Notas,...</code>
            <br/>
            Las categorías, cuentas y objetivos de ahorro se buscarán por nombre. Si no se encuentran, se usarán valores predeterminados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csvFile">Archivo CSV</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <Button onClick={handleImport} disabled={isImporting || !csvFile} className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" /> {isImporting ? "Importando..." : "Importar Transacciones"}
          </Button>
          {importErrors.length > 0 && (
             <Alert variant="destructive" className="mt-4 max-h-60 overflow-y-auto">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errores Durante la Importación</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index} className="text-xs">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Download className="mr-2 h-5 w-5 text-primary" />Exportar Transacciones a CSV</CardTitle>
          <CardDescription>
            Descarga todas tus transacciones en un archivo CSV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} className="w-full sm:w-auto">
            Exportar Todas las Transacciones
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    