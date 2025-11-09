import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { homeStyles } from "../assets/styles/home.styles";
import { TermGuard } from "../components/TermGuard";
import { COLORS } from "../constants/colors";
import { useAuth } from "../contexts/AuthContext";
import { apiClient, Exam, Prescription, Reminder } from "../services/api";
import { formatDateDDMMYYYY } from "../utils/dateFormatter";

function HomeContent() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Recarrega dados quando a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      loadData(false); // Não mostra loading ao voltar
    }, [])
  );

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      await Promise.all([
        loadRecentExams(),
        loadRecentPrescriptions(),
        loadUpcomingReminders(),
      ]);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const loadRecentPrescriptions = async () => {
    try {
      const response = await apiClient.getPrescriptions({ limit: 3, sortField: 'issueDate', sortOrder: 'desc' });
      if (response.success) {
        const data = Array.isArray(response.data)
          ? response.data
          : (response.data as any)?.data ?? [];
        setPrescriptions(data as Prescription[]);
      } else {
        setPrescriptions([]);
      }
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      setPrescriptions([]);
    }
  };

  const loadRecentExams = async () => {
    try {
      const response = await apiClient.getExams({ limit: 5 });
      console.log('Home - Exams API Response:', response);
      
      if (response.success) {
        // Garantir que data é um array
        const examsData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.exams || []);
        console.log('Home - Exams loaded:', examsData.length);
        setExams(examsData);
      } else {
        console.log('Home - Exams API returned success=false:', response.message);
        setExams([]);
      }
    } catch (error) {
      console.error('Error loading exams:', error);
      setExams([]);
    }
  };

  const loadUpcomingReminders = async () => {
    try {
      const response = await apiClient.getUpcomingReminders(7);
      console.log('Home - Reminders API Response:', response);
      
      if (response.success) {
        // Garantir que data é um array
        const remindersData = Array.isArray(response.data) ? response.data : (response.data?.data || response.data?.reminders || []);
        console.log('Home - Reminders loaded:', remindersData.length);
        setReminders(remindersData);
      } else {
        console.log('Home - Reminders API returned success=false:', response.message);
        setReminders([]);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
      setReminders([]);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirmar logout',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Aguardar um pouco para garantir que o estado foi atualizado
              await new Promise(resolve => setTimeout(resolve, 100));
              // Redireciona para login após logout
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              // Mesmo se houver erro, tentar redirecionar
              router.replace('/login');
            }
          },
        },
      ]
    );
  };

  // Redireciona para login se não estiver autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading]);

  const formatDate = (dateString: string) => {
    return formatDateDDMMYYYY(dateString);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <View style={[homeStyles.container, homeStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={homeStyles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={homeStyles.container}>
      {/* Header with greeting and avatar */}
      <View style={homeStyles.header}>
        <View style={homeStyles.greetingContainer}>
          <Text style={homeStyles.greetingText}>
            Olá, {user?.name?.split(' ')[0] || 'Usuário'}!
          </Text>
          <Text style={homeStyles.welcomeText}>bem-vindo de volta</Text>
        </View>
        <TouchableOpacity 
          style={homeStyles.avatarContainer}
          onPress={handleLogout}
        >
          <Text style={homeStyles.avatarText}>
            {getInitials(user?.name || 'U')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main content */}
      <ScrollView 
        style={homeStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Main access buttons */}
        <TouchableOpacity 
          style={homeStyles.mainButton}
          activeOpacity={0.8}
          onPress={() => router.push('/exams')}
        >
          <Ionicons name="medical-outline" size={24} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={homeStyles.mainButtonText}>
            Acessar seus Exames Médicos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[homeStyles.mainButton, { marginTop: 16, backgroundColor: '#2E7D32' }]}
          activeOpacity={0.8}
          onPress={() => router.push('/prescriptions')}
        >
          <Ionicons name="medkit-outline" size={24} color={COLORS.white} style={{ marginRight: 8 }} />
          <Text style={homeStyles.mainButtonText}>
            Gerenciar Prescrições Médicas
          </Text>
        </TouchableOpacity>

        {/* Recent Prescriptions Section */}
        <View style={homeStyles.sectionContainer}>
          <View style={homeStyles.sectionHeader}>
            <Text style={homeStyles.sectionTitle}>Prescrições Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/prescriptions')}>
              <Text style={homeStyles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {prescriptions.length > 0 ? (
            prescriptions.map((prescription) => (
              <TouchableOpacity
                key={prescription.id}
                style={homeStyles.prescriptionCard}
                onPress={() => router.push(`/prescription-detail/${prescription.id}`)}
              >
                <View style={homeStyles.prescriptionIcon}>
                  <Ionicons name="medkit" size={20} color={COLORS.white} />
                </View>
                <View style={homeStyles.prescriptionContent}>
                  <Text style={homeStyles.prescriptionTitle}>{prescription.title}</Text>
                  <Text style={homeStyles.prescriptionSubtitle}>
                    {formatDate(prescription.issueDate)}
                  </Text>
                  <Text style={homeStyles.prescriptionStatus}>
                    Status: {prescription.status === 'em_uso' ? 'Em uso' : prescription.status === 'concluida' ? 'Concluída' : 'Suspensa'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={homeStyles.emptyState}>
              <Ionicons name="medkit-outline" size={48} color={COLORS.subtitle} />
              <Text style={homeStyles.emptyStateText}>Nenhuma prescrição cadastrada</Text>
              <Text style={homeStyles.emptyStateSubtext}>
                Registre suas prescrições para acompanhar posologia e anexos
              </Text>
            </View>
          )}
        </View>

        {/* Recent Exams Section */}
        <View style={homeStyles.sectionContainer}>
          <View style={homeStyles.sectionHeader}>
            <Text style={homeStyles.sectionTitle}>Exames Recentes</Text>
            <TouchableOpacity onPress={() => router.push('/exams')}>
              <Text style={homeStyles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          {exams.length > 0 ? (
            exams.map((exam) => (
              <View key={exam.id} style={homeStyles.examCard}>
                <View style={homeStyles.examIcon}>
                  <Ionicons name="document-text" size={20} color={COLORS.primary} />
                </View>
                <View style={homeStyles.examContent}>
                  <Text style={homeStyles.examName}>{exam.name}</Text>
                  {exam.examDate && (
                    <Text style={homeStyles.examDate}>
                      {formatDate(exam.examDate)}
                    </Text>
                  )}
                  {exam.tags && exam.tags.length > 0 && (
                    <View style={homeStyles.tagsContainer}>
                      {exam.tags.slice(0, 2).map((tag, index) => (
                        <View key={index} style={homeStyles.tag}>
                          <Text style={homeStyles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={homeStyles.emptyState}>
              <Ionicons name="document-outline" size={48} color={COLORS.subtitle} />
              <Text style={homeStyles.emptyStateText}>Nenhum exame encontrado</Text>
              <Text style={homeStyles.emptyStateSubtext}>
                Adicione seu primeiro exame médico
              </Text>
            </View>
          )}
        </View>

        {/* Reminders Section */}
        <View style={homeStyles.sectionContainer}>
          <View style={homeStyles.sectionHeader}>
            <Text style={homeStyles.sectionTitle}>Lembretes</Text>
            <TouchableOpacity onPress={() => router.push('/reminders')}>
              <Text style={homeStyles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          {reminders.length > 0 ? (
            reminders.slice(0, 3).map((reminder) => (
              <View key={reminder.id} style={homeStyles.notificationCard}>
                <View style={[homeStyles.notificationIcon, homeStyles.notificationIconRed]}>
                  <Ionicons name="alarm" size={24} color={COLORS.white} />
                </View>
                <View style={homeStyles.notificationContent}>
                  <Text style={homeStyles.notificationText}>
                    {reminder.title}
                  </Text>
                </View>
                <Text style={homeStyles.notificationDate}>
                  {formatDate(reminder.reminderDate)}
                </Text>
              </View>
            ))
          ) : (
            <View style={homeStyles.emptyState}>
              <Ionicons name="alarm-outline" size={48} color={COLORS.subtitle} />
              <Text style={homeStyles.emptyStateText}>Nenhum lembrete ativo</Text>
              <Text style={homeStyles.emptyStateSubtext}>
                Crie lembretes para seus exames
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={homeStyles.bottomNav}>
        <TouchableOpacity style={homeStyles.navButton}>
          <Ionicons name="home" size={28} color={COLORS.primary} />
          <Text style={[homeStyles.navText, { color: COLORS.primary }]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={homeStyles.navButton}
          onPress={() => router.push('/exams')}
        >
          <Ionicons name="document-text-outline" size={28} color={COLORS.subtitle} />
          <Text style={homeStyles.navText}>Exames</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={homeStyles.navButton}
          onPress={() => router.push('/prescriptions')}
        >
          <Ionicons name="medkit-outline" size={28} color={COLORS.subtitle} />
          <Text style={homeStyles.navText}>Prescrições</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={homeStyles.navButton}
          onPress={() => router.push('/reminders')}
        >
          <Ionicons name="alarm-outline" size={28} color={COLORS.subtitle} />
          <Text style={homeStyles.navText}>Lembretes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={homeStyles.navButton}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-outline" size={28} color={COLORS.subtitle} />
          <Text style={homeStyles.navText}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Home() {
  return (
    <TermGuard>
      <Stack.Screen options={{ headerShown: false }} />
      <HomeContent />
    </TermGuard>
  );
}



