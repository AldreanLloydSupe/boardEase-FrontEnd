import { AnnouncementComposer } from "@/components/announcement-composer";
import { AppAlert as Alert } from "@/components/app-alert";
import { LandlordDashboardSkeleton } from "@/components/landlord-dashboard-skeleton";
import { LandlordNavigation } from "@/components/landlord-navigation";
import { LandlordPageHeader } from "@/components/landlord-page-header";
import { NotificationsModal } from "@/components/notifications-modal";
import { ProfilePictureButton } from "@/components/profile-picture-button";
import { useAuth } from "@/lib/auth-context";
import { cycleDetails, peso, timestampMillis } from "@/lib/billing";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notification-data";
import { useMaintenanceInbox } from "@/lib/use-maintenance-inbox";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
    collection,
    doc,
  getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";
import React from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const stats = [
  {
    label: "Occupied Rooms",
    color: "#2463e8",
    iconBackground: "#eaf1ff",
    icon: "bed-outline" as const,
  },
  {
    label: "Pending Apps",
    color: "#e09a00",
    iconBackground: "#fff5d6",
    icon: "document-text-outline" as const,
  },
  {
    label: "Overdue Payments",
    color: "#ef4444",
    iconBackground: "#fff0f0",
    icon: "alert-circle-outline" as const,
  },
  {
    label: "This Month's Revenue",
    color: "#099268",
    iconBackground: "#e8f8f1",
    icon: "cash-outline" as const,
  },
];

type PaymentStatRecord = {
  id: string;
  tenantId?: string;
  tenantName?: string;
  amount?: number | string;
  status?: string;
  dateSent?: unknown;
  approvedAt?: unknown;
  createdAt?: unknown;
  dueDate?: unknown;
  dueAt?: unknown;
  dueDateTime?: unknown;
  paymentDueDate?: unknown;
};

function paymentAmount(amount: PaymentStatRecord["amount"]) {
  if (typeof amount === "number") return Number.isFinite(amount) ? amount : 0;
  if (typeof amount !== "string") return 0;
  const parsed = Number(amount.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function firestoreDate(value: unknown, endOfDay = false): Date | null {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: unknown }).toDate;
    if (typeof toDate === "function") {
      const converted = toDate.call(value);
      if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return converted;
      }
    }
  }
  if (typeof value !== "string") return null;
  const dateOnly = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateOnly) {
    const parsed = new Date(
      Number(dateOnly[3]),
      Number(dateOnly[1]) - 1,
      Number(dateOnly[2]),
    );
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    return parsed;
  }
  const isoDateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const parsed = new Date(
      Number(isoDateOnly[1]),
      Number(isoDateOnly[2]) - 1,
      Number(isoDateOnly[3]),
    );
    if (endOfDay) parsed.setHours(23, 59, 59, 999);
    return parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function revenueDate(payment: PaymentStatRecord) {
  return (
    firestoreDate(payment.approvedAt) ??
    firestoreDate(payment.dateSent) ??
    firestoreDate(payment.createdAt)
  );
}

