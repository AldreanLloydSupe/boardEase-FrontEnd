import { MeterReadings } from "@/components/meter-readings";
import { TenantHomeSkeleton } from "@/components/tenant-home-skeleton";
import { AssignedTenantNav } from "@/components/tenant-navigation";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { cycleDetails, peso, timestampMillis } from "@/lib/billing";
import { db } from "@/lib/firebase";
import { useNotifications } from "@/lib/use-notifications";
import { usePropertySettings } from "@/lib/use-property-settings";
import { useTenantData } from "@/lib/use-tenant-data";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TenantHome() {
  const { user } = useAuth();
  const { profile, payments, error, loading } = useTenantData();
  const { settings, error: settingsError } = usePropertySettings();
  const {
    unreadCount,
    announcements,
    bulletinPosts,
    markRead,
    error: announcementError,
  } = useNotifications();
  const { announcementId } = useLocalSearchParams<{
    announcementId?: string;
  }>();
  const [openedAnnouncement, setOpenedAnnouncement] = React.useState<
    string | null
  >(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = React.useState(false);
  const selectedAnnouncement = announcements.find(
    (notice) => notice.id === (openedAnnouncement || announcementId),
  );
  function closeAnnouncement() {
    setOpenedAnnouncement(null);
    if (announcementId) router.setParams({ announcementId: "" });
  }
  const [pending, setPending] = React.useState(0);
  const [requestError, setRequestError] = React.useState("");
  const cycle = cycleDetails(profile, payments);
  const roomId = String(profile.roomId || "");
  const [assignedRoom, setAssignedRoom] = React.useState<Record<string, unknown> | null>(null);
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- clear the previous room while switching assignments */
    setAssignedRoom(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    if (!db || !roomId) return;
    return onSnapshot(
      doc(db, "roomListings", roomId),
      (snapshot) => setAssignedRoom(snapshot.exists() ? snapshot.data() : null),
      () => setAssignedRoom(null),
    );
  }, [roomId]);
  const tenantRoom = {
    number: String(assignedRoom?.number ?? profile.roomNumber ?? ""),
    type: String(assignedRoom?.type ?? profile.roomType ?? "Room"),
  };
  const roomLocation = [
    assignedRoom?.propertyName ?? assignedRoom?.property,
    assignedRoom?.location ?? assignedRoom?.address,
    assignedRoom?.floor ? `Floor ${String(assignedRoom.floor)}` : "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" · ");
  React.useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(
      query(
        collection(db, "maintenanceRequests"),
        where("tenantId", "==", user.uid),
      ),
      (snapshot) =>
        setPending(
          snapshot.docs.filter(
            (d) => !["completed", "cancelled"].includes(d.data().status),
          ).length,
        ),
      () => setRequestError("Unable to load maintenance count."),
    );
  }, [user]);
  const roomLabel = tenantRoom.number
    ? `Room ${tenantRoom.number} - ${tenantRoom.type}`
    : "No room assigned";
  if (loading && !error) return <TenantHomeSkeleton />;

  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader title="Home" backHref="/tenant/account" />
      <ScrollView contentContainerStyle={styles.content}>
        {!!(error || requestError || settingsError || announcementError) && (
          <Text accessibilityRole="alert">
            {error || requestError || settingsError || announcementError}
          </Text>
        )}
        <View style={styles.due}>
          <Text style={styles.dueBadge}>
            DUE {cycle.due.toLocaleDateString("en-PH")}
          </Text>
          <View>
            <Text style={styles.dueLabel}>· Rent Due</Text>
            <Text style={styles.amount}>
              {loading || error ? "—" : peso(cycle.balance)}
            </Text>
            <Text style={styles.muted}>
              Period: {cycle.period} · Approved payments: {peso(cycle.paid)}
            </Text>
          </View>
        </View>
        <View style={styles.roomCard}>
          <View style={styles.roomTop}>
            <View>
              <Text style={styles.cardLabel}>YOUR ROOM</Text>
              <Text style={styles.roomTitle}>{roomLabel}</Text>
              {!!roomLocation && <Text style={styles.muted}>{roomLocation}</Text>}
            </View>
            <Text style={styles.lease}>● Active Lease</Text>
          </View>
          <View style={styles.roomDetails}>
            <View style={styles.roommateInfo}>
              <Text style={styles.cardLabel}>ROOMMATE/S</Text>
              <Text style={styles.detail}>
                {String(profile.roommateName || "No Roommate")}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          {[
            ["construct-outline", "Maintenance", `${pending} Pending`],
            ["notifications-outline", "Notifications", `${unreadCount} New`],
            ["person-outline", "Profile", "Tenant Info"],
          ].map(([icon, label, sub]) => (
            <Pressable
              style={styles.action}
              key={label}
              onPress={() => {
                if (label === "Profile") router.push("/tenant/account" as any);
                if (label === "Maintenance")
                  router.push("/tenant/applications" as any);
                if (label === "Notifications")
                  router.push("/tenant/notifications" as any);
              }}
            >
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color="#2563eb"
              />
              <Text style={styles.actionText}>{label}</Text>
              <Text style={styles.actionSub}>{sub}</Text>
            </Pressable>
          ))}
        </View>
        <MeterReadings
          key={String(profile.roomId || "")}
          roomId={profile.hasRoom ? String(profile.roomId || "") : ""}
          roomNumber={String(profile.roomNumber || "")}
        />
        <View style={styles.bulletin}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Announcements</Text>
            {announcements.length > 3 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAllAnnouncements((value) => !value)}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={styles.history}>
                  {showAllAnnouncements ? "Show recent" : "View all"}
                </Text>
              </Pressable>
            )}
          </View>
          {!announcements.length && (
            <Text style={styles.muted}>
              {announcementError
                ? "Announcements could not load."
                : "No announcements published yet."}
            </Text>
          )}
          {announcements
            .slice(0, showAllAnnouncements ? undefined : 3)
            .map((notice) => (
              <Pressable
                key={notice.id}
                accessibilityRole="button"
                accessibilityLabel={`Read announcement: ${notice.title}`}
                style={styles.announcementCard}
                onPress={() => {
                  setOpenedAnnouncement(notice.id);
                  void markRead(notice);
                }}
              >
                <View style={styles.sectionRow}>
                  <Text style={[styles.sectionTitle, { flex: 1 }]}>
                    {notice.title}
                  </Text>
                  {!notice.read && <Text style={styles.newBadge}>NEW</Text>}
                </View>
                <Text style={styles.muted}>
                  {timestampMillis(notice.createdAt)
                    ? new Date(
                        timestampMillis(notice.createdAt),
                      ).toLocaleString("en-PH")
                    : "Just posted"}
                </Text>
                <Text style={styles.announcementBody} numberOfLines={3}>
                  {notice.body}
                </Text>
                <Text style={styles.history}>Read announcement ›</Text>
              </Pressable>
            ))}
        </View>
        <View style={styles.bulletin}>
          <Text style={styles.sectionTitle}>📣 BoardEase Bulletin</Text>
          {!!String(settings.bulletin || "").trim() && (
            <View style={styles.bulletinPostCard}>
              <Text style={styles.bulletinPostTitle}>Property bulletin</Text>
              <Text style={styles.bulletinText}>
                {String(settings.bulletin)}
              </Text>
            </View>
          )}
          {!bulletinPosts.length && !String(settings.bulletin || "").trim() && (
            <Text style={styles.muted}>No bulletin published yet.</Text>
          )}
          {bulletinPosts.map((notice) => (
            <Pressable
              key={notice.id}
              accessibilityRole="button"
              accessibilityLabel={`Read bulletin: ${notice.title}`}
              style={styles.bulletinPostCard}
              onPress={() => {
                setOpenedAnnouncement(notice.id);
                void markRead(notice);
              }}
            >
              <View style={styles.bulletinPostHeading}>
                <Text style={styles.bulletinPostTitle}>{notice.title}</Text>
                {!notice.read && <Text style={styles.newBadge}>NEW</Text>}
              </View>
              <Text style={styles.muted}>
                {timestampMillis(notice.createdAt)
                  ? new Date(
                      timestampMillis(notice.createdAt),
                    ).toLocaleString("en-PH")
                  : "Just posted"}
              </Text>
              <Text style={styles.bulletinText}>{notice.body}</Text>
              <Text style={styles.history}>Read announcement ›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Modal
        visible={!!selectedAnnouncement}
        transparent
        animationType="fade"
        onRequestClose={closeAnnouncement}
      >
        <View style={styles.announcementBackdrop}>
          <View style={styles.announcementDialog}>
            <ScrollView>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { flex: 1 }]}>
                  Announcement
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close announcement"
                  onPress={closeAnnouncement}
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={24} color="#536783" />
                </Pressable>
              </View>
              <Text style={styles.announcementTitle}>
                {selectedAnnouncement?.title}
              </Text>
              <Text style={styles.muted}>
                {timestampMillis(selectedAnnouncement?.createdAt)
                  ? new Date(
                      timestampMillis(selectedAnnouncement?.createdAt),
                    ).toLocaleString("en-PH")
                  : "Just posted"}
              </Text>
              <Text selectable style={styles.announcementBody}>
                {selectedAnnouncement?.body}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <AssignedTenantNav active="Home" />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  announcementCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#dce6fa",
    borderRadius: 12,
    backgroundColor: "#f8faff",
    gap: 8,
    marginTop: 12,
  },
  newBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2864e8",
    backgroundColor: "#e8efff",
    padding: 5,
    borderRadius: 5,
    alignSelf: "flex-start",
  },
  announcementBody: {
    fontSize: 14,
    lineHeight: 23,
    color: "#253149",
    marginVertical: 8,
  },
  announcementTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#172033",
    marginVertical: 12,
  },
  announcementBackdrop: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  announcementDialog: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "85%",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  header: {
    backgroundColor: "#2864e8",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
    zIndex: 1,
  },
  kicker: {
    fontSize: 11,
    color: "#d9e5ff",
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 11 },
  headerCopy: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 9,
  },
  headerProfileActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  welcome: { fontSize: 12, color: "#d9e5ff" },
  name: { fontSize: 23, fontWeight: "800", color: "#fff", marginTop: 2 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffd86b",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 12, paddingBottom: 100 },
  due: {
    backgroundColor: "#eaf2ff",
    borderRadius: 8,
    padding: 16,
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#d5e5ff",
  },
  dueLabel: { color: "#1d4ed8", fontSize: 12 },
  amount: { fontSize: 24, fontWeight: "800", color: "#172033", marginTop: 8 },
  muted: { fontSize: 11, color: "#78879b", marginTop: 3 },
  bold: { fontWeight: "700" },
  dueBadge: {
    color: "#1d4ed8",
    fontSize: 11,
    backgroundColor: "#d5e5ff",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  roomCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: "#dce7f5",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  roomTop: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { fontSize: 12, color: "#8997a6", letterSpacing: 0.5 },
  roomTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#253149",
    marginTop: 4,
  },
  lease: {
    color: "#14805f",
    backgroundColor: "#d9f7e8",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 12,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  detail: { fontSize: 12, color: "#253149", fontWeight: "600", marginTop: 4 },
  roomDetails: { flexDirection: "row", gap: 9, marginTop: 14 },
  roommateInfo: { flex: 1 },
  actions: { flexDirection: "row", gap: 8, marginVertical: 12 },
  action: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#253149",
    marginTop: 6,
  },
  actionSub: { fontSize: 12, color: "#8390a2", marginTop: 3 },
  reading: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1eafa",
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#253149" },
  history: { fontSize: 11, color: "#2563eb" },
  readingRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  readingBox: {
    flex: 1,
    backgroundColor: "#f3f7fd",
    borderRadius: 7,
    padding: 9,
  },
  readingValue: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
    marginTop: 5,
  },
  progress: {
    height: 4,
    backgroundColor: "#4e9fe5",
    borderRadius: 2,
    marginTop: 6,
    width: "65%",
  },
  bulletin: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    padding: 14,
    marginTop: 12,
  },
  bulletinText: {
    fontSize: 12,
    color: "#536783",
    lineHeight: 19,
    marginTop: 6,
  },
  bulletinPostCard: {
    backgroundColor: "#f8faff",
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  bulletinPostHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletinPostTitle: {
    flex: 1,
    color: "#253149",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  bottomBar: {
    position: "absolute",
    bottom: 85,
    left: 14,
    right: 14,
    backgroundColor: "#1e3a8a",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  bottomText: { color: "#fff", fontSize: 13, fontWeight: "500" },
  call: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  callText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  nav: {
    height: 64,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },
  navItem: { alignItems: "center", gap: 3 },
  navText: { fontSize: 11, color: "#9aa8ba" },
  navActive: { color: "#2563eb" },
});
