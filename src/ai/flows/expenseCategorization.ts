// This is a placeholder for the actual Genkit flow.
// In a real scenario, this would be part of the `src/ai/flows` directory
// and implemented using Genkit tools.

// Mock implementation
type CategorizeExpenseInput = string; // e.g., "Café Starbucks"
type CategorizeExpenseOutput = {
  suggestedCategoryName: string | null; // e.g., "Alimentación y Comidas"
  alternativeCategoryNames: string[]; // e.g., ["Cafeterías", "Bebidas"]
  confidence?: number; // e.g., 0.85
};

export async function categorizeExpenseFlow(
  input: CategorizeExpenseInput
): Promise<CategorizeExpenseOutput> {
  console.log(`AI Flow: Categorizando gasto para entrada: "${input}"`);
  
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  const lowerInput = input.toLowerCase();

  if (lowerInput.includes('café') || lowerInput.includes('starbucks') || lowerInput.includes('restaurante')) {
    return {
      suggestedCategoryName: 'Alimentación y Comidas',
      alternativeCategoryNames: ['Entretenimiento', 'Compras'],
      confidence: 0.9,
    };
  } else if (lowerInput.includes('gasolina') || lowerInput.includes('uber') || lowerInput.includes('metro')) {
    return {
      suggestedCategoryName: 'Transporte',
      alternativeCategoryNames: ['Viajes', 'Servicios Públicos'],
      confidence: 0.88,
    };
  } else if (lowerInput.includes('película') || lowerInput.includes('concierto') || lowerInput.includes('juego')) {
    return {
      suggestedCategoryName: 'Entretenimiento',
      alternativeCategoryNames: ['Compras', 'Alimentación y Comidas'],
      confidence: 0.82,
    };
  } else if (lowerInput.includes('alquiler') || lowerInput.includes('hipoteca')) {
    return {
      suggestedCategoryName: 'Vivienda',
      alternativeCategoryNames: ['Servicios Públicos'],
      confidence: 0.95,
    };
  } else if (lowerInput.includes('amazon') || lowerInput.includes('target') || lowerInput.includes('ropa')) {
     return {
      suggestedCategoryName: 'Compras',
      alternativeCategoryNames: ['Entretenimiento', 'Otros'],
      confidence: 0.78,
    };
  }

  // Fallback or less confident match
  return {
    suggestedCategoryName: null, // AI couldn't confidently categorize
    alternativeCategoryNames: ['Alimentación y Comidas', 'Compras', 'Servicios Públicos', 'Otros'], // Offer general alternatives
    confidence: 0.4,
  };
}
