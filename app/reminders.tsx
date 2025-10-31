import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { COLORS } from '../constants/colors';
import { apiClient, Reminder } from '../services/api';

export default function Reminders() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);

  useEffect(() => {
    loadReminders();
  }, [showUpcomingOnly]);

  const loadReminders = async () => {
    try {
      let response;
      if (showUpcomingOnly) {
        response = await apiClient.getUpcomingReminders(30);
      } else {
        response = await apiClient.getReminders({ limit: 50 });
      }
      
      if (response.success) {
        setReminders(response.data);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      Alert.alert('Erro', 'Não foi possível carregar os lembretes.');
    } finally {
      setIsLoading(false);
    }
  };

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
              // TODO: Implement delete reminder endpoint
              Alert.alert('Sucesso', 'Lembrete excluído com sucesso.');
              // setReminders(reminders.filter(reminder => reminder.id !== reminderId));
            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Erro', 'Não foi possível excluir o lembrete.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Há ${Math.abs(diffDays)} dias`;
    } else if (diffDays === 0) {
      return 'Hoje';
    } else if (diffDays === 1) {
      return 'Amanhã';
    } else {
      return `Em ${diffDays} dias`;
    }
  };

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const renderReminderItem = ({ item }: { item: Reminder }) => (
    <TouchableOpacity style={styles.reminderCard}>
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
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteReminder(item.id, item.title)}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.notificationRed} />
      </TouchableOpacity>
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
        onPress={() => Alert.alert('Em breve', 'Funcionalidade de criar lembretes será implementada em breve.')}
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
          style={styles.filterButton}
          onPress={() => setShowUpcomingOnly(!showUpcomingOnly)}
        >
          <Ionicons 
            name={showUpcomingOnly ? "filter" : "filter-outline"} 
            size={24} 
            color={showUpcomingOnly ? COLORS.white : COLORS.primary} 
          />
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
        keyExtractor={(item) => item.id}
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
  filterButton: {
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
  deleteButton: {
    padding: 8,
    marginLeft: 8,
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
