'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TransactionDetailsInputSchema = z.object({
  query: z.string().describe('The natural language query from the user.'),
});
export type TransactionDetailsInput = z.infer<typeof TransactionDetailsInputSchema>;

const TransactionDetailsOutputSchema = z.object({
  type: z.enum(['expense', 'income', 'transfer'])
    .optional()
    .describe("The transaction type. Use 'expense' for spending money, 'income' for receiving money. Default to 'expense' if it is a purchase."),
  description: z.string()
    .optional()
    .describe("A short, clean description of the transaction, like 'lunch with friends' or 'monthly salary'."),
  amount: z.number()
    .optional()
    .describe("The transaction amount as a single number. Convert text like 'diez mil' to 10000. Remove currency symbols and separators."),
  confidence: z.number()
    .min(0).max(1)
    .optional()
    .describe("Your confidence from 0.0 to 1.0 that you extracted the information correctly."),
  errorReason: z.string()
    .optional()
    .describe("If no transaction can be extracted, provide a brief reason why (e.g., 'The text does not appear to be a financial transaction.')."),
});
export type TransactionDetailsOutput = z.infer<typeof TransactionDetailsOutputSchema>;

// Función mejorada para limpiar y normalizar el texto
function preprocessQuery(query: string): string {
  let processed = query
    .toLowerCase()
    .trim()
    // Limpiar espacios y caracteres extraños
    .replace(/\s+/g, ' ')
    // Convertir números separados por espacios o puntos
    .replace(/(\d+)[\s\.]+(\d{3})/g, '$1$2') // 100 000 -> 100000
    .replace(/(\d+)[\s\.]+(\d{3})[\s\.]+(\d{3})/g, '$1$2$3') // 1 000 000 -> 1000000
    // Corregir errores comunes de transcripción de voz
    .replace(/\b(oi|oy)\b/g, 'hoy')
    .replace(/\bcompre\b/g, 'compré')
    .replace(/\bpague\b/g, 'pagué')
    .replace(/\bgaste\b/g, 'gasté')
    .replace(/\bcosto\b/g, 'costó')
    .replace(/\brecibi\b/g, 'recibí')
    .replace(/\bgasolin\b/g, 'gasolina')
    .replace(/\bpantalon\b/g, 'pantalón')
    .replace(/\balmorse\b/g, 'almuerzo')
    .replace(/\bdesayun\b/g, 'desayuno')
    .replace(/\bcen[aá]\b/g, 'cena')
    .replace(/\bsup[eé]r\b/g, 'supermercado')
    .replace(/\bmercao\b/g, 'mercado')
    // Corregir "mi" cuando debería ser "mil"
    .replace(/(\d+)\s*mi\b(?!\s+(nombre|casa|familia))/g, '$1 mil')
    .replace(/\b(un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|cien|doscientos|quinientos)\s+mi\b(?!\s+(nombre|casa|familia))/g, '$1 mil')
    .trim();

  console.log('🔧 Preprocessed:', processed);
  return processed;
}

export async function extractTransactionDetails(query: string): Promise<TransactionDetailsOutput> {
  try {
    // Agregar logging para debug
    console.log('🎤 Texto original:', query);
    
    const cleanedQuery = preprocessQuery(query);
    console.log('🧹 Texto limpio:', cleanedQuery);
    
    const result = await extractTransactionDetailsFlow({ query: cleanedQuery });
    console.log('🤖 Resultado completo:', JSON.stringify(result, null, 2));
    
    // Validar que el resultado tenga los campos mínimos necesarios
    if (result && (result.amount || result.description || result.type)) {
      // Asegurar valores por defecto
      const processedResult = {
        ...result,
        type: result.type || 'expense',
        confidence: result.confidence || 0.7
      };
      console.log('✅ Transacción procesada:', processedResult);
      return processedResult;
    }
    
    console.log('❌ No se pudo extraer transacción válida');
    return result || { errorReason: 'No se pudo procesar el texto como una transacción financiera.' };
    
  } catch (error) {
    console.error('💥 Error en extractTransactionDetails:', error);
    return { 
      errorReason: `Error al procesar: ${error instanceof Error ? error.message : 'Error desconocido'}` 
    };
  }
}

