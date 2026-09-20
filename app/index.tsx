import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "@/lib/auth-context";

export default function Index() {
  const { user, role, hasRoom, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (role === "admin") return <Redirect href="/landlord/dashboard" />;
  return (
    <Redirect href={hasRoom ? "/tenant/tenant-home" : "/tenant/room-browser"} />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f9fc",
  },
});
