import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { ShareModal } from '../components/ShareModal';
import { TermGuard } from '../components/TermGuard';
import { COLORS } from '../constants/colors';
import { apiClient, Exam } from '../services/api';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

function ExamsContent() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  // Recarrega exames quando a tela recebe foco (sem busca)
  useFocusEffect(
    useCallback(() => {
      if (!searchQuery.trim()) {
        loadExams();
      }
    }, [searchQuery])
  );

  const loadExams = async (search?: string) => {
    try {
      const params: any = { limit: 50 };
      if (search && search.trim()) {
        params.search = search.trim();
      }
      
      const response = await apiClient.getExams(params);
      console.log('Exams API Response:', response);
      
      if (response.success) {
        // Garantir que data é um array
        const data = response.data as any;
        const examsData = Array.isArray(data) ? data : (data?.data || data?.exams || []);
        console.log('Exams loaded:', examsData.length, 'exams:', examsData);
        
        if (examsData.length === 0) {
          console.warn('No exams found in response:', response);
        }
        
        setExams(examsData);
        setFilteredExams(examsData);
        
        // Extrair todas as tags únicas dos exames (normalizadas para maiúsculas)
        const allTags = new Set<string>();
        examsData.forEach((exam: Exam) => {
          if (exam.tags) {
            exam.tags.forEach((tag: string) => {
              // Normalizar para maiúsculas e adicionar
              allTags.add(tag.toUpperCase());
            });
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      } else {
        console.log('Exams API returned success=false:', response.message);
        setExams([]);
        setFilteredExams([]);
        setAvailableTags([]);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      Alert.alert('Erro', 'Não foi possível carregar os exames.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar exames por nome e tags
  useEffect(() => {
    let filtered = [...exams];
    
    // Filtrar por nome (busca)
    if (searchQuery.trim()) {
      filtered = filtered.filter(exam => 
        exam.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filtrar por tags selecionadas (comparação case-insensitive)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(exam => 
        exam.tags && exam.tags.some(tag => 
          selectedTags.includes(tag.toUpperCase())
        )
      );
    }
    
    setFilteredExams(filtered);
  }, [searchQuery, selectedTags, exams]);

  // Buscar na API quando o usuário parar de digitar (debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        loadExams(searchQuery);
      } else {
        loadExams();
      }
    }, 500); // Espera 500ms após o usuário parar de digitar

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadExams(searchQuery || undefined);
    setIsRefreshing(false);
  };

  const handleDeleteExam = async (examId: string, examName: string) => {
    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o exame "${examName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteExam(examId);
              setExams(exams.filter(exam => exam.id !== examId));
              Alert.alert('Sucesso', 'Exame excluído com sucesso.');
            } catch (error) {
              console.error('Error deleting exam:', error);
              Alert.alert('Erro', 'Não foi possível excluir o exame.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return formatDateDDMMYYYY(dateString);
  };

  const toggleExamSelection = (examId: string) => {
    setSelectedExamIds(prev => {
      if (prev.includes(examId)) {
        return prev.filter(id => id !== examId);
      } else {
        return [...prev, examId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedExamIds.length === filteredExams.length) {
      setSelectedExamIds([]);
    } else {
      setSelectedExamIds(filteredExams.map(exam => exam.id));
    }
  };

  const handleSharePress = () => {
    if (selectedExamIds.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um exame para compartilhar');
      return;
    }
    setShareModalVisible(true);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedExamIds([]);
  };

  const handleShareSuccess = () => {
    setIsSelectionMode(false);
    setSelectedExamIds([]);
    loadExams();
  };

  const showShareInfo = () => {
    Alert.alert(
      'Como funciona o Compartilhamento',
      '• Selecione um ou mais exames e clique no botão de compartilhar\n\n' +
      '• Informe o e-mail do destinatário e uma mensagem opcional\n\n' +
      '• Um link único será gerado e enviado por e-mail ao destinatário\n\n' +
      '• O link expira em 7 dias e pode ser usado apenas 1 vez por padrão\n\n' +
      '• O destinatário poderá visualizar e baixar os arquivos dos exames compartilhados\n\n' +
      '• Você pode revogar o compartilhamento a qualquer momento',
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  const renderExamItem = ({ item }: { item: Exam }) => {
    const isSelected = selectedExamIds.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.examCard,
          isSelectionMode && styles.examCardSelection,
          isSelected && styles.examCardSelected,
        ]}
        onPress={() => {
          if (isSelectionMode) {
            toggleExamSelection(item.id);
          } else {
            router.push(`/exam-detail/${item.id}`);
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedExamIds([item.id]);
          }
        }}
      >
        {isSelectionMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && (
                <Ionicons name="checkmark" size={20} color={COLORS.white} />
              )}
            </View>
          </View>
        )}
        <View style={styles.examIcon}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.examContent}>
          <Text style={styles.examName}>{item.name}</Text>
          {item.examDate && (
            <Text style={styles.examDate}>
              Data: {formatDate(item.examDate)}
            </Text>
          )}
          {item.notes && (
            <Text style={styles.examNotes} numberOfLines={2}>
              {item.notes}
            </Text>
          )}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {item.uploadedFiles && item.uploadedFiles.length > 0 && (
            <View style={styles.filesIndicator}>
              <Ionicons name="attach" size={16} color={COLORS.subtitle} />
              <Text style={styles.filesText}>
                {item.uploadedFiles.length} arquivo(s)
              </Text>
            </View>
          )}
        </View>
        {!isSelectionMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteExam(item.id, item.name)}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.notificationRed} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    const hasFilters = searchQuery.trim() || selectedTags.length > 0;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="document-outline" size={64} color={COLORS.subtitle} />
        <Text style={styles.emptyStateTitle}>Nenhum exame encontrado</Text>
        <Text style={styles.emptyStateText}>
          {hasFilters 
            ? searchQuery.trim() && selectedTags.length > 0
              ? `Nenhum exame encontrado com "${searchQuery}" e tag(s) selecionada(s)`
              : searchQuery.trim()
              ? `Nenhum exame encontrado com "${searchQuery}"`
              : `Nenhum exame encontrado com a(s) tag(s) selecionada(s)`
            : 'Adicione seu primeiro exame médico para começar'
          }
        </Text>
        {!hasFilters && (
          <TouchableOpacity
            style={styles.addFirstButton}
            onPress={() => router.push('/add-exam')}
          >
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addFirstButtonText}>Adicionar Exame</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando exames...</Text>
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
        <Text style={styles.headerTitle}>Meus Exames</Text>
        <View style={styles.headerActions}>
          {!isSelectionMode ? (
            <>
              <TouchableOpacity
                style={styles.infoHeaderButton}
                onPress={showShareInfo}
              >
                <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareHeaderButton}
                onPress={() => setIsSelectionMode(true)}
              >
                <Ionicons name="share-outline" size={24} color={COLORS.primaryDark} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/add-exam')}
              >
                <Ionicons name="add" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.cancelHeaderButton}
              onPress={handleCancelSelection}
            >
              <Ionicons name="close" size={24} color={COLORS.primaryDark} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={COLORS.subtitle} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome do exame..."
            placeholderTextColor={COLORS.subtitle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {(searchQuery.length > 0 || selectedTags.length > 0) && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearFilters}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.subtitle} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tags Filter */}
      {availableTags.length > 0 && (
        <View style={styles.tagsFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsFilterContent}
          >
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagFilterButton,
                  selectedTags.includes(tag) && styles.tagFilterButtonActive,
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagFilterText,
                    selectedTags.includes(tag) && styles.tagFilterTextActive,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Exams List */}
      <FlatList
        data={filteredExams}
        renderItem={renderExamItem}
        keyExtractor={(item, index) => item.id || `exam-${index}`}
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

      {/* Toolbar flutuante para ações de compartilhamento */}
      {isSelectionMode && (
        <View style={styles.floatingToolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleCancelSelection}
          >
            <Ionicons name="close" size={20} color={COLORS.text} />
            <Text style={styles.toolbarButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={toggleSelectAll}
          >
            <Ionicons 
              name={selectedExamIds.length === filteredExams.length ? "checkbox" : "square-outline"} 
              size={20} 
              color={COLORS.text} 
            />
            <Text style={styles.toolbarButtonText}>Selecionar tudo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolbarButton, styles.toolbarButtonPrimary]}
            onPress={handleSharePress}
            disabled={selectedExamIds.length === 0}
          >
            <Ionicons name="share" size={20} color={COLORS.white} />
            <Text style={[styles.toolbarButtonText, styles.toolbarButtonTextPrimary]}>
              Compartilhar ({selectedExamIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Compartilhamento */}
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        exams={exams}
        selectedExamIds={selectedExamIds}
        onShareSuccess={handleShareSuccess}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  infoHeaderButton: {
    padding: 8,
  },
  shareHeaderButton: {
    padding: 8,
  },
  cancelHeaderButton: {
    padding: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagFilterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tagFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  tagFilterTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  examCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  examIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  examContent: {
    flex: 1,
  },
  examName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  examDate: {
    fontSize: 14,
    color: COLORS.subtitle,
    marginBottom: 8,
  },
  examNotes: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  filesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filesText: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginLeft: 4,
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
  examCardSelection: {
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  examCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  floatingToolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  toolbarButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  toolbarButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  toolbarButtonTextPrimary: {
    color: COLORS.white,
  },
});

export default function Exams() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <ExamsContent />
    </TermGuard>
  );
}
