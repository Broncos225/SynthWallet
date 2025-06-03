
import type { Category, Account, ThemeSettings } from '@/types';

export const APP_NAME = "SynthWallet";
export const DEFAULT_CURRENCY = 'COP'; 

// Initial categories, will be loaded into state
export const INITIAL_CATEGORIES: Category[] = [
  // Parent Categories
  { id: 'food', name: 'Alimentación y Comidas', icon: 'Utensils', color: 'hsl(var(--chart-1))' },
  { id: 'transport', name: 'Transporte', icon: 'Car', color: 'hsl(var(--chart-2))' },
  { id: 'entertainment', name: 'Entretenimiento', icon: 'Gamepad2', color: 'hsl(var(--chart-3))' },
  { id: 'housing', name: 'Vivienda', icon: 'Home', color: 'hsl(var(--chart-4))' },
  { id: 'utilities', name: 'Servicios Públicos', icon: 'Zap', color: 'hsl(var(--chart-5))' },
  { id: 'shopping', name: 'Compras', icon: 'ShoppingBag', color: 'hsl(var(--chart-6))' },
  { id: 'health', name: 'Salud', icon: 'Stethoscope', color: 'hsl(var(--chart-7))' },
  { id: 'education', name: 'Educación', icon: 'BookOpen', color: 'hsl(var(--chart-8))' },
  { id: 'travel', name: 'Viajes', icon: 'Plane', color: 'hsl(var(--chart-9))' },
  { id: 'personal', name: 'Cuidado Personal', icon: 'PersonStanding', color: 'hsl(var(--chart-10))' },
  { id: 'gifts_donations', name: 'Regalos/Donaciones', icon: 'Gift', color: 'hsl(var(--chart-11))' },
  { id: 'investments_savings', name: 'Inversiones/Ahorros', icon: 'TrendingUp', color: 'hsl(var(--chart-12))' },
  { id: 'income', name: 'Ingresos', icon: 'DollarSign', color: 'hsl(var(--chart-4))' }, 

  // Subcategories
  { id: 'food_restaurants', name: 'Restaurantes', icon: 'Pizza', parentId: 'food', color: 'hsl(var(--chart-1))' },
  { id: 'food_groceries', name: 'Supermercado', icon: 'ShoppingBasket', parentId: 'food', color: 'hsl(var(--chart-1))' },
  { id: 'food_coffee', name: 'Cafeterías', icon: 'Coffee', parentId: 'food', color: 'hsl(var(--chart-1))' },
  { id: 'transport_public', name: 'Transporte Público', icon: 'Bus', parentId: 'transport', color: 'hsl(var(--chart-2))' },
  { id: 'transport_gas', name: 'Gasolina', icon: 'Fuel', parentId: 'transport', color: 'hsl(var(--chart-2))' },
  { id: 'transport_maintenance', name: 'Mantenimiento Vehículo', icon: 'Wrench', parentId: 'transport', color: 'hsl(var(--chart-2))' },
  { id: 'shopping_clothes', name: 'Ropa y Accesorios', icon: 'Shirt', parentId: 'shopping', color: 'hsl(var(--chart-6))' },
  { id: 'shopping_electronics', name: 'Electrónicos', icon: 'Smartphone', parentId: 'shopping', color: 'hsl(var(--chart-6))' },
  { id: 'shopping_household', name: 'Hogar', icon: 'Sofa', parentId: 'shopping', color: 'hsl(var(--chart-6))' },
  { id: 'health_pharmacy', name: 'Farmacia', icon: 'Pill', parentId: 'health', color: 'hsl(var(--chart-7))' },
  { id: 'health_doctor', name: 'Médicos/Consultas', icon: 'Stethoscope', parentId: 'health', color: 'hsl(var(--chart-7))' },
  { id: 'education_courses', name: 'Cursos/Talleres', icon: 'School', parentId: 'education', color: 'hsl(var(--chart-8))' },
  { id: 'education_books', name: 'Libros/Materiales', icon: 'BookCopy', parentId: 'education', color: 'hsl(var(--chart-8))' },
  { id: 'housing_rent_mortgage', name: 'Alquiler/Hipoteca', icon: 'Home', parentId: 'housing', color: 'hsl(var(--chart-4))' },
  { id: 'housing_services', name: 'Servicios (Agua, Luz, Gas)', icon: 'Lightbulb', parentId: 'housing', color: 'hsl(var(--chart-4))' },
  { id: 'income_salary', name: 'Salario', icon: 'Wallet', parentId: 'income', color: 'hsl(var(--chart-4))' },
  { id: 'income_freelance', name: 'Trabajos Freelance', icon: 'Briefcase', parentId: 'income', color: 'hsl(var(--chart-4))' },
  { id: 'income_investments', name: 'Ingresos por Inversión', icon: 'AreaChart', parentId: 'income', color: 'hsl(var(--chart-4))' },

  { id: 'uncategorized', name: 'Sin Categoría', icon: 'HelpCircle', color: 'hsl(var(--muted-foreground))' },
  { id: 'other', name: 'Otros', icon: 'Package', color: 'hsl(var(--muted))' },
];

export const DEFAULT_CATEGORY_ID = 'uncategorized';
export const RESERVED_CATEGORY_IDS = ['uncategorized', 'other', 'income'];

export const DEFAULT_ACCOUNT_ID = 'default_cash_account';
export const INITIAL_ACCOUNTS: Account[] = [
  { id: DEFAULT_ACCOUNT_ID, name: 'Efectivo General', type: 'cash', icon: 'Wallet', initialBalance: 0, currentBalance: 0, color: 'hsl(var(--muted))' },
  { id: 'main_bank_account', name: 'Cuenta Bancaria Principal', type: 'bank', icon: 'Landmark', initialBalance: 1000, currentBalance: 1000, color: 'hsl(var(--primary))' },
];

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  background: "240 17% 96%",
  foreground: "240 10% 20%",
  card: "0 0% 100%",
  primary: "258 100% 70%",
  accent: "208 100% 70%",
  numberFormatLocale: 'es-ES', // Punto miles, coma decimal
};
