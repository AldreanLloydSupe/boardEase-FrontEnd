import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { ProfilePictureButton } from "@/components/profile-picture-button";
import { db } from "@/lib/firebase";
import { LandlordNavigation } from "@/components/landlord-navigation";

const stats = [
  {
    value: "0/24",
    label: "Occupied Rooms",
    color: "#2463e8",
    icon: "bed-outline" as const,
    foot: "0% occupied",
  },
  {
    value: "5",
    label: "Pending Apps",
    color: "#e09a00",
    icon: "document-text-outline" as const,
    foot: "Needs Action",
  },
  {
    value: "3",
    label: "Overdue Payments",
    color: "#ef4444",
    icon: "alert-circle-outline" as const,
    foot: "No overdue users",
  },
  {
    value: "₱0",
    label: "This Month's Revenue",
    color: "#099268",
    icon: "cash-outline" as const,
    foot: "No payments yet",
  },
];
const dues: string[][] = [];
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

export default function Dashboard() {
  const { user, signOut, updateUserProfile } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [profileName, setProfileName] = React.useState(user?.displayName || "");
  const [profilePhone, setProfilePhone] = React.useState("");
  const [applicationNotifications, setApplicationNotifications] =
    React.useState<DashboardNotification[]>([]);
  const [tourNotifications, setTourNotifications] = React.useState<
    DashboardNotification[]
  >([]);
  const [maintenanceNotifications, setMaintenanceNotifications] =
    React.useState<DashboardNotification[]>([]);
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
    return () => {
      stopApplications();
      stopTours();
      stopMaintenance();
    };
  }, []);
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
  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.breadcrumb}>BoardEase ·</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setNotificationsOpen(true)}
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={20} color="#4b5c75" />
            {notificationCount > 0 && <View style={styles.dot} />}
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
              <View>
                <Text style={[styles.statValue, { color: stat.color }]}>
                  {stat.label === "Pending Apps"
                    ? applicationNotifications.length
                    : stat.value}
                </Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={[styles.statFoot, { color: stat.color }]}>
                  {stat.foot}
                </Text>
              </View>
              <Ionicons name={stat.icon} size={23} color={stat.color} />
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
            <Text style={styles.emptyNoticeText}>
              No tenant applications yet.
            </Text>
          </View>
        )}
        {applicationNotifications.map((application) => {
          const type = application.roomType || "Room";
          return (
            <View style={styles.application} key={application.id}>
              <View style={styles.person}>
                <Text style={styles.name}>
                  {application.tenantName || "Tenant"}
                </Text>
                <Text style={styles.detail}>
                  Applied for Room {application.roomNumber || "requested room"}
                </Text>
                <Text style={styles.type}>{type} · Oct 24</Text>
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
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={21}
                color="#2864e8"
              />
              <Text style={styles.quickText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <SectionTitle
          title="Immediate Action · Overdue (0)"
          action="Total ₱0"
        />
        <View style={styles.overdue}>
          {dues.length === 0 && (
            <Text style={styles.emptyNoticeText}>No overdue payments.</Text>
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
      <Pressable onPress={onPress} disabled={!onPress}>
        <Text style={styles.see}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  header: {
    minHeight: 65,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e9edf3",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#172033" },
  breadcrumb: { fontSize: 12, color: "#8090a5", marginTop: 3 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  bell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f6f8fb",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
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
  scroll: { padding: 14, paddingBottom: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "48%",
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 13,
    position: "relative",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#8390a2", marginTop: 4 },
  statFoot: { fontSize: 11, marginTop: 12 },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 9,
  },
  sectionText: { fontSize: 13, fontWeight: "700", color: "#253149" },
  see: { fontSize: 12, color: "#2864e8" },
  application: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5eaf1",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  person: { gap: 3 },
  name: { fontSize: 11, fontWeight: "700", color: "#253149" },
  detail: { fontSize: 12, color: "#78879b" },
  type: { fontSize: 11, color: "#8390a2" },
  review: {
    backgroundColor: "#fff4c9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewText: { fontSize: 12, color: "#9c6b00", fontWeight: "600" },
  quickTitle: {
    fontSize: 12,
    letterSpacing: 1,
    color: "#91a0b3",
    marginTop: 16,
    marginBottom: 8,
  },
  quickRow: { flexDirection: "row", gap: 8 },
  quick: {
    flex: 1,
    height: 72,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5eaf1",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  quickText: { fontSize: 12, color: "#536783" },
  overdue: { backgroundColor: "#fff1f3", borderRadius: 10, padding: 10 },
  emptyNotice: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    padding: 14,
  },
  emptyNoticeText: { color: "#71809a", fontSize: 12, textAlign: "center" },
  due: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "#f5d7dd",
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
