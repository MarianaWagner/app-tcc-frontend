import * as Notifications from 'expo-notifications';
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AuthProvider } from "../contexts/AuthContext";
import { notificationService } from "../services/notifications";

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Solicitar permissões de notificação ao inicializar o app
    notificationService.requestPermissions();

    // Listener para notificações recebidas quando o app está em primeiro plano
    notificationListener.current = notificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notificação recebida:', notification);
      }
    );

    // Listener para quando o usuário toca na notificação
    responseListener.current = notificationService.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Usuário tocou na notificação:', response);
        const data = response.notification.request.content.data;
        
        // Aqui você pode navegar para a tela específica baseado no tipo de notificação
        // Por exemplo: router.push(`/reminders/${data.reminderId}`)
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <Stack />
    </AuthProvider>
  );
}
