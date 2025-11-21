import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { apiClient, Exam } from '../services/api';
import { formatDateDDMMYYYY } from '../utils/dateFormatter';

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  exams: Exam[];
  selectedExamIds: string[];
  onShareSuccess?: () => void;
}

export function ShareModal({
  visible,
  onClose,
  exams,
  selectedExamIds,
  onShareSuccess,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedExams = exams.filter(exam => selectedExamIds.includes(exam.id));

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleShare = async () => {
    setError(null);

    // Validações
    if (selectedExamIds.length === 0) {
      setError('Selecione pelo menos um exame para compartilhar');
      return;
    }

    if (!email.trim()) {
      setError('O e-mail é obrigatório');
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Por favor, insira um e-mail válido');
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiClient.createShareLink({
        examIds: selectedExamIds,
        email: email.trim(),
        message: message.trim() || undefined,
        expiresInDays: 7,
        maxUses: 1,
      });

      if (response.success) {
        Alert.alert(
          'Sucesso!',
          `Link gerado e enviado para ${email.trim()}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setEmail('');
                setMessage('');
                setError(null);
                onShareSuccess?.();
                onClose();
              },
            },
          ]
        );
      } else {
        setError(response.message || 'Falha ao criar compartilhamento');
      }
    } catch (err: any) {
      console.error('Error sharing exams:', err);
      setError(err.message || 'Falha ao criar compartilhamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateDDMMYYYY(dateString);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Compartilhar Exames</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Resumo dos exames selecionados */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>
                {selectedExamIds.length} {selectedExamIds.length === 1 ? 'exame selecionado' : 'exames selecionados'}
              </Text>
              {selectedExams.slice(0, 3).map((exam) => (
                <View key={exam.id} style={styles.examPreview}>
                  <Ionicons name="document-text" size={16} color={COLORS.primary} />
                  <Text style={styles.examPreviewName} numberOfLines={1}>
                    {exam.name}
                  </Text>
                  {exam.examDate && (
                    <Text style={styles.examPreviewDate}>
                      {formatDate(exam.examDate)}
                    </Text>
                  )}
                </View>
              ))}
              {selectedExamIds.length > 3 && (
                <Text style={styles.moreExamsText}>
                  +{selectedExamIds.length - 3} outro(s) exame(s)
                </Text>
              )}
            </View>

            {/* Campo de E-mail */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-mail do destinatário *</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="exemplo@email.com"
                placeholderTextColor={COLORS.subtitle}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setError(null);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Campo de Mensagem (opcional) */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mensagem (opcional)</Text>
              <TextInput
                style={[styles.textArea, error && styles.inputError]}
                placeholder="Adicione uma mensagem para o destinatário..."
                placeholderTextColor={COLORS.subtitle}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                maxLength={1000}
                editable={!isLoading}
              />
              <Text style={styles.charCount}>{message.length}/1000</Text>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={COLORS.notificationRed} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Informações adicionais */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.subtitle} />
                <Text style={styles.infoText}>
                  O link expira em 7 dias
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={16} color={COLORS.subtitle} />
                <Text style={styles.infoText}>
                  Um e-mail será enviado ao destinatário
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer com botões */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.shareButton, isLoading && styles.buttonDisabled]}
              onPress={handleShare}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={20} color={COLORS.white} />
                  <Text style={styles.shareButtonText}>Enviar Link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  summaryContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  examPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  examPreviewName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  examPreviewDate: {
    fontSize: 12,
    color: COLORS.subtitle,
  },
  moreExamsText: {
    fontSize: 12,
    color: COLORS.subtitle,
    fontStyle: 'italic',
    marginTop: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  inputError: {
    borderColor: COLORS.notificationRed,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.subtitle,
    textAlign: 'right',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.notificationRed,
  },
  infoContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.subtitle,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  shareButton: {
    backgroundColor: COLORS.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