const extractTransactionPrompt = ai.definePrompt({
    name: 'extractTransactionPrompt',
    input: { schema: TransactionDetailsInputSchema },
    output: { schema: TransactionDetailsOutputSchema },
    system: `Eres un experto en finanzas personales. Tu única tarea es extraer información financiera de texto transcrito por voz en español.

REGLAS ABSOLUTAS:
1. SIEMPRE extrae type, description y amount cuando sea posible
2. Si ves números y palabras relacionadas con dinero, es una transacción
3. Convierte números en palabras a dígitos
4. Usa "expense" como tipo por defecto
5. Si no puedes extraer nada, usa solo errorReason

CONVERSIONES OBLIGATORIAS:
- "mil" = 1000
- "cinco mil" = 5000  
- "diez mil" = 10000
- "quince mil" = 15000
- "veinte mil" = 20000
- "treinta mil" = 30000
- "cincuenta mil" = 50000
- "cien mil" = 100000
- "100 000" = 100000
- "100000" = 100000

EJEMPLOS DE RESPUESTA CORRECTA:
Entrada: "compré almuerzo quince mil"
Salida: {"type":"expense","description":"almuerzo","amount":15000,"confidence":0.9}

Entrada: "compra un pantalón de 100000"  
Salida: {"type":"expense","description":"pantalón","amount":100000,"confidence":0.9}`,
    
    prompt: `Extrae la transacción de este texto:

"{{{query}}}"

INSTRUCCIONES:
1. Identifica el tipo (expense/income)
2. Extrae descripción del item/servicio
3. Convierte el monto a número
4. Asigna confianza 0.8-0.9 si está claro

Responde SOLO con JSON válido con todos los campos requeridos:`,
});

const extractTransactionDetailsFlow = ai.defineFlow(
  {
    name: 'extractTransactionDetailsFlow',
    inputSchema: TransactionDetailsInputSchema,
    outputSchema: TransactionDetailsOutputSchema,
  },
  async (input) => {
    try {
      console.log('🔄 Procesando en flow:', input.query);
      
      const result = await extractTransactionPrompt(input);
      console.log('🎯 Respuesta del prompt completa:', JSON.stringify(result, null, 2));
      console.log('🎯 Output específico:', JSON.stringify(result.output, null, 2));
      
      const output = result.output;

      // Si no hay output del todo
      if (!output) {
        console.log('⚠️ No hay output del AI');
        return { 
          errorReason: 'El AI no generó respuesta. Texto posiblemente no es financiero.' 
        };
      }

      // Si solo tiene errorReason
      if (output.errorReason && !output.amount && !output.description && !output.type) {
        console.log('❌ Solo error:', output.errorReason);
        return { errorReason: output.errorReason };
      }

      // Si el output está parcialmente vacío, intentar completarlo
      if (output.type && !output.amount && !output.description) {
        console.log('⚠️ Output parcial detectado, intentando completar...');
        
        // Intentar extraer información básica del texto original
        const query = input.query.toLowerCase();
        let amount = null;
        let description = 'transacción';
        
        // Buscar números en el texto
        const numberMatch = query.match(/(\d+[\s\.,]*\d*)/);
        if (numberMatch) {
          amount = parseInt(numberMatch[1].replace(/[\s\.,]/g, ''));
        }
        
        // Buscar palabras clave para descripción
        if (query.includes('pantalón') || query.includes('pantalon')) description = 'pantalón';
        else if (query.includes('almuerzo') || query.includes('almorse')) description = 'almuerzo';
        else if (query.includes('gasolina') || query.includes('gasolin')) description = 'gasolina';
        else if (query.includes('cena')) description = 'cena';
        else if (query.includes('desayuno')) description = 'desayuno';
        
        const completedOutput = {
          type: output.type,
          description: description,
          amount: amount,
          confidence: 0.6
        };
        
        console.log('🔧 Output completado manualmente:', completedOutput);
        return completedOutput;
      }

      // Si tiene datos válidos, devolverlos
      if (output.type || output.amount || output.description) {
        const finalOutput = {
          type: output.type || 'expense',
          description: output.description || 'transacción',
          amount: output.amount,
          confidence: output.confidence || 0.7
        };
        console.log('✅ Output válido:', finalOutput);
        return finalOutput;
      }

      // Fallback final
      console.log('🤔 Respuesta ambigua del AI');
      return { 
        errorReason: 'No se pudo interpretar como transacción financiera.' 
      };
      
    } catch (error) {
      console.error('💥 Error en flow:', error);
      return { 
        errorReason: `Error: ${error instanceof Error ? error.message : 'Desconocido'}` 
      };
    }
  }
);

// Función auxiliar para debugging
export async function debugTransactionText(query: string) {
  const cleaned = preprocessQuery(query);
  console.log('🔍 DEBUG:');
  console.log('Original:', query);
  console.log('Limpio:', cleaned);
  console.log('Contiene palabras clave financieras:', /\b(compré|compra|pagué|pago|gasté|costó|mil|peso|dinero|plata)\b/i.test(cleaned));
  console.log('Contiene números:', /\d+|mil|millón/i.test(cleaned));
  return cleaned;
}