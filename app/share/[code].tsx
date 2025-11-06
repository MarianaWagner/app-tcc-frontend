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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { apiClient } from '../../services/api';
import { formatDateDDMMYYYY } from '../../utils/dateFormatter';

interface ShareExam {
  id: string;
  name: string;
  examDate?: string;
  notes?: string;
  tags?: string[];
  files?: Array<{
    id: string;
    mediaType: string;
    fileName: string;
    fileSize: number;
    downloadUrl: string;
  }>;
  hasPdf: boolean;
}

interface ShareInfo {
  code: string;
  exams: ShareExam[];
  expiresAt: string;
  maxUses: number;
  timesUsed: number;
  downloadAllUrl?: string;
  isRevoked?: boolean;
  isExpired?: boolean;
  isMaxUsesReached?: boolean;
}

export default function ShareScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'files'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      loadShareInfo();
    }
  }, [code]);

  const loadShareInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getShareByCode(code!);
      if (response.success) {
        const shareData = response.data as any;
        setShareInfo({
          code: shareData.code || code!,
          exams: shareData.exams || [],
          expiresAt: shareData.expiresAt,
          maxUses: shareData.maxUses,
          timesUsed: shareData.timesUsed,
          downloadAllUrl: shareData.downloadAllUrl,
        });
      } else {
        setError(response.message || 'Link de compartilhamento inválido ou expirado.');
      }
    } catch (err: any) {
      console.error('Error loading share info:', err);
      setError(err.message || 'Falha ao carregar compartilhamento. Verifique se o link está correto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.requestShareAccess(code!, email);
      if (response.success) {
        Alert.alert('Código enviado', 'Verifique seu e-mail para o código de verificação');
        setStep('otp');
      } else {
        setError(response.message || 'Falha ao solicitar acesso');
      }
    } catch (err: any) {
      console.error('Error requesting access:', err);
      // Verificar se é erro de e-mail não correspondente
      if (err.message?.includes('email') || err.message?.includes('Email')) {
        setError('O e-mail informado não corresponde ao e-mail do compartilhamento.');
      } else {
        setError(err.message || 'Falha ao solicitar acesso. Verifique o e-mail informado.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Erro', 'Por favor, insira o código de 6 dígitos');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.validateShareOTP(code!, email, otp);
      if (response.success && response.data?.accessToken) {
        setAccessToken(response.data.accessToken);
        setStep('files');
        // loadFiles(response.data.accessToken); // This line is removed as per the new_code
      } else {
        setError(response.message || 'Código inválido ou expirado');
      }
    } catch (err: any) {
      console.error('Error validating OTP:', err);
      // Verificar se é erro de OTP inválido
      if (err.message?.includes('OTP') || err.message?.includes('código') || err.message?.includes('invalid')) {
        setError('Código OTP inválido ou expirado. Solicite um novo código.');
      } else {
        setError(err.message || 'Código inválido ou expirado');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (mediaId: string, fileName: string) => {
    if (!accessToken || !code) return;

    try {
      const downloadUrl = `http://192.168.1.8:5001/s/${code}/files/${mediaId}/download`;
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Erro', 'Não foi possível baixar o arquivo');
      }
    } catch (err: any) {
      console.error('Error downloading file:', err);
      Alert.alert('Erro', err.message || 'Falha ao baixar arquivo');
    }
  };

  const handleDownloadAll = async () => {
    if (!accessToken || !code || !shareInfo?.downloadAllUrl) return;

    try {
      const downloadUrl = `http://192.168.1.8:5001/s/${code}/download-all`;
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Erro', 'Não foi possível baixar os arquivos');
      }
    } catch (err: any) {
      console.error('Error downloading all files:', err);
      Alert.alert('Erro', err.message || 'Falha ao baixar arquivos');
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateDDMMYYYY(dateString);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const hasFiles = shareInfo?.exams.some(exam => exam.files && exam.files.length > 0);

  if (isLoading && !shareInfo) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Verificar se o link está inválido, expirado ou revogado
  if (shareInfo && (shareInfo.isRevoked || shareInfo.isExpired || shareInfo.isMaxUsesReached)) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.notificationRed} />
          <Text style={styles.errorTitle}>Compartilhamento Indisponível</Text>
          <Text style={styles.errorText}>
            {shareInfo.isRevoked 
              ? 'Este compartilhamento foi revogado pelo proprietário.'
              : shareInfo.isExpired
              ? 'Este compartilhamento expirou.'
              : 'Este compartilhamento atingiu o limite máximo de usos.'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (error && !shareInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={COLORS.notificationRed} />
          <Text style={styles.errorTitle}>Erro</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={loadShareInfo}>
            <Text style={styles.buttonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {shareInfo && shareInfo.exams.length > 0 && (
          <View style={styles.examsInfo}>
            <Text style={styles.examsTitle}>
              {shareInfo.exams.length} {shareInfo.exams.length === 1 ? 'exame compartilhado' : 'exames compartilhados'}
            </Text>
            {shareInfo.expiresAt && (
              <Text style={styles.shareInfo}>
                Expira em: {formatDate(shareInfo.expiresAt)}
              </Text>
            )}
          </View>
        )}

        {/* Lista de exames */}
        {step === 'files' && shareInfo && (
          <>
            {shareInfo.exams.map((exam) => (
              <View key={exam.id} style={styles.examCard}>
                <View style={styles.examHeader}>
                  <Ionicons name="document-text" size={32} color={COLORS.primary} />
                  <View style={styles.examHeaderText}>
                    <Text style={styles.examName}>{exam.name}</Text>
                    {exam.examDate && (
                      <Text style={styles.examDate}>Data: {formatDate(exam.examDate)}</Text>
                    )}
                  </View>
                </View>
                
                {exam.notes && (
                  <View style={styles.examNotesContainer}>
                    <Text style={styles.examNotes}>{exam.notes}</Text>
                  </View>
                )}

                {exam.files && exam.files.length > 0 ? (
                  <View style={styles.filesContainer}>
                    <Text style={styles.filesTitle}>Arquivos ({exam.files.length}):</Text>
                    {exam.files.map((file) => (
                      <TouchableOpacity
                        key={file.id}
                        style={styles.fileItem}
                        onPress={() => handleDownload(file.id, file.fileName)}
                      >
                        <View style={styles.fileIconContainer}>
                          <Ionicons
                            name={file.mediaType === 'pdf' ? 'document-text' : 'document'}
                            size={24}
                            color={COLORS.primary}
                          />
                        </View>
                        <View style={styles.fileInfo}>
                          <Text style={styles.fileName} numberOfLines={2}>
                            {file.fileName}
                          </Text>
                          <Text style={styles.fileSize}>
                            {formatFileSize(file.fileSize)}
                          </Text>
                        </View>
                        <Ionicons name="download-outline" size={24} color={COLORS.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noFilesContainer}>
                    <Text style={styles.noFilesText}>PDF não disponível</Text>
                  </View>
                )}
              </View>
            ))}

            {/* Botão Download Tudo */}
            {hasFiles && (
              <TouchableOpacity
                style={styles.downloadAllButton}
                onPress={handleDownloadAll}
              >
                <Ionicons name="download" size={24} color={COLORS.white} />
                <Text style={styles.downloadAllButtonText}>Baixar Tudo (ZIP)</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Steps de email e OTP mantêm o código existente */}
        {step === 'email' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Verificação de E-mail</Text>
            <Text style={styles.stepDescription}>
              Digite o e-mail para o qual este compartilhamento foi criado
            </Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRequestAccess}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Enviar código</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Código de Verificação</Text>
            <Text style={styles.stepDescription}>
              Digite o código de 6 dígitos enviado para {email}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleValidateOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verificar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setStep('email');
                setOtp('');
                setError(null);
              }}
            >
              <Text style={styles.linkText}>Voltar e reenviar código</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  examInfo: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  examDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  shareInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  stepContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
  },
  errorText: {
    color: COLORS.notificationRed,
    fontSize: 14,
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.notificationRed,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  examsInfo: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  examCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  examHeaderText: {
    flex: 1,
  },
  examNotesContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  examNotes: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  filesContainer: {
    marginTop: 8,
  },
  filesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 4,
  },
  noFilesContainer: {
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    alignItems: 'center',
  },
  noFilesText: {
    fontSize: 14,
    color: COLORS.subtitle,
    fontStyle: 'italic',
  },
  downloadAllButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  downloadAllButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

