import { Ionicons } from "@expo/vector-icons";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

export type NotificationModalItem = {
  id: string;
  title: string;
  body?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
};

type NotificationModalProps = {
  visible: boolean;
  title?: string;
  loading?: boolean;
  error?: string;
  notices: NotificationModalItem[];
  emptyMessage?: string;
  onClose: () => void;
};

export function NotificationsModal({
  visible,
  title = "Notifications",
  loading = false,
  error,
  notices,
  emptyMessage = "You’re all caught up.",
  onClose,
}: NotificationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={styles.panel}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#526174" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.body}>
                {error}
              </Text>
            )}
            {loading && <Text style={styles.body}>Loading notifications…</Text>}
            {notices.length === 0 && !loading ? (
              <Text style={styles.empty}>{emptyMessage}</Text>
            ) : (
              notices.map((notice) => (
                <Pressable
                  key={notice.id}
                  style={styles.notice}
                  onPress={notice.onPress}
                >
                  <Ionicons
                    name={notice.icon || "information-circle-outline"}
                    size={20}
                    color={notice.iconColor || "#2864e8"}
                  />
                  <View style={styles.copy}>
                    <Text style={styles.noticeTitle}>{notice.title}</Text>
                    {!!notice.body && (
                      <Text style={styles.body}>{notice.body}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#8a99a9" />
                </Pressable>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    alignItems: "center",
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
