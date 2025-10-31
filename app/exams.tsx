import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
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
import { COLORS } from '../constants/colors';
import { apiClient, Exam } from '../services/api';

export default function Exams() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  // Recarrega exames quando a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      loadExams();
    }, [])
  );

  const loadExams = async () => {
    try {
      const response = await apiClient.getExams({ limit: 50 });
      if (response.success) {
        setExams(response.data);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      Alert.alert('Erro', 'Não foi possível carregar os exames.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadExams();
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
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderExamItem = ({ item }: { item: Exam }) => (
    <TouchableOpacity
      style={styles.examCard}
      onPress={() => router.push(`/exam-detail/${item.id}`)}
    >
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
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteExam(item.id, item.name)}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.notificationRed} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-outline" size={64} color={COLORS.subtitle} />
      <Text style={styles.emptyStateTitle}>Nenhum exame encontrado</Text>
      <Text style={styles.emptyStateText}>
        Adicione seu primeiro exame médico para começar
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => router.push('/add-exam')}
      >
        <Ionicons name="add" size={20} color={COLORS.white} />
        <Text style={styles.addFirstButtonText}>Adicionar Exame</Text>
      </TouchableOpacity>
    </View>
  );

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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-exam')}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Exams List */}
      <FlatList
        data={exams}
        renderItem={renderExamItem}
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
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
});
