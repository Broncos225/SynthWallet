
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, CreditCard, Target, BarChartHorizontalBig, Settings, Star, Tags, ReceiptText, Wallet, Goal, Repeat, UploadCloud, Palette } from "lucide-react"; // Removed VenetianMask, CustomAppIcon. Ensured Wallet is here.

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  isExternal?: boolean;
  subNavItems?: NavItem[];
};

export type SettingsNavItem = NavItem & {
  description?: string;
}

export type SiteConfig = {
  name: string;
  description: string;
  navItems: NavItem[];
  settingsNavItems: SettingsNavItem[];
  logo: LucideIcon;
};

export const siteConfig: SiteConfig = {
  name: "SynthWallet",
  description: "Una aplicación moderna para presupuestar y seguir gastos.",
  logo: Wallet, // Changed to Wallet icon
  navItems: [
    {
      title: "Panel Principal",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Presupuestos",
      href: "/budgets",
      icon: Target,
    },
    {
      title: "Deudas",
      href: "/debts",
      icon: ReceiptText,
    },
    {
      title: "Objetivos",
      href: "/saving-goals",
      icon: Goal,
    },
    {
      title: "Recordatorios",
      href: "/recurring",
      icon: Repeat,
    },
    {
      title: "Reportes",
      href: "/reports",
      icon: BarChartHorizontalBig,
    },
    {
      title: "Configuración",
      href: "/settings",
      icon: Settings,
    },
  ],
  settingsNavItems: [
     {
      title: "Categorías",
      href: "/settings/categories",
      icon: Tags,
      description: "Organiza tus finanzas con categorías y subcategorías personalizadas."
    },
    {
      title: "Plantillas",
      href: "/settings/templates",
      icon: Star,
      description: "Crea plantillas para tus transacciones frecuentes y ahorra tiempo."
    },
    {
      title: "Cuentas",
      href: "/settings/accounts",
      icon: Wallet, // Wallet is already used here
      description: "Administra tus cuentas bancarias, de efectivo y otras."
    },
    {
      title: "Apariencia",
      href: "/settings/appearance",
      icon: Palette,
      description: "Personaliza los colores y el tema de la aplicación."
    },
    {
      title: "Importar/Exportar",
      href: "/settings/data",
      icon: UploadCloud,
      description: "Importa o exporta tus datos de transacciones."
    }
  ]
};
