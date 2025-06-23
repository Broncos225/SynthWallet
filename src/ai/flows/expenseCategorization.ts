
'use server';
/**
 * @fileOverview Un agente de IA para la categorización automática de gastos.
 *
 * - categorizeExpenseFlow - Una función que maneja el proceso de categorización de gastos.
 * - ExpenseCategorizationInput - El tipo de entrada para la función categorizeExpenseFlow.
 * - ExpenseCategorizationOutput - El tipo de retorno para la función categorizeExpenseFlow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional().nullable(),
  isReserved: z.boolean().optional().describe("Indica si esta categoría es una reservada especial (ej. 'Ingresos', 'Sin Categoría') que podría requerir un tratamiento especial o ser excluida de la categorización de gastos típicos."),
});
export type CategoryForAI = z.infer<typeof CategorySchema>;

const ExpenseCategorizationInputSchema = z.object({
  description: z.string().describe('La descripción del gasto, por ejemplo, "Café Starbucks con amigos".'),
  payee: z.string().optional().describe('El nombre del beneficiario o comercio, por ejemplo, "Starbucks".'),
  categories: z.array(CategorySchema).describe('Una lista de todas las categorías de gastos disponibles (incluyendo principales y subcategorías) para que el modelo elija. No incluir categorías de tipo "Ingreso" aquí si solo se categorizan gastos.'),
});
export type ExpenseCategorizationInput = z.infer<typeof ExpenseCategorizationInputSchema>;

const ExpenseCategorizationOutputSchema = z.object({
  suggestedCategoryId: z.string().nullable().describe('El ID de la categoría de gasto más probable. Debe ser uno de los IDs proporcionados en la lista de categorías de entrada. Null si no se puede determinar con confianza.'),
  alternativeCategoryIds: z.array(z.string()).describe('Una lista de hasta 3 IDs de categorías alternativas de la lista de entrada, en caso de que la sugerencia principal no sea la deseada.'),
  confidence: z.number().min(0).max(1).optional().describe('Un puntaje de confianza (0.0 a 1.0) para la categoría sugerida. 1.0 es la máxima confianza.'),
  needsClarification: z.boolean().optional().describe('True si el modelo considera que la descripción es demasiado ambigua y necesita más información para una categorización precisa.'),
});
export type ExpenseCategorizationOutput = z.infer<typeof ExpenseCategorizationOutputSchema>;

export async function categorizeExpense(input: ExpenseCategorizationInput): Promise<ExpenseCategorizationOutput> {
  // Filtrar las categorías de 'Ingreso' antes de pasarlas al prompt si el objetivo es solo categorizar gastos.
  const expenseCategories = input.categories.filter(cat => cat.id !== 'income' && cat.name.toLowerCase() !== 'ingresos' && !cat.isReserved);

  if (expenseCategories.length === 0) {
    console.warn("No hay categorías de gastos disponibles para la categorización.");
    return {
      suggestedCategoryId: null,
      alternativeCategoryIds: [],
      confidence: 0,
      needsClarification: true,
    };
  }
  
  const output = await categorizeExpenseGenkitFlow({ ...input, categories: expenseCategories });
  // The flow itself provides a fallback, but we can add one here for extra safety against `undefined`.
  return output || { 
      suggestedCategoryId: null,
      alternativeCategoryIds: [],
      confidence: 0,
      needsClarification: true,
  };
}

const categorizeExpensePrompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: { schema: ExpenseCategorizationInputSchema },
  output: { schema: ExpenseCategorizationOutputSchema },
  prompt: `Eres un asistente experto en finanzas personales encargado de categorizar gastos.
Analiza la descripción del gasto y el beneficiario (si se proporciona).
Luego, selecciona el ID de la categoría más apropiada de la lista de categorías disponibles que te proporcionaré.

Descripción del Gasto: {{{description}}}
{{#if payee}}Beneficiario: {{{payee}}}{{/if}}

Categorías Disponibles (ID - Nombre - [ID de Categoría Principal si es Subcategoría]):
{{#each categories}}
- {{id}} - {{name}} {{#if parentId}} (Subcategoría de {{parentId}}){{/if}}
{{/each}}

Consideraciones Importantes:
1.  Tu respuesta DEBE ser el ID de una categoría de la lista proporcionada. No inventes categorías.
2.  Si el gasto parece claramente una subcategoría (ej. "Café" y existe "Alimentación / Cafeterías"), elige el ID de la subcategoría.
3.  Si no estás seguro, puedes sugerir la categoría principal más relevante.
4.  Si la descripción es muy ambigua o no encaja bien en ninguna categoría, puedes devolver null para suggestedCategoryId y true para needsClarification.
5.  Proporciona hasta 3 IDs de categorías alternativas.
6.  No sugieras categorías de tipo "Ingreso" para un gasto.

Devuelve tu respuesta en el formato JSON especificado por el esquema de salida.
`,
});

const categorizeExpenseGenkitFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseGenkitFlow',
    inputSchema: ExpenseCategorizationInputSchema,
    outputSchema: ExpenseCategorizationOutputSchema,
  },
  async (input) => {
    console.log(`AI Flow: Categorizando gasto para entrada: "${input.description}"`);
    // El prompt ya ha sido definido y se pasa como primer argumento a la función del flujo
    // La llamada al modelo (prompt) se hace aquí
    const result = await categorizeExpensePrompt(input); 
    // No es necesario llamar a result.output() si el prompt ya define el outputSchema.
    // El resultado de ai.definePrompt ya es el objeto de salida parseado.
    // Asegúrate de que el prompt devuelva un JSON que coincida con ExpenseCategorizationOutputSchema.
    return result.output || { // Aseguramos un fallback si el output es null/undefined
      suggestedCategoryId: null,
      alternativeCategoryIds: [],
      confidence: 0,
      needsClarification: true,
    };
  }
);
