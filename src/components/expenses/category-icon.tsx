
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconMap, getDefaultIcon } from '@/lib/icon-map';

interface CategoryIconProps {
  iconName: string | undefined;
  color?: string;
  className?: string;
  size?: number;
}

export function CategoryIcon({ iconName, color, className, size = 4 }: CategoryIconProps) {
  const IconComponent = iconName && iconMap[iconName] ? iconMap[iconName] : getDefaultIcon();
  const iconSizeClass = `h-${size} w-${size}`;
  
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full p-1.5',
        className
      )}
      style={{ backgroundColor: color ? `${color}20` : 'hsl(var(--muted))' }} // Use color with low opacity or muted as fallback
    >
      <IconComponent 
        className={cn(iconSizeClass, 'shrink-0')} 
        style={{ color: color || 'hsl(var(--muted-foreground))' }} 
      />
    </div>
  );
}
