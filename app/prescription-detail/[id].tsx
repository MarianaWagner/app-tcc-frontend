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
import { apiClient, Prescription, PrescriptionStatus } from '../../services/api';
import { formatDateDDMMYYYY } from '../../utils/dateFormatter';

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

function PrescriptionDetailContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    const loadPrescription = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const response = await apiClient.getPrescription(id);
        if (!response.success) {
          throw new Error(response.message || 'Falha ao carregar prescrição.');
        }
        setPrescription(response.data as Prescription);
      } catch (error) {
        console.error('Erro ao carregar prescrição:', error);
        Alert.alert('Erro', 'Não foi possível carregar a prescrição.');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    loadPrescription();
  }, [id, router]);

  const handleDownloadAttachment = async () => {
    if (!id || !prescription) return;

    try {
      setIsDownloading(true);
      const url = await apiClient.getPrescriptionDownloadUrl(id);
      const token = apiClient.getToken();
      if (!token) {
        Alert.alert('Sessão expirada', 'Faça login novamente para baixar o arquivo.');
        return;
      }

      const fileName =
        prescription.attachment?.metadata?.originalName ||
        `${prescription.title.replace(/\s+/g, '_')}.pdf`;
      const downloadUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(url, downloadUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (downloadResult.status !== 200) {
        throw new Error(`Falha no download. Status ${downloadResult.status}`);
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri);
      } else {
        Alert.alert('Download concluído', `Arquivo salvo em ${downloadResult.uri}`);
      }
    } catch (error) {
      console.error('Erro ao baixar anexo:', error);
      Alert.alert('Erro', 'Não foi possível baixar o anexo. Tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!id) return;
    Alert.alert(
      'Excluir prescrição',
      'Deseja realmente excluir esta prescrição?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.deletePrescription(id);
              Alert.alert('Sucesso', 'Prescrição excluída.', [
                { text: 'OK', onPress: () => router.replace('/prescriptions') },
              ]);
            } catch (error) {
              console.error('Erro ao excluir prescrição:', error);
              Alert.alert('Erro', 'Não foi possível excluir a prescrição.');
            }
          },
        },
      ]
    );
  };

  if (isLoading || !prescription) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando prescrição...</Text>
      </View>
    );
  }

  const statusPalette = STATUS_COLORS[prescription.status];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes da Prescrição</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/edit-prescription/${id}`)}
        >
          <Ionicons name="create-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{prescription.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusPalette.background }]}>
              <Text style={[styles.statusBadgeText, { color: statusPalette.text }]}>
                {STATUS_LABELS[prescription.status]}
              </Text>
            </View>
          </View>
          <Text style={styles.issueDate}>
            Emitida em {formatDateDDMMYYYY(prescription.issueDate)}
          </Text>
          {prescription.professional && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.infoText}>{prescription.professional}</Text>
            </View>
          )}
          {prescription.tags && prescription.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {prescription.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          {prescription.examId && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push(`/exam-detail/${prescription.examId}`)}
            >
              <Ionicons name="link-outline" size={18} color={COLORS.primary} />
              <Text style={styles.linkButtonText}>Ver exame vinculado</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posologia</Text>
          <Text style={styles.sectionContent}>{prescription.posology}</Text>
        </View>

        {prescription.items && prescription.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medicamentos</Text>
            {prescription.items.map((item, index) => (
              <View key={item.id ?? index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.itemIndex}>#{index + 1}</Text>
                </View>
                {item.dosage && <Text style={styles.itemDetail}>Dosagem: {item.dosage}</Text>}
                {item.route && <Text style={styles.itemDetail}>Via: {item.route}</Text>}
                {item.frequency && (
                  <Text style={styles.itemDetail}>Frequência: {item.frequency}</Text>
                )}
                {item.duration && <Text style={styles.itemDetail}>Duração: {item.duration}</Text>}
                {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {prescription.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.sectionContent}>{prescription.notes}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anexo</Text>
          <View style={styles.attachmentCard}>
            <View style={styles.attachmentInfo}>
              <Ionicons name="document-attach-outline" size={22} color={COLORS.primary} />
              <View style={styles.attachmentDetails}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {prescription.attachment?.metadata?.originalName || 'Arquivo da prescrição'}
                </Text>
                {prescription.attachment?.metadata?.size && (
                  <Text style={styles.attachmentSize}>
                    {(prescription.attachment.metadata.size / 1024).toFixed(1)} KB
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.downloadButton, isDownloading && styles.downloadButtonDisabled]}
              onPress={handleDownloadAttachment}
              disabled={isDownloading}
            >
              <Ionicons name="cloud-download-outline" size={18} color={COLORS.white} />
              <Text style={styles.downloadButtonText}>
                {isDownloading ? 'Baixando...' : 'Baixar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Importante</Text>
          <Text style={styles.warningText}>
            Este registro é pessoal e não substitui uma prescrição médica oficial. Os dados
            inseridos são de responsabilidade exclusiva do usuário e não substituem orientações
            médicas profissionais.
          </Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={COLORS.notificationRed} />
          <Text style={styles.deleteButtonText}>Excluir prescrição</Text>
        </TouchableOpacity>
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
    marginTop: 12,
    fontSize: 16,
    color: COLORS.subtitle,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
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
  editButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryDark,
    flex: 1,
    marginRight: 12,
  },
  issueDate: {
    fontSize: 14,
    color: COLORS.subtitle,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  sectionContent: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: COLORS.background,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  itemIndex: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  itemDetail: {
    fontSize: 14,
    color: COLORS.text,
  },
  itemNotes: {
    fontSize: 13,
    color: COLORS.subtitle,
  },
  attachmentCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: COLORS.background,
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  attachmentDetails: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  attachmentSize: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
  },
  downloadButtonDisabled: {
    opacity: 0.6,
  },
  downloadButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  warningBox: {
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: '#FFDDB0',
    padding: 16,
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#B26A00',
  },
  warningText: {
    fontSize: 13,
    color: '#B26A00',
    lineHeight: 18,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.notificationRed,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  deleteButtonText: {
    color: COLORS.notificationRed,
    fontWeight: '600',
  },
});

export default function PrescriptionDetail() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <PrescriptionDetailContent />
    </TermGuard>
  );
}

