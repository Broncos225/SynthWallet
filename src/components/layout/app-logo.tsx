
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function AppLogo({ className, iconOnly = false }: AppLogoProps) {
  const IconComponent = siteConfig.logo; // This will now be VenetianMask
  return (
    <Link href="/" className={cn("flex items-center gap-2 group", className)}>
      <IconComponent className="h-7 w-7 text-primary" /> {/* IconComponent is directly used */}
      {!iconOnly && (
        <span className="text-xl font-bold tracking-tight">
          {siteConfig.name}
        </span>
      )}
    </Link>
  );
}
