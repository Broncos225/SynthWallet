
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { ThemeSettingsForm } from '@/components/settings/theme-form';
import { useAppData } from '@/contexts/app-data-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppearanceSettingsPage() {
  const { dataLoading } = useAppData();

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Apariencia y Tema"
          description="Personaliza los colores de la aplicación para que se ajusten a tu estilo."
        />
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apariencia y Tema"
        description="Personaliza los colores de la aplicación para que se ajusten a tu estilo."
      />
      <div className="max-w-2xl">
        <ThemeSettingsForm />
      </div>
    </div>
  );
}
