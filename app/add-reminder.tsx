import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { TermGuard } from '../components/TermGuard';
import { COLORS } from '../constants/colors';
import { apiClient } from '../services/api';
import { notificationService } from '../services/notifications';

function AddReminderContent() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [requiresFasting, setRequiresFasting] = useState(false);
  const [fastingDuration, setFastingDuration] = useState('');
  const [fastingAlertMode, setFastingAlertMode] = useState<'interval' | 'datetime'>('interval');
  const [fastingAlertInterval, setFastingAlertInterval] = useState('');
  const [fastingAlertDate, setFastingAlertDate] = useState('');
  const [fastingAlertTime, setFastingAlertTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  const formatTimeInput = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    const limited = numbers.slice(0, 4);
    
    if (limited.length <= 2) {
      return limited;
    } else {
      return `${limited.slice(0, 2)}:${limited.slice(2)}`;
    }
  };

  const handleDateChange = (text: string) => {
    const formatted = formatDateInput(text);
    setReminderDate(formatted);
  };

  const handleTimeChange = (text: string) => {
    const formatted = formatTimeInput(text);
    setReminderTime(formatted);
  };

  const convertDateTimeToBackendFormat = (dateStr: string, timeStr: string) => {
    // Converte DD/MM/AAAA HH:MM para AAAA-MM-DDTHH:MM:00 com timezone offset local
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
      
      const time = timeStr || '00:00';
      const [hours, minutes] = time.split(':').map(t => t.padStart(2, '0'));
      
      // Criar data no timezone local do usuário
      const localDate = new Date(yearNum, monthNum - 1, dayNum, parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      
      // Obter timezone offset em minutos e converter para formato ±HH:MM
      // getTimezoneOffset() retorna offset em minutos: positivo para UTC- (ex: -03:00 = 180), negativo para UTC+ (ex: +05:00 = -300)
      const offsetMinutes = localDate.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes > 0 ? '-' : '+'; // Inverter: se offsetMinutes > 0, estamos em UTC-, então offset é negativo
      const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
      
      // Construir string ISO com timezone offset (formato aceito pelo Zod datetime)
      // Formato: YYYY-MM-DDTHH:mm:ss[±]HH:mm (sem milissegundos)
      const yearISO = String(localDate.getFullYear());
      const monthISO = String(localDate.getMonth() + 1).padStart(2, '0');
      const dayISO = String(localDate.getDate()).padStart(2, '0');
      const hoursISO = String(localDate.getHours()).padStart(2, '0');
      const minutesISO = String(localDate.getMinutes()).padStart(2, '0');
      
      // Retornar como ISO string com timezone offset (preserva o horário local)
      // Zod datetime aceita: YYYY-MM-DDTHH:mm:ss[±]HH:mm (sem milissegundos)
      return `${yearISO}-${monthISO}-${dayISO}T${hoursISO}:${minutesISO}:00${offsetStr}`;
    }
    return null;
  };

  const showDateTimeInfo = () => {
    Alert.alert(
      'Como funcionam as Datas e Horas',
      '• Data: Use o formato DD/MM/AAAA (ex: 25/12/2024)\n\n' +
      '• Horário: Use o formato HH:MM em 24 horas (ex: 14:30). Se não informar, será usado 00:00\n\n' +
      '• O sistema usa o fuso horário do seu dispositivo automaticamente\n\n' +
      '• A notificação será enviada no horário exato que você configurou',
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  const showNotificationInfo = () => {
    Alert.alert(
      'Como funcionam as Notificações',
      '• Você receberá uma notificação no horário exato configurado no lembrete\n\n' +
      '• Se o lembrete requer jejum, você também receberá um aviso no horário configurado para o aviso de jejum\n\n' +
      '• As notificações aparecem mesmo com o app fechado\n\n' +
      '• Certifique-se de permitir notificações nas configurações do dispositivo',
      [{ text: 'Entendi', style: 'default' }]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o título do lembrete.');
      return;
    }

    if (!reminderDate.trim()) {
      Alert.alert('Erro', 'Por favor, preencha a data do lembrete.');
      return;
    }

    // Validações de jejum
    if (requiresFasting) {
      if (!fastingDuration.trim()) {
        Alert.alert('Erro', 'Por favor, informe a duração do jejum em horas.');
        return;
      }
      
      const fastingDurationNum = parseFloat(fastingDuration);
      if (isNaN(fastingDurationNum) || fastingDurationNum <= 0) {
        Alert.alert('Erro', 'A duração do jejum deve ser um número válido maior que zero.');
        return;
      }
      
      if (fastingAlertMode === 'interval') {
        if (!fastingAlertInterval.trim()) {
          Alert.alert('Erro', 'Por favor, informe o intervalo antes do exame (em horas).');
          return;
        }
        const intervalNum = parseFloat(fastingAlertInterval);
        if (isNaN(intervalNum) || intervalNum <= 0) {
          Alert.alert('Erro', 'O intervalo deve ser um número válido maior que zero.');
          return;
        }
      }
      
      if (fastingAlertMode === 'datetime' && (!fastingAlertDate.trim() || !fastingAlertTime.trim())) {
        Alert.alert('Erro', 'Por favor, preencha a data e horário do aviso de jejum.');
        return;
      }
    }

    try {
      setIsLoading(true);

      const formattedDateTime = convertDateTimeToBackendFormat(reminderDate, reminderTime);
      if (!formattedDateTime) {
        Alert.alert('Erro', 'Data inválida. Por favor, verifique a data informada.');
        return;
      }

      // Calcular horário de aviso do jejum
      let calculatedFastingAlertTime: string | undefined = undefined;
      
      if (requiresFasting) {
        if (fastingAlertMode === 'interval') {
          // Calcular data/hora subtraindo o intervalo da data do exame
          // formattedDateTime já tem timezone offset, então new Date() vai interpretar corretamente
          const reminderDateTime = new Date(formattedDateTime);
          const intervalHours = parseFloat(fastingAlertInterval);
          if (!isNaN(intervalHours)) {
            // Subtrair horas mantendo no timezone local
            reminderDateTime.setHours(reminderDateTime.getHours() - intervalHours);
            // Converter para ISO string com timezone offset preservado
            const offsetMinutes = reminderDateTime.getTimezoneOffset();
            const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
            const offsetMins = Math.abs(offsetMinutes) % 60;
            const offsetSign = offsetMinutes > 0 ? '-' : '+';
            const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
            
            const year = String(reminderDateTime.getFullYear());
            const month = String(reminderDateTime.getMonth() + 1).padStart(2, '0');
            const day = String(reminderDateTime.getDate()).padStart(2, '0');
            const hours = String(reminderDateTime.getHours()).padStart(2, '0');
            const minutes = String(reminderDateTime.getMinutes()).padStart(2, '0');
            
            // Formato aceito pelo Zod datetime: YYYY-MM-DDTHH:mm:ss[±]HH:mm (sem milissegundos)
            calculatedFastingAlertTime = `${year}-${month}-${day}T${hours}:${minutes}:00${offsetStr}`;
          }
        } else if (fastingAlertMode === 'datetime') {
          // Usar data/hora específica informada pelo usuário
          const formattedAlertDateTime = convertDateTimeToBackendFormat(fastingAlertDate, fastingAlertTime);
          if (formattedAlertDateTime) {
            calculatedFastingAlertTime = formattedAlertDateTime;
          }
        }
      }

      const reminderData: any = {
        title: title.trim(),
        reminderDate: formattedDateTime,
      };

      if (requiresFasting) {
        reminderData.requiresFasting = true;
        reminderData.fastingDuration = parseInt(fastingDuration, 10);
        if (calculatedFastingAlertTime) {
          reminderData.fastingAlertTime = calculatedFastingAlertTime;
        }
      }

      if (notes.trim()) {
        reminderData.notes = notes.trim();
      }

      const response = await apiClient.createReminder(reminderData);
      console.log('Create reminder response:', response);

      if (response.success) {
        // Extrair o ID do lembrete da resposta
        const reminderId = response.data?.id || (response.data as any)?.data?.id || (response as any)?.data?.id;
        
        // Agendar notificação do lembrete
        if (reminderId) {
          const reminderDateObj = new Date(formattedDateTime);
          await notificationService.scheduleReminderNotification(
            reminderId,
            title.trim(),
            reminderDateObj,
            notes.trim() || undefined
          );

          // Agendar notificação de aviso de jejum se necessário
          if (requiresFasting && calculatedFastingAlertTime) {
            const fastingAlertDateObj = new Date(calculatedFastingAlertTime);
            await notificationService.scheduleFastingAlertNotification(
              reminderId,
              fastingAlertDateObj,
              title.trim(),
              parseInt(fastingDuration, 10)
            );
          }
        }

        Alert.alert('Sucesso', 'Lembrete criado com sucesso!', [
          { 
            text: 'OK', 
            onPress: () => {
              // Pequeno delay para garantir que o backend processou
              setTimeout(() => {
                router.back();
              }, 500);
            }
          }
        ]);
      }
    } catch (error: any) {
      console.error('Error creating reminder:', error);
      const errorMessage = error?.message || 'Não foi possível criar o lembrete.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
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
        <Text style={styles.headerTitle}>Novo Lembrete</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          {/* Title */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título do Lembrete *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Revisão de resultados"
              autoCapitalize="words"
            />
          </View>

          {/* Date */}
          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Data do Lembrete *</Text>
              <TouchableOpacity onPress={showDateTimeInfo} style={styles.infoIcon}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={reminderDate}
              onChangeText={handleDateChange}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
          </View>

          {/* Time */}
          <View style={styles.inputContainer}>
            <View style={styles.labelContainer}>
              <Text style={styles.label}>Horário (opcional)</Text>
              <TouchableOpacity onPress={showNotificationInfo} style={styles.infoIcon}>
                <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={reminderTime}
              onChangeText={handleTimeChange}
              placeholder="HH:MM"
              keyboardType="numeric"
              maxLength={5}
            />
          </View>

          {/* Notes */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Informações adicionais sobre o lembrete..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Fasting Section */}
          <View style={styles.inputContainer}>
            <View style={styles.switchContainer}>
              <Text style={styles.label}>Requer Jejum</Text>
              <Switch
                value={requiresFasting}
                onValueChange={setRequiresFasting}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          {/* Fasting Duration - aparece apenas se requiresFasting for true */}
          {requiresFasting && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Duração do Jejum (horas) *</Text>
              <TextInput
                style={styles.input}
                value={fastingDuration}
                onChangeText={setFastingDuration}
                placeholder="Ex: 12"
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Fasting Alert - aparece apenas se requiresFasting for true */}
          {requiresFasting && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Tipo de Aviso de Jejum</Text>
                <View style={styles.alertModeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.alertModeButton,
                      fastingAlertMode === 'interval' && styles.alertModeButtonActive,
                    ]}
                    onPress={() => setFastingAlertMode('interval')}
                  >
                    <Text
                      style={[
                        styles.alertModeText,
                        fastingAlertMode === 'interval' && styles.alertModeTextActive,
                      ]}
                    >
                      Intervalo antes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.alertModeButton,
                      fastingAlertMode === 'datetime' && styles.alertModeButtonActive,
                    ]}
                    onPress={() => setFastingAlertMode('datetime')}
                  >
                    <Text
                      style={[
                        styles.alertModeText,
                        fastingAlertMode === 'datetime' && styles.alertModeTextActive,
                      ]}
                    >
                      Data/Hora específica
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {fastingAlertMode === 'interval' ? (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Horas antes do exame *</Text>
                  <TextInput
                    style={styles.input}
                    value={fastingAlertInterval}
                    onChangeText={setFastingAlertInterval}
                    placeholder="Ex: 14 (horas antes do exame)"
                    keyboardType="numeric"
                  />
                </View>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Data do Aviso *</Text>
                    <TextInput
                      style={styles.input}
                      value={fastingAlertDate}
                      onChangeText={(text) => {
                        const formatted = formatDateInput(text);
                        setFastingAlertDate(formatted);
                      }}
                      placeholder="DD/MM/AAAA"
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Horário do Aviso *</Text>
                    <TextInput
                      style={styles.input}
                      value={fastingAlertTime}
                      onChangeText={(text) => {
                        const formatted = formatTimeInput(text);
                        setFastingAlertTime(formatted);
                      }}
                      placeholder="HH:MM"
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </>
              )}
            </>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              isLoading && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Criando...' : 'Criar Lembrete'}
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
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryDark,
    flex: 1,
  },
  infoIcon: {
    padding: 4,
    marginLeft: 8,
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
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  alertModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  alertModeButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertModeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  alertModeText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.subtitle,
  },
  alertModeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default function AddReminder() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <AddReminderContent />
    </TermGuard>
  );
}

