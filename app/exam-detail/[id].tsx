import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { TermGuard } from '../../components/TermGuard';
import { COLORS } from '../../constants/colors';
import { apiClient, Exam, ExamMedia } from '../../services/api';
import { formatDateDDMMYYYY } from '../../utils/dateFormatter';

function ExamDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [examFiles, setExamFiles] = useState<ExamMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadExamDetail();
      loadExamFiles();
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
    if (id) {
      router.push(`/edit-exam/${id}`);
    }
  };

  const loadExamFiles = async () => {
    if (!id) return;
    try {
      setIsLoadingFiles(true);
      const response = await apiClient.getExamMedia(id);
      if (response.success) {
        // A resposta pode vir como array direto ou como { data: [...], pagination: {...} }
        const data = response.data as any;
        const filesData = Array.isArray(data) ? data : (data?.data || []);
        setExamFiles(Array.isArray(filesData) ? filesData : []);
      }
    } catch (error) {
      console.error('Error loading exam files:', error);
      setExamFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDownloadFile = async (mediaId: string, fileName: string) => {
    try {
      setDownloadingFileId(mediaId);
      const downloadUrl = await apiClient.downloadExamMedia(mediaId);
      const token = apiClient.getToken();
      
      if (!token) {
        Alert.alert('Sessão expirada', 'Faça login novamente para baixar o arquivo.');
        return;
      }

      // Sanitizar o nome do arquivo para evitar problemas com caracteres especiais
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const downloadUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${safeFileName}`;

      // Fazer download do arquivo com o token de autenticação
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, downloadUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (downloadResult.status !== 200) {
        throw new Error(`Falha no download. Status ${downloadResult.status}`);
      }

      // Tentar compartilhar/abrir o arquivo baixado
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert('Download concluído', `Arquivo salvo em ${downloadResult.uri}`);
      }
    } catch (error: any) {
      console.error('Error downloading file:', error);
      Alert.alert('Erro', 'Não foi possível baixar o arquivo. Verifique sua conexão e tente novamente.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateDDMMYYYY(dateString);
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Arquivos ({examFiles.length})
          </Text>
          {isLoadingFiles ? (
            <View style={styles.loadingFilesContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingFilesText}>Carregando arquivos...</Text>
            </View>
          ) : examFiles.length === 0 ? (
            <View style={styles.emptyFilesContainer}>
              <Ionicons name="document-outline" size={48} color={COLORS.subtitle} />
              <Text style={styles.emptyFilesTitle}>Nenhum arquivo enviado</Text>
              <Text style={styles.emptyFilesText}>
                Você ainda não enviou arquivos para este exame
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => router.push(`/add-exam?id=${id}`)}
              >
                <Ionicons name="cloud-upload-outline" size={20} color={COLORS.white} />
                <Text style={styles.uploadButtonText}>Enviar Arquivo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            examFiles.map((file) => (
              <TouchableOpacity
                key={file.id}
                style={[styles.fileCard, downloadingFileId === file.id && styles.fileCardDownloading]}
                onPress={() => handleDownloadFile(file.id, file.metadata?.originalName || 'arquivo')}
                disabled={downloadingFileId === file.id}
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
                  <View style={styles.fileDetailsRow}>
                    <Text style={styles.fileDetails}>
                      {file.mediaType?.toUpperCase() || 'ARQUIVO'}
                    </Text>
                    {file.metadata?.size && (
                      <Text style={styles.fileDetails}>
                        • {formatFileSize(file.metadata.size)}
                      </Text>
                    )}
                    {file.createdAt && (
                      <Text style={styles.fileDetails}>
                        • {formatDateDDMMYYYY(file.createdAt)}
                      </Text>
                    )}
                  </View>
                </View>
                {downloadingFileId === file.id ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Ionicons name="download-outline" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
  },
  infoIcon: {
    padding: 4,
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
  loadingFilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingFilesText: {
    fontSize: 14,
    color: COLORS.subtitle,
  },
  emptyFilesContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  emptyFilesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyFilesText: {
    fontSize: 14,
    color: COLORS.subtitle,
    textAlign: 'center',
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
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
  fileDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  fileCardDownloading: {
    opacity: 0.6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});

export default function ExamDetail() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <ExamDetailContent />
    </TermGuard>
  );
}
