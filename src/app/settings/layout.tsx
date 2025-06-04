
"use client"; 

import type { ReactNode } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site'; // Import siteConfig
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Gestiona las categorías, plantillas, cuentas y otras configuraciones de la aplicación."
      />
      
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {siteConfig.settingsNavItems.map((item) => (
          <Button 
            key={item.href}
            variant={pathname === item.href ? "default" : "ghost"} 
            className={cn(
              "justify-start whitespace-normal h-auto py-2 px-3 text-left", // Removed w-full that was on the Link
              pathname === item.href && "bg-primary text-primary-foreground hover:bg-primary/90"
            )} 
            asChild
          >
            <Link href={item.href} className="flex items-center"> {/* Removed w-full and md:w-auto here */}
              <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="flex-grow min-w-0">{item.title}</span>
            </Link>
          </Button>
        ))}
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}

    