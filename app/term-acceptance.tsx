import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';

export default function TermAcceptance() {
  const router = useRouter();
  const { user, hasAcceptedTerm, checkTermStatus } = useAuth();
  const [term, setTerm] = useState<{
    version: string;
    content: string;
    updatedAt: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    loadTerm();
  }, []);

  // Se já aceitou o termo, redirecionar para home (evitar ficar preso aqui)
  useEffect(() => {
    if (hasAcceptedTerm) {
      router.replace('/home');
    }
  }, [hasAcceptedTerm, router]);

  const loadTerm = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getTerm();
      if (response.success) {
        setTerm(response.data);
      }
    } catch (error: any) {
      console.error('Error loading term:', error);
      Alert.alert('Erro', 'Não foi possível carregar o termo de responsabilidade.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!term) return;

    Alert.alert(
      'Confirmar aceite',
      'Você confirma que leu e concorda com o termo de responsabilidade?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Aceitar',
          onPress: async () => {
            try {
              setIsAccepting(true);
              const response = await apiClient.acceptTerm(term.version);
              if (response.success) {
                // Atualizar status do termo imediatamente
                await checkTermStatus();
                
                // Aguardar um pouco para garantir que o estado foi atualizado
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Redirecionar para home (sem alert para melhor UX)
                router.replace('/home');
              } else {
                Alert.alert('Erro', response.message || 'Não foi possível aceitar o termo.');
              }
            } catch (error: any) {
              console.error('Error accepting term:', error);
              Alert.alert('Erro', error.message || 'Não foi possível aceitar o termo.');
            } finally {
              setIsAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    if (isCloseToBottom) {
      setHasScrolled(true);
    }
  };

  // Se já aceitou o termo, não mostrar nada (o useEffect vai redirecionar)
  if (hasAcceptedTerm) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Redirecionando...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando termo...</Text>
      </View>
    );
  }

  if (!term) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Não foi possível carregar o termo</Text>
        <TouchableOpacity style={styles.button} onPress={loadTerm}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text" size={48} color={COLORS.primary} />
        <Text style={styles.title}>Termo de Responsabilidade</Text>
        <Text style={styles.version}>Versão {term.version}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.termContent}>
          <Text style={styles.termText}>{term.content}</Text>
        </View>
      </ScrollView>

      {!hasScrolled && (
        <View style={styles.scrollHint}>
          <Ionicons name="arrow-down" size={20} color={COLORS.subtitle} />
          <Text style={styles.scrollHintText}>Role para ler todo o termo</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={24} color={COLORS.notificationRed} />
          <Text style={styles.warningText}>
            Você precisa aceitar este termo para utilizar o aplicativo.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.acceptButton, (!hasScrolled || isAccepting) && styles.acceptButtonDisabled]}
          onPress={handleAccept}
          disabled={!hasScrolled || isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.acceptButtonText}>Aceitar Termo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryDark,
    marginTop: 12,
  },
  version: {
    fontSize: 14,
    color: COLORS.subtitle,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  termContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  termText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.text,
    textAlign: 'justify',
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  scrollHintText: {
    fontSize: 12,
    color: COLORS.subtitle,
    marginLeft: 8,
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    marginLeft: 12,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.subtitle,
    opacity: 0.6,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.subtitle,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

