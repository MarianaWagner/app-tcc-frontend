import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { TermGuard } from '../../components/TermGuard';
import { COLORS } from '../../constants/colors';
import { apiClient, Exam } from '../../services/api';

function EditExamContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [name, setName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExam, setIsLoadingExam] = useState(true);

  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  const loadExam = async () => {
    try {
      setIsLoadingExam(true);
      const response = await apiClient.getExam(id!);
      console.log('Load exam response:', response);
      
      if (response.success) {
        // Garantir que data é o objeto Exam
        const examData = response.data || (response as any).data?.data || (response as any).data?.exam;
        
        if (!examData) {
          console.error('No exam data found in response:', response);
          Alert.alert('Erro', 'Não foi possível carregar os dados do exame.');
          router.back();
          return;
        }
        
        setExam(examData);
        setName(examData.name || '');
        setNotes(examData.notes || '');
        setTags(examData.tags?.join(', ') || '');
        
        // Converter data de AAAA-MM-DD para DD/MM/AAAA
        if (examData.examDate) {
          try {
            const date = new Date(examData.examDate);
            if (!isNaN(date.getTime())) {
              const day = date.getDate().toString().padStart(2, '0');
              const month = (date.getMonth() + 1).toString().padStart(2, '0');
              const year = date.getFullYear().toString();
              setExamDate(`${day}/${month}/${year}`);
            }
          } catch (dateError) {
            console.error('Error parsing date:', dateError);
          }
        }
      } else {
        console.error('API returned success=false:', response.message);
        Alert.alert('Erro', response.message || 'Não foi possível carregar os dados do exame.');
        router.back();
      }
    } catch (error) {
      console.error('Error loading exam:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do exame.');
      router.back();
    } finally {
      setIsLoadingExam(false);
    }
  };

  const formatDateInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    const limited = numbers.slice(0, 8);
    
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
    if (dateStr.length === 10 && dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/');
      
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
        return null;
      }
      if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31 || yearNum < 1900 || yearNum > 2100) {
        return null;
      }
      
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
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

    if (!id) {
      Alert.alert('Erro', 'ID do exame não encontrado.');
      return;
    }

    try {
      setIsLoading(true);

      const formattedDate = convertDateToBackendFormat(examDate);
      if (!formattedDate) {
        Alert.alert('Erro', 'Data inválida. Por favor, verifique o formato DD/MM/AAAA.');
        setIsLoading(false);
        return;
      }

      const examData: any = { 
        name: name.trim(),
        examDate: formattedDate
      };
      if (notes) examData.notes = notes.trim();
      if (tags) {
        examData.tags = tags.split(',')
          .map(tag => tag.trim().toUpperCase())
          .filter(tag => tag);
      }

      const response = await apiClient.updateExam(id, examData);
      console.log('Update exam response:', response);
      
      if (response && response.success) {
        Alert.alert('Sucesso', 'Exame atualizado com sucesso!', [
          { 
            text: 'OK', 
            onPress: () => {
              setTimeout(() => {
                router.back();
              }, 500);
            }
          }
        ]);
      } else {
        const errorMessage = response?.message || 'Não foi possível atualizar o exame.';
        Alert.alert('Erro', errorMessage);
      }
    } catch (error) {
      console.error('Error updating exam:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o exame.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingExam) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando exame...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Editar Exame</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
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

export default function EditExam() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <EditExamContent />
    </TermGuard>
  );
}