function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString("en-PH")}`;
}

type DashboardNotification = {
  id: string;
  tenantName?: string;
  roomNumber?: string;
  roomType?: string;
  requestedDate?: string;
  status?: string;
  title?: string;
  details?: string;
  createdAt?: unknown;
};
type TenantRecipient = {
  id: string;
  name: string;
  email: string;
  room: string;
};

export default function Dashboard() {
  const { user, displayName, signOut, updateUserProfile } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [announcementOpen, setAnnouncementOpen] = React.useState(false);
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [sentMessages, setSentMessages] = React.useState<
    {
      id: string;
      title?: string;
      kind?: string;
      body: string;
      recipientIds: string[];
      createdAt?: unknown;
    }[]
  >([]);
  const [sentError, setSentError] = React.useState("");
  const [sentLoading, setSentLoading] = React.useState(true);
  React.useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(
      query(collection(db, "messages"), where("senderId", "==", user.uid)),
      (snapshot) => {
        setSentMessages(
          snapshot.docs
            .map(
              (item) =>
                ({ id: item.id, ...item.data() }) as {
                  id: string;
                  title?: string;
                  kind?: string;
                  body: string;
                  recipientIds: string[];
                  createdAt?: unknown;
                },
            )
            .sort(
              (a, b) =>
                timestampMillis(b.createdAt) - timestampMillis(a.createdAt),
            ),
        );
        setSentError("");
        setSentLoading(false);
      },
      (cause) => {
        setSentError("Unable to load sent messages (" + cause.code + ").");
        setSentLoading(false);
      },
    );
  }, [user]);
  const [tenantRecipients, setTenantRecipients] = React.useState<
    TenantRecipient[]
  >([]);
  const [loadingTenantRecipients, setLoadingTenantRecipients] =
    React.useState(false);
  const [profileName, setProfileName] = React.useState(displayName || "");
  const [profilePhone, setProfilePhone] = React.useState("");
  const [applicationNotifications, setApplicationNotifications] =
    React.useState<DashboardNotification[]>([]);
  const [tourNotifications, setTourNotifications] = React.useState<
    DashboardNotification[]
  >([]);
  const [maintenanceNotifications, setMaintenanceNotifications] =
    React.useState<DashboardNotification[]>([]);
  const {
    requests: inboxRequests,
    unreadCount: tenantReplyCount,
    error: inboxError,
  } = useMaintenanceInbox();
  const [occupiedRooms, setOccupiedRooms] = React.useState(0);
  const [totalRooms, setTotalRooms] = React.useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = React.useState(0);
  const [pendingPayments, setPendingPayments] = React.useState<
    Record<string, unknown>[]
  >([]);
  const [accountRequestCount, setAccountRequestCount] = React.useState(0);
  const [billingProfiles, setBillingProfiles] = React.useState<
    (Record<string, unknown> & { id: string })[]
  >([]);
  const [billingPayments, setBillingPayments] = React.useState<
    Record<string, unknown>[]
  >([]);
  const [dataError, setDataError] = React.useState("");
  const [dashboardSourcesReady, setDashboardSourcesReady] = React.useState<
    Set<string>
  >(new Set());
  function markDashboardSourceReady(source: string) {
    setDashboardSourcesReady((ready) => {
      if (ready.has(source)) return ready;
      return new Set(ready).add(source);
    });
  }
  const dues = billingProfiles
    .filter((p) => p.hasRoom)
    .map((profile) => {
      const cycle = cycleDetails(
        profile,
        billingPayments.filter((p) => p.tenantId === profile.id),
      );
      return {
        id: profile.id,
        name: String(profile.name || "Tenant"),
        amount: cycle.balance,
        overdue:
          cycle.balance > 0 &&
          cycle.daysUntilDue < 0 &&
          (!profile.leaseStartedAt ||
            timestampMillis(profile.leaseStartedAt) <= cycle.due.getTime()),
      };
    })
    .filter((d) => d.overdue);
  const overdueTenantCount = dues.length;
  const [maintenanceReads, setMaintenanceReads] = React.useState<Set<string>>(
    new Set(),
  );
  const [notificationError, setNotificationError] = React.useState("");
  React.useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(
      collection(db, "users", user.uid, "notificationReads"),
      (snapshot) => {
        setMaintenanceReads(new Set(snapshot.docs.map((item) => item.id)));
        setNotificationError("");
      },
      (cause) =>
        setNotificationError(
          "Unable to load notification read status (" + cause.code + ").",
        ),
    );
  }, [user]);
  const maintenanceUnreadCount = maintenanceNotifications.filter(
    (item) => !maintenanceReads.has("maintenance__" + item.id),
  ).length;
  const sortedMaintenance = [...maintenanceNotifications].sort(
    (a, b) =>
      Number(maintenanceReads.has("maintenance__" + a.id)) -
        Number(maintenanceReads.has("maintenance__" + b.id)) ||
      timestampMillis(b.createdAt) - timestampMillis(a.createdAt),
  );
  function openMaintenance(id?: string) {
    setNotificationsOpen(false);
    if (db && user && id)
      void setDoc(
        doc(db, "users", user.uid, "notificationReads", "maintenance__" + id),
        { readAt: serverTimestamp() },
      ).catch(() =>
        setNotificationError(
          "Request opened, but notification read status could not be saved.",
        ),
      );
    router.push(
      id
        ? { pathname: "/landlord/requests", params: { requestId: id } }
        : "/landlord/requests",
    );
  }
  const notificationCount =
    applicationNotifications.length +
    tourNotifications.length +
    maintenanceUnreadCount +
    tenantReplyCount +
    pendingPayments.length +
    accountRequestCount;
  React.useEffect(() => {
    if (!db) return;
    const stopPaymentQueue = onSnapshot(
      query(collection(db, "payments"), where("status", "==", "pending")),
      (snapshot) => setPendingPayments(snapshot.docs.map((d) => d.data())),
      () => setDataError("Unable to load payment proofs."),
    );
    const stopAccountQueue = onSnapshot(
      collection(db, "accountRequests"),
      (snapshot) => setAccountRequestCount(snapshot.size),
      () => setDataError("Unable to load account requests."),
    );
    const stopApplications = onSnapshot(
      collection(db, "applications"),
      (snapshot) => {
        const records = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as DashboardNotification[];
        setApplicationNotifications(
          records.filter((item) => !item.status || item.status === "pending"),
        );
        markDashboardSourceReady("applications");
      },
      () => {
        setDataError("Unable to load applications.");
        markDashboardSourceReady("applications");
      },
    );
    const stopTours = onSnapshot(
      collection(db, "tourRequests"),
      (snapshot) => {
        const records = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as DashboardNotification[];
        setTourNotifications(
          records.filter((item) => !item.status || item.status === "pending"),
        );
      },
      () => setDataError("Unable to load tours."),
    );
    const stopMaintenance = onSnapshot(
      collection(db, "maintenanceRequests"),
      (snapshot) => {
        const records = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as DashboardNotification[];
        setMaintenanceNotifications(
          records.filter(
            (item) =>
              item.status !== "completed" && item.status !== "cancelled",
          ),
        );
        markDashboardSourceReady("maintenance");
      },
      () => {
        setDataError("Unable to load maintenance requests.");
        markDashboardSourceReady("maintenance");
      },
    );
    const stopRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const records = snapshot.docs.map((room) => room.data());
        for (const roomDoc of snapshot.docs) {
          const room = roomDoc.data();
          const capacity =
            Number.isInteger(Number(room.capacity)) && Number(room.capacity) > 0
              ? Number(room.capacity)
              : 1;
          const tenantCount = Array.isArray(room.tenantIds)
            ? room.tenantIds.length
            : room.tenantId
              ? 1
              : 0;
          const availableSpaces = Math.max(0, capacity - tenantCount);
          const listingRef = doc(db, "roomListings", roomDoc.id);
          void getDoc(listingRef)
            .then((listing) => {
              if (!listing.exists())
                return setDoc(listingRef, {
                  number: String(room.number ?? ""),
                  type: String(room.type ?? "Room"),
                  price: String(room.price ?? room.rent ?? "0"),
                  rent: String(room.rent ?? room.price ?? "0"),
                  image: String(room.image ?? ""),
                  amenities: Array.isArray(room.amenities) ? room.amenities : [],
                  guidelines: String(room.guidelines ?? ""),
                  propertyName: String(room.propertyName ?? ""),
                  location: String(room.location ?? ""),
                  floor: room.floor ?? "",
                  unit: room.unit ?? "",
                  capacity,
                  tenantCount,
                  availableSpaces,
                  status: availableSpaces > 0 ? "available" : "occupied",
                  updatedAt: serverTimestamp(),
                });
            })
            .catch(() => undefined);
        }
        const occupiedCount = records.filter(
          (room) =>
            room.isOccupied === true ||
            String(room.status ?? "").toLowerCase() === "occupied",
        ).length;
        setTotalRooms(records.length);
        setOccupiedRooms(occupiedCount);
        markDashboardSourceReady("rooms");
      },
      () => {
        setTotalRooms(0);
        setOccupiedRooms(0);
        markDashboardSourceReady("rooms");
      },
    );
    const currentDate = new Date();
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const nextMonthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
    const stopApprovedPayments = onSnapshot(
      query(collection(db, "payments"), where("status", "==", "approved")),
      (snapshot) => {
        setBillingPayments(snapshot.docs.map((d) => d.data()));
        const currentMonthTotal = snapshot.docs.reduce((total, paymentDoc) => {
          const payment = {
            id: paymentDoc.id,
            ...paymentDoc.data(),
          } as PaymentStatRecord;
          const paidAt = revenueDate(payment);
          if (!paidAt || paidAt < monthStart || paidAt >= nextMonthStart) {
            return total;
          }
          return total + paymentAmount(payment.amount);
        }, 0);
        setMonthlyRevenue(currentMonthTotal);
        markDashboardSourceReady("payments");
      },
      () => {
        setDataError("Unable to load payments.");
        markDashboardSourceReady("payments");
      },
    );
    const stopOverduePayments = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setBillingProfiles(
          snapshot.docs.map((d) => ({ ...d.data(), id: d.id })),
        );
        markDashboardSourceReady("tenantBalances");
      },
      () => {
        setDataError("Unable to load tenant balances.");
        markDashboardSourceReady("tenantBalances");
      },
    );
    return () => {
      stopPaymentQueue();
      stopAccountQueue();
      stopApplications();
      stopTours();
      stopMaintenance();
      stopRooms();
      stopApprovedPayments();
      stopOverduePayments();
    };
  }, []);
  const occupancyPercent = totalRooms
    ? Math.round((occupiedRooms / totalRooms) * 100)
    : 0;
  async function logout() {
    await signOut();
    router.replace("/login");
  }
  async function saveProfile() {
    if (!profileName.trim()) {
      Alert.alert("Missing name", "Enter your name.");
      return;
    }
    try {
      await updateUserProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        emergencyContact: "",
      });
      setEditProfileOpen(false);
      Alert.alert("Profile updated", "Your profile information was saved.");
    } catch {
      Alert.alert("Unable to update profile", "Please try again.");
    }
  }
  async function openAnnouncementComposer() {
    setAnnouncementOpen(true);
    setTenantRecipients([]);
    setLoadingTenantRecipients(true);
    try {
      if (!db) throw new Error("Firebase is not available.");
      const snapshot = await getDocs(collection(db, "users"));
      const recipients = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            name: String(
              data.name || data.displayName || data.email || "Tenant",
            ),
            email: String(data.email || ""),
            room: String(data.roomNumber || data.roomId || "Room not assigned"),
            isTenant:
              data.role !== "admin" &&
              (data.hasRoom === true || Boolean(data.roomId)),
          };
        })
        .filter((recipient) => recipient.isTenant)
        .map(({ id, name, email, room }) => ({ id, name, email, room }));
      setTenantRecipients(recipients);
    } catch {
      Alert.alert(
        "Unable to load tenants",
        "Check your connection and try again.",
      );
    } finally {
      setLoadingTenantRecipients(false);
    }
  }
  if (db && dashboardSourcesReady.size < 5 && !dataError) {
    return <LandlordDashboardSkeleton />;
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <LandlordPageHeader
        title="Dashboard"
        rightAction={
          <View style={styles.headerActions}>
          <Pressable
            onPress={() => setNotificationsOpen(true)}
            style={styles.bell}
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={openAnnouncementComposer}
            style={styles.noticeButton}
            accessibilityLabel="Post notice"
          >
            <Ionicons name="megaphone-outline" size={17} color="#fff" />
            <Text style={styles.noticeButtonText}></Text>
          </Pressable>
          <Pressable
            onPress={() => setProfileOpen(true)}
            accessibilityLabel="Open profile menu"
          >
            <ProfilePictureButton
              fallback={(displayName || "CV").slice(0, 2).toUpperCase()}
              size={34}
              interactive={false}
            />
          </Pressable>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {!!dataError && <Text accessibilityRole="alert">{dataError}</Text>}
        {!!accountRequestCount && (
          <Pressable
            style={styles.emptyNotice}
            onPress={() => router.push("/landlord/tenants")}
          >
            <Text>
              {accountRequestCount} account or move-out requests to review
            </Text>
          </Pressable>
        )}
        <View style={styles.grid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <View style={styles.statTop}>
                <Text
                  style={[styles.statValue, { color: stat.color }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                >
                  {stat.label === "Occupied Rooms"
                    ? `${occupiedRooms}/${totalRooms}`
                    : stat.label === "Pending Apps"
                      ? applicationNotifications.length
                      : stat.label === "Overdue Payments"
                        ? overdueTenantCount
                        : formatPeso(monthlyRevenue)}
                </Text>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: stat.iconBackground },
                  ]}
                >
                  <Ionicons name={stat.icon} size={20} color={stat.color} />
                </View>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statFoot, { color: stat.color }]}>
                {stat.label === "Occupied Rooms"
                  ? `${occupancyPercent}% occupied`
                  : stat.label === "Pending Apps"
                    ? "Needs Action"
                    : stat.label === "Overdue Payments"
                      ? overdueTenantCount === 0
                        ? "No overdue users"
                        : `${overdueTenantCount} tenant${overdueTenantCount === 1 ? "" : "s"} overdue`
                      : monthlyRevenue > 0
                        ? "Approved payments this month"
                        : "No approved payments this month"}
              </Text>
            </View>
          ))}
        </View>
        <Pressable
          style={styles.maintenanceShortcut}
          onPress={() => openMaintenance()}
          accessibilityRole="button"
          accessibilityLabel="Open Maintenance Requests"
        >
          <View style={styles.quickIcon}>
            <Ionicons name="construct-outline" size={24} color="#2864e8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>Maintenance Requests</Text>
            <Text style={styles.detail}>
              {maintenanceNotifications.length} active ·{" "}
              {maintenanceUnreadCount} new requests
            </Text>
            <Text style={styles.emptySubtext}>
              Review issues, reply, and update repair status.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#2864e8" />
        </Pressable>
        {!!notificationError && (
          <Text accessibilityRole="alert">{notificationError}</Text>
        )}
        <SectionTitle
          title="Pending Applications"
          action="See all"
          onPress={() => router.push("/landlord/pending-applications" as any)}
        />
        {applicationNotifications.length === 0 && (
          <View style={styles.emptyNotice}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={19}
                color="#2864e8"
              />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyNoticeText}>
                No tenant applications yet
              </Text>
              <Text style={styles.emptySubtext}>
                New applications will appear here.
              </Text>
            </View>
          </View>
        )}
        {applicationNotifications.map((application) => {
          const type = application.roomType || "Room";
          return (
            <View style={styles.application} key={application.id}>
              <View style={styles.applicationPerson}>
                <View style={styles.applicationIcon}>
                  <Ionicons name="person-outline" size={19} color="#2864e8" />
                </View>
                <View style={styles.person}>
                  <Text style={styles.name}>
                    {application.tenantName || "Tenant"}
                  </Text>
                  <Text style={styles.detail}>
                    Applied for Room{" "}
                    {application.roomNumber || "requested room"}
                  </Text>
                  <Text style={styles.type}>{type}</Text>
                </View>
              </View>
              <Pressable
                style={styles.review}
                onPress={() =>
                  router.push({
                    pathname: "/landlord/application/[name]" as any,
                    params: {
                      name: application.tenantName || "Tenant",
                      applicationId: application.id,
                    },
                  })
                }
              >
                <Text style={styles.reviewText}>Review</Text>
              </Pressable>
            </View>
          );
        })}
        <Text style={styles.quickTitle}>QUICK ACTIONS</Text>
        <View style={styles.quickRow}>
          {[
            ["person-add-outline", "Assign Room"],
            ["cash-outline", "Log Rent"],
          ].map(([icon, label]) => (
            <Pressable
              key={label}
              style={styles.quick}
              onPress={() => {
                router.push(
                  label === "Assign Room"
                    ? "/landlord/pending-applications"
                    : label === "Log Rent"
                      ? "/landlord/finance"
                      : ("/landlord/property-settings" as any),
                );
              }}
            >
              <View style={styles.quickIcon}>
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color="#2864e8"
                />
              </View>
              <Text style={styles.quickText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <SectionTitle
          title="Sent messages & announcements"
          action="Post Notice"
          onPress={openAnnouncementComposer}
        />
        {sentError ? (
          <Text accessibilityRole="alert">{sentError}</Text>
        ) : sentLoading ? (
          <Text>Loading sent messages...</Text>
        ) : sentMessages.length === 0 ? (
          <Text style={styles.emptySubtext}>No announcements sent yet.</Text>
        ) : (
          sentMessages.slice(0, 10).map((message) => (
            <View key={message.id} style={styles.replySummary}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{message.title || message.body}</Text>
                {!!message.title && (
                  <Text style={styles.emptySubtext}>{message.body}</Text>
                )}
                <Text style={styles.emptySubtext}>
                  {message.recipientIds?.length || 0} recipients ·{" "}
                  {timestampMillis(message.createdAt)
                    ? new Date(
                        timestampMillis(message.createdAt),
                      ).toLocaleString()
                    : "Sending..."}
                </Text>
              </View>
            </View>
          ))
        )}
        <SectionTitle
          title={`Messages${tenantReplyCount ? ` (${tenantReplyCount})` : ""}`}
          action="Open inbox"
          onPress={() => router.push("/landlord/messages" as any)}
        />
        <Pressable
          style={styles.replySummary}
          onPress={() => router.push("/landlord/messages" as any)}
        >
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={19} color="#2864e8" />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyNoticeText}>
              {tenantReplyCount
                ? `${tenantReplyCount} message${tenantReplyCount === 1 ? "" : "s"} in maintenance requests`
                : inboxError
                  ? "Unread counts unavailable for some requests"
                  : inboxRequests.some((r) => !r.unreadAvailable)
                    ? "Loading unread counts..."
                    : "No new tenant replies"}
            </Text>
            <Text style={styles.emptySubtext}>
              Open Messages to read and reply to your tenants.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#71809a" />
        </Pressable>
        <SectionTitle
          title={`Immediate Action · Overdue (${dues.length})`}
          action={`Total ${peso(dues.reduce((sum, d) => sum + d.amount, 0))}`}
        />
        <View style={styles.overdue}>
          {dues.length === 0 && (
            <View style={styles.emptyOverdue}>
              <View style={styles.overdueIcon}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#079268"
                />
              </View>
              <View>
                <Text style={styles.overdueTitle}>All caught up</Text>
                <Text style={styles.emptySubtext}>
                  No overdue payments to follow up.
                </Text>
              </View>
            </View>
          )}
          {dues.map(({ id, name, amount }) => (
            <View style={styles.due} key={id}>
              <View>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.late}>{peso(amount)}</Text>
              </View>
              <Pressable
                style={styles.remind}
                onPress={() =>
                  void createNotification(id, {
                    type: "rent_reminder",
                    title: "Payment reminder",
                    body: `You have ${peso(amount)} outstanding for the current billing period. Please review Payments.`,
                    route: "/tenant/payments",
                  })
                    .then(() =>
                      Alert.alert(
                        "Reminder saved",
                        "Eligible tenants will see the reminder in the app.",
                      ),
                    )
                    .catch(() =>
                      Alert.alert(
                        "Could not send reminder",
                        "Please try again.",
                      ),
                    )
                }
              >
                <Text style={styles.remindText}>Remind</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
      <LandlordNavigation active="Dashboard" />
      <NotificationsModal
        visible={notificationsOpen}
        emptyMessage="No applications, tour requests, or maintenance requests yet."
        notices={[
          ...applicationNotifications.map((item) => ({
            id: `application-${item.id}`,
            title: "New room application",
            body: `${item.tenantName || "A tenant"} applied for Room ${item.roomNumber || "requested room"}.`,
            icon: "document-text-outline" as const,
            iconColor: "#e09a00",
            onPress: () => {
              setNotificationsOpen(false);
              router.push({
                pathname: "/landlord/application/[name]" as any,
                params: {
                  name: item.tenantName || "Tenant",
                  applicationId: item.id,
                },
              });
            },
          })),
          ...tourNotifications.map((item) => ({
            id: `tour-${item.id}`,
            title: "New tour request",
            body: `${item.tenantName || "A tenant"} requested a tour for Room ${item.roomNumber || "requested room"}.`,
            icon: "calendar-outline" as const,
            iconColor: "#2864e8",
            onPress: () => {
              setNotificationsOpen(false);
              router.push("/landlord/pending-applications" as any);
            },
          })),
          ...(pendingPayments.length
            ? [
                {
                  id: "pending-payments",
                  title: `${pendingPayments.length} payment proof${pendingPayments.length === 1 ? "" : "s"} awaiting review`,
                  body: "Review and approve tenant payment submissions.",
                  icon: "cash-outline" as const,
                  iconColor: "#099268",
                  onPress: () => {
                    setNotificationsOpen(false);
                    router.push("/landlord/finance");
                  },
                },
              ]
            : []),
          ...(accountRequestCount
            ? [
                {
                  id: "account-requests",
                  title: `${accountRequestCount} account request${accountRequestCount === 1 ? "" : "s"} awaiting review`,
                  body: "Review tenant account requests.",
                  icon: "person-add-outline" as const,
                  iconColor: "#e09a00",
                  onPress: () => {
                    setNotificationsOpen(false);
                    router.push("/landlord/tenants");
                  },
                },
              ]
            : []),
          ...inboxRequests
            .filter((item) => item.unreadAvailable && item.unread > 0)
            .map((item) => ({
              id: `reply-${item.id}`,
              title: "New tenant message",
              body: `${item.tenantName || "Tenant"} · ${item.title} · ${item.unread} unread`,
              icon: "chatbubbles-outline" as const,
              iconColor: "#2864e8",
              onPress: () => {
                setNotificationsOpen(false);
                router.push({
                  pathname: "/landlord/messages",
                  params: { requestId: item.id },
                });
              },
            })),
          ...sortedMaintenance.map((item) => ({
            id: `maintenance-${item.id}`,
            title: maintenanceReads.has("maintenance__" + item.id)
              ? "Maintenance request"
              : "New maintenance request",
            body: `${item.tenantName || "A tenant"} reported: ${item.title || "Maintenance issue"}.`,
            icon: "construct-outline" as const,
            iconColor: "#b55339",
            onPress: () => openMaintenance(item.id),
          })),
        ]}
        onClose={() => setNotificationsOpen(false)}
      />
      <AnnouncementComposer
        visible={announcementOpen}
        onClose={() => setAnnouncementOpen(false)}
        recipients={tenantRecipients}
        loadingRecipients={loadingTenantRecipients}
      />
      <Modal
        visible={profileOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setProfileOpen(false)}
        >
          <Pressable
            style={styles.profileMenu}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.profileHeading}>
              <ProfilePictureButton
                fallback={(displayName || "CV").slice(0, 2).toUpperCase()}
                size={42}
              />
              <View>
                <Text style={styles.profileName}>
                  {displayName || "Landlord"}
                </Text>
                <Text style={styles.profileEmail}>
                  {user?.email || "Administrator"}
                </Text>
              </View>
            </View>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setProfileOpen(false);
                setProfileName(displayName || "");
                setEditProfileOpen(true);
              }}
            >
              <Ionicons
                name="person-circle-outline"
                size={22}
                color="#536783"
              />
              <Text style={styles.menuText}>Profile Settings</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setProfileOpen(false);
                router.push("/landlord/property-settings" as any);
              }}
            >
              <Ionicons name="settings-outline" size={22} color="#536783" />
              <Text style={styles.menuText}>Property Settings</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color="#e94762" />
              <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={editProfileOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditProfileOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editProfileModal}>
            <View style={styles.notificationHeader}>
              <Text style={styles.profileName}>Edit Profile</Text>
              <Pressable onPress={() => setEditProfileOpen(false)}>
                <Ionicons name="close" size={21} color="#536783" />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.profileInput}
              value={profileName}
              onChangeText={setProfileName}
            />
            <Text style={styles.inputLabel}>Contact Number</Text>
            <TextInput
              style={styles.profileInput}
              value={profilePhone}
              onChangeText={setProfilePhone}
              keyboardType="phone-pad"
            />
            <Pressable style={styles.profileSave} onPress={saveProfile}>
              <Text style={styles.profileSaveText}>Save Profile</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{title}</Text>
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.7}
        style={styles.sectionActionButton}
        accessibilityRole="button"
      >
        <Text style={styles.see}>{action}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  maintenanceShortcut: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe5f4",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    marginBottom: 16,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: { color: "white", fontSize: 10, fontWeight: "700" },
  header: {
    minHeight: 106,
    backgroundColor: "#2864e8",
    paddingHorizontal: 20,
    paddingTop: 14,
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
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#fff" },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  breadcrumb: {
    fontSize: 11,
    color: "#d9e5ff",
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  noticeButton: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  noticeButtonText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  dot: {
    position: "absolute",
    right: 3,
    top: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    width: "48%",
    minHeight: 124,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    backgroundColor: "#fff",
    padding: 14,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: { fontSize: 12, color: "#536783", fontWeight: "700" },
  statFoot: { fontSize: 10, marginTop: 7, fontWeight: "600" },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 10,
  },
  sectionText: { fontSize: 14, fontWeight: "700", color: "#253149" },
  see: { fontSize: 12, color: "#2864e8" },
  sectionActionButton: {
    minHeight: 40,
    minWidth: 60,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 2,
  },
  application: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  applicationPerson: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  applicationIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },
  person: { flex: 1, gap: 3 },
  name: { fontSize: 13, fontWeight: "700", color: "#253149" },
  detail: { fontSize: 11, color: "#617083" },
  type: { fontSize: 10, color: "#8390a2" },
  review: {
    backgroundColor: "#eaf1ff",
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginLeft: 8,
  },
  reviewText: { fontSize: 12, color: "#2458c7", fontWeight: "700" },
  quickTitle: {
    fontSize: 12,
    letterSpacing: 1.2,
    color: "#536783",
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
  },
  quickRow: { flexDirection: "row", gap: 10 },
  quick: {
    flex: 1,
    minHeight: 88,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },
  quickText: { fontSize: 11, color: "#42536c", fontWeight: "600" },
  overdue: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    padding: 14,
  },
  emptyNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    padding: 14,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  replySummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    padding: 14,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCopy: { flex: 1 },
  emptyNoticeText: { color: "#253149", fontSize: 12, fontWeight: "700" },
  emptySubtext: { color: "#71809a", fontSize: 11, marginTop: 3 },
  emptyOverdue: { flexDirection: "row", alignItems: "center", gap: 11 },
  overdueIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#e8f8f1",
    alignItems: "center",
    justifyContent: "center",
  },
  overdueTitle: { color: "#253149", fontSize: 12, fontWeight: "700" },
  due: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "#edf0f4",
  },
  late: { fontSize: 11, color: "#e94762", marginTop: 3 },
  remind: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ffb9c4",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  remindText: { fontSize: 11, color: "#e94762" },
  nav: {
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
  },
  navItem: { alignItems: "center", gap: 4 },
  navText: { fontSize: 11, color: "#9aa8ba" },
  navActive: { color: "#2864e8" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "flex-end",
    paddingTop: 84,
    paddingRight: 14,
  },
  profileMenu: {
    width: 235,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  notificationMenu: {
    width: 320,
    maxHeight: 430,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#edf0f4",
  },
  notificationList: { maxHeight: 350 },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: "#edf0f4",
  },
  notificationCopy: { flex: 1 },
  notificationTitle: { fontSize: 13, fontWeight: "700", color: "#253149" },
  notificationText: {
    fontSize: 12,
    color: "#617083",
    lineHeight: 17,
    marginTop: 3,
  },
  notificationDate: { fontSize: 11, color: "#2864e8", marginTop: 4 },
  profileHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderColor: "#edf0f4",
  },
  menuAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { fontSize: 13, fontWeight: "700", color: "#172033" },
  profileEmail: { fontSize: 12, color: "#8390a2", marginTop: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  menuText: { fontSize: 13, color: "#253149" },
  logoutText: { fontSize: 13, color: "#e94762", fontWeight: "600" },
  editProfileModal: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignSelf: "center",
    marginTop: 180,
  },
  inputLabel: {
    fontSize: 11,
    color: "#536783",
    marginTop: 12,
    marginBottom: 5,
  },
  profileInput: {
    height: 42,
    borderWidth: 1,
    borderColor: "#d8e0e8",
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#253149",
  },
  profileSave: {
    backgroundColor: "#173b36",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 11,
    marginTop: 16,
  },
  profileSaveText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
