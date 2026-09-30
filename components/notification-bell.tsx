import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type Notice = {
  id: string;
  title?: string;
  body?: string;
  route?: string;
  createdAt?: { seconds?: number };
};

export function NotificationBell({ color = "#fff" }: { color?: string }) {
  const { user } = useAuth();
  const [notices, setNotices] = React.useState<Notice[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(
      query(
        collection(db, "notifications"),
        where("recipientId", "==", user.uid),
        where("read", "==", false),
      ),
      (snapshot) =>
        setNotices(
          snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Notice[],
        ),
      () => setNotices([]),
    );
  }, [user]);

  async function openNotice(notice: Notice) {
    if (db) {
      await updateDoc(doc(db, "notifications", notice.id), { read: true }).catch(() => undefined);
    }
    setOpen(false);
    if (notice.route) router.push(notice.route as any);
  }

  return (
    <>
      <Pressable
        style={styles.button}
        onPress={() => setOpen(true)}
        accessibilityLabel={`Notifications${notices.length ? `, ${notices.length} unread` : ""}`}
      >
        <Ionicons name="notifications-outline" size={20} color={color} />
        {notices.length > 0 && <View style={styles.dot} />}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(event) => event.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Notifications</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#526174" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
              {notices.length === 0 ? (
                <Text style={styles.empty}>You’re all caught up.</Text>
              ) : (
                notices.map((notice) => (
                  <Pressable key={notice.id} style={styles.notice} onPress={() => void openNotice(notice)}>
                    <Ionicons name="information-circle-outline" size={20} color="#2864e8" />
                    <View style={styles.copy}>
                      <Text style={styles.noticeTitle}>{notice.title || "BoardEase update"}</Text>
                      <Text style={styles.body}>{notice.body || "You have a new update."}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", position: "relative" },
  dot: { position: "absolute", top: 6, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ffcf4a", borderWidth: 1, borderColor: "#fff" },
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.35)", justifyContent: "center", alignItems: "center", padding: 16 },
  panel: { width: "100%", maxHeight: "65%", backgroundColor: "#fff", borderRadius: 20, padding: 16, shadowColor: "#173b80", shadowOpacity: 0.2, shadowRadius: 14, elevation: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#edf1f7" },
  title: { fontSize: 18, fontWeight: "800", color: "#253149" },
  list: { gap: 8, paddingTop: 10 },
  notice: { flexDirection: "row", gap: 10, padding: 11, borderRadius: 10, backgroundColor: "#f3f7fd" },
  copy: { flex: 1 },
  noticeTitle: { color: "#253149", fontSize: 13, fontWeight: "700" },
  body: { color: "#71809a", fontSize: 11, marginTop: 3 },
  empty: { color: "#71809a", textAlign: "center", paddingVertical: 24 },
});
