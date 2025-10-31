import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../constants/colors";
import { useAuth } from "../contexts/AuthContext";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? "./home" : "./login"} />;
}
