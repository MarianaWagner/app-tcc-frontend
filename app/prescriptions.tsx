import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TermGuard } from '../components/TermGuard';
import { COLORS } from '../constants/colors';
import { apiClient, PrescriptionStatus } from '../services/api';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

type PrescriptionSummary = {
  id: string;
  title: string;
  issueDate?: string;
  status: PrescriptionStatus;
  tags?: string[];
  professional?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const STATUS_LABELS: Record<PrescriptionStatus, string> = {
  em_uso: 'Em uso',
  concluida: 'Concluída',
  suspensa: 'Suspensa',
};

const STATUS_COLORS: Record<PrescriptionStatus, { background: string; text: string }> = {
  em_uso: { background: '#E3F2FD', text: COLORS.primaryDark },
  concluida: { background: '#E8F5E9', text: '#2E7D32' },
  suspensa: { background: '#FFF4E5', text: '#B26A00' },
};

function PrescriptionsContent() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PrescriptionStatus | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    prescriptions.forEach((prescription) => {
      prescription.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b));
  }, [prescriptions]);

  const loadPrescriptions = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setIsLoading(true);
        }

        const response = await apiClient.getPrescriptions({
          limit: 100,
          search: searchQuery.trim() || undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          sortField: 'issueDate',
          sortOrder: 'desc',
        });

        if (response.success) {
          const data = response.data?.data ?? [];
          setPrescriptions(data as PrescriptionSummary[]);
          setPagination(response.data?.pagination ?? response.pagination);
        } else {
          setPrescriptions([]);
          setPagination(undefined);
        }
      } catch (error) {
        console.error('Error loading prescriptions:', error);
        Alert.alert('Erro', 'Não foi possível carregar as prescrições.');
      } finally {
        if (showLoader) {
          setIsLoading(false);
        }
      }
    },
    [searchQuery, selectedStatus, selectedTags]
  );

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions(false);
    }, [loadPrescriptions])
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPrescriptions();
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedStatus, selectedTags, loadPrescriptions]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadPrescriptions();
    setIsRefreshing(false);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    );
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Excluir prescrição',
      `Deseja realmente excluir a prescrição "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deletePrescription(id);
              setPrescriptions((prev) => prev.filter((item) => item.id !== id));
              Alert.alert('Sucesso', 'Prescrição excluída.');
            } catch (error) {
              console.error('Error deleting prescription:', error);
              Alert.alert('Erro', 'Não foi possível excluir a prescrição.');
            }
          },
        },
      ]
    );
  };

  const renderStatusBadge = (status: PrescriptionStatus) => {
    const palette = STATUS_COLORS[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: palette.background }]}>
        <Text style={[styles.statusBadgeText, { color: palette.text }]}>
          {STATUS_LABELS[status]}
        </Text>
      </View>
    );
  };

  const renderPrescriptionItem = ({ item }: { item: PrescriptionSummary }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/prescription-detail/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {renderStatusBadge(item.status)}
        </View>
        {item.professional && (
          <Text style={styles.professionalText}>{item.professional}</Text>
        )}
        {item.issueDate && (
          <Text style={styles.dateText}>
            Emitida em {formatDateDDMMYYYY(item.issueDate)}
          </Text>
        )}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag) => (
              <View key={`${item.id}-${tag}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => router.push(`/edit-prescription/${item.id}`)}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.primaryDark} />
            <Text style={styles.cardActionText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cardActionButton}
            onPress={() => handleDelete(item.id, item.title)}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.notificationRed} />
            <Text style={[styles.cardActionText, { color: COLORS.notificationRed }]}>
              Excluir
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="medical-outline" size={64} color={COLORS.subtitle} />
      <Text style={styles.emptyStateTitle}>Nenhuma prescrição encontrada</Text>
      <Text style={styles.emptyStateText}>
        Cadastre suas prescrições médicas para acompanhar posologia, anexos e observações em um só lugar.
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => router.push('/add-prescription')}
      >
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.addFirstButtonText}>Nova Prescrição</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando prescrições...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prescrições Médicas</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-prescription')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.subtitle} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título ou profissional..."
            placeholderTextColor={COLORS.subtitle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {(searchQuery.length > 0 ||
            selectedStatus !== 'all' ||
            selectedTags.length > 0) && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="close-circle" size={20} color={COLORS.subtitle} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <ScrollStatusChips
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />
      </View>

      {availableTags.length > 0 && (
        <View style={styles.tagsFilterContainer}>
          <FlatList
            data={availableTags}
            horizontal
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsFilterContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tagFilterButton,
                  selectedTags.includes(item) && styles.tagFilterButtonActive,
                ]}
                onPress={() => toggleTag(item)}
              >
                <Text
                  style={[
                    styles.tagFilterText,
                    selectedTags.includes(item) && styles.tagFilterTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <FlatList
        data={prescriptions}
        renderItem={renderPrescriptionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
        ListFooterComponent={
          <View style={styles.footerDisclaimer}>
            <Text style={styles.footerDisclaimerText}>
              Este registro é pessoal e não substitui uma prescrição médica oficial.
            </Text>
            <Text style={styles.responsibilityText}>
              O aplicativo destina-se ao armazenamento pessoal de informações médicas. Os dados inseridos são de responsabilidade exclusiva do usuário e não substituem orientações médicas profissionais.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function ScrollStatusChips({
  selectedStatus,
  onSelectStatus,
}: {
  selectedStatus: PrescriptionStatus | 'all';
  onSelectStatus: (status: PrescriptionStatus | 'all') => void;
}) {
  return (
    <View style={styles.statusChipsContainer}>
      <TouchableOpacity
        style={[
          styles.statusChip,
          selectedStatus === 'all' && styles.statusChipActive,
        ]}
        onPress={() => onSelectStatus('all')}
      >
        <Text
          style={[
            styles.statusChipText,
            selectedStatus === 'all' && styles.statusChipTextActive,
          ]}
        >
          Todas
        </Text>
      </TouchableOpacity>
      {(Object.keys(STATUS_LABELS) as PrescriptionStatus[]).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.statusChip,
            selectedStatus === status && styles.statusChipActive,
          ]}
          onPress={() => onSelectStatus(status)}
        >
          <Text
            style={[
              styles.statusChipText,
              selectedStatus === status && styles.statusChipTextActive,
            ]}
          >
            {STATUS_LABELS[status]}
          </Text>
        </TouchableOpacity>
      ))}
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
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primaryDark,
  },
  statusChipTextActive: {
    color: COLORS.white,
  },
  tagsFilterContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tagsFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tagFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagFilterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagFilterText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
  tagFilterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  professionalText: {
    fontSize: 14,
    color: COLORS.primaryDark,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.subtitle,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: 14,
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
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
  footerDisclaimer: {
    marginTop: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  footerDisclaimerText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '600',
    textAlign: 'center',
  },
  responsibilityText: {
    fontSize: 12,
    color: COLORS.subtitle,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default function Prescriptions() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <PrescriptionsContent />
    </TermGuard>
  );
}

