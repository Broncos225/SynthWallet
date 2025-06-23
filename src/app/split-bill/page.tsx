
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle, Users, DivideCircle, Info, PercentIcon, Copy } from 'lucide-react';
import { useCurrencyInput } from '@/hooks/use-currency-input';
import { useAppData } from '@/contexts/app-data-context';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  name: string;
  amountPaid: number;
  percentageToPay?: number; // Percentage of the total bill this participant is responsible for
}

interface DebtSettlement {
  from: string;
  to: string;
  amount: number;
}

interface IndividualContribution {
    name: string;
    paid: number;
    shouldPay: number;
    balance: number;
}

export default function SplitBillPage() {
  const { formatUserCurrency } = useAppData();
  const { toast } = useToast();
  const [totalBillAmount, setTotalBillAmount] = useState<number | undefined>(undefined);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [settlements, setSettlements] = useState<DebtSettlement[]>([]);
  const [costPerPersonSummary, setCostPerPersonSummary] = useState<IndividualContribution[]>([]);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const { inputProps: totalBillInputProps } = useCurrencyInput({
    initialValue: totalBillAmount,
    onChangeRHF: (value) => setTotalBillAmount(value),
  });

  const addParticipant = () => {
    if (newParticipantName.trim() === '') return;
    setParticipants([
      ...participants,
      { id: crypto.randomUUID(), name: newParticipantName.trim(), amountPaid: 0, percentageToPay: undefined },
    ]);
    setNewParticipantName('');
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  const updateParticipantName = (id: string, name: string) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  const updateParticipantAmountPaid = (id: string, amount: number | undefined) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, amountPaid: amount || 0 } : p))
    );
  };

  const updateParticipantPercentage = (id: string, percentage?: number) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, percentageToPay: percentage } : p))
    );
  };

  const calculateDebts = () => {
    setCalculationError(null);
    setSettlements([]);
    setCostPerPersonSummary([]);

    if (totalBillAmount === undefined || totalBillAmount <= 0) {
      setCalculationError("Por favor, ingresa un monto total de gasto válido y positivo.");
      return;
    }
    if (participants.length === 0) {
      setCalculationError("Por favor, añade al menos un participante.");
      return;
    }
    if (participants.some(p => p.name.trim() === '')) {
      setCalculationError("Todos los participantes deben tener un nombre.");
      return;
    }

    let totalPercentageAssigned = 0;
    let amountCoveredByPercentage = 0;
    const participantsWithPercentage = participants.filter(p => p.percentageToPay !== undefined && p.percentageToPay > 0);
    const participantsWithoutPercentage = participants.filter(p => p.percentageToPay === undefined || p.percentageToPay <= 0);

    for (const p of participantsWithPercentage) {
        totalPercentageAssigned += p.percentageToPay!;
        amountCoveredByPercentage += (p.percentageToPay! / 100) * totalBillAmount;
    }

    if (totalPercentageAssigned > 100.01) { // Allow small tolerance for floating point sum
        setCalculationError(`La suma de porcentajes asignados (${totalPercentageAssigned.toFixed(2)}%) excede el 100%. Por favor, ajusta los porcentajes.`);
        return;
    }
    if (amountCoveredByPercentage > totalBillAmount + 0.01) { 
        setCalculationError(`El monto cubierto por porcentajes (${formatUserCurrency(amountCoveredByPercentage)}) excede el total del gasto (${formatUserCurrency(totalBillAmount)}). Por favor, ajusta los porcentajes.`);
        return;
    }
    if (Math.abs(totalPercentageAssigned - 100) < 0.01 && participantsWithoutPercentage.length > 0 && (totalBillAmount - amountCoveredByPercentage > 0.01) ) {
        setCalculationError("Si la suma de porcentajes es 100%, no debe haber participantes sin porcentaje asignado si aún queda monto por cubrir.");
        return;
    }


    const remainingAmountToSplit = totalBillAmount - amountCoveredByPercentage;
    const numParticipantsForEqualSplit = participantsWithoutPercentage.length;
    
    let equalShareOfRemainder = 0;
    if (numParticipantsForEqualSplit > 0 && remainingAmountToSplit > 0) {
        equalShareOfRemainder = remainingAmountToSplit / numParticipantsForEqualSplit;
    } else if (numParticipantsForEqualSplit === 0 && remainingAmountToSplit > 0.01) {
        setCalculationError(`Queda un monto de ${formatUserCurrency(remainingAmountToSplit)} por cubrir, pero no hay participantes para dividirlo equitativamente. Asigna porcentajes que sumen 100% o añade participantes sin porcentaje.`);
        return;
    }


    const individualContributions: IndividualContribution[] = participants.map(p => {
        let shouldPayAmount = 0;
        if (p.percentageToPay !== undefined && p.percentageToPay > 0) {
            shouldPayAmount = (p.percentageToPay / 100) * totalBillAmount;
        } else if (numParticipantsForEqualSplit > 0 && remainingAmountToSplit > 0) { 
            shouldPayAmount = equalShareOfRemainder;
        } else if (numParticipantsForEqualSplit > 0 && remainingAmountToSplit <= 0 && totalPercentageAssigned < 100) { 
             shouldPayAmount = 0; 
        }


        return {
            name: p.name,
            paid: p.amountPaid,
            shouldPay: shouldPayAmount,
            balance: p.amountPaid - shouldPayAmount,
        };
    });

    setCostPerPersonSummary(individualContributions);

    const debtors = individualContributions.filter((p) => p.balance < -0.001).sort((a, b) => a.balance - b.balance);
    const creditors = individualContributions.filter((p) => p.balance > 0.001).sort((a, b) => b.balance - a.balance);

    const newSettlements: DebtSettlement[] = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amountToSettle = Math.min(Math.abs(debtor.balance), creditor.balance);

      if (amountToSettle > 0.001) {
        newSettlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: amountToSettle,
        });
        debtor.balance += amountToSettle;
        creditor.balance -= amountToSettle;
      }

      if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
      if (creditor.balance < 0.01) creditorIndex++;
    }
    setSettlements(newSettlements);
  };
  
  const totalPaidByParticipants = participants.reduce((sum, p) => sum + p.amountPaid, 0);
  const differenceFromTotalBill = totalBillAmount !== undefined ? totalPaidByParticipants - totalBillAmount : 0;

  const generateSummaryText = (): string => {
    if (!totalBillAmount || costPerPersonSummary.length === 0) return "No hay datos para generar el resumen.";

    let summary = "Resumen de División de Gastos\n";
    summary += "=============================\n";
    summary += `Monto Total del Gasto: ${formatUserCurrency(totalBillAmount)}\n\n`;

    summary += "Participantes:\n";
    summary += "-----------------------------\n";
    costPerPersonSummary.forEach(item => {
      const originalParticipant = participants.find(p => p.name === item.name);
      summary += `- ${item.name}:\n`;
      summary += `  Pagó: ${formatUserCurrency(item.paid)}\n`;
      if (originalParticipant && originalParticipant.percentageToPay !== undefined && originalParticipant.percentageToPay > 0) {
        summary += `  % A Cubrir: ${originalParticipant.percentageToPay.toFixed(2)}%\n`;
      } else {
        summary += `  % A Cubrir: N/A (División equitativa del resto)\n`;
      }
      summary += `  Debería Pagar: ${formatUserCurrency(item.shouldPay)}\n`;
      let balanceText = `${formatUserCurrency(item.balance)}`;
      if (item.balance < -0.001) balanceText += ` (Debe ${formatUserCurrency(Math.abs(item.balance))})`;
      else if (item.balance > 0.001) balanceText += ` (A favor ${formatUserCurrency(item.balance)})`;
      else balanceText += ` (Saldado)`;
      summary += `  Balance: ${balanceText}\n`;
      summary += "-----------------------------\n";
    });

    summary += "\nAjustes para Saldar Cuentas:\n";
    summary += "-----------------------------\n";
    if (settlements.length > 0) {
      settlements.forEach(settlement => {
        summary += `- ${settlement.from} le debe a ${settlement.to}: ${formatUserCurrency(settlement.amount)}\n`;
      });
    } else {
      summary += "¡Todas las cuentas están saldadas o no se requieren pagos adicionales!\n";
    }
    summary += "=============================";
    return summary;
  };

  const handleCopySummary = async () => {
    const summaryText = generateSummaryText();
    try {
      await navigator.clipboard.writeText(summaryText);
      toast({
        title: "¡Resumen Copiado!",
        description: "El resumen de la división de gastos ha sido copiado al portapapeles.",
      });
    } catch (err) {
      console.error('Error al copiar el texto: ', err);
      toast({
        variant: "destructive",
        title: "Error al Copiar",
        description: "No se pudo copiar el resumen al portapapeles.",
      });
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Dividir Gastos"
        description="Calcula fácilmente cómo dividir una cuenta entre varias personas, con opción de porcentajes."
      />

      <div className="grid grid-cols-1 gap-6 items-start">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>1. Configuración del Gasto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="totalBillAmount">Monto Total del Gasto</Label>
              <Input
                id="totalBillAmount"
                {...totalBillInputProps}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" /> 2. Participantes</CardTitle>
             <CardDescription>Añade quiénes participaron, cuánto pagó cada uno y, opcionalmente, el % del total que deben cubrir.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Nombre del nuevo participante"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                onKeyPress={(e) => { if (e.key === 'Enter') addParticipant(); }}
              />
              <Button onClick={addParticipant} variant="outline" size="icon">
                <PlusCircle className="h-5 w-5" />
                <span className="sr-only">Añadir participante</span>
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[50vh] pr-1">
              {participants.length > 0 && (
                  <div className={cn("space-y-3", participants.length > 3 && "border-t pt-3 mt-3")}>
                    {participants.map((participant, index) => (
                        <ParticipantInputRow
                        key={participant.id}
                        participant={participant}
                        onNameChange={(name) => updateParticipantName(participant.id, name)}
                        onAmountChange={(amount) => updateParticipantAmountPaid(participant.id, amount)}
                        onPercentageChange={(percentage) => updateParticipantPercentage(participant.id, percentage)}
                        onRemove={() => removeParticipant(participant.id)}
                        index={index}
                        />
                    ))}
                  </div>
              )}
            </div>
            {participants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aún no hay participantes. Añade algunos para empezar.</p>
            )}
          </CardContent>
           <CardFooter className="border-t pt-4">
                <div className="w-full text-sm text-muted-foreground">
                    <p>Total pagado por participantes: <span className="font-semibold text-foreground">{formatUserCurrency(totalPaidByParticipants)}</span></p>
                    {totalBillAmount !== undefined && (
                        <p className={cn("mt-1", differenceFromTotalBill !== 0 && Math.abs(differenceFromTotalBill) > 0.01 ? "text-orange-600 font-medium" : "text-green-600")}>
                            Diferencia con el total del gasto: {formatUserCurrency(differenceFromTotalBill)}
                            {differenceFromTotalBill !== 0 && Math.abs(differenceFromTotalBill) > 0.01 && <span className="text-xs italic"> (Esto afectará los cálculos de deuda)</span>}
                        </p>
                    )}
                </div>
           </CardFooter>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button onClick={calculateDebts} size="lg" className="text-base px-8 py-6">
          <DivideCircle className="mr-2 h-5 w-5" />
          Dividir la Cuenta y Calcular Deudas
        </Button>
      </div>

      {(calculationError || settlements.length > 0 || costPerPersonSummary.length > 0) && (
        <Card className="shadow-xl mt-6">
          <CardHeader>
            <CardTitle>3. Resultados de la División</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {calculationError && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error en el Cálculo</AlertTitle>
                <AlertDescription>{calculationError}</AlertDescription>
              </Alert>
            )}
            
            {!calculationError && costPerPersonSummary.length > 0 && (
              <div className="space-y-3">
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Resumen de Aportes y Deudas Individuales</AlertTitle>
                    <AlertDescription>
                        Esta tabla muestra cuánto pagó cada persona, cuánto debería haber pagado y su balance.
                    </AlertDescription>
                </Alert>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Participante</TableHead>
                            <TableHead className="text-right">Pagó</TableHead>
                            <TableHead className="text-right">Debería Pagar</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {costPerPersonSummary.map((summary, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{summary.name}</TableCell>
                                <TableCell className="text-right">{formatUserCurrency(summary.paid)}</TableCell>
                                <TableCell className="text-right">{formatUserCurrency(summary.shouldPay)}</TableCell>
                                <TableCell className={cn("text-right font-semibold", summary.balance < 0 ? "text-red-600" : (summary.balance > 0 ? "text-green-600" : ""))}>
                                    {formatUserCurrency(summary.balance)}
                                    {summary.balance < -0.001 && " (Debe)"}
                                    {summary.balance > 0.001 && " (A Favor)"}
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
              </div>
            )}

            {!calculationError && settlements.length > 0 && (
              <div>
                <h3 className="text-md font-semibold mb-2 text-primary mt-4">Transacciones para Saldar Cuentas:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {settlements.map((debt, index) => (
                    <li key={index} className="text-sm">
                      <strong>{debt.from}</strong> le debe a <strong>{debt.to}</strong> la cantidad de <strong className="text-primary">{formatUserCurrency(debt.amount)}</strong>.
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!calculationError && settlements.length === 0 && costPerPersonSummary.length > 0 && (
              <p className="text-sm text-green-600 font-medium text-center py-3">¡Todas las cuentas están saldadas o no se requieren pagos adicionales entre participantes!</p>
            )}
          </CardContent>
          {!calculationError && costPerPersonSummary.length > 0 && (
            <CardFooter className="border-t pt-4 flex justify-end">
                <Button onClick={handleCopySummary} variant="outline">
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Resumen
                </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}


interface ParticipantInputRowProps {
  participant: Participant;
  onNameChange: (name: string) => void;
  onAmountChange: (amount: number | undefined) => void;
  onPercentageChange: (percentage?: number) => void;
  onRemove: () => void;
  index: number;
}

function ParticipantInputRow({ participant, onNameChange, onAmountChange, onPercentageChange, onRemove, index }: ParticipantInputRowProps) {
  const { inputProps: amountPaidInputProps } = useCurrencyInput({
    initialValue: participant.amountPaid,
    onChangeRHF: onAmountChange,
  });

  const handlePercentageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
        onPercentageChange(undefined);
        return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        onPercentageChange(numValue);
    } else if (isNaN(numValue) && value.trim() !== "") {
        // Allow typing, but don't update state if invalid partial input (e.g. "abc")
    } else if (numValue < 0) {
        onPercentageChange(0);
    } else if (numValue > 100) {
        onPercentageChange(100);
    }
  };


  return (
    <div className="flex flex-wrap items-end gap-2 p-3 border rounded-md bg-card hover:shadow-sm">
      <div className="flex-grow space-y-1 min-w-[150px]">
        <Label htmlFor={`participantName-${participant.id}`} className="text-xs">Participante #{index + 1}</Label>
        <Input
          id={`participantName-${participant.id}`}
          type="text"
          placeholder="Nombre"
          value={participant.name}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-9 text-sm"
        />
      </div>
      <div className="w-32 space-y-1">
        <Label htmlFor={`participantAmount-${participant.id}`} className="text-xs">Pagó</Label>
        <Input
          id={`participantAmount-${participant.id}`}
          {...amountPaidInputProps}
          className="h-9 text-sm"
        />
      </div>
      <div className="w-28 space-y-1">
        <Label htmlFor={`participantPercentage-${participant.id}`} className="text-xs">Porcentaje (%)</Label>
        <div className="flex items-center">
            <Input
            id={`participantPercentage-${participant.id}`}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="Ej: 20"
            value={participant.percentageToPay === undefined ? '' : participant.percentageToPay}
            onChange={handlePercentageInputChange}
            className="h-9 text-sm rounded-r-none"
            />
            <span className="flex h-9 items-center justify-center rounded-r-md border border-l-0 border-input bg-muted px-2 text-sm text-muted-foreground">
                <PercentIcon className="h-4 w-4" />
            </span>
        </div>
      </div>
      <Button onClick={onRemove} variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive flex-shrink-0">
        <Trash2 className="h-4 w-4" />
         <span className="sr-only">Eliminar {participant.name}</span>
      </Button>
    </div>
  );
}
    
