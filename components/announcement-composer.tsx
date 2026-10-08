import { AppAlert as Alert } from "@/components/app-alert";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import {
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";
import React from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export function AnnouncementComposer({
  visible,
  onClose,
  recipients,
  loadingRecipients,
}: {
  visible: boolean;
  onClose: () => void;
  recipients: { id: string; name: string; email: string; room: string }[];
  loadingRecipients: boolean;
}) {
  const { user, displayName } = useAuth();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [audience, setAudience] = React.useState<"all" | "selected">("all");
  const [recipientSearch, setRecipientSearch] = React.useState("");
  const [selectedRecipientIds, setSelectedRecipientIds] = React.useState<
    string[]
  >([]);
  const [publishing, setPublishing] = React.useState(false);
  const [error, setError] = React.useState("");
  const matchingRecipients = recipients.filter((recipient) =>
    [recipient.name, recipient.email, recipient.room]
      .join(" ")
      .toLowerCase()
      .includes(recipientSearch.trim().toLowerCase()),
  );
  const recipientIds =
    audience === "all"
      ? recipients.map((recipient) => recipient.id)
      : selectedRecipientIds.filter((id) =>
          recipients.some((recipient) => recipient.id === id),
        );
  async function publish() {
    if (publishing || loadingRecipients || !title.trim() || !body.trim())
      return;
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
      if (!recipientIds.length)
        throw new Error("Select at least one assigned tenant.");
      if (recipientIds.length > 500)
        throw new Error("This announcement exceeds the 500-recipient limit.");
      await addDoc(collection(db, "messages"), {
        kind: "announcement",
        title: title.trim(),
        body: body.trim(),
        audience,
        recipientIds,
        senderId: user.uid,
        senderName: displayName || "BoardEase Management",
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setBody("");
      setAudience("all");
      setSelectedRecipientIds([]);
      setRecipientSearch("");
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
              Publish an update to all assigned tenants or choose specific tenants.
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
            <View style={styles.audience}>
              <Pressable
                onPress={() => setAudience("all")}
                style={[
                  styles.audienceOption,
                  audience === "all" && styles.audienceOptionActive,
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={audience === "all" ? "#fff" : "#536783"}
                />
                <Text
                  style={[
                    styles.audienceText,
                    audience === "all" && styles.audienceTextActive,
                  ]}
                >
                  Everyone
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setAudience("selected")}
                style={[
                  styles.audienceOption,
                  audience === "selected" && styles.audienceOptionActive,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={audience === "selected" ? "#fff" : "#536783"}
                />
                <Text
                  style={[
                    styles.audienceText,
                    audience === "selected" && styles.audienceTextActive,
                  ]}
                >
                  Choose tenants
                </Text>
              </Pressable>
            </View>
            {audience === "all" ? (
              <View style={styles.recipientSummary}>
                <Ionicons
                  name="information-circle-outline"
                  size={17}
                  color="#2864e8"
                />
                <Text style={styles.recipientSummaryText}>
                  {loadingRecipients
                    ? "Loading tenant list..."
                    : `This notice will go to all ${recipients.length} assigned tenant${recipients.length === 1 ? "" : "s"}.`}
                </Text>
              </View>
            ) : (
              <View style={styles.recipientPicker}>
                <Text style={styles.recipientHeading}>
                  Select tenants ({selectedRecipientIds.length})
                </Text>
                <TextInput
                  value={recipientSearch}
                  onChangeText={setRecipientSearch}
                  placeholder="Search name, room, or email"
                  accessibilityLabel="Search tenants"
                  style={styles.recipientSearch}
                />
                {loadingRecipients ? (
                  <Text style={styles.recipientEmpty}>
                    Loading tenant list...
                  </Text>
                ) : matchingRecipients.length === 0 ? (
                  <Text style={styles.recipientEmpty}>
                    {recipients.length
                      ? "No tenants match your search."
                      : "No assigned tenants found."}
                  </Text>
                ) : (
                  <ScrollView style={styles.recipientList}>
                    {matchingRecipients.map((recipient) => {
                      const selected = selectedRecipientIds.includes(
                        recipient.id,
                      );
                      return (
                        <Pressable
                          key={recipient.id}
                          onPress={() =>
                            setSelectedRecipientIds((current) =>
                              selected
                                ? current.filter((id) => id !== recipient.id)
                                : [...current, recipient.id],
                            )
                          }
                          style={styles.recipientRow}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                        >
                          <View
                            style={[
                              styles.recipientCheckbox,
                              selected && styles.recipientCheckboxSelected,
                            ]}
                          >
                            {selected && (
                              <Ionicons
                                name="checkmark"
                                size={14}
                                color="#fff"
                              />
                            )}
                          </View>
                          <View style={styles.recipientInfo}>
                            <Text
                              style={styles.recipientName}
                              numberOfLines={1}
                            >
                              {recipient.name}
                            </Text>
                            <Text
                              style={styles.recipientDetail}
                              numberOfLines={1}
                            >
                              {recipient.room}
                              {recipient.email ? ` · ${recipient.email}` : ""}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
            <Text style={styles.info}>
              Appears in Recent Announcements on selected tenant dashboards and
              in their notification bell. No SMS is sent.
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
                disabled={
                  publishing ||
                  loadingRecipients ||
                  !title.trim() ||
                  !body.trim() ||
                  recipientIds.length === 0
                }
                onPress={() => void publish()}
                style={[
                  styles.button,
                  styles.publish,
                  (publishing ||
                    loadingRecipients ||
                    !title.trim() ||
                    !body.trim() ||
                    recipientIds.length === 0) && {
                    opacity: 0.5,
                  },
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {publishing ? "Publishing..." : "Publish notice"}
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
  audience: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#f3f7fd",
    borderRadius: 8,
    padding: 4,
    marginTop: 14,
  },
  audienceOption: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 6,
  },
  audienceOptionActive: { backgroundColor: "#2864e8" },
  audienceText: { fontSize: 12, color: "#536783", fontWeight: "600" },
  audienceTextActive: { color: "#fff" },
  recipientSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#eaf1ff",
    borderRadius: 8,
    padding: 11,
    marginTop: 11,
  },
  recipientSummaryText: { flex: 1, color: "#42536c", fontSize: 12 },
  recipientPicker: { marginTop: 12 },
  recipientHeading: {
    color: "#253149",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5,
  },
  recipientSearch: {
    borderWidth: 1,
    borderColor: "#dbe5f4",
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  recipientList: { maxHeight: 210 },
  recipientEmpty: { color: "#71809a", fontSize: 12, paddingVertical: 14 },
  recipientRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
    paddingVertical: 8,
  },
  recipientCheckbox: {
    width: 21,
    height: 21,
    borderWidth: 1,
    borderColor: "#b8c7db",
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  recipientCheckboxSelected: {
    backgroundColor: "#2864e8",
    borderColor: "#2864e8",
  },
  recipientInfo: { flex: 1 },
  recipientName: { color: "#253149", fontSize: 13, fontWeight: "600" },
  recipientDetail: { color: "#71809a", fontSize: 11, marginTop: 2 },
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
