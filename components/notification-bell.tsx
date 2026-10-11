import { NotificationsModal } from "@/components/notifications-modal";
import { useNotifications, type Notice } from "@/lib/use-notifications";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

export function NotificationBell({ color = "#fff" }: { color?: string }) {
  const { notices: allNotices, error, loading, markRead } = useNotifications();
  const notices = allNotices.filter(
    (n) =>
      !n.read && n.type !== "chat_message" && n.type !== "maintenance_message",
  );
  const [open, setOpen] = React.useState(false);
  async function openNotice(notice: Notice) {
    await markRead(notice);
    setOpen(false);
    if (notice.route?.startsWith("/tenant/")) router.push(notice.route as any);
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
      <NotificationsModal
        visible={open}
        loading={loading}
        error={error}
        notices={notices.map((notice) => ({
          id: notice.id,
          title: notice.title || "BoardEase update",
          body: notice.body || "You have a new update.",
          onPress: () => void openNotice(notice),
        }))}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffcf4a",
    borderWidth: 1,
    borderColor: "#fff",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  panel: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "65%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#173b80",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f7",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#253149" },
  list: { gap: 8, paddingTop: 10 },
  notice: {
    flexDirection: "row",
    gap: 10,
    padding: 11,
    borderRadius: 10,
    backgroundColor: "#f3f7fd",
  },
  copy: { flex: 1 },
  noticeTitle: { color: "#253149", fontSize: 13, fontWeight: "700" },
  body: { color: "#71809a", fontSize: 11, marginTop: 3 },
  empty: { color: "#71809a", textAlign: "center", paddingVertical: 24 },
});
