import { TenantHeaderMark } from "@/components/tenant-header-mark";
import { AssignedTenantNav, ApplicantTenantNav } from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Notice = { id: string; title?: string; body?: string; route?: string; read?: boolean };

export default function TenantNotifications() {
  const { user, hasRoom } = useAuth();
  const [notices, setNotices] = React.useState<Notice[]>([]);

  React.useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(
      query(collection(db, "notifications"), where("recipientId", "==", user.uid)),
      (snapshot) => setNotices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Notice[]),
      () => setNotices([]),
    );
  }, [user]);

  async function openNotice(notice: Notice) {
    const firestore = db;
    if (firestore && !notice.read) await updateDoc(doc(firestore, "notifications", notice.id), { read: true }).catch(() => undefined);
    if (notice.route) router.push(notice.route as any);
  }

  async function markAllRead() {
    const firestore = db;
    if (!firestore) return;
    await Promise.all(notices.filter((notice) => !notice.read).map((notice) => updateDoc(doc(firestore, "notifications", notice.id), { read: true }).catch(() => undefined)));
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>
        <TenantHeaderMark />
        <Text style={styles.title}>Notifications</Text>
        <Pressable onPress={() => void markAllRead()}><Text style={styles.mark}>Mark all read</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {notices.length === 0 ? (
          <View style={styles.empty}><Ionicons name="notifications-off-outline" size={38} color="#9aa8ba" /><Text style={styles.emptyTitle}>No notifications yet</Text><Text style={styles.emptyText}>Updates about your applications, payments, tours, and maintenance will appear here.</Text></View>
        ) : notices.map((notice) => (
          <Pressable key={notice.id} style={[styles.card, !notice.read && styles.unread]} onPress={() => void openNotice(notice)}>
            <View style={styles.icon}><Ionicons name={notice.read ? "notifications-outline" : "notifications"} size={20} color="#2864e8" /></View>
            <View style={styles.copy}><Text style={styles.cardTitle}>{notice.title || "BoardEase update"}</Text><Text style={styles.body}>{notice.body || "You have a new update."}</Text></View>
            {!notice.read && <View style={styles.badge} />}
          </Pressable>
        ))}
      </ScrollView>
      {hasRoom ? <AssignedTenantNav active="Profile" /> : <ApplicantTenantNav active="Account" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  header: { backgroundColor: "#2864e8", padding: 16, gap: 10, flexDirection: "row", alignItems: "center" },
  title: { color: "#fff", fontSize: 19, fontWeight: "800", flex: 1 },
  mark: { color: "#fff", fontSize: 11, fontWeight: "700" },
  content: { padding: 14, gap: 10 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#e1eafa" },
  unread: { borderColor: "#9bb9f5", backgroundColor: "#f8fbff" },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eaf1ff", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  cardTitle: { color: "#253149", fontSize: 13, fontWeight: "700" },
  body: { color: "#71809a", fontSize: 11, marginTop: 3 },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2864e8" },
  empty: { backgroundColor: "#fff", borderRadius: 14, padding: 30, alignItems: "center", marginTop: 16 },
  emptyTitle: { color: "#253149", fontSize: 15, fontWeight: "700", marginTop: 10 },
  emptyText: { color: "#71809a", fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 18 },
});
