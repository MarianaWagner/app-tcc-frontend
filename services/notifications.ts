import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar como as notificações devem ser tratadas quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface ScheduledNotification {
  identifier: string;
  title: string;
  body: string;
  date: Date;
  data?: any;
}

class NotificationService {
  private reminderPrefix = 'reminder-';
  private fastingAlertPrefix = 'fasting-alert-';

  /**
   * Solicita permissões para enviar notificações
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permissão de notificação não concedida');
        return false;
      }

      // Configurar canal de notificação para Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Lembretes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0066CC',
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões de notificação:', error);
      return false;
    }
  }

  /**
   * Agenda uma notificação de lembrete
   */
  async scheduleReminderNotification(
    reminderId: string,
    title: string,
    reminderDate: Date,
    notes?: string
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Não agendar notificações para datas passadas
      if (reminderDate < new Date()) {
        console.warn('Não é possível agendar notificação para data passada');
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Lembrete',
          body: title,
          subtitle: notes ? notes.substring(0, 100) : undefined,
          data: {
            type: 'reminder',
            reminderId,
          },
          sound: true,
        },
        trigger: reminderDate,
      });

      console.log(`Notificação de lembrete agendada: ${notificationId} para ${reminderDate}`);
      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação de lembrete:', error);
      return null;
    }
  }

  /**
   * Agenda uma notificação de aviso de jejum
   */
  async scheduleFastingAlertNotification(
    reminderId: string,
    fastingAlertTime: Date,
    reminderTitle: string,
    fastingDuration?: number
  ): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Não agendar notificações para datas passadas
      if (fastingAlertTime < new Date()) {
        console.warn('Não é possível agendar notificação para data passada');
        return null;
      }

      const body = fastingDuration
        ? `Comece o jejum agora! Duração: ${fastingDuration}h`
        : 'Comece o jejum agora!';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Aviso de Jejum',
          body: `${reminderTitle} - ${body}`,
          data: {
            type: 'fasting-alert',
            reminderId,
          },
          sound: true,
        },
        trigger: fastingAlertTime,
      });

      console.log(`Notificação de jejum agendada: ${notificationId} para ${fastingAlertTime}`);
      return notificationId;
    } catch (error) {
      console.error('Erro ao agendar notificação de jejum:', error);
      return null;
    }
  }

  /**
   * Cancela uma notificação específica
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`Notificação cancelada: ${notificationId}`);
    } catch (error) {
      console.error('Erro ao cancelar notificação:', error);
    }
  }

  /**
   * Cancela todas as notificações de um lembrete
   */
  async cancelReminderNotifications(reminderId: string): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        const notificationData = notification.content.data;
        if (
          notificationData?.reminderId === reminderId &&
          (notificationData?.type === 'reminder' || notificationData?.type === 'fasting-alert')
        ) {
          await this.cancelNotification(notification.identifier);
        }
      }

      console.log(`Todas as notificações do lembrete ${reminderId} foram canceladas`);
    } catch (error) {
      console.error('Erro ao cancelar notificações do lembrete:', error);
    }
  }

  /**
   * Cancela todas as notificações agendadas
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Todas as notificações foram canceladas');
    } catch (error) {
      console.error('Erro ao cancelar todas as notificações:', error);
    }
  }

  /**
   * Lista todas as notificações agendadas
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Erro ao listar notificações agendadas:', error);
      return [];
    }
  }

  /**
   * Obtém o token de push (para futuras implementações de push remoto)
   * Nota: Para usar push notifications remotas, você precisará configurar um Expo project ID
   */
  async getPushToken(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Para push notifications remotas, você precisaria de um Expo project ID
      // const projectId = 'your-expo-project-id';
      // const token = await Notifications.getExpoPushTokenAsync({ projectId });
      // return token.data;
      
      console.log('Push token não configurado - usando apenas notificações locais');
      return null;
    } catch (error) {
      console.error('Erro ao obter token de push:', error);
      return null;
    }
  }

  /**
   * Adiciona listener para notificações recebidas
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Adiciona listener para quando o usuário toca na notificação
   */
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = new NotificationService();

