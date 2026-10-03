import React from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { AppAlert as Alert } from "@/components/app-alert";

export function AnnouncementComposer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user, displayName } = useAuth();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [publishing, setPublishing] = React.useState(false);
  const [error, setError] = React.useState("");
  async function publish() {
    if (publishing || !title.trim() || !body.trim()) return;
    if (!db || !user) {
      setError("Sign in again before publishing.");
      return;
    }
    if (title.trim().length > 100 || body.trim().length > 2000) {
      setError(
        "Use a title up to 100 characters and a message up to 2,000 characters.",
      );
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const tenants = await getDocs(
        query(collection(db, "users"), where("hasRoom", "==", true)),
      );
      const recipientIds = tenants.docs
        .filter((record) => record.data().role !== "admin")
        .map((record) => record.id);
      if (!recipientIds.length)
        throw new Error("No assigned tenants to receive this announcement.");
      if (recipientIds.length > 500)
        throw new Error("This announcement exceeds the 500-recipient limit.");
      await addDoc(collection(db, "messages"), {
        kind: "announcement",
        title: title.trim(),
        body: body.trim(),
        audience: "all",
        recipientIds,
        senderId: user.uid,
        senderName: displayName || "BoardEase Management",
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setBody("");
      onClose();
      Alert.alert(
        "Announcement published",
        `Posted to ${recipientIds.length} tenant dashboards. In-app alerts follow each tenant's notification settings.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to publish. Please retry.",
      );
    } finally {
      setPublishing(false);
    }
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!publishing) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.heading}>
              <Text style={styles.title}>Post Announcement</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close announcement"
                disabled={publishing}
                onPress={onClose}
                style={styles.close}
              >
                <Ionicons name="close" size={23} color="#536783" />
              </Pressable>
            </View>
            <Text style={styles.muted}>
              Publish a recent update to all currently assigned tenants.
            </Text>
            <Text style={styles.label}>Title</Text>
            <TextInput
              accessibilityLabel="Announcement title"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              editable={!publishing}
              placeholder="Example: Water interruption tomorrow"
              style={styles.input}
            />
            <Text style={styles.label}>Announcement</Text>
            <TextInput
              accessibilityLabel="Announcement message"
              value={body}
              onChangeText={setBody}
              maxLength={2000}
              editable={!publishing}
              multiline
              placeholder="Include what is happening, when, and any action tenants should take."
              style={[styles.input, styles.message]}
            />
            <Text style={styles.counter}>{body.length} / 2,000 characters</Text>
            <Text style={styles.info}>
              Appears in Recent Announcements on the tenant dashboard and in
              their notification bell. No SMS is sent.
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <View style={styles.actions}>
              <Pressable
                style={styles.button}
                disabled={publishing}
                onPress={onClose}
              >
                <Text>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={publishing || !title.trim() || !body.trim()}
                onPress={() => void publish()}
                style={[
                  styles.button,
                  styles.publish,
                  (publishing || !title.trim() || !body.trim()) && {
                    opacity: 0.5,
                  },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {publishing ? "Publishing..." : "Publish announcement"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#172033", flexShrink: 1 },
  close: {
    minHeight: 44,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { fontSize: 14, color: "#637794", lineHeight: 22 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#253149",
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#d5e0f4",
    borderRadius: 10,
    padding: 12,
    minHeight: 48,
    backgroundColor: "#f9fbff",
    color: "#172033",
  },
  message: { minHeight: 140, textAlignVertical: "top" },
  counter: { textAlign: "right", fontSize: 12, color: "#637794", marginTop: 6 },
  info: {
    backgroundColor: "#edf3ff",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    color: "#536783",
    lineHeight: 20,
    marginVertical: 16,
  },
  error: { color: "#b42318", marginBottom: 12 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d5e0f4",
    borderRadius: 10,
    justifyContent: "center",
  },
  publish: { backgroundColor: "#2864e8", borderColor: "#2864e8" },
});
