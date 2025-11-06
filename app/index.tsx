import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../constants/colors";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading, hasAcceptedTerm, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    return <Redirect href="./login" />;
  }

  // Se está autenticado mas não aceitou o termo, redireciona para aceite
  // IMPORTANTE: Só solicitar o termo na primeira autenticação (quando não aceitou)
  if (!hasAcceptedTerm) {
    return <Redirect href="./term-acceptance" />;
  }

  // Se está autenticado e aceitou o termo, redireciona para home
  return <Redirect href="./home" />;
}
