
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { useAppData } from '@/contexts/app-data-context';
import type { TransactionType, Transaction } from '@/types';
import { Plus, X as CloseIcon, TrendingDown, TrendingUp, ArrowRightLeft, Mic } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { extractTransactionDetails } from '@/ai/flows/extractTransactionDetails';

export function TransactionFAB() {
  const {
    transactionToPrefill,
    setTransactionToPrefill,
  } = useAppData();
  const { toast } = useToast();

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [transactionTypeForModal, setTransactionTypeForModal] = useState<TransactionType | undefined>(undefined);
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (transactionToPrefill) {
      console.log("TransactionFAB: useEffect detected transactionToPrefill:", transactionToPrefill);
      setTransactionTypeForModal(transactionToPrefill.type);
      setIsTransactionFormOpen(true);
    }
  }, [transactionToPrefill]);

  const handleFabOptionClick = (type: TransactionType) => {
    console.log("TransactionFAB: FAB option clicked for type:", type);
    setTransactionTypeForModal(type);
    setIsTransactionFormOpen(true);
    setIsFabMenuOpen(false);
  };
  
  const handleVoiceInput = () => {
    setIsFabMenuOpen(false);
    
    // @ts-ignore - webkitSpeechRecognition might not be in the default window type
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "Navegador no compatible", description: "Tu navegador no soporta el reconocimiento de voz." });
      return;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      toast({ title: "Escuchando...", description: "Habla ahora para registrar tu transacción.", duration: 5000 });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      toast({ variant: "destructive", title: "Error de voz", description: `Ocurrió un error: ${event.error}` });
      setIsListening(false);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      toast({ title: "Procesando...", description: `"${transcript}"` });
      try {
        const extractedData = await extractTransactionDetails(transcript);
        
        if (extractedData.errorReason) {
            toast({ variant: "destructive", title: "No se pudo extraer la transacción", description: `Razón: ${extractedData.errorReason}`, duration: 8000 });
        } else if (extractedData && (extractedData.amount || extractedData.description)) {
          setTransactionToPrefill({
            type: extractedData.type || 'expense', // Default to expense if not found
            description: extractedData.description,
            amount: extractedData.amount,
            date: new Date().toISOString(), // Set date to now
          });
        } else {
          toast({ variant: "destructive", title: "No se pudo entender", description: "La IA no devolvió detalles válidos. Inténtalo de nuevo con más detalles." });
        }
      } catch (error) {
        console.error("Error calling AI flow for voice input:", error);
        toast({ variant: "destructive", title: "Error de IA", description: "No se pudo procesar la solicitud." });
      }
    };

    recognition.start();
  };


  const handleTransactionFormSave = () => {
    setIsTransactionFormOpen(false);
    setTransactionTypeForModal(undefined);
    if (transactionToPrefill) {
      console.log("TransactionFAB: Clearing prefill data on transaction form save.");
      setTransactionToPrefill(null);
    }
  };

  const handleTransactionDialogClose = () => {
    setIsTransactionFormOpen(false);
    setTransactionTypeForModal(undefined);
    if (transactionToPrefill) {
      console.log("TransactionFAB: Clearing prefill data on transaction dialog close.");
      setTransactionToPrefill(null);
    }
  };

  const transactionDialogTitleText = 
    transactionTypeForModal === 'expense' ? "Añadir Nuevo Gasto" :
    transactionTypeForModal === 'income' ? "Añadir Nuevo Ingreso" :
    transactionTypeForModal === 'transfer' ? "Añadir Nueva Transferencia" : "Añadir Nueva Transacción";

  const transactionDialogDescriptionText = 
    transactionTypeForModal === 'expense' ? "Introduce los detalles de tu nuevo gasto." :
    transactionTypeForModal === 'income' ? "Introduce los detalles de tu nuevo ingreso." :
    transactionTypeForModal === 'transfer' ? "Introduce los detalles de tu nueva transferencia." :
    "Introduce los detalles de tu nueva transacción.";

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {isFabMenuOpen && (
          <div className="flex flex-col items-end gap-3 mb-2 transition-all duration-300 ease-in-out">
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full shadow-lg w-auto pl-4 pr-5 py-3 h-auto bg-background hover:bg-muted text-foreground"
              onClick={handleVoiceInput}
              aria-label="Añadir por voz"
              disabled={isListening}
            >
              <Mic className="mr-2 h-5 w-5 text-purple-500" />
              {isListening ? "Escuchando..." : "Voz"}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full shadow-lg w-auto pl-4 pr-5 py-3 h-auto bg-background hover:bg-muted text-foreground"
              onClick={() => handleFabOptionClick('transfer')}
              aria-label="Añadir nueva transferencia"
            >
              <ArrowRightLeft className="mr-2 h-5 w-5 text-blue-500" />
              Transferencia
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full shadow-lg w-auto pl-4 pr-5 py-3 h-auto bg-background hover:bg-muted text-foreground"
              onClick={() => handleFabOptionClick('income')}
              aria-label="Añadir nuevo ingreso"
            >
              <TrendingUp className="mr-2 h-5 w-5 text-green-500" />
              Ingreso
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="rounded-full shadow-lg w-auto pl-4 pr-5 py-3 h-auto bg-background hover:bg-muted text-foreground"
              onClick={() => handleFabOptionClick('expense')}
              aria-label="Añadir nuevo gasto"
            >
              <TrendingDown className="mr-2 h-5 w-5 text-red-500" />
              Gasto
            </Button>
          </div>
        )}
        <Button
          size="icon"
          className="rounded-full h-14 w-14 shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
          aria-label={isFabMenuOpen ? "Cerrar menú de acciones" : "Abrir menú de acciones"}
        >
          {isFabMenuOpen ? <CloseIcon className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
        </Button>
      </div>

      <Dialog open={isTransactionFormOpen} onOpenChange={(open) => {
        if (!open) handleTransactionDialogClose();
        else setIsTransactionFormOpen(true);
      }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col" aria-label={transactionDialogTitleText}>
          <DialogHeader>
            <DialogTitle>{transactionDialogTitleText}</DialogTitle>
            <DialogDescription>{transactionDialogDescriptionText}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
            <TransactionForm
              initialType={transactionTypeForModal}
              transactionToPrefill={transactionToPrefill || undefined}
              onSave={handleTransactionFormSave}
              dialogClose={handleTransactionDialogClose}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
