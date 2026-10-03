import { cycleDetails, peso, timestampMillis } from "@/lib/billing";
import { AppAlert as Alert } from "@/components/app-alert";
import { LandlordNavigation } from "@/components/landlord-navigation";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notification-data";
import { vacateTenantRoom } from "@/lib/room-vacate";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Tenants() {
  const [users, setUsers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [accountRequests, setAccountRequests] = useState<any[]>([]);
  const [loadError, setLoadError] = useState("");
  const [sort, setSort] = useState("room");
  function openTenant(tenant: any) {
    router.push(
      tenant.isPending
        ? "/landlord/pending-applications"
        : {
            pathname: "./tenant-details",
            params: { tenantId: tenant.id },
          },
    );
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(Boolean(db));
  const [filter, setFilter] = useState<
    "all" | "overdue" | "ending" | "pending"
  >("all");
  useEffect(() => {
    const firestore = db;
    if (!firestore) return;
    const ready = new Set<string>();
    const failed = () => {
      setLoadError(
        "Unable to load tenant records. Check your connection and permissions.",
      );
      setLoading(false);
    };
    const subscribe = (name: string, save: (records: any[]) => void) =>
      onSnapshot(
        collection(firestore, name),
        (snapshot) => {
          save(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
          ready.add(name);
          setLoading(ready.size < 4);
        },
        failed,
      );
    const stops = [
      subscribe("users", setUsers),
      subscribe("applications", setApplications),
      subscribe("payments", setPayments),
      subscribe("accountRequests", setAccountRequests),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);
  const assignedTenants = users
    .filter((item: any) => item.role !== "admin" && item.hasRoom === true)
    .map((item: any) => {
      const leaseEndValue =
        item.noticeEndsAt || item.leaseEndDate || item.leaseEnd || item.endDate;
      const leaseEndDate =
        leaseEndValue?.toDate?.() ||
        (leaseEndValue ? new Date(leaseEndValue) : null);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntilLeaseEnd =
        leaseEndDate && !Number.isNaN(leaseEndDate.getTime())
          ? Math.ceil((leaseEndDate.getTime() - today.getTime()) / 86400000)
          : null;
      const cycle = cycleDetails(
        item,
        payments.filter((p) => p.tenantId === item.id),
      );
      const isOverdue =
        cycle.balance > 0 &&
        cycle.daysUntilDue < 0 &&
        (!item.leaseStartedAt ||
          timestampMillis(item.leaseStartedAt) <= cycle.due.getTime());
      const isEndingSoon =
        daysUntilLeaseEnd !== null &&
        daysUntilLeaseEnd >= 0 &&
        daysUntilLeaseEnd <= 30;
      return {
        id: item.id,
        name: item.name || item.email || "Tenant",
        room: `Room ${item.roomNumber || item.roomId || "Assigned"} · ${item.roomType || "Room"}`,
        rent: peso(item.roomRent),
        status: isOverdue
          ? "OVERDUE"
          : isEndingSoon
            ? "ENDING SOON"
            : "ACTIVE LEASE",
        color: isOverdue ? "#fff0c2" : isEndingSoon ? "#fff0c2" : "#d9f7e8",
        photoURL: item.photoURL,
        phone: item.phone,
        isPending: false,
        raw: item,
      };
    });
  const pendingTenants = applications
    .filter((item: any) => !item.status || item.status === "pending")
    .map((item: any) => ({
      id: item.id,
      name: item.tenantName || item.tenantEmail || "Tenant",
      room: `Applied for Room ${item.roomNumber || "requested room"}`,
      rent: `₱${item.price || "—"}`,
      status: "PENDING REVIEW",
      color: "#fff0c2",
      photoURL: users.find((u) => u.id === item.tenantId)?.photoURL,
      phone: users.find((u) => u.id === item.tenantId)?.phone,
      isPending: true,
      raw: item,
    }));

  const allTenants = [...assignedTenants, ...pendingTenants];
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const filteredTenants = allTenants.filter((tenant) => {
    const matchesFilter =
      (filter === "all" && !tenant.isPending) ||
      (filter === "overdue" && tenant.status.includes("OVERDUE")) ||
      (filter === "ending" && tenant.status.includes("ENDING")) ||
      (filter === "pending" && tenant.status.includes("PENDING"));
    const searchableText = [
      tenant.name,
      tenant.room,
      tenant.phone,
      tenant.raw?.email,
      tenant.raw?.tenantEmail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return (
      matchesFilter &&
      (!normalizedQuery || searchableText.includes(normalizedQuery))
    );
  });
  filteredTenants.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "balance")
      return (
        cycleDetails(
          b.raw,
          payments.filter((p) => p.tenantId === b.id),
        ).balance -
        cycleDetails(
          a.raw,
          payments.filter((p) => p.tenantId === a.id),
        ).balance
      );
    if (sort === "newest")
      return (
        timestampMillis(b.raw.leaseStartedAt || b.raw.createdAt) -
        timestampMillis(a.raw.leaseStartedAt || a.raw.createdAt)
      );
    return a.room.localeCompare(b.room, undefined, { numeric: true });
  });
  const overdueCount = allTenants.filter((tenant) =>
    tenant.status.includes("OVERDUE"),
  ).length;
  const endingSoonCount = allTenants.filter((tenant) =>
    tenant.status.includes("ENDING"),
  ).length;
  const pendingCount = allTenants.filter((tenant) =>
    tenant.status.includes("PENDING"),
  ).length;

  function reviewAccountRequest(request: any) {
    const tenant = users.find((u) => u.id === request.tenantId);
    if (request.kind === "vacate") {
      Alert.alert(
        "Confirm move-out?",
        `Release ${tenant?.name || "this tenant"}'s room after completing your move-out review?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm move-out",
            onPress: async () => {
              try {
                await vacateTenantRoom(request.tenantId);
                if (db) await deleteDoc(doc(db, "accountRequests", request.id));
                await createNotification(request.tenantId, {
                  type: "room_update",
                  title: "Move-out confirmed",
                  body: "Management has released your room.",
                  route: "/tenant/account",
                }).catch(() =>
                  Alert.alert(
                    "Move-out saved",
                    "The notification could not be sent.",
                  ),
                );
              } catch (error) {
                Alert.alert(
                  "Could not confirm",
                  error instanceof Error ? error.message : "Please try again.",
                );
              }
            },
          },
        ],
      );
    } else
      Alert.alert(
        "Account deletion review",
        `Tenant: ${tenant?.name || request.tenantId}\nEmail: ${tenant?.email || "Not recorded"}\nUser ID: ${request.tenantId}\n\nAfter reviewing the tenant's records and releasing any room, use the backend delete-account command. The account remains available until that review is complete.`,
      );
  }
  async function remindTenant(tenant: any) {
    const balance = cycleDetails(
      tenant.raw,
      payments.filter((p) => p.tenantId === tenant.id),
    ).balance;
    await createNotification(tenant.id, {
      type: "rent_reminder",
      title: "Payment reminder",
      body: `Your current rent balance is ${peso(balance)}. Please review Payments.`,
      route: "/tenant/payments",
    });
  }
  async function remindAll() {
    const overdue = allTenants.filter((t) => t.status === "OVERDUE");
    const result = await Promise.allSettled(overdue.map(remindTenant));
    const failures = result.filter((r) => r.status === "rejected").length;
    Alert.alert(
      failures ? "Some reminders failed" : "Reminders saved",
      failures
        ? `${failures} reminders could not be saved. Please try again.`
        : "Reminders were saved for tenants with payment notifications enabled.",
    );
  }
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
              {
                allTenants.filter((tenant) => tenant.status === "ACTIVE LEASE")
                  .length
              }{" "}
              Active Tenants · {overdueCount} Overdue ·{" "}
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
        {!!loadError && <Text accessibilityRole="alert">{loadError}</Text>}
        {accountRequests.map((request) => (
          <View key={request.id} style={styles.card}>
            <Text style={styles.name}>
              {users.find((u) => u.id === request.tenantId)?.name ||
                request.tenantId}
            </Text>
            <Text>
              {request.kind === "vacate"
                ? "Move-out requested"
                : "Account deletion requested"}
            </Text>
            <Pressable
              style={styles.smallButton}
              onPress={() => reviewAccountRequest(request)}
            >
              <Text>Review request</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.search}>
          <Ionicons name="search-outline" size={16} color="#8997a6" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, room #, or phone..."
            placeholderTextColor="#8997a6"
            returnKeyType="search"
            accessibilityLabel="Search tenants by name, room, phone, or email"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear tenant search"
            >
              <Ionicons name="close-circle" size={18} color="#8997a6" />
            </Pressable>
          )}
        </View>
        <View style={styles.filters}>
          <Pressable
            onPress={() => setFilter("all")}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === "all" }}
          >
            <Text
              style={[styles.filter, filter === "all" && styles.filterActive]}
            >
              Current Tenants ({assignedTenants.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter("overdue")}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === "overdue" }}
          >
            <Text
              style={[
                styles.filter,
                filter === "overdue" && styles.filterActive,
              ]}
            >
              Overdue ({overdueCount})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter("ending")}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === "ending" }}
          >
            <Text
              style={[
                styles.filter,
                filter === "ending" && styles.filterActive,
              ]}
            >
              Lease Ending Soon ({endingSoonCount})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilter("pending")}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === "pending" }}
          >
            <Text
              style={[
                styles.filter,
                filter === "pending" && styles.filterActive,
              ]}
            >
              Applicants ({pendingCount})
            </Text>
          </Pressable>
        </View>
        <View style={[styles.filters, { flexWrap: "wrap" }]}>
          {["room", "name", "balance", "newest"].map((value) => (
            <Pressable
              key={value}
              onPress={() => setSort(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: sort === value }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text
                style={[styles.filter, sort === value && styles.filterActive]}
              >
                Sort: {value}
              </Text>
            </Pressable>
          ))}
        </View>
        {overdueCount > 0 && (
          <View style={styles.alert}>
            <Ionicons name="alert-circle" size={23} color="#a84b2f" />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>ATTENTION REQUIRED</Text>
              <Text style={styles.alertValue}>
                {overdueCount} Overdue Collection{overdueCount === 1 ? "" : "s"}{" "}
                <Text style={styles.alertAmount}>
                  {peso(
                    allTenants
                      .filter((t) => t.status === "OVERDUE")
                      .reduce(
                        (sum, t) =>
                          sum +
                          cycleDetails(
                            t.raw,
                            payments.filter((p) => p.tenantId === t.id),
                          ).balance,
                        0,
                      ),
                  )}
                </Text>
              </Text>
              <Text style={styles.alertText}>
                Current rent balances past the configured due date. Send an
                in-app reminder to eligible tenants.
              </Text>
            </View>
            <Pressable
              style={styles.notifyAll}
              onPress={() => void remindAll()}
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
              <Text style={styles.emptyTitle}>
                {searchQuery || filter !== "all"
                  ? "No matching tenants"
                  : "No tenants yet"}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery || filter !== "all"
                  ? "Try a different search or filter."
                  : "Tenants will appear here after an application is approved and a room is assigned."}
              </Text>
            </View>
          )
        )}
        {filteredTenants.map((tenant) => (
          <Pressable
            key={`${tenant.isPending ? "application" : "tenant"}:${tenant.id}`}
            style={styles.card}
            onPress={() => openTenant(tenant)}
          >
            <View style={styles.cardTop}>
              {tenant.photoURL ? (
                <Image
                  source={
                    tenant.photoURL ? { uri: tenant.photoURL } : undefined
                  }
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarInitials}>
                  <Text style={styles.avatarInitialsText}>
                    {String(tenant.name).slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.person}>
                <Text style={styles.name}>{tenant.name}</Text>
                <Text style={styles.room}>{tenant.room}</Text>
                <Text style={styles.phone}>
                  {tenant.phone || "Phone not provided"}
                </Text>
              </View>
              <Text style={[styles.badge, { backgroundColor: tenant.color }]}>
                {tenant.status}
              </Text>
            </View>
            {!tenant.isPending && (
              <Text style={[styles.phone, { marginVertical: 10 }]}>
                {tenant.raw.assignedSpace || "Space not specified"} · Balance{" "}
                {peso(
                  cycleDetails(
                    tenant.raw,
                    payments.filter((p) => p.tenantId === tenant.id),
                  ).balance,
                )}{" "}
                · Due{" "}
                {cycleDetails(
                  tenant.raw,
                  payments.filter((p) => p.tenantId === tenant.id),
                ).due.toLocaleDateString()}
              </Text>
            )}
            <View style={[styles.tenantActions, { flexWrap: "wrap", gap: 8 }]}>
              <Text style={styles.rent}>
                {tenant.rent}
                <Text style={styles.month}>/mo</Text>
              </Text>
              {!tenant.isPending && (
                <Pressable
                  style={[styles.smallButton, { minHeight: 44 }]}
                  accessibilityRole="button"
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push({
                      pathname: "/landlord/messages",
                      params: { tenantId: tenant.id },
                    });
                  }}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={18}
                    color="#2864e8"
                  />
                  <Text>Message</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.smallButton, { minHeight: 44 }]}
                accessibilityRole="button"
                onPress={(e) => {
                  e.stopPropagation();
                  openTenant(tenant);
                }}
              >
                <Ionicons name="person-outline" size={18} color="#2864e8" />
                <Text>{tenant.isPending ? "Review" : "View Info"}</Text>
              </Pressable>
              {tenant.status === "OVERDUE" && (
                <Pressable
                  style={[
                    styles.smallButton,
                    tenant.status.includes("OVERDUE") && styles.notifyButton,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (tenant.status === "OVERDUE")
                      void remindTenant(tenant)
                        .then(() =>
                          Alert.alert(
                            "Reminder saved",
                            "The reminder was saved if the tenant has reminders enabled.",
                          ),
                        )
                        .catch(() =>
                          Alert.alert(
                            "Unable to send reminder",
                            "Please try again.",
                          ),
                        );
                    else openTenant(tenant);
                  }}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={12}
                    color={
                      tenant.status.includes("OVERDUE") ? "#fff" : "#173b36"
                    }
                  />
                  <Text
                    style={
                      tenant.status.includes("OVERDUE") &&
                      styles.notifyButtonText
                    }
                  >
                    Notify
                  </Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
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
  headerBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
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
  kicker: {
    fontSize: 11,
    color: "#d9e5ff",
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 2 },
  subtitle: {
    fontSize: 11,
    color: "#e1eaff",
    marginTop: 5,
    maxWidth: 310,
    lineHeight: 16,
  },
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
    minHeight: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce7f5",
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 42,
    fontSize: 12,
    color: "#253149",
    paddingVertical: 0,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 12,
  },
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
  avatarInitials: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },
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
    minHeight: 44,
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
