import { LandlordNavigation } from "@/components/landlord-navigation";
import { ProfilePictureButton } from "@/components/profile-picture-button";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React from "react";
import {
  Alert,
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
const dues: string[][] = [];

type PaymentStatRecord = {
  id: string;
  tenantId?: string;
  tenantName?: string;
  amount?: number | string;
  status?: string;
  dateSent?: unknown;
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
    firestoreDate(payment.dateSent) ??
    firestoreDate(payment.createdAt)
  );
}

function dueDate(payment: PaymentStatRecord) {
  return (
    firestoreDate(payment.dueDate, true) ??
    firestoreDate(payment.dueAt, true) ??
    firestoreDate(payment.dueDateTime, true) ??
    firestoreDate(payment.paymentDueDate, true)
  );
}

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
};
type MessageRecipient = {
  id: string;
  name: string;
  email: string;
  room: string;
};

export default function Dashboard() {
  const { user, signOut, updateUserProfile } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [messageOpen, setMessageOpen] = React.useState(false);
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [messageText, setMessageText] = React.useState("");
  const [messageAudience, setMessageAudience] = React.useState<"all" | "selected">("all");
  const [messageRecipients, setMessageRecipients] = React.useState<MessageRecipient[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = React.useState<string[]>([]);
  const [loadingRecipients, setLoadingRecipients] = React.useState(false);
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [profileName, setProfileName] = React.useState(user?.displayName || "");
  const [profilePhone, setProfilePhone] = React.useState("");
  const [applicationNotifications, setApplicationNotifications] =
    React.useState<DashboardNotification[]>([]);
  const [tourNotifications, setTourNotifications] = React.useState<
    DashboardNotification[]
  >([]);
  const [maintenanceNotifications, setMaintenanceNotifications] =
    React.useState<DashboardNotification[]>([]);
  const [tenantReplyCounts, setTenantReplyCounts] = React.useState<Record<string, number>>({});
  const [occupiedRooms, setOccupiedRooms] = React.useState(0);
  const [totalRooms, setTotalRooms] = React.useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = React.useState(0);
  const [overdueTenantCount, setOverdueTenantCount] = React.useState(0);
  const notificationCount =
    applicationNotifications.length +
    tourNotifications.length +
    maintenanceNotifications.length;
  React.useEffect(() => {
    if (!db) return;
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
      },
      () => setApplicationNotifications([]),
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
      () => setTourNotifications([]),
    );
    const stopMaintenance = onSnapshot(
      collection(db, "maintenanceRequests"),
      (snapshot) => {
        const records = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as DashboardNotification[];
        setMaintenanceNotifications(
          records.filter((item) => item.status !== "completed"),
        );
      },
      () => setMaintenanceNotifications([]),
    );
    const stopRooms = onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        const records = snapshot.docs.map((room) => room.data());
        const occupiedCount = records.filter((room) =>
          room.isOccupied === true ||
          String(room.status ?? "").toLowerCase() === "occupied",
        ).length;
        setTotalRooms(records.length);
        setOccupiedRooms(occupiedCount);
      },
      () => {
        setTotalRooms(0);
        setOccupiedRooms(0);
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
        const currentMonthTotal = snapshot.docs.reduce((total, paymentDoc) => {
          const payment = {
            id: paymentDoc.id,
            ...paymentDoc.data(),
          } as PaymentStatRecord;
          const paidAt = revenueDate(payment);
          if (
            !paidAt ||
            paidAt < monthStart ||
            paidAt >= nextMonthStart
          ) {
            return total;
          }
          return total + paymentAmount(payment.amount);
        }, 0);
        setMonthlyRevenue(currentMonthTotal);
      },
      () => setMonthlyRevenue(0),
    );
    const stopOverduePayments = onSnapshot(
      query(
        collection(db, "payments"),
        where("status", "in", ["overdue", "unpaid"]),
      ),
      (snapshot) => {
        const now = Date.now();
        const overdueTenantIds = new Set(
          snapshot.docs
            .map((paymentDoc) => ({
              id: paymentDoc.id,
              ...paymentDoc.data(),
            }) as PaymentStatRecord)
            .filter((payment) => {
              const due = dueDate(payment);
              return due !== null && due.getTime() < now;
            })
            .map((payment) => payment.tenantId || payment.tenantName || payment.id),
        );
        setOverdueTenantCount(overdueTenantIds.size);
      },
      () => setOverdueTenantCount(0),
    );
    return () => {
      stopApplications();
      stopTours();
      stopMaintenance();
      stopRooms();
      stopApprovedPayments();
      stopOverduePayments();
    };
  }, []);
  React.useEffect(() => {
    const firestore = db;
    if (!firestore) return;
    const nextCounts: Record<string, number> = {};
    const stops = maintenanceNotifications.map((request) =>
      onSnapshot(
        collection(firestore, "maintenanceRequests", request.id, "messages"),
        (snapshot) => {
          nextCounts[request.id] = snapshot.docs.filter((item) => item.data().senderId !== "landlord").length;
          setTenantReplyCounts({ ...nextCounts });
        },
        () => undefined,
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, [maintenanceNotifications]);
  const tenantReplyCount = Object.values(tenantReplyCounts).reduce((sum, count) => sum + count, 0);
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
  async function openMessageComposer() {
    setMessageOpen(true);
    setLoadingRecipients(true);
    setMessageText("");
    setMessageAudience("all");
    setSelectedRecipientIds([]);
    try {
      if (!db) throw new Error("Firebase is not available.");
      const snapshot = await getDocs(collection(db, "users"));
      const recipients = snapshot.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            name: String(data.name || data.displayName || data.email || "Tenant"),
            email: String(data.email || ""),
            room: String(data.roomNumber || data.roomId || "Room not assigned"),
            isTenant:
              data.role !== "admin" &&
              (data.hasRoom === true || Boolean(data.roomId)),
          };
        })
        .filter((recipient) => recipient.isTenant)
        .map(({ id, name, email, room }) => ({ id, name, email, room }));
      setMessageRecipients(recipients);
    } catch {
      Alert.alert("Unable to load tenants", "Check your connection and try again.");
    } finally {
      setLoadingRecipients(false);
    }
  }
  function closeMessageComposer() {
    setMessageOpen(false);
    setMessageText("");
    setSelectedRecipientIds([]);
  }
  function toggleRecipient(recipientId: string) {
    setSelectedRecipientIds((current) =>
      current.includes(recipientId)
        ? current.filter((id) => id !== recipientId)
        : [...current, recipientId],
    );
  }
  async function sendMessage() {
    const body = messageText.trim();
    const recipientIds =
      messageAudience === "all"
        ? messageRecipients.map((recipient) => recipient.id)
        : selectedRecipientIds;
    if (!body) {
      Alert.alert("Message required", "Write a message before sending.");
      return;
    }
    if (recipientIds.length === 0) {
      Alert.alert("Choose recipients", "Select at least one tenant to message.");
      return;
    }
    if (!db || !user) {
      Alert.alert("Unable to send", "Sign in again and try sending the message.");
      return;
    }
    setSendingMessage(true);
    try {
      await addDoc(collection(db, "messages"), {
        body,
        audience: messageAudience,
        recipientIds,
        senderId: user.uid,
        senderName: user.displayName || user.email || "Landlord",
        createdAt: serverTimestamp(),
      });
      closeMessageComposer();
      Alert.alert(
        "Message sent",
        `Your message was sent to ${recipientIds.length} tenant${recipientIds.length === 1 ? "" : "s"}.`,
      );
    } catch {
      Alert.alert("Unable to send message", "Please try again.");
    } finally {
      setSendingMessage(false);
    }
  }
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogo}>
            <Ionicons name="business" size={24} color="#fff" />
          </View>
          <View>
            <Text style={styles.breadcrumb}>BOARDEASE</Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setNotificationsOpen(true)}
            style={styles.bell}
            accessibilityLabel="Open notifications"
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {notificationCount > 0 && <View style={styles.dot} />}
          </Pressable>
          <Pressable
            onPress={openMessageComposer}
            style={styles.bell}
            accessibilityLabel="Message tenants"
          >
            <Ionicons name="mail-outline" size={19} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setProfileOpen(true)}
            accessibilityLabel="Open profile menu"
          >
            <ProfilePictureButton
              fallback={(user?.displayName || "CV").slice(0, 2).toUpperCase()}
              size={34}
              interactive={false}
            />
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <View style={styles.statTop}>
                <Text style={[styles.statValue, { color: stat.color }]}>
                  {stat.label === "Occupied Rooms"
                    ? `${occupiedRooms}/${totalRooms}`
                    : stat.label === "Pending Apps"
                      ? applicationNotifications.length
                      : stat.label === "Overdue Payments"
                        ? overdueTenantCount
                        : formatPeso(monthlyRevenue)}
                </Text>
                <View style={[styles.statIcon, { backgroundColor: stat.iconBackground }]}>
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
        <SectionTitle
          title="Pending Applications"
          action="See all"
          onPress={() => router.push("/landlord/pending-applications" as any)}
        />
        {applicationNotifications.length === 0 && (
          <View style={styles.emptyNotice}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={19} color="#2864e8" />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyNoticeText}>No tenant applications yet</Text>
              <Text style={styles.emptySubtext}>New applications will appear here.</Text>
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
                    Applied for Room {application.roomNumber || "requested room"}
                  </Text>
                  <Text style={styles.type}>{type} · Oct 24</Text>
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
            ["megaphone-outline", "Post Notice"],
          ].map(([icon, label]) => (
            <Pressable key={label} style={styles.quick}>
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
          title={`Tenant Replies${tenantReplyCount ? ` (${tenantReplyCount})` : ""}`}
          action="Open requests"
          onPress={() => router.push("/landlord/requests" as any)}
        />
        <Pressable style={styles.replySummary} onPress={() => router.push("/landlord/requests" as any)}>
          <View style={styles.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={19} color="#2864e8" />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyNoticeText}>
              {tenantReplyCount ? `${tenantReplyCount} message${tenantReplyCount === 1 ? "" : "s"} in maintenance requests` : "No new tenant replies"}
            </Text>
            <Text style={styles.emptySubtext}>Open a request to reply to the tenant.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#71809a" />
        </Pressable>
        <SectionTitle
          title="Immediate Action · Overdue (0)"
          action="Total ₱0"
        />
        <View style={styles.overdue}>
          {dues.length === 0 && (
            <View style={styles.emptyOverdue}>
              <View style={styles.overdueIcon}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#079268" />
              </View>
              <View>
                <Text style={styles.overdueTitle}>All caught up</Text>
                <Text style={styles.emptySubtext}>No overdue payments to follow up.</Text>
              </View>
            </View>
          )}
          {dues.map(([name, amount]) => (
            <View style={styles.due} key={name}>
              <View>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.late}>{amount}</Text>
              </View>
              <Pressable
                style={styles.remind}
                onPress={() =>
                  Alert.alert(
                    "Reminder sent",
                    `A payment reminder was sent to ${name}.`,
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
      <Modal
        visible={notificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNotificationsOpen(false)}
        >
          <Pressable
            style={styles.notificationMenu}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.notificationHeader}>
              <Text style={styles.profileName}>Notifications</Text>
              <Pressable onPress={() => setNotificationsOpen(false)}>
                <Ionicons name="close" size={21} color="#536783" />
              </Pressable>
            </View>
            {notificationCount === 0 ? (
              <Text style={styles.emptyNoticeText}>
                No applications, tour requests, or maintenance requests yet.
              </Text>
            ) : (
              <ScrollView style={styles.notificationList}>
                {applicationNotifications.map((item) => (
                  <Pressable
                    key={`application-${item.id}`}
                    style={styles.notificationItem}
                    onPress={() => {
                      setNotificationsOpen(false);
                      router.push({
                        pathname: "/landlord/application/[name]" as any,
                        params: {
                          name: item.tenantName || "Tenant",
                          applicationId: item.id,
                        },
                      });
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={21}
                      color="#e09a00"
                    />
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationTitle}>
                        New room application
                      </Text>
                      <Text style={styles.notificationText}>
                        {item.tenantName || "A tenant"} applied for Room{" "}
                        {item.roomNumber || "requested room"}.
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#8a99a9"
                    />
                  </Pressable>
                ))}
                {tourNotifications.map((item) => (
                  <Pressable
                    key={`tour-${item.id}`}
                    style={styles.notificationItem}
                    onPress={() => {
                      setNotificationsOpen(false);
                      router.push("/landlord/pending-applications" as any);
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={21}
                      color="#2864e8"
                    />
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationTitle}>
                        New tour request
                      </Text>
                      <Text style={styles.notificationText}>
                        {item.tenantName || "A tenant"} requested a tour for
                        Room {item.roomNumber || "requested room"}.
                      </Text>
                      <Text style={styles.notificationDate}>
                        {item.requestedDate || "Date selected"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#8a99a9"
                    />
                  </Pressable>
                ))}
                {maintenanceNotifications.map((item) => (
                  <Pressable
                    key={`maintenance-${item.id}`}
                    style={styles.notificationItem}
                    onPress={() => {
                      setNotificationsOpen(false);
                      router.push("/landlord/requests" as any);
                    }}
                  >
                    <Ionicons
                      name="construct-outline"
                      size={21}
                      color="#b55339"
                    />
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationTitle}>
                        New maintenance request
                      </Text>
                      <Text style={styles.notificationText}>
                        {item.tenantName || "A tenant"} reported: {item.title || "Maintenance issue"}.
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#8a99a9"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={messageOpen}
        transparent
        animationType="slide"
        onRequestClose={closeMessageComposer}
      >
        <View style={styles.messageBackdrop}>
          <View style={styles.messageModal}>
            <View style={styles.messageModalHeader}>
              <View>
                <Text style={styles.messageModalTitle}>Message tenants</Text>
                <Text style={styles.messageModalSubtitle}>
                  Send an update to assigned tenants.
                </Text>
              </View>
              <Pressable
                onPress={closeMessageComposer}
                accessibilityLabel="Close message composer"
                style={styles.closeMessageButton}
              >
                <Ionicons name="close" size={20} color="#536783" />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={styles.messageInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Write your message..."
              placeholderTextColor="#91a0b3"
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <View style={styles.messageAudience}>
              <Pressable
                onPress={() => setMessageAudience("all")}
                style={[
                  styles.audienceOption,
                  messageAudience === "all" && styles.audienceOptionActive,
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={messageAudience === "all" ? "#fff" : "#536783"}
                />
                <Text
                  style={[
                    styles.audienceText,
                    messageAudience === "all" && styles.audienceTextActive,
                  ]}
                >
                  Everyone
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMessageAudience("selected")}
                style={[
                  styles.audienceOption,
                  messageAudience === "selected" && styles.audienceOptionActive,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={messageAudience === "selected" ? "#fff" : "#536783"}
                />
                <Text
                  style={[
                    styles.audienceText,
                    messageAudience === "selected" && styles.audienceTextActive,
                  ]}
                >
                  Choose tenants
                </Text>
              </Pressable>
            </View>
            {messageAudience === "all" ? (
              <View style={styles.recipientSummary}>
                <Ionicons name="information-circle-outline" size={17} color="#2864e8" />
                <Text style={styles.recipientSummaryText}>
                  {loadingRecipients
                    ? "Loading tenant list..."
                    : `This message will go to all ${messageRecipients.length} assigned tenant${messageRecipients.length === 1 ? "" : "s"}.`}
                </Text>
              </View>
            ) : (
              <View style={styles.recipientPicker}>
                <Text style={styles.recipientHeading}>
                  Select tenants ({selectedRecipientIds.length})
                </Text>
                {loadingRecipients ? (
                  <Text style={styles.recipientEmpty}>Loading tenant list...</Text>
                ) : messageRecipients.length === 0 ? (
                  <Text style={styles.recipientEmpty}>No assigned tenants found.</Text>
                ) : (
                  <ScrollView style={styles.recipientList}>
                    {messageRecipients.map((recipient) => {
                      const selected = selectedRecipientIds.includes(recipient.id);
                      return (
                        <Pressable
                          key={recipient.id}
                          onPress={() => toggleRecipient(recipient.id)}
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
                            {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <View style={styles.recipientInfo}>
                            <Text style={styles.recipientName} numberOfLines={1}>
                              {recipient.name}
                            </Text>
                            <Text style={styles.recipientDetail} numberOfLines={1}>
                              {recipient.room}{recipient.email ? ` · ${recipient.email}` : ""}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            )}
            <View style={styles.messageModalActions}>
              <Pressable
                onPress={closeMessageComposer}
                style={styles.cancelMessageButton}
                disabled={sendingMessage}
              >
                <Text style={styles.cancelMessageText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={sendMessage}
                style={[
                  styles.sendMessageButton,
                  (sendingMessage || loadingRecipients) && styles.sendMessageDisabled,
                ]}
                disabled={sendingMessage || loadingRecipients}
              >
                <Ionicons name="send-outline" size={15} color="#fff" />
                <Text style={styles.sendMessageText}>
                  {sendingMessage ? "Sending..." : "Send message"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
                fallback={(user?.displayName || "CV").slice(0, 2).toUpperCase()}
                size={42}
              />
              <View>
                <Text style={styles.profileName}>
                  {user?.displayName || "Landlord"}
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
                setProfileName(user?.displayName || "");
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
            <TextInput style={styles.profileInput} value={profileName} onChangeText={setProfileName} />
            <Text style={styles.inputLabel}>Contact Number</Text>
            <TextInput style={styles.profileInput} value={profilePhone} onChangeText={setProfilePhone} keyboardType="phone-pad" />
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
  messageBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  messageModal: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  messageModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
  },
  messageModalTitle: { fontSize: 18, fontWeight: "700", color: "#172033" },
  messageModalSubtitle: { fontSize: 12, color: "#71809a", marginTop: 3 },
  closeMessageButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f3f7fd",
    alignItems: "center",
    justifyContent: "center",
  },
  messageInput: {
    minHeight: 100,
    maxHeight: 170,
    borderWidth: 1,
    borderColor: "#d4e0f0",
    borderRadius: 8,
    padding: 12,
    color: "#253149",
    backgroundColor: "#fbfcff",
    fontSize: 14,
    marginTop: 6,
  },
  messageAudience: {
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
  recipientHeading: { color: "#253149", fontSize: 12, fontWeight: "700", marginBottom: 5 },
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
  recipientCheckboxSelected: { backgroundColor: "#2864e8", borderColor: "#2864e8" },
  recipientInfo: { flex: 1 },
  recipientName: { color: "#253149", fontSize: 13, fontWeight: "600" },
  recipientDetail: { color: "#71809a", fontSize: 11, marginTop: 2 },
  messageModalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 16 },
  cancelMessageButton: {
    minHeight: 42,
    minWidth: 82,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d4e0f0",
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  cancelMessageText: { color: "#536783", fontSize: 12, fontWeight: "600" },
  sendMessageButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#2864e8",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  sendMessageDisabled: { opacity: 0.55 },
  sendMessageText: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
  statValue: { fontSize: 22, fontWeight: "800" },
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
  applicationPerson: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
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
  inputLabel: { fontSize: 11, color: "#536783", marginTop: 12, marginBottom: 5 },
  profileInput: {
    height: 42,
    borderWidth: 1,
    borderColor: "#d8e0e8",
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#253149",
  },
  profileSave: { backgroundColor: "#173b36", borderRadius: 8, alignItems: "center", paddingVertical: 11, marginTop: 16 },
  profileSaveText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
