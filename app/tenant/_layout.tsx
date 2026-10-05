import { useAuth } from "@/lib/auth-context";
import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function TenantLayout() {
  const { user, role, hasRoom, loading } = useAuth();
  const segments = useSegments();
  const page = String(segments[1] || "");
  const assignedOnly = ["tenant-home", "payments"].includes(page);
  const applicantOnly = ["room-browser", "room-details", "saved"].includes(
    page,
  );
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  if (!user) return <Redirect href="/login" />;
  if (role === "admin") return <Redirect href="/landlord/dashboard" />;
  if (!hasRoom && assignedOnly) return <Redirect href="/tenant/room-browser" />;

  if (hasRoom && applicantOnly) {
    return <Redirect href="/tenant/tenant-home" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
