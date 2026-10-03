import { Stack, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { MaintenanceInboxProvider } from "@/lib/use-maintenance-inbox";
export default function LandlordLayout() {
  const { user, role, hasRoom, loading } = useAuth();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  if (!user) return <Redirect href="/login" />;
  if (role !== "admin")
    return (
      <Redirect
        href={hasRoom ? "/tenant/tenant-home" : "/tenant/room-browser"}
      />
    );
  return (
    <MaintenanceInboxProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </MaintenanceInboxProvider>
  );
}
