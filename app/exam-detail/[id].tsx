import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { apiClient, Exam } from '../../services/api';

export default function ExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadExamDetail();
    }
  }, [id]);

  const loadExamDetail = async () => {
    try {
      const response = await apiClient.getExam(id!);
      if (response.success) {
        setExam(response.data);
      }
    } catch (error) {
      console.error('Error loading exam detail:', error);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do exame.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!exam) return;

    Alert.alert(
      'Confirmar exclusão',
      `Tem certeza que deseja excluir o exame "${exam.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deleteExam(exam.id);
              Alert.alert('Sucesso', 'Exame excluído com sucesso.');
              router.back();
            } catch (error) {
              console.error('Error deleting exam:', error);
              Alert.alert('Erro', 'Não foi possível excluir o exame.');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    Alert.alert('Em breve', 'A funcionalidade de edição será implementada em breve.');
  };

  const handleOpenFile = async (filePath: string, fileName: string) => {
    try {
      // In a real app, you would construct the full URL to the file
      const fileUrl = `http://localhost:5001${filePath}`;
      const supported = await Linking.canOpenURL(fileUrl);
      
      if (supported) {
        await Linking.openURL(fileUrl);
      } else {
        Alert.alert('Erro', 'Não é possível abrir este arquivo.');
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Erro', 'Não foi possível abrir o arquivo.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image':
        return 'image';
      case 'pdf':
        return 'document-text';
      case 'video':
        return 'videocam';
      default:
        return 'document';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={COLORS.notificationRed} />
        <Text style={styles.errorTitle}>Exame não encontrado</Text>
        <Text style={styles.errorText}>
          O exame solicitado não foi encontrado ou foi excluído.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleEdit}
          >
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={24} color={COLORS.notificationRed} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Exam Info */}
        <View style={styles.infoCard}>
          <View style={styles.examIcon}>
            <Ionicons name="document-text" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.examName}>{exam.name}</Text>
          
          {exam.examDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={16} color={COLORS.subtitle} />
              <Text style={styles.infoText}>
                Data: {formatDate(exam.examDate)}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time" size={16} color={COLORS.subtitle} />
            <Text style={styles.infoText}>
              Criado em: {formatDate(exam.createdAt)}
            </Text>
          </View>

          {exam.tags && exam.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={styles.tagsTitle}>Tags:</Text>
              <View style={styles.tagsList}>
                {exam.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        {exam.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{exam.notes}</Text>
            </View>
          </View>
        )}

        {/* Files */}
        {exam.uploadedFiles && exam.uploadedFiles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Arquivos ({exam.uploadedFiles.length})
            </Text>
            {exam.uploadedFiles.map((file, index) => (
              <TouchableOpacity
                key={index}
                style={styles.fileCard}
                onPress={() => handleOpenFile(file.filePath, file.metadata?.originalName || 'arquivo')}
              >
                <View style={styles.fileIcon}>
                  <Ionicons
                    name={getFileIcon(file.mediaType)}
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.metadata?.originalName || 'arquivo'}
                  </Text>
                  <Text style={styles.fileDetails}>
                    {file.mediaType.toUpperCase()} • {
                      file.metadata?.size ? formatFileSize(file.metadata.size) : 'Tamanho desconhecido'
                    }
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.subtitle} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.subtitle,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
  headerBackButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  examIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  examName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.subtitle,
    marginLeft: 8,
  },
  tagsContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  tagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginBottom: 12,
  },
  notesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  notesText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  fileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  fileDetails: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
});
