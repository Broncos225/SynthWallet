
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { siteConfig, type NavItem } from '@/config/site';
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/layout/app-logo';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AppDataProvider, useAppData } from '@/contexts/app-data-context';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ThemeSettings } from '@/types';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppDataProvider>
        <SidebarProvider defaultOpen>
            <ShellLayout>
              {children}
            </ShellLayout>
          <Toaster />
        </SidebarProvider>
      </AppDataProvider>
    </AuthProvider>
  );
}

function ShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { open, isMobile, setOpenMobile } = useSidebar();
  const { user, loading: authLoading, logout } = useAuth();
  const { themeSettings } = useAppData();
  const router = useRouter();

  const [hasMounted, setHasMounted] = useState(false);
  const [loadingDivClassName, setLoadingDivClassName] = useState(
    "flex min-h-screen w-full items-center justify-center bg-background"
  );
  const [dynamicGreeting, setDynamicGreeting] = useState("Bienvenido");
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state based on current status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (themeSettings && typeof document !== 'undefined') {
      const root = document.documentElement;
      if (themeSettings.background) root.style.setProperty('--background', themeSettings.background);
      if (themeSettings.foreground) root.style.setProperty('--foreground', themeSettings.foreground);
      if (themeSettings.card) root.style.setProperty('--card', themeSettings.card);
      if (themeSettings.primary) root.style.setProperty('--primary', themeSettings.primary);
      if (themeSettings.accent) root.style.setProperty('--accent', themeSettings.accent);
    }
  }, [themeSettings]);

  useEffect(() => {
    if (hasMounted && !authLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, authLoading, pathname, router, hasMounted]);

  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setDynamicGreeting("Buenos días");
    } else if (currentHour >= 12 && currentHour < 19) {
      setDynamicGreeting("Buenas tardes");
    } else {
      setDynamicGreeting("Buenas noches");
    }
  }, []);


  const userNameOnly = user?.email ? user.email.split('@')[0] : 'Usuario';
  const capitalizedUserName = userNameOnly.charAt(0).toUpperCase() + userNameOnly.slice(1);

  const showLoadingScreen = authLoading || !hasMounted;


  if (showLoadingScreen) {
    return (
      <div className={loadingDivClassName}>
        <div className="space-y-4 w-64">
            <AppLogo className="justify-center mb-8"/>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <p className="text-center text-muted-foreground">Cargando SynthWallet...</p>
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r shadow-md">
        <SidebarHeader className="p-4">
          <AppLogo iconOnly={!open} />
        </SidebarHeader>
        <Separator />
        <SidebarContent asChild>
          <ScrollArea className="h-full">
            <SidebarMenu className="p-4 space-y-2">
              {siteConfig.navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      variant="default"
                      size="default"
                      className="w-full"
                      tooltip={open ? undefined : item.title}
                      onClick={() => {
                        if (isMobile) setOpenMobile(false);
                      }}
                    >
                      <Link href={item.href} className="flex items-center">
                        <item.icon className="mr-2 h-5 w-5 flex-shrink-0" />
                        {open && <span className="truncate">{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </ScrollArea>
        </SidebarContent>
        <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={logout}
                aria-label="Cerrar sesión"
              >
                <LogOut className="mr-2 h-5 w-5 flex-shrink-0" />
                {open && <span className="truncate">Cerrar Sesión</span>}
              </Button>
            </TooltipTrigger>
            {!open && <TooltipContent side="right">Cerrar Sesión</TooltipContent>}
          </Tooltip>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col w-[inherit]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="md:hidden">
             <SidebarTrigger />
          </div>
          <div className="hidden md:block">
            {user && <span className="text-lg font-semibold text-foreground">{dynamicGreeting}, {capitalizedUserName}!</span>}
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
                <Wifi className="mr-1 h-3.5 w-3.5" />
                Online
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="mr-1 h-3.5 w-3.5" />
                Offline
              </Badge>
            )}
            {/* User Menu or Other Actions can go here */}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
