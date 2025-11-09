import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
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
import { apiClient } from '../services/api';

interface UploadedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

function AddExamContent() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isValidFileType = (mimeType: string, fileName: string): boolean => {
    const lowerMimeType = mimeType.toLowerCase();
    const lowerFileName = fileName.toLowerCase();
    
    // Aceitar apenas JPG, PNG e PDF
    return (
      lowerMimeType === 'image/jpeg' ||
      lowerMimeType === 'image/jpg' ||
      lowerMimeType === 'image/png' ||
      lowerMimeType === 'application/pdf' ||
      lowerFileName.endsWith('.jpg') ||
      lowerFileName.endsWith('.jpeg') ||
      lowerFileName.endsWith('.png') ||
      lowerFileName.endsWith('.pdf')
    );
  };

  const handleSelectImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const validFiles: UploadedFile[] = [];
        const invalidFiles: string[] = [];

        result.assets.forEach(asset => {
          const fileName = asset.fileName || `image_${Date.now()}.jpg`;
          const mimeType = asset.type || 'image/jpeg';
          
          if (isValidFileType(mimeType, fileName)) {
            validFiles.push({
              uri: asset.uri,
              name: fileName,
              type: mimeType,
              size: asset.fileSize || 0,
            });
          } else {
            invalidFiles.push(fileName);
          }
        });

        if (invalidFiles.length > 0) {
          Alert.alert(
            'Arquivo não suportado',
            `Os seguintes arquivos não são suportados: ${invalidFiles.join(', ')}\n\nApenas arquivos JPG, PNG e PDF são permitidos.`
          );
        }

        if (validFiles.length > 0) {
          setFiles(prev => [...prev, ...validFiles]);
        }
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Erro', 'Não foi possível selecionar as imagens.');
    }
  };

  const handleSelectDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const validFiles: UploadedFile[] = [];
        const invalidFiles: string[] = [];

        result.assets.forEach(asset => {
          const mimeType = asset.mimeType || 'application/octet-stream';
          
          if (isValidFileType(mimeType, asset.name)) {
            validFiles.push({
              uri: asset.uri,
              name: asset.name,
              type: mimeType,
              size: asset.size || 0,
            });
          } else {
            invalidFiles.push(asset.name);
          }
        });

        if (invalidFiles.length > 0) {
          Alert.alert(
            'Arquivo não suportado',
            `Os seguintes arquivos não são suportados: ${invalidFiles.join(', ')}\n\nApenas arquivos JPG, PNG e PDF são permitidos.`
          );
        }

        if (validFiles.length > 0) {
          setFiles(prev => [...prev, ...validFiles]);
        }
      }
    } catch (error) {
      console.error('Error selecting documents:', error);
      Alert.alert('Erro', 'Não foi possível selecionar os documentos.');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do exame.');
      return;
    }

    if (!examDate || examDate.length !== 10) {
      Alert.alert('Erro', 'Por favor, preencha a data do exame no formato DD/MM/AAAA.');
      return;
    }

    try {
      setIsLoading(true);

      // Converter data DD/MM/AAAA para AAAA-MM-DD
      const formattedDate = examDate ? convertDateToBackendFormat(examDate) : null;

      if (files.length > 0) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('name', name);
        if (formattedDate) formData.append('examDate', formattedDate);
        if (notes) formData.append('notes', notes);
        if (tags) {
          const tagsArray = tags.split(',')
            .map(tag => tag.trim().toUpperCase())
            .filter(tag => tag);
          // Envia cada tag individualmente para o backend
          tagsArray.forEach((tag, index) => {
            formData.append(`tags[${index}]`, tag);
          });
        }

        // Add files
        files.forEach((file, index) => {
          formData.append('files', {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any);
        });

          const response = await apiClient.uploadExamWithFiles(formData);
          console.log('Create exam response:', response);
          if (response.success) {
            Alert.alert(
              'Sucesso', 
              'Exame criado com sucesso!',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setTimeout(() => {
                      router.back();
                    }, 500);
                  }
                }
              ]
            );
          }
      } else {
        // Create exam without files
        const examData: any = { name };
        if (formattedDate) examData.examDate = formattedDate;
        if (notes) examData.notes = notes;
        if (tags) {
          examData.tags = tags.split(',')
          .map(tag => tag.trim().toUpperCase())
          .filter(tag => tag);
        }

          const response = await apiClient.createExam(examData);
          console.log('Create exam response:', response);
          if (response.success) {
            Alert.alert(
              'Sucesso', 
              'Exame criado com sucesso!',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setTimeout(() => {
                      router.back();
                    }, 500);
                  }
                }
              ]
            );
          }
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      Alert.alert('Erro', 'Não foi possível criar o exame.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateInput = (text: string) => {
    // Remove tudo que não é número
    const numbers = text.replace(/\D/g, '');
    
    // Limita a 8 dígitos (DDMMAAAA)
    const limited = numbers.slice(0, 8);
    
    // Formata com barras
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setExamDate(formatted);
  };

  const convertDateToBackendFormat = (dateStr: string) => {
    // Converte DD/MM/AAAA para AAAA-MM-DD
    if (dateStr.length === 10 && dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      
      // Validar que é uma data válida
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      // Validações básicas
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
        return null;
      }
      if (monthNum < 1 || monthNum > 12) {
        return null;
      }
      if (dayNum < 1 || dayNum > 31) {
        return null;
      }
      if (yearNum < 1900 || yearNum > 2100) {
        return null;
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adicionar Exame</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nome do Exame *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Hemograma Completo"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Data do Exame *</Text>
            <TextInput
              style={styles.input}
              value={examDate}
              onChangeText={handleDateChange}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observações sobre o exame..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Tags (separadas por vírgula)</Text>
            <TextInput
              style={styles.input}
              value={tags}
              onChangeText={setTags}
              placeholder="Ex: sangue, rotina, urgente"
              autoCapitalize="none"
            />
          </View>

          {/* File Upload Section */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Anexar Arquivos</Text>
            <Text style={styles.fileHint}>
              Máximo 10 arquivos, 50MB cada. Tipos: JPG, PNG e PDF
            </Text>
            
            <View style={styles.fileButtons}>
              <TouchableOpacity
                style={styles.fileButton}
                onPress={handleSelectImages}
              >
                <Ionicons name="image-outline" size={20} color={COLORS.primary} />
                <Text style={styles.fileButtonText}>Imagens</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.fileButton}
                onPress={handleSelectDocuments}
              >
                <Ionicons name="document-outline" size={20} color={COLORS.primary} />
                <Text style={styles.fileButtonText}>Documentos</Text>
              </TouchableOpacity>
            </View>

            {/* File List */}
            {files.length > 0 && (
              <View style={styles.filesList}>
                {files.map((file, index) => (
                  <View key={index} style={styles.fileItem}>
                    <View style={styles.fileInfo}>
                      <Ionicons
                        name={
                          file.type.startsWith('image/') ? 'image' :
                          'document-text'
                        }
                        size={16}
                        color={COLORS.primary}
                      />
                      <View style={styles.fileDetails}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {file.name}
                        </Text>
                        <Text style={styles.fileSize}>
                          {formatFileSize(file.size)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => removeFile(index)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.notificationRed} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Criando...' : 'Criar Exame'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  fileHint: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginBottom: 12,
  },
  fileButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  fileButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fileButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  filesList: {
    marginTop: 8,
  },
  fileItem: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginTop: 2,
  },
  removeFileButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default function AddExam() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <AddExamContent />
    </TermGuard>
  );
}
