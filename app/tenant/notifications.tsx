import { TenantPageHeader } from "@/components/tenant-page-header";
import {
  AssignedTenantNav,
  ApplicantTenantNav,
} from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { useNotifications, type Notice } from "@/lib/use-notifications";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TenantNotifications() {
  const { hasRoom } = useAuth();
  const { notices, error, loading, markRead } = useNotifications();
  async function openNotice(notice: Notice) {
    await markRead(notice);
    if (notice.route?.startsWith("/tenant/")) router.push(notice.route as any);
  }
  async function markAllRead() {
    await Promise.all(notices.map(markRead));
  }
  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader title="Notifications" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        {!!error && <Text accessibilityRole="alert">{error}</Text>}
        {loading && <Text>Loading notifications…</Text>}
        <Pressable style={styles.markAll} onPress={() => void markAllRead()}>
          <Text style={styles.mark}>Mark all read</Text>
        </Pressable>
        {notices.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="notifications-off-outline"
              size={38}
              color="#9aa8ba"
            />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              Updates about your applications, payments, tours, and maintenance
              will appear here.
            </Text>
          </View>
        ) : (
          notices.map((notice) => (
            <Pressable
              key={notice.id}
              style={[styles.card, !notice.read && styles.unread]}
              onPress={() => void openNotice(notice)}
            >
              <View style={styles.icon}>
                <Ionicons
                  name={notice.read ? "notifications-outline" : "notifications"}
                  size={20}
                  color="#2864e8"
                />
              </View>
              <View style={styles.copy}>
                <Text style={styles.cardTitle}>
                  {notice.title || "BoardEase update"}
                </Text>
                <Text style={styles.body}>
                  {notice.body || "You have a new update."}
                </Text>
              </View>
              {!notice.read && <View style={styles.badge} />}
            </Pressable>
          ))
        )}
      </ScrollView>
      {hasRoom ? (
        <AssignedTenantNav active="Profile" />
      ) : (
        <ApplicantTenantNav active="Account" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  header: {
    backgroundColor: "#2864e8",
    padding: 16,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  title: { color: "#fff", fontSize: 19, fontWeight: "800", flex: 1 },
  markAll: { alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 2 },
  mark: { color: "#2864e8", fontSize: 11, fontWeight: "700" },
  content: { padding: 14, gap: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e1eafa",
  },
  unread: { borderColor: "#9bb9f5", backgroundColor: "#f8fbff" },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  cardTitle: { color: "#253149", fontSize: 13, fontWeight: "700" },
  body: { color: "#71809a", fontSize: 11, marginTop: 3 },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2864e8" },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: {
    color: "#253149",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  emptyText: {
    color: "#71809a",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
