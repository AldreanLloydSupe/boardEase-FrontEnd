import { NotificationBell } from "@/components/notification-bell";
import { TenantHeaderMark } from "@/components/tenant-header-mark";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function TenantPageHeader({
  title,
  backHref,
  rightAction,
}: {
  title: string;
  backHref?: string;
  rightAction?: ReactNode;
}) {
  const { hasRoom } = useAuth();
  const destination =
    backHref || (hasRoom ? "/tenant/tenant-home" : "/tenant/room-browser");

  return (
    <View style={styles.header}>
      <Pressable
        style={styles.back}
        onPress={() => router.replace(destination as any)}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
      >
        <Ionicons name="arrow-back" size={21} color="#fff" />
      </Pressable>
      <TenantHeaderMark />
      <View style={styles.copy}>
        <Text style={styles.brand}>BOARDEASE</Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightAction}
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  back: {
    width: 34,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  brand: { color: "#d9e5ff", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 2 },
});
