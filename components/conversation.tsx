import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useIsFocused } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import {
  ActivityIndicator,
  AppState,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { timestampMillis } from "@/lib/billing";
import { createNotification } from "@/lib/notification-data";
import type { RequestSummary } from "@/lib/use-maintenance-inbox";
type ChatMessage = {
  id: string;
  senderId?: string;
  senderName?: string;
  body: string;
  createdAt?: unknown;
};
export function Conversation({
  request,
  onBack,
}: {
  request: RequestSummary;
  onBack?: () => void;
}) {
  const { user, displayName, role } = useAuth();
  const isFocused = useIsFocused();
  const [appActive, setAppActive] = React.useState(
    AppState.currentState === "active",
  );
  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setAppActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [text, setText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [attempt, setAttempt] = React.useState(0);
  const scroll = React.useRef<ScrollView>(null);
  const uid = user?.uid;
  const source = request.source || "maintenanceRequests";
  const threadId = request.threadId || request.id;
  React.useEffect(() => {
    const firestore = db;
    if (!firestore || !uid || !isFocused || !appActive) return;
    let active = true;
    const stop = onSnapshot(
      query(
        collection(firestore, source, threadId, "messages"),
        orderBy("createdAt", "asc"),
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return;
        setMessages(
          snapshot.docs.map(
            (item) => ({ ...item.data(), id: item.id }) as ChatMessage,
          ),
        );
        setLoading(false);
        setError("");
        if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites)
          void setDoc(doc(firestore, source, threadId, "readReceipts", uid), {
            readAt: serverTimestamp(),
          })
            .then(() => {
              if (active)
                setNotice((previous) =>
                  previous ===
                  "Messages loaded, but read status could not be saved."
                    ? ""
                    : previous,
                );
            })
            .catch(() => {
              if (active)
                setNotice(
                  "Messages loaded, but read status could not be saved.",
                );
            });
      },
      (cause) => {
        if (!active) return;
        setLoading(false);
        setError(
          `Unable to load this conversation (${cause.code}). Please retry.`,
        );
      },
    );
    return () => {
      active = false;
      stop();
    };
  }, [threadId, source, uid, attempt, isFocused, appActive]);
  async function send() {
    if (!db || !user || sending || loading || error || !text.trim()) return;
    const body = text.trim();
    if (body.length > 2000) return;
    setSending(true);
    setNotice("");
    try {
      const message = {
        senderId: user.uid,
        senderName:
          displayName || (role === "admin" ? "BoardEase Management" : "Tenant"),
        body,
        createdAt: serverTimestamp(),
      };
      if (source === "conversations") {
        const firestore = db;
        const messageRef = doc(
          collection(firestore, source, threadId, "messages"),
        );
        await runTransaction(firestore, async (transaction) => {
          const threadRef = doc(firestore, source, threadId);
          const thread = await transaction.get(threadRef);
          if (!thread.exists()) {
            if (role !== "admin" && threadId !== user.uid)
              throw new Error("Conversation unavailable");
            const profile = await transaction.get(
              doc(firestore, "users", threadId),
            );
            if (!profile.exists())
              throw new Error("Tenant profile unavailable");
            transaction.set(threadRef, {
              tenantId: threadId,
              tenantName: String(
                profile.data()?.name || displayName || "Tenant",
              ),
              roomNumber: String(profile.data()?.roomNumber || ""),
              createdAt: serverTimestamp(),
            });
          }
          transaction.set(messageRef, message);
        });
      } else
        await addDoc(
          collection(db, "maintenanceRequests", request.id, "messages"),
          {
            senderId: user.uid,
            senderName: displayName || "BoardEase Management",
            body,
            createdAt: serverTimestamp(),
          },
        );
      setText("");
      if (role === "admin" && request.tenantId) {
        try {
          await createNotification(request.tenantId, {
            type:
              source === "conversations"
                ? "chat_message"
                : "maintenance_message",
            title:
              source === "conversations"
                ? "New message from management"
                : "New maintenance message",
            body,
            route:
              source === "conversations"
                ? "/tenant/messages"
                : "/tenant/messages?requestId=" +
                  encodeURIComponent(request.id),
          });
        } catch {
          setNotice(
            "Message sent. The additional tenant notification could not be delivered.",
          );
        }
      }
    } catch {
      setNotice(
        "Message not sent. Please try again; your draft is saved here.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={styles.chat}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.chatHeader}>
        {!!onBack && (
          <Pressable
            onPress={onBack}
            style={styles.back}
            accessibilityLabel="Back to conversations"
          >
            <Ionicons name="arrow-back" size={22} color="#2864e8" />
          </Pressable>
        )}
        <View style={styles.copy}>
          <Text style={styles.name}>
            {role === "admin"
              ? request.tenantName || "Tenant"
              : "BoardEase Management"}
          </Text>
          <Text style={styles.subject}>
            Room {request.roomNumber || "—"} ·{" "}
            {request.title || "Maintenance request"}
          </Text>
        </View>
        {role === "admin" && source === "maintenanceRequests" && (
          <Pressable
            style={styles.back}
            accessibilityLabel="View maintenance request"
            onPress={() =>
              router.push({
                pathname: "/landlord/requests",
                params: { requestId: request.id },
              })
            }
          >
            <Ionicons name="construct-outline" size={22} color="#2864e8" />
          </Pressable>
        )}
      </View>
      {source === "maintenanceRequests" && (
        <View style={{ padding: 14, backgroundColor: "#eaf1ff" }}>
          <Text style={styles.name}>
            Reported issue ·{" "}
            {request.status?.replaceAll("_", " ") || "In progress"}
          </Text>
          <Text style={styles.subject}>{request.details || request.title}</Text>
          {!!request.photoUri &&
            /^(https:\/\/|data:image\/)/.test(request.photoUri) && (
              <Image
                source={{ uri: request.photoUri }}
                style={{ height: 100, width: "100%" }}
                resizeMode="contain"
                accessibilityLabel="Maintenance issue photo"
              />
            )}
        </View>
      )}
      {!!error && (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              setError("");
              setAttempt((n) => n + 1);
            }}
            style={styles.retry}
          >
            <Text style={styles.link}>Retry conversation</Text>
          </Pressable>
        </View>
      )}
      <ScrollView
        ref={scroll}
        style={styles.chatScroll}
        contentContainerStyle={styles.messageContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({ animated: true })
        }
      >
        {loading ? (
          <ActivityIndicator color="#2864e8" />
        ) : !error && messages.length === 0 ? (
          <Text style={styles.muted}>
            No messages yet. Start a conversation with management.
          </Text>
        ) : (
          messages.map((message) => {
            const management =
              role === "admin"
                ? message.senderId !== request.tenantId
                : message.senderId === uid;
            return (
              <View
                key={message.id}
                style={[
                  styles.bubble,
                  management ? styles.outgoing : styles.incoming,
                ]}
              >
                <Text style={[styles.sender, management && styles.lightText]}>
                  {message.senderName ||
                    (management
                      ? "Management"
                      : request.tenantName || "Tenant")}
                </Text>
                <Text style={[styles.body, management && styles.lightText]}>
                  {message.body}
                </Text>
                <Text style={[styles.time, management && styles.lightText]}>
                  {timestampMillis(message.createdAt)
                    ? new Date(
                        timestampMillis(message.createdAt),
                      ).toLocaleString()
                    : "Sending..."}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
      {!!notice && (
        <Text accessibilityRole="alert" style={styles.notice}>
          {notice}
        </Text>
      )}
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Write a reply..."
          accessibilityLabel="Write a message"
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <Pressable
          style={[
            styles.send,
            (sending || loading || !!error || !text.trim()) && styles.disabled,
          ]}
          onPress={() => void send()}
          disabled={sending || loading || !!error || !text.trim()}
          accessibilityLabel="Send reply"
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </Pressable>
      </View>
      <Text style={styles.counter}>{text.length} / 2,000</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7ff" },
  heading: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#e5edfb",
  },
  brand: {
    color: "#2864e8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#172033",
    marginVertical: 4,
  },
  muted: { color: "#71809a", fontSize: 12, lineHeight: 18 },
  workspace: { flex: 1, flexDirection: "row" },
  inbox: { flexGrow: 1, flexShrink: 1, flexBasis: 0, backgroundColor: "white" },
  wideInbox: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 340,
    width: 340,
    borderRightWidth: 1,
    borderColor: "#e5edfb",
  },
  search: {
    margin: 14,
    padding: 12,
    backgroundColor: "#f4f7ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5edfb",
  },
  conversation: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
    alignItems: "center",
  },
  selected: { backgroundColor: "#eaf1ff" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#2864e8", fontWeight: "700" },
  copy: { flex: 1 },
  name: { color: "#172033", fontWeight: "700", fontSize: 14 },
  subject: { color: "#536783", fontSize: 12, marginVertical: 4 },
  meta: { alignItems: "flex-end", gap: 8 },
  badge: {
    minWidth: 22,
    paddingHorizontal: 6,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "white", fontSize: 11, fontWeight: "700" },
  time: { fontSize: 10, color: "#71809a", marginTop: 4 },
  empty: { alignItems: "center", padding: 30, gap: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#172033",
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  chat: { flex: 1, minWidth: 0 },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "white",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "#e5edfb",
  },
  back: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chatScroll: { flex: 1 },
  messageContent: { padding: 18, gap: 12 },
  bubble: { maxWidth: "85%", borderRadius: 16, padding: 14, gap: 4 },
  outgoing: { alignSelf: "flex-end", backgroundColor: "#2864e8" },
  incoming: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dbe5f4",
  },
  sender: { fontSize: 11, fontWeight: "700", color: "#536783" },
  body: { fontSize: 14, lineHeight: 21, color: "#172033" },
  lightText: { color: "white" },
  composer: {
    flexDirection: "row",
    padding: 12,
    gap: 10,
    alignItems: "flex-end",
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#dbe5f4",
    borderRadius: 14,
    padding: 12,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
  counter: {
    textAlign: "right",
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: "white",
    color: "#71809a",
    fontSize: 10,
  },
  errorBox: { padding: 14, backgroundColor: "#fff1f0" },
  errorText: { color: "#9c3024", fontSize: 12 },
  retry: { paddingVertical: 12 },
  link: { color: "#2864e8", fontWeight: "700" },
  notice: {
    padding: 12,
    color: "#9c3024",
    backgroundColor: "#fff1f0",
    fontSize: 12,
  },
});
