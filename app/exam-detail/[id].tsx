import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { TermGuard } from '../../components/TermGuard';
import { COLORS } from '../../constants/colors';
import { apiClient, Exam, ExamMedia, ShareLink } from '../../services/api';
import { formatDateDDMMYYYY } from '../../utils/dateFormatter';

function ExamDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [examFiles, setExamFiles] = useState<ExamMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareExpiresInDays, setShareExpiresInDays] = useState('7');
  const [shareMaxUses, setShareMaxUses] = useState('1');
  const [isCreatingShare, setIsCreatingShare] = useState(false);

  useEffect(() => {
    if (id) {
      loadExamDetail();
      loadExamFiles();
      loadShareLinks();
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
        // A resposta vem como { data: [...], pagination: {...} }
        const filesData = response.data?.data || response.data || [];
        setExamFiles(Array.isArray(filesData) ? filesData : []);
      }
    } catch (error) {
      console.error('Error loading exam files:', error);
      setExamFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const loadShareLinks = async () => {
    if (!id) return;
    try {
      const response = await apiClient.getShareLinks(id);
      if (response.success) {
        setShareLinks(response.data || []);
      }
    } catch (error: any) {
      console.error('Error loading share links:', error);
      // Não mostrar erro para o usuário, apenas logar
    }
  };

  const handleCreateShare = async () => {
    if (!shareEmail || !shareEmail.includes('@')) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido');
      return;
    }

    try {
      setIsCreatingShare(true);
      const response = await apiClient.createShareLink({
        examId: id!,
        email: shareEmail,
        expiresInDays: parseInt(shareExpiresInDays) || 7,
        maxUses: parseInt(shareMaxUses) || 1,
      });
      if (response.success) {
        Alert.alert('Sucesso', 'Compartilhamento criado com sucesso!');
        setShowShareModal(false);
        setShareEmail('');
        loadShareLinks();
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar o compartilhamento.');
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handleCopyLink = async (shareUrl: string) => {
    try {
      await Clipboard.setString(shareUrl);
      Alert.alert('Sucesso', 'Link copiado para a área de transferência!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar o link.');
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    Alert.alert(
      'Confirmar revogação',
      'Tem certeza que deseja revogar este compartilhamento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revogar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.revokeShareLink(shareId);
              Alert.alert('Sucesso', 'Compartilhamento revogado.');
              loadShareLinks();
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Não foi possível revogar o compartilhamento.');
            }
          },
        },
      ]
    );
  };

  const handleDownloadFile = async (mediaId: string, fileName: string) => {
    try {
      const downloadUrl = await apiClient.downloadExamMedia(mediaId);
      const token = apiClient.getToken();
      
      // Para React Native, fazer fetch com token e depois tentar abrir
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      });

      if (!response.ok) {
        // Se falhar, tentar abrir diretamente (pode funcionar se o token estiver no cookie ou header)
        const supported = await Linking.canOpenURL(downloadUrl);
        if (supported) {
          await Linking.openURL(downloadUrl);
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
      }

      // Se a resposta for OK, tentar abrir a URL diretamente
      // O backend vai servir o arquivo com os headers corretos
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Erro', 'Não é possível abrir este arquivo.');
      }
    } catch (error: any) {
      console.error('Error downloading file:', error);
      // Se falhar, tentar abrir a URL diretamente como fallback
      try {
        const downloadUrl = await apiClient.downloadExamMedia(mediaId);
        const supported = await Linking.canOpenURL(downloadUrl);
        if (supported) {
          await Linking.openURL(downloadUrl);
        } else {
          Alert.alert('Erro', 'Não foi possível baixar o arquivo. Verifique sua conexão e tente novamente.');
        }
      } catch (retryError) {
        Alert.alert('Erro', 'Não foi possível baixar o arquivo. Verifique sua conexão e tente novamente.');
      }
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
            onPress={() => setShowShareModal(true)}
          >
            <Ionicons name="share-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
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
                style={styles.fileCard}
                onPress={() => handleDownloadFile(file.id, file.metadata?.originalName || 'arquivo')}
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
                <Ionicons name="download-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Share Links */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Compartilhamentos ({shareLinks.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {shareLinks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="link-outline" size={32} color={COLORS.subtitle} />
              <Text style={styles.emptyText}>Nenhum compartilhamento criado</Text>
            </View>
          ) : (
            shareLinks.map((share) => (
              <View key={share.id} style={styles.shareCard}>
                <View style={styles.shareInfo}>
                  <Text style={styles.shareEmail}>{share.email}</Text>
                  <Text style={styles.shareDetails}>
                    Usos: {share.timesUsed}/{share.maxUses} • Expira em: {formatDate(share.expiresAt)}
                  </Text>
                  {share.isRevoked && (
                    <Text style={styles.revokedText}>Revogado</Text>
                  )}
                  {share.isExpired && (
                    <Text style={styles.expiredText}>Expirado</Text>
                  )}
                </View>
                <View style={styles.shareActions}>
                  {share.isActive && (
                    <>
                      <TouchableOpacity
                        style={styles.shareActionButton}
                        onPress={() => handleCopyLink(`http://192.168.1.8:5001${share.shareUrl}`)}
                      >
                        <Ionicons name="copy-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.shareActionButton}
                        onPress={() => handleRevokeShare(share.id)}
                      >
                        <Ionicons name="close-circle-outline" size={20} color={COLORS.notificationRed} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Compartilhar Exame</Text>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="E-mail do destinatário"
              value={shareEmail}
              onChangeText={setShareEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Dias até expirar (padrão: 7)"
              value={shareExpiresInDays}
              onChangeText={setShareExpiresInDays}
              keyboardType="number-pad"
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Máximo de usos (padrão: 1)"
              value={shareMaxUses}
              onChangeText={setShareMaxUses}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[styles.modalButton, isCreatingShare && styles.modalButtonDisabled]}
              onPress={handleCreateShare}
              disabled={isCreatingShare}
            >
              {isCreatingShare ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalButtonText}>Criar Compartilhamento</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    padding: 8,
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.subtitle,
    marginTop: 12,
  },
  shareCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  shareInfo: {
    flex: 1,
  },
  shareEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  shareDetails: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  revokedText: {
    fontSize: 12,
    color: COLORS.notificationRed,
    marginTop: 4,
    fontWeight: '500',
  },
  expiredText: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 4,
    fontWeight: '500',
  },
  shareActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shareActionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default function ExamDetail() {
  return (
    <TermGuard>
      <ExamDetailContent />
    </TermGuard>
  );
}
