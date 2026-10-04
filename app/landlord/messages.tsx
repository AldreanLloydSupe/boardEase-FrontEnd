import { LandlordNavigation } from "@/components/landlord-navigation";
import { LandlordPageHeader } from "@/components/landlord-page-header";
import { useMaintenanceInbox } from "@/lib/use-maintenance-inbox";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
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

import { Conversation } from "@/components/conversation";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function LandlordMessages() {
  const inbox = useMaintenanceInbox();
  const { requestId, tenantId } = useLocalSearchParams<{
    requestId?: string;
    tenantId?: string;
  }>();
  const [directTenant, setDirectTenant] = React.useState<any>(null);
  const [tenantError, setTenantError] = React.useState("");
  React.useEffect(() => {
    if (!tenantId || !db) return;
    return onSnapshot(
      doc(db, "users", tenantId),
      (snapshot) => {
        setDirectTenant(
          snapshot.exists() ? { ...snapshot.data(), id: tenantId } : null,
        );
        setTenantError(snapshot.exists() ? "" : "Tenant not found.");
      },
      () => setTenantError("Unable to load tenant information."),
    );
  }, [tenantId]);
  const routeSelection = requestId || (tenantId ? `direct:${tenantId}` : null);
  const [selection, setSelection] = React.useState<{
    id: string | null;
    route: string | null;
  }>({ id: routeSelection, route: routeSelection });
  const selectedId =
    selection.route === routeSelection ? selection.id : routeSelection;
  const setSelectedId = (id: string | null) =>
    setSelection({ id, route: routeSelection });
  const [search, setSearch] = React.useState("");
  const wide = useWindowDimensions().width >= 800;
  const selected =
    inbox.requests.find((r) => r.id === selectedId) ||
    (tenantId &&
    directTenant?.id === tenantId &&
    selectedId === `direct:${tenantId}`
      ? {
          id: `direct:${tenantId}`,
          source: "conversations" as const,
          threadId: tenantId,
          tenantId,
          tenantName: directTenant.name || "Tenant",
          roomNumber: directTenant.roomNumber || "",
          title: "Direct message",
          unread: 0,
          unreadAvailable: true,
        }
      : undefined);
  const conversations = inbox.requests
    .filter((r) =>
      [r.tenantName, r.title, r.roomNumber]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <LandlordPageHeader
        title="Messages"
        subtitle={`Tenant conversations · ${inbox.unreadCount} unread`}
      />
      {!!tenantError && (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {tenantError}
        </Text>
      )}
      {!!inbox.error && (
        <View style={styles.errorBox}>
          <Text accessibilityRole="alert" style={styles.errorText}>
            {inbox.error}
          </Text>
          <Pressable
            onPress={() => void inbox.retry()}
            disabled={inbox.retrying}
            style={styles.retry}
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
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search tenant, room, or request"
              accessibilityLabel="Search conversations"
            />
            <ScrollView keyboardShouldPersistTaps="handled">
              {inbox.loading ? (
                <ActivityIndicator style={styles.empty} color="#2864e8" />
              ) : conversations.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons
                    name="chatbubbles-outline"
                    size={40}
                    color="#9aa8ba"
                  />
                  <Text style={styles.emptyTitle}>
                    {search
                      ? "No matching conversations"
                      : inbox.error
                        ? "Inbox unavailable"
                        : "No tenant conversations yet"}
                  </Text>
                  <Text style={styles.muted}>
                    Replies to maintenance requests appear here.
                  </Text>
                </View>
              ) : (
                conversations.map((r) => (
                  <Pressable
                    key={r.id}
                    style={[
                      styles.conversation,
                      selectedId === r.id && styles.selected,
                    ]}
                    onPress={() => setSelectedId(r.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Chat with ${r.tenantName || "Tenant"}, ${r.title || "Maintenance request"}`}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.initials}>
                        {(r.tenantName || "Tenant")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.name}>
                        {r.tenantName || "Tenant"}
                      </Text>
                      <Text style={styles.subject} numberOfLines={1}>
                        Room {r.roomNumber || "—"} ·{" "}
                        {r.title || "Maintenance request"}
                      </Text>
                      <Text style={styles.muted} numberOfLines={1}>
                        {r.lastMessage || "Loading conversation..."}
                      </Text>
                      {!r.unreadAvailable && (
                        <Text style={styles.muted}>
                          Unread count unavailable
                        </Text>
                      )}
                    </View>
                    <View style={styles.meta}>
                      {!!r.lastMessageAt && (
                        <Text style={styles.time}>
                          {new Date(r.lastMessageAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </Text>
                      )}
                      {r.unreadAvailable && r.unread > 0 && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {r.unread > 99 ? "99+" : r.unread}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        )}
        {(wide || selected) &&
          (selected ? (
            <Conversation
              key={selected.id}
              request={selected}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="chatbubbles-outline" size={56} color="#2864e8" />
              <Text style={styles.emptyTitle}>Your tenant inbox</Text>
              <Text style={styles.muted}>
                Select a conversation to read and reply.
              </Text>
            </View>
          ))}
      </View>
      <LandlordNavigation active="Messages" />
    </SafeAreaView>
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
