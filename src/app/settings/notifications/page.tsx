
"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BellRing, BellOff, Send } from 'lucide-react';

export default function NotificationsSettingsPage() {
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'loading'>('loading');
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('denied'); // Notifications not supported
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast({
        variant: "destructive",
        title: "Navegador no compatible",
        description: "Tu navegador no soporta notificaciones.",
      });
      setNotificationPermission('denied');
      return;
    }

    if (Notification.permission === 'granted') {
      toast({ title: "Permiso ya concedido", description: "Ya has concedido permiso para las notificaciones." });
      setNotificationPermission('granted');
      return;
    }

    if (Notification.permission === 'denied') {
      toast({
        variant: "destructive",
        title: "Permiso Bloqueado",
        description: "Has bloqueado las notificaciones. Por favor, habilítalas en la configuración de tu navegador.",
      });
      setNotificationPermission('denied');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({ title: "¡Permiso Concedido!", description: "Ahora recibirás notificaciones." });
      } else if (permission === 'denied') {
        toast({ variant: "destructive", title: "Permiso Denegado", description: "No has concedido permiso para las notificaciones." });
      } else {
        toast({ title: "Permiso Pendiente", description: "Has cerrado el diálogo de permiso sin tomar una decisión." });
      }
    } catch (error) {
      console.error("Error solicitando permiso de notificación:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo solicitar el permiso de notificación." });
      setNotificationPermission('default');
    }
  }, [toast]);

  const sendTestNotification = useCallback(async () => {
    console.log("sendTestNotification: Iniciando envío de notificación de prueba...");
    if (!('Notification' in window)) {
      console.error("sendTestNotification: API de Notificación no encontrada en window.");
      toast({
        variant: "destructive",
        title: "Navegador no compatible",
        description: "Tu navegador no soporta notificaciones (API Notification no encontrada).",
      });
      return;
    }
     if (notificationPermission !== 'granted') {
      console.warn("sendTestNotification: Permiso de notificación no concedido. Estado actual:", notificationPermission);
      toast({
        variant: "destructive",
        title: "Permiso Requerido",
        description: `El permiso para notificaciones está actualmente: ${notificationPermission}. Por favor, concédelo primero.`,
      });
      return;
    }
    console.log("sendTestNotification: Permiso de notificación concedido.");

    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      console.warn("sendTestNotification: Service Worker no está controlando la página o no está disponible. Intentando notificación local simple...");
      try {
        new Notification('Notificación de Prueba (Local)', {
          body: '¡Si ves esto, las notificaciones locales básicas funcionan!',
          icon: '/icons/icon-192x192.png',
        });
        toast({ title: "Notificación Local de Prueba Enviada", description: "Deberías ver una notificación. Esto no usó el Service Worker." });
      } catch (localError) {
        console.error("sendTestNotification: Error al enviar notificación local:", localError);
        toast({ variant: "destructive", title: "Error Notificación Local", description: "No se pudo enviar ni siquiera una notificación local." });
      }
      return;
    }

    console.log("sendTestNotification: API de ServiceWorker encontrada y parece estar activa.");

    try {
      console.log("sendTestNotification: Intentando obtener el registro del Service Worker (navigator.serviceWorker.ready)...");
      
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: Service Worker ready promise did not resolve in 10 seconds.")), 10000)
      );

      // Type assertion as ServiceWorkerRegistration because we expect it or a timeout error
      const registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;
      
      console.log("sendTestNotification: Registro del Service Worker obtenido:", registration);
      
      if (!registration.active) {
        console.warn("sendTestNotification: El Service Worker está registrado pero no está activo. Estado de registration.active:", registration.active);
        toast({
          variant: "destructive",
          title: "Service Worker no activo",
          description: "El Service Worker está registrado pero no está activo. Intenta recargar la página o revisa la consola del Service Worker.",
        });
        // Fallback a notificación local si el SW no está activo
        console.log("sendTestNotification: Fallback a notificación local porque SW no está activo.");
        new Notification('Notificación de Prueba (Fallback SW no activo)', {
          body: '¡Service Worker no activo, esta es una notificación local!',
          icon: '/icons/icon-192x192.png',
        });
        return;
      }
      console.log("sendTestNotification: Service Worker activo. Mostrando notificación vía SW...");

      await registration.showNotification('Notificación de Prueba de SynthWallet (SW)', {
        body: '¡Si ves esto, las notificaciones vía Service Worker funcionan!',
        icon: '/icons/icon-192x192.png', 
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'synthwallet-test-notification-sw',
      });
      console.log("sendTestNotification: registration.showNotification() llamado exitosamente.");
      toast({ title: "Notificación de Prueba (SW) Enviada", description: "Deberías ver una notificación de tu sistema operativo." });
    } catch (error) {
      console.error("sendTestNotification: Error durante el envío de la notificación vía SW:", error);
      let errorMessage = "No se pudo enviar la notificación de prueba vía Service Worker.";
      if (error instanceof Error) {
        errorMessage += ` Detalles: ${error.message}`;
      }
      toast({ variant: "destructive", title: "Error al Enviar Notificación SW", description: errorMessage });
      
      console.log("sendTestNotification: Fallback a notificación local después de error con SW.");
      try {
        new Notification('Notificación de Prueba (Fallback tras error SW)', {
          body: 'Error con SW, ¡esta es una notificación local!',
          icon: '/icons/icon-192x192.png',
        });
      } catch (localError) {
        console.error("sendTestNotification: Error también en fallback de notificación local:", localError);
      }
    }
  }, [notificationPermission, toast]);

  const getPermissionStatusText = () => {
    switch (notificationPermission) {
      case 'loading': return 'Cargando estado del permiso...';
      case 'granted': return 'Permitidas';
      case 'denied': return 'Bloqueadas';
      case 'default': return 'No solicitado / Pendiente';
      default: return 'Desconocido';
    }
  };

  const getPermissionStatusColor = () => {
    switch (notificationPermission) {
      case 'granted': return 'text-green-600';
      case 'denied': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Notificaciones"
        description="Gestiona cómo y cuándo recibes notificaciones de la aplicación."
      />
      <Card>
        <CardHeader>
          <CardTitle>Estado del Permiso de Notificaciones</CardTitle>
          <CardDescription>
            Las notificaciones te mantienen informado sobre eventos importantes como recordatorios de presupuesto o vencimientos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Estado Actual:</p>
              <p className={`text-lg font-semibold ${getPermissionStatusColor()}`}>
                {getPermissionStatusText()}
              </p>
            </div>
            {notificationPermission === 'loading' && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>}
            {notificationPermission === 'granted' && <BellRing className={`h-6 w-6 ${getPermissionStatusColor()}`} />}
            {(notificationPermission === 'denied' || notificationPermission === 'default') && <BellOff className={`h-6 w-6 ${getPermissionStatusColor()}`} />}
          </div>

          {notificationPermission !== 'granted' && notificationPermission !== 'loading' && (
            <Button onClick={requestNotificationPermission} className="w-full sm:w-auto">
              <BellRing className="mr-2 h-4 w-4" />
              {Notification.permission === 'denied' ? 'Ayuda para Habilitar Notificaciones' : 'Solicitar Permiso de Notificación'}
            </Button>
          )}
          {Notification.permission === 'denied' && (
            <p className="text-sm text-muted-foreground">
              Has bloqueado las notificaciones. Para habilitarlas, ve a la configuración de tu navegador para este sitio y permite las notificaciones.
            </p>
          )}

          <Button
            onClick={sendTestNotification}
            disabled={notificationPermission !== 'granted' || notificationPermission === 'loading'}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            Enviar Notificación de Prueba
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Preferencias de Notificación (Próximamente)</CardTitle>
            <CardDescription>
                Aquí podrás personalizar qué tipo de notificaciones deseas recibir (ej. recordatorios de presupuesto, alertas de transacciones recurrentes, etc.). Esta funcionalidad está en desarrollo.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground text-center">Aún no hay configuraciones disponibles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
