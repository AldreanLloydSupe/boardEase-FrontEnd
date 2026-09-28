import { LandlordNavigation } from "@/components/landlord-navigation";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Tenants() {
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(Boolean(db));
  const [filter, setFilter] = useState<
    "all" | "overdue" | "ending" | "pending"
  >("all");
  useEffect(() => {
    if (!db) return;
    Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "applications")),
    ])
      .then(([usersSnapshot, applicationsSnapshot]) => {
        const assignedTenants = usersSnapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item: any) => item.role !== "admin" && item.hasRoom === true)
          .map((item: any) => ({
            id: item.id,
            name: item.name || item.email || "Tenant",
            room: `Room ${item.roomNumber || item.roomId || "Assigned"} · ${item.roomType || "Room"}`,
            rent: `₱${item.roomRent || "—"}`,
            status: item.paymentStatus === "overdue" || item.isOverdue === true ? "OVERDUE" : "ACTIVE LEASE",
            color: "#d9f7e8",
            photoURL: item.photoURL,
            isPending: false,
            raw: item
          }));
        const pendingTenants = applicationsSnapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item: any) => !item.status || item.status === "pending")
          .map((item: any) => ({
            id: item.id,
            name: item.tenantName || item.tenantEmail || "Tenant",
            room: `Applied for Room ${item.roomNumber || "requested room"}`,
            rent: `₱${item.price || "—"}`,
            status: "PENDING REVIEW",
            color: "#fff0c2",
            photoURL: item.tenantPhotoURL,
            isPending: true,
            raw: item
          }));
        setAllTenants([...assignedTenants, ...pendingTenants]);
      })
      .catch(() => setAllTenants([]))
      .finally(() => setLoading(false));
  }, []);
  const filteredTenants = allTenants.filter(
    (tenant) =>
      filter === "all" ||
      (filter === "overdue"
        ? tenant.status.includes("OVERDUE")
        : filter === "ending"
          ? tenant.status.includes("ENDING")
          : tenant.status.includes("PENDING")),
  );
  const overdueCount = allTenants.filter((tenant) =>
    tenant.status.includes("OVERDUE"),
  ).length;
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogo}>
            <Ionicons name="business" size={24} color="#fff" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>BOARDEASE</Text>
            <Text style={styles.title}>Tenants</Text>
            <Text style={styles.subtitle}>
              {allTenants.filter((tenant) => tenant.status === "ACTIVE LEASE").length}{" "}
              Active Tenants · 0 Overdue ·{" "}
              {
                allTenants.filter((tenant) => tenant.status.includes("PENDING"))
                  .length
              }{" "}
              Pending Applications
            </Text>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={16} color="#8997a6" />
          <Text style={styles.searchText}>
            Search by name, room #, or phone...
          </Text>
        </View>
        <View style={styles.filters}>
          <Pressable onPress={() => setFilter("all")}>
            <Text
              style={[styles.filter, filter === "all" && styles.filterActive]}
            >
              All Tenants ({allTenants.length})
            </Text>
          </Pressable>
          <Pressable onPress={() => setFilter("overdue")}>
            <Text
              style={[
                styles.filter,
                filter === "overdue" && styles.filterActive,
              ]}
            >
              Overdue ({overdueCount})
            </Text>
          </Pressable>
          <Pressable onPress={() => setFilter("ending")}>
            <Text
              style={[
                styles.filter,
                filter === "ending" && styles.filterActive,
              ]}
            >
              Lease Ending Soon (0)
            </Text>
          </Pressable>
          <Pressable onPress={() => setFilter("pending")}>
            <Text
              style={[
                styles.filter,
                filter === "pending" && styles.filterActive,
              ]}
            >
              Pending (
              {
                allTenants.filter((tenant) => tenant.status.includes("PENDING"))
                  .length
              }
              )
            </Text>
          </Pressable>
        </View>
        {overdueCount > 0 && (
          <View style={styles.alert}>
            <Ionicons name="alert-circle" size={23} color="#a84b2f" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>ATTENTION REQUIRED</Text>
              <Text style={styles.alertValue}>
                {overdueCount} Overdue Collection{overdueCount === 1 ? "" : "s"}{" "}
                <Text style={styles.alertAmount}>₱11,200</Text>
              </Text>
              <Text style={styles.alertText}>
                Unsettled amounts past the monthly grace period. You can trigger
                automated in-app notifications.
              </Text>
            </View>
            <Pressable
              style={styles.notifyAll}
              onPress={() =>
                Alert.alert(
                  "Notifications sent",
                  "Payment reminders were sent to all overdue tenants.",
                )
              }
            >
              <Text style={styles.notifyText}>Notify All Overdue Tenants</Text>
            </Pressable>
          </View>
        )}
        {loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Loading tenants...</Text>
          </View>
        ) : (
          filteredTenants.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No tenants yet</Text>
              <Text style={styles.emptyText}>
                Tenants will appear here after an application is approved and a
                room is assigned.
              </Text>
            </View>
          )
        )}
        {filteredTenants.map((tenant, index) => (
          <Pressable key={`${tenant.name}-${tenant.room}-${index}`} style={styles.card} onPress={() => setSelectedTenant(tenant)}>
            <View style={styles.cardTop}>
              {tenant.photoURL ? (
                <Image source={{ uri: tenant.photoURL }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarInitials}>
                  <Text style={styles.avatarInitialsText}>{String(tenant.name).slice(0, 2).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.person}>
                <Text style={styles.name}>{tenant.name}</Text>
                <Text style={styles.room}>{tenant.room}</Text>
                <Text style={styles.phone}>+63 917 555 1234</Text>
              </View>
              <Text style={[styles.badge, { backgroundColor: tenant.color }]}>
                {tenant.status}
              </Text>
            </View>
            <View style={styles.tenantActions}>
              <Text style={styles.rent}>
                {tenant.rent}
                <Text style={styles.month}>/mo</Text>
              </Text>
              <Pressable
                style={styles.smallButton}
                onPress={(e) => { e.stopPropagation(); Alert.alert("Call tenant", `Call ${tenant.name}?`); }}
              >
                <Ionicons name="call-outline" size={12} color="#173b36" />
                <Text>Call</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.smallButton,
                  tenant.status.includes("OVERDUE") && styles.notifyButton,
                ]}
                onPress={(e) => { e.stopPropagation(); setSelectedTenant(tenant); }}
              >
                <Ionicons
                  name="notifications-outline"
                  size={12}
                  color={tenant.status.includes("OVERDUE") ? "#fff" : "#173b36"}
                />
                <Text
                  style={tenant.status.includes("OVERDUE") && styles.notifyButtonText}
                >
                  {tenant.status.includes("OVERDUE") ? "Notify" : "Profile"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Modal
        visible={!!selectedTenant}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTenant(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            {selectedTenant && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                <View style={styles.modalHeader}>
                  <Pressable onPress={() => setSelectedTenant(null)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#536783" />
                  </Pressable>
                </View>
                
                <View style={styles.tenantProfile}>
                  {selectedTenant.photoURL ? (
                    <Image source={{ uri: selectedTenant.photoURL }} style={styles.modalAvatar} />
                  ) : (
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarInitials}>{String(selectedTenant.name).slice(0, 2).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.modalName}>{selectedTenant.name}</Text>
                  <Text style={styles.modalRoom}>{selectedTenant.room}</Text>
                  <View style={[styles.badge, { backgroundColor: selectedTenant.color, alignSelf: 'center', marginTop: 8 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '600' }}>{selectedTenant.status}</Text>
                  </View>
                </View>

                {!selectedTenant.isPending && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    <View style={styles.historyCard}>
                      <View style={styles.historyRow}>
                        <View>
                          <Text style={styles.historyItemTitle}>September Rent</Text>
                          <Text style={styles.historyItemDate}>Sep 1, 2026</Text>
                        </View>
                        <Text style={styles.historyItemAmount}>Paid {selectedTenant.rent}</Text>
                      </View>
                      <View style={styles.historyDivider} />
                      <View style={styles.historyRow}>
                        <View>
                          <Text style={styles.historyItemTitle}>August Rent</Text>
                          <Text style={styles.historyItemDate}>Aug 2, 2026</Text>
                        </View>
                        <Text style={styles.historyItemAmount}>Paid {selectedTenant.rent}</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Activity</Text>
                  <View style={styles.activityList}>
                    <View style={styles.activityItem}>
                      <View style={styles.activityDot} />
                      <View>
                        <Text style={styles.activityTitle}>Maintenance request completed</Text>
                        <Text style={styles.activityDate}>Sep 12, 2026</Text>
                      </View>
                    </View>
                    <View style={styles.activityItem}>
                      <View style={styles.activityDot} />
                      <View>
                        <Text style={styles.activityTitle}>Lease agreement signed</Text>
                        <Text style={styles.activityDate}>Aug 1, 2026</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {!selectedTenant.isPending && (
                  <View style={styles.dangerZone}>
                    <Text style={styles.dangerTitle}>Landlord Actions</Text>
                    <Pressable 
                      style={styles.evictBtn}
                      onPress={() => {
                        Alert.alert(
                          "30-Day Notice",
                          `Are you sure you want to issue a 30-day notice to remove ${selectedTenant.name}?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            { 
                              text: "Issue Notice", 
                              style: "destructive",
                              onPress: () => {
                                Alert.alert("Notice Issued", "The tenant has been notified.");
                                setSelectedTenant(null);
                              }
                            }
                          ]
                        )
                      }}
                    >
                      <Ionicons name="warning-outline" size={18} color="#c62828" />
                      <Text style={styles.evictBtnText}>Issue 30-Day Removal Notice</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <LandlordNavigation active="Tenants" />
    </SafeAreaView>
  );
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BottomNav() {
  return (
    <View style={styles.nav}>
      {[
        ["grid-outline", "Dashboard"],
        ["business-outline", "Rooms"],
        ["people-outline", "Tenants"],
        ["bar-chart-outline", "Finance"],
      ].map(([icon, label], index) => (
        <Pressable
          key={label}
          style={styles.navItem}
          onPress={() =>
            index === 0
              ? router.replace("/landlord/dashboard" as any)
              : index === 1
                ? router.push("/landlord/rooms" as any)
                : index === 3
                  ? router.push("/landlord/finance" as any)
                  : undefined
          }
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={index === 2 ? "#2864e8" : "#9aa8ba"}
          />
          <Text style={[styles.navText, index === 2 && styles.navActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  header: {
    minHeight: 118,
    backgroundColor: "#2864e8",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1,
  },
  headerBrand: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 11, color: "#d9e5ff", fontWeight: "700", letterSpacing: 1.4 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 2 },
  subtitle: { fontSize: 11, color: "#e1eaff", marginTop: 5, maxWidth: 310, lineHeight: 16 },
  register: {
    backgroundColor: "#173b36",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  registerText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 24 },
  search: {
    height: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce7f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchText: { fontSize: 12, color: "#8997a6" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 12 },
  filterActive: {
    fontSize: 11,
    color: "#fff",
    backgroundColor: "#2864e8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  filter: {
    fontSize: 11,
    color: "#66768a",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#dce7f5",
  },
  alert: {
    backgroundColor: "#fff2f0",
    borderWidth: 1,
    borderColor: "#ffd8d3",
    borderRadius: 8,
    padding: 13,
    flexDirection: "row",
    gap: 9,
    flexWrap: "wrap",
    marginBottom: 11,
  },
  alertTitle: { fontSize: 12, color: "#a84b2f", fontWeight: "700" },
  alertValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7e3623",
    marginTop: 2,
  },
  alertAmount: { marginLeft: 38 },
  alertText: { fontSize: 11, color: "#875445", marginTop: 3 },
  notifyAll: {
    flexBasis: "100%",
    backgroundColor: "#b9382b",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 7,
  },
  notifyText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    padding: 14,
    marginBottom: 10,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { display: "none" },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  avatarInitials: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#eaf1ff", alignItems: "center", justifyContent: "center" },
  avatarInitialsText: { color: "#2458c7", fontSize: 13, fontWeight: "700" },
  person: { flex: 1 },
  name: { fontSize: 13, fontWeight: "700", color: "#253149" },
  room: { fontSize: 11, color: "#728197", marginTop: 2 },
  phone: { fontSize: 12, color: "#8997a6", marginTop: 2 },
  badge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#42634f",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tenantActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#edf1f7",
  },
  rent: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2458c7",
    marginRight: "auto",
  },
  month: { fontSize: 12, fontWeight: "400" },
  smallButton: {
    borderRadius: 6,
    backgroundColor: "#f3f7fd",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  smallButtonText: { fontSize: 11 },
  notifyButton: { backgroundColor: "#b9382b" },
  notifyButtonText: { color: "#fff" },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 28,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e1eafa",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#253149" },
  emptyText: {
    fontSize: 12,
    color: "#71809a",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 7,
  },
  nav: {
    height: 66,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },
  navItem: { alignItems: "center", gap: 3 },
  navText: { fontSize: 11, color: "#9aa8ba" },
  navActive: { color: "#2864e8" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  closeBtn: { padding: 4 },
  tenantProfile: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  modalAvatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalAvatarInitials: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2458c7",
  },
  modalName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172033",
  },
  modalRoom: {
    fontSize: 13,
    color: "#728197",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: "#f7f9fc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#253149",
  },
  historyItemDate: {
    fontSize: 11,
    color: "#728197",
    marginTop: 2,
  },
  historyItemAmount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2458c7",
  },
  historyDivider: {
    height: 1,
    backgroundColor: "#e5eaf1",
    marginVertical: 12,
  },
  activityList: {
    gap: 16,
    paddingHorizontal: 8,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2864e8",
    marginTop: 6,
  },
  activityTitle: {
    fontSize: 13,
    color: "#253149",
  },
  activityDate: {
    fontSize: 11,
    color: "#8997a6",
    marginTop: 2,
  },
  dangerZone: {
    marginTop: 8,
    padding: 16,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffe3e3",
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#c62828",
    marginBottom: 12,
  },
  evictBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c62828",
    paddingVertical: 12,
    borderRadius: 8,
  },
  evictBtnText: {
    color: "#c62828",
    fontWeight: "600",
    fontSize: 13,
  },
});
