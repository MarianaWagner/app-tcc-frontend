import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { TermGuard } from '../components/TermGuard';
import { COLORS } from '../constants/colors';
import { apiClient, Reminder } from '../services/api';
import { notificationService } from '../services/notifications';
import { formatDateTimeDDMMYYYY, formatRelativeDate } from '../utils/dateFormatter';

function RemindersContent() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);

  const loadReminders = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      let response;
      if (showUpcomingOnly) {
        response = await apiClient.getUpcomingReminders(30);
      } else {
        response = await apiClient.getReminders({ limit: 50 });
      }
      
      console.log('Reminders API Response:', response);
      
      if (response.success) {
        // Garantir que data é um array
        const remindersData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.reminders || []);
        console.log('Reminders loaded:', remindersData.length, 'reminders:', remindersData);
        
        if (remindersData.length === 0) {
          console.warn('No reminders found in response:', response);
        }
        
        setReminders(remindersData);
      } else {
        console.log('Reminders API returned success=false:', response.message);
        setReminders([]); // Garantir que está vazio se não teve sucesso
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert('Erro', 'Não foi possível carregar os lembretes.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [showUpcomingOnly]);

  // Recarrega lembretes quando a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      // Recarrega os dados quando a tela recebe foco, sem mostrar loading
      loadReminders(false);
    }, [showUpcomingOnly])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadReminders();
    setIsRefreshing(false);
  };

  const handleDeleteReminder = async (reminderId: string, reminderTitle: string) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o lembrete "${reminderTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cancelar notificações antes de deletar
              await notificationService.cancelReminderNotifications(reminderId);
              
              await apiClient.deleteReminder(reminderId);
              Alert.alert('Sucesso', 'Lembrete excluído com sucesso.');
              // Recarrega os lembretes após deletar
              await loadReminders(false);
            } catch (error: any) {
              console.error('Error deleting reminder:', error);
              const errorMessage = error?.message || 'Não foi possível excluir o lembrete.';
              Alert.alert('Erro', errorMessage);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return formatRelativeDate(dateString);
  };

  const formatFullDate = (dateString: string) => {
    return formatDateTimeDDMMYYYY(dateString);
  };

  const isOverdue = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
  };

  const getReminderIcon = (dateString: string) => {
    if (isOverdue(dateString)) {
      return 'warning';
    }
    return 'alarm';
  };

  const getReminderColor = (dateString: string) => {
    if (isOverdue(dateString)) {
      return COLORS.notificationRed;
    }
    return COLORS.primary;
  };

  const handleEditReminder = (reminderId: string) => {
    router.push(`/edit-reminder/${reminderId}`);
  };

  const renderReminderItem = ({ item }: { item: Reminder }) => (
    <TouchableOpacity
      style={styles.reminderCard}
      activeOpacity={0.85}
      onPress={() => handleEditReminder(item.id)}
    >
      <View style={[
        styles.reminderIcon,
        { backgroundColor: getReminderColor(item.reminderDate) }
      ]}>
        <Ionicons 
          name={getReminderIcon(item.reminderDate)} 
          size={24} 
          color={COLORS.white} 
        />
      </View>
      <View style={styles.reminderContent}>
        <Text style={styles.reminderTitle}>{item.title}</Text>
        <Text style={styles.reminderDate}>
          {formatFullDate(item.reminderDate)}
        </Text>
        <Text style={[
          styles.reminderTime,
          { color: getReminderColor(item.reminderDate) }
        ]}>
          {formatDate(item.reminderDate)}
        </Text>
        
        {/* Fasting Information */}
        {item.requiresFasting && (
          <View style={styles.fastingContainer}>
            <View style={styles.fastingBadge}>
              <Ionicons name="water" size={14} color={COLORS.primary} />
              <Text style={styles.fastingText}>
                Jejum: {item.fastingDuration || 0}h
              </Text>
            </View>
            {item.fastingAlertTime && (
              <Text style={styles.fastingAlertText}>
                Aviso: {formatFullDate(item.fastingAlertTime)}
              </Text>
            )}
          </View>
        )}
        
        {/* Notes */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditReminder(item.id)}
        >
          <Ionicons name="create-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteReminder(item.id, item.title)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.notificationRed} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alarm-outline" size={64} color={COLORS.subtitle} />
      <Text style={styles.emptyStateTitle}>
        {showUpcomingOnly ? 'Nenhum lembrete próximo' : 'Nenhum lembrete encontrado'}
      </Text>
      <Text style={styles.emptyStateText}>
        {showUpcomingOnly 
          ? 'Você não tem lembretes nos próximos 30 dias'
          : 'Crie lembretes para seus exames médicos'
        }
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => router.push('/add-reminder')}
      >
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.addFirstButtonText}>Criar Lembrete</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando lembretes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lembretes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-reminder')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            !showUpcomingOnly && styles.filterTabActive
          ]}
          onPress={() => setShowUpcomingOnly(false)}
        >
          <Text style={[
            styles.filterTabText,
            !showUpcomingOnly && styles.filterTabTextActive
          ]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterTab,
            showUpcomingOnly && styles.filterTabActive
          ]}
          onPress={() => setShowUpcomingOnly(true)}
        >
          <Text style={[
            styles.filterTabText,
            showUpcomingOnly && styles.filterTabTextActive
          ]}>
            Próximos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reminders List */}
      <FlatList
        data={reminders}
        renderItem={renderReminderItem}
        keyExtractor={(item, index) => item.id || `reminder-${index}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.subtitle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.subtitle,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  reminderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  reminderDate: {
    fontSize: 14,
    color: COLORS.subtitle,
    marginBottom: 4,
  },
  reminderTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  fastingContainer: {
    marginTop: 8,
  },
  fastingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  fastingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  fastingAlertText: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 4,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesText: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  addFirstButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addFirstButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default function Reminders() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <RemindersContent />
    </TermGuard>
  );
}
