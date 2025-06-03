import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  footerText?: string;
  className?: string;
  iconColor?: string;
}

export function SummaryCard({ title, value, icon: Icon, footerText, className, iconColor = "text-primary" }: SummaryCardProps) {
  return (
    <Card className={cn("shadow-md hover:shadow-lg transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value}</div>
        {footerText && <p className="text-xs text-muted-foreground pt-1">{footerText}</p>}
      </CardContent>
    </Card>
  );
}
