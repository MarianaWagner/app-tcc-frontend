import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { TermGuard } from '../components/TermGuard';
import { COLORS } from '../constants/colors';
import { apiClient, Exam, PrescriptionItem, PrescriptionStatus } from '../services/api';

type Attachment = {
  uri: string;
  name: string;
  type: string;
  size?: number;
};

type EditableItem = Omit<PrescriptionItem, 'id' | 'createdAt'>;

const STATUS_OPTIONS: { value: PrescriptionStatus; label: string }[] = [
  { value: 'em_uso', label: 'Em uso' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'suspensa', label: 'Suspensa' },
];

function AddPrescriptionContent() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [posology, setPosology] = useState('');
  const [status, setStatus] = useState<PrescriptionStatus>('em_uso');
  const [notes, setNotes] = useState('');
  const [professional, setProfessional] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isExamModalVisible, setExamModalVisible] = useState(false);

  useEffect(() => {
    const loadExams = async () => {
      try {
        const response = await apiClient.getExams({ limit: 100 });
        if (response.success) {
          const data = Array.isArray(response.data)
            ? response.data
            : (response.data as any)?.data ?? [];
          setExams(data as Exam[]);
        }
      } catch (error) {
        console.error('Erro ao carregar exames:', error);
      }
    };
    loadExams();
  }, []);

  const isValidFileType = (mimeType: string, fileName: string) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
    const normalizedMime = (mimeType || '').toLowerCase();
    const normalizedName = fileName.toLowerCase();
    return (
      normalizedMime === 'image/jpeg' ||
      normalizedMime === 'image/jpg' ||
      normalizedMime === 'image/png' ||
      normalizedMime === 'application/pdf' ||
      allowedExtensions.some((ext) => normalizedName.endsWith(ext))
    );
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (!isValidFileType(asset.mimeType || '', asset.name)) {
          Alert.alert(
            'Arquivo não suportado',
            'Apenas arquivos JPG, PNG ou PDF são permitidos.'
          );
          return;
        }
        setAttachment({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size,
        });
      }
    } catch (error) {
      console.error('Erro ao selecionar documento:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo.');
    }
  };

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão negada', 'É necessário permitir acesso às imagens.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        const mimeType = asset.type || 'image/jpeg';
        if (!isValidFileType(mimeType, fileName)) {
          Alert.alert(
            'Arquivo não suportado',
            'Apenas arquivos JPG, PNG ou PDF são permitidos.'
          );
          return;
        }
        setAttachment({
          uri: asset.uri,
          name: fileName,
          type: mimeType,
          size: asset.fileSize,
        });
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const formatDateInput = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const handleIssueDateChange = (value: string) => {
    setIssueDate(formatDateInput(value));
  };

  const convertToIsoDate = (value: string) => {
    if (value.length !== 10 || !value.includes('/')) {
      return null;
    }
    const [day, month, year] = value.split('/');
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: '',
        dosage: '',
        route: '',
        frequency: '',
        duration: '',
        notes: '',
      },
    ]);
  };

  const handleUpdateItem = (index: number, key: keyof EditableItem, value: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [key]: value,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Validação', 'Informe um título para a prescrição.');
      return false;
    }
    if (!issueDate.trim()) {
      Alert.alert('Validação', 'Informe a data de emissão.');
      return false;
    }
    const isoDate = convertToIsoDate(issueDate);
    if (!isoDate) {
      Alert.alert('Validação', 'Data de emissão inválida. Use o formato DD/MM/AAAA.');
      return false;
    }
    if (!posology.trim()) {
      Alert.alert('Validação', 'Descreva a posologia.');
      return false;
    }
    if (!attachment) {
      Alert.alert('Validação', 'Anexe o arquivo da prescrição (imagem ou PDF).');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const isoDate = convertToIsoDate(issueDate)!;
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('issueDate', isoDate);
      formData.append('posology', posology.trim());
      formData.append('status', status);

      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      if (professional.trim()) {
        formData.append('professional', professional.trim());
      }

      if (tagsInput.trim()) {
        const tags = tagsInput
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean);
        if (tags.length > 0) {
          formData.append('tags', JSON.stringify(tags));
        }
      }

      if (selectedExam) {
        formData.append('examId', selectedExam.id);
      }

      const filteredItems = items
        .map((item) => ({
          ...item,
          name: item.name?.trim() ?? '',
        }))
        .filter((item) => item.name);

      if (filteredItems.length > 0) {
        formData.append('items', JSON.stringify(filteredItems));
      }

      formData.append('attachment', {
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.type,
      } as any);

      const response = await apiClient.createPrescription(formData);

      if (response.success) {
        Alert.alert('Sucesso', 'Prescrição salva com sucesso!', [
          {
            text: 'OK',
            onPress: () => router.push('/prescriptions'),
          },
        ]);
      }
    } catch (error) {
      console.error('Erro ao criar prescrição:', error);
      Alert.alert('Erro', 'Não foi possível salvar a prescrição.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderExamModal = () => (
    <Modal
      visible={isExamModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setExamModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Selecionar exame</Text>
            <TouchableOpacity onPress={() => setExamModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.primaryDark} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {exams.length === 0 && (
              <Text style={styles.modalEmptyText}>Nenhum exame encontrado.</Text>
            )}
            {exams.map((exam) => (
              <TouchableOpacity
                key={exam.id}
                style={[
                  styles.modalItem,
                  selectedExam?.id === exam.id && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setSelectedExam(exam);
                  setExamModalVisible(false);
                }}
              >
                <Text style={styles.modalItemTitle}>{exam.name}</Text>
                {exam.examDate && (
                  <Text style={styles.modalItemSubtitle}>
                    {formatDate(exam.examDate)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalClearButton}
            onPress={() => {
              setSelectedExam(null);
              setExamModalVisible(false);
            }}
          >
            <Text style={styles.modalClearButtonText}>Remover vínculo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const formatDate = (date: string) => {
    try {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return date;
    }
  };

  const renderAttachment = () => {
    if (!attachment) {
      return (
        <Text style={styles.attachmentHint}>
          Anexe uma foto ou PDF da prescrição (máximo 20MB).
        </Text>
      );
    }
    return (
      <View style={styles.attachmentCard}>
        <View style={styles.attachmentInfo}>
          <Ionicons
            name={
              attachment.type.includes('pdf') ? 'document-text-outline' : 'image-outline'
            }
            size={20}
            color={COLORS.primary}
          />
          <View style={styles.attachmentDetails}>
            <Text style={styles.attachmentName} numberOfLines={1}>
              {attachment.name}
            </Text>
            {attachment.size && (
              <Text style={styles.attachmentSize}>{formatFileSize(attachment.size)}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => setAttachment(null)} style={styles.removeAttachment}>
          <Ionicons name="trash-outline" size={18} color={COLORS.notificationRed} />
        </TouchableOpacity>
      </View>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Prescrição</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados gerais</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Título *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Amoxicilina 500mg"
            />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.rowItem]}>
              <Text style={styles.label}>Data de emissão *</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                value={issueDate}
                onChangeText={handleIssueDateChange}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <View style={[styles.inputGroup, styles.rowItem]}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusContainer}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      status === option.value && styles.statusOptionActive,
                    ]}
                    onPress={() => setStatus(option.value)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        status === option.value && styles.statusOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Posologia *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={posology}
              onChangeText={setPosology}
              placeholder="Descreva a posologia conforme a prescrição..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Informações adicionais importantes..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Profissional</Text>
            <TextInput
              style={styles.input}
              value={professional}
              onChangeText={setProfessional}
              placeholder="Ex: Dra. Ana - Clínica Geral"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tags</Text>
            <TextInput
              style={styles.input}
              value={tagsInput}
              onChangeText={setTagsInput}
              placeholder="Ex: antibiótico, uso contínuo"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>Separe as tags por vírgula.</Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relacionar com exame</Text>
            <TouchableOpacity
              style={styles.examSelector}
              onPress={() => setExamModalVisible(true)}
            >
              <Ionicons name="link-outline" size={18} color={COLORS.primaryDark} />
              <Text style={styles.examSelectorText}>
                {selectedExam ? selectedExam.name : 'Vincular a um exame existente'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicamentos da prescrição</Text>
          {items.length === 0 && (
            <Text style={styles.helperText}>
              Adicione medicamentos para detalhar dosagem, frequência e duração da prescrição.
            </Text>
          )}
          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Medicamento {index + 1}</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.notificationRed} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={item.name}
                onChangeText={(text) => handleUpdateItem(index, 'name', text)}
                placeholder="Nome do medicamento *"
              />
              <TextInput
                style={styles.input}
                value={item.dosage ?? ''}
                onChangeText={(text) => handleUpdateItem(index, 'dosage', text)}
                placeholder="Dosagem (ex: 500mg)"
              />
              <TextInput
                style={styles.input}
                value={item.route ?? ''}
                onChangeText={(text) => handleUpdateItem(index, 'route', text)}
                placeholder="Via de administração (ex: oral)"
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.rowItem]}
                  value={item.frequency ?? ''}
                  onChangeText={(text) => handleUpdateItem(index, 'frequency', text)}
                  placeholder="Frequência (ex: 8/8h)"
                />
                <TextInput
                  style={[styles.input, styles.rowItem]}
                  value={item.duration ?? ''}
                  onChangeText={(text) => handleUpdateItem(index, 'duration', text)}
                  placeholder="Duração (ex: 7 dias)"
                />
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={item.notes ?? ''}
                onChangeText={(text) => handleUpdateItem(index, 'notes', text)}
                placeholder="Observações"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          ))}
          <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
            <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
            <Text style={styles.addItemButtonText}>Adicionar medicamento</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anexo da prescrição *</Text>
          {renderAttachment()}
          <View style={styles.attachmentActions}>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickDocument}>
              <Ionicons name="document-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.attachButtonText}>Selecionar arquivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachButton} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.attachButtonText}>Selecionar foto</Text>
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

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Salvando...' : 'Salvar prescrição'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {renderExamModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
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
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  statusOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusOptionText: {
    fontSize: 13,
    color: COLORS.primaryDark,
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: COLORS.white,
  },
  examSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  examSelectorText: {
    fontSize: 14,
    color: COLORS.primaryDark,
    flex: 1,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
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
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  addItemButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  attachmentHint: {
    fontSize: 13,
    color: COLORS.subtitle,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COLORS.background,
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
    marginTop: 2,
  },
  removeAttachment: {
    padding: 6,
  },
  attachmentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  attachButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  attachButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primaryDark,
  },
  warningBox: {
    borderRadius: 12,
    backgroundColor: '#FFF4E5',
    borderWidth: 1,
    borderColor: '#FFDDB0',
    padding: 16,
    gap: 12,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  modalList: {
    maxHeight: 300,
  },
  modalEmptyText: {
    fontSize: 14,
    color: COLORS.subtitle,
    padding: 12,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemSelected: {
    backgroundColor: COLORS.background,
  },
  modalItemTitle: {
    fontSize: 16,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  modalItemSubtitle: {
    fontSize: 13,
    color: COLORS.subtitle,
  },
  modalClearButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalClearButtonText: {
    fontSize: 14,
    color: COLORS.notificationRed,
    fontWeight: '600',
  },
});

export default function AddPrescription() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <AddPrescriptionContent />
    </TermGuard>
  );
}

