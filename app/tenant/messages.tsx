import React from "react";
import { Conversation } from "@/components/conversation";
import { TenantPageHeader } from "@/components/tenant-page-header";
import {
  AssignedTenantNav,
  ApplicantTenantNav,
} from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { useTenantData } from "@/lib/use-tenant-data";
import {
  useTenantInbox,
  type RequestSummary,
} from "@/lib/use-maintenance-inbox";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { timestampMillis } from "@/lib/billing";

export default function TenantMessages() {
  const { user, displayName, hasRoom } = useAuth();
  const { profile } = useTenantData();
  const inbox = useTenantInbox();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const [selection, setSelection] = React.useState<{
    id: string | null;
    route?: string;
  } | null>(null);
  const selectedId =
    selection && selection.route === requestId
      ? selection.id
      : requestId || null;
  const [search, setSearch] = React.useState("");
  const wide = useWindowDimensions().width >= 800;
  const general: RequestSummary = inbox.requests.find(
    (r) => r.source === "conversations",
  ) || {
    id: "direct:" + user?.uid,
    threadId: user?.uid,
    source: "conversations",
    tenantId: user?.uid,
    tenantName: displayName || "Tenant",
    roomNumber: String(profile.roomNumber || ""),
    title: "General conversation",
    unread: 0,
    unreadAvailable: !inbox.loading,
    lastMessage: "Ask management a question",
  };
  const threads = [
    general,
    ...inbox.requests.filter((r) => r.source === "maintenanceRequests"),
  ]
    .filter((r) =>
      [r.title, r.details, r.lastMessage]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (b.lastMessageAt || timestampMillis(b.createdAt)) -
        (a.lastMessageAt || timestampMillis(a.createdAt)),
    );
  const selected = [general, ...inbox.requests].find(
    (r) => r.id === selectedId,
  );
  const select = (id: string | null) => setSelection({ id, route: requestId });
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <TenantPageHeader
        title="Messages"
        showBack
        onBack={() => {
          if (router.canGoBack()) router.back();
          else
            router.replace(
              hasRoom ? "/tenant/tenant-home" : "/tenant/room-browser",
            );
        }}
      />
      {!!inbox.error && (
        <View style={styles.error}>
          <Text accessibilityRole="alert">{inbox.error}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => void inbox.retry()}
            disabled={inbox.retrying}
          >
            <Text style={styles.link}>
              {inbox.retrying ? "Retrying..." : "Retry inbox"}
            </Text>
          </Pressable>
        </View>
      )}
      <View style={styles.workspace}>
        {(wide || !selected) && (
          <View style={[styles.inbox, wide && styles.wideInbox]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search requests or messages"
              style={styles.search}
              accessibilityLabel="Search messages"
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {inbox.loading && <ActivityIndicator color="#2864e8" />}
              {!inbox.loading && requestId && !selected && (
                <Text style={styles.helper}>
                  Select a conversation below. This request may no longer be
                  available.
                </Text>
              )}
              {threads.map((thread) => (
                <Pressable
                  key={thread.id}
                  style={[
                    styles.row,
                    selectedId === thread.id && styles.selected,
                  ]}
                  onPress={() => select(thread.id)}
                  accessibilityRole="button"
                >
                  <View style={styles.avatar}>
                    <Ionicons
                      name={
                        thread.source === "conversations"
                          ? "chatbubbles-outline"
                          : "construct-outline"
                      }
                      size={22}
                      color="#2864e8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {thread.source === "conversations"
                        ? "BoardEase Management"
                        : thread.title || "Maintenance request"}
                    </Text>
                    <Text style={styles.subject}>
                      {thread.source === "conversations"
                        ? "General conversation"
                        : "Maintenance · " +
                          (thread.status || "in_progress").replaceAll("_", " ")}
                    </Text>
                    <Text style={styles.muted} numberOfLines={2}>
                      {thread.lastMessage ||
                        thread.details ||
                        "Open to read and reply"}
                    </Text>
                  </View>
                  {thread.unreadAvailable && thread.unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {thread.unread > 99 ? "99+" : thread.unread}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
              {!threads.length && (
                <Text style={styles.helper}>No matching conversations.</Text>
              )}
            </ScrollView>
          </View>
        )}
        {(wide || selected) &&
          (selected && user ? (
            <Conversation
              key={selected.id}
              request={selected}
              onBack={() => select(null)}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="chatbubbles-outline" size={52} color="#2864e8" />
              <Text style={styles.name}>
                Your conversations with management
              </Text>
              <Text style={styles.muted}>
                Choose a maintenance request or a general conversation.
              </Text>
            </View>
          ))}
      </View>
      {hasRoom ? (
        <AssignedTenantNav active="Messages" />
      ) : (
        <ApplicantTenantNav active="Messages" />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7ff" },
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
    borderWidth: 1,
    borderColor: "#e5edfb",
    borderRadius: 12,
    backgroundColor: "#f4f7ff",
  },
  row: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "#e5edfb",
  },
  selected: { backgroundColor: "#eaf1ff" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf1ff",
  },
  name: { fontSize: 14, fontWeight: "700", color: "#172033" },
  subject: { fontSize: 12, color: "#536783", marginVertical: 4 },
  muted: { fontSize: 12, color: "#71809a", lineHeight: 18 },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "white", fontSize: 11, fontWeight: "700" },
  error: { padding: 14, backgroundColor: "#fff1f0" },
  retry: { paddingVertical: 12 },
  link: { color: "#2864e8", fontWeight: "700" },
  helper: { padding: 18, color: "#71809a" },
});
