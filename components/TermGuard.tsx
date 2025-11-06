import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { useAuth } from '../contexts/AuthContext';

interface TermGuardProps {
  children: React.ReactNode;
}

/**
 * Componente que protege rotas exigindo aceite do termo de responsabilidade
 * Redireciona para term-acceptance se o usuário não aceitou o termo
 */
export function TermGuard({ children }: TermGuardProps) {
  const { isAuthenticated, isLoading, hasAcceptedTerm } = useAuth();

  // Não verificar status do termo aqui - o index.tsx já faz isso
  // Este componente só protege rotas baseado no estado atual

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Se não está autenticado, deixa o router tratar o redirecionamento
  if (!isAuthenticated) {
    return null;
  }

  // Se está autenticado mas não aceitou o termo, redireciona
  if (!hasAcceptedTerm) {
    return <Redirect href="/term-acceptance" />;
  }

  // Se aceitou o termo, renderiza o conteúdo
  return <>{children}</>;
}

