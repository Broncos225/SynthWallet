
"use client";

import { PageHeader } from '@/components/shared/page-header';
import { DataImportExport } from '@/components/settings/data-import-export';
import { useAppData } from '@/contexts/app-data-context';
import { Skeleton } from '@/components/ui/skeleton';

export default function DataManagementPage() {
  const { dataLoading } = useAppData();

  if (dataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Importar / Exportar Datos"
          description="Gestiona tus datos de transacciones mediante importación o exportación CSV."
        />
        <div className="max-w-xl space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar / Exportar Datos"
        description="Gestiona tus datos de transacciones mediante importación o exportación CSV."
      />
      <div className="max-w-xl">
        <DataImportExport />
      </div>
    </div>
  );
}

    