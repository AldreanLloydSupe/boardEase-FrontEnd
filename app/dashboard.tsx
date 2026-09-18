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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";

const stats = [
  {
    value: "18/24",
    label: "Occupied Rooms",
    color: "#2463e8",
    icon: "bed-outline" as const,
    foot: "75% Cap.",
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
    foot: "₱11,200 due",
  },
  {
    value: "₱84,200",
    label: "This Month's Revenue",
    color: "#099268",
    icon: "cash-outline" as const,
    foot: "+12.4% vs Sep",
  },
];
const applications = [
  ["Juan Dela Cruz", "Applied for Room 301", "Bedspace"],
  ["Ana Reyes", "Applied for Room 104", "Solo Studio"],
  ["Mark Bautista", "Applied for Room 202", "Twin Sharing"],
];
const dues = [
  ["Carlos Núñez", "₱3,500 • 3 days late"],
  ["Bea Santos", "₱4,200 • 5 days late"],
  ["Darren Lim", "₱3,500 • 1 day late"],
];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = React.useState(false);
  async function logout() {
    await signOut();
    router.replace("/login");
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
            onPress={() =>
              Alert.alert("Notifications", "You have 5 pending applications.")
            }
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={20} color="#4b5c75" />
            <View style={styles.dot} />
          </Pressable>
          <Pressable
            onPress={() => setProfileOpen(true)}
            style={styles.avatar}
            accessibilityLabel="Log out"
          >
            <Text style={styles.avatarText}>
              {(user?.displayName || "CV").slice(0, 2).toUpperCase()}
            </Text>
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
                  {stat.value}
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
          onPress={() => router.push("/pending-applications")}
        />
        {applications.map(([name, detail, type]) => (
          <View style={styles.application} key={name}>
            <View style={styles.person}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.detail}>{detail}</Text>
              <Text style={styles.type}>{type} · Oct 24</Text>
            </View>
            <Pressable
              style={styles.review}
              onPress={() =>
                router.push({
                  pathname: "/application/[name]",
                  params: { name },
                })
              }
            >
              <Text style={styles.reviewText}>Review</Text>
            </Pressable>
          </View>
        ))}
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
          title="Immediate Action · Overdue (3)"
          action="Total ₱11,200"
        />
        <View style={styles.overdue}>
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
              index === 1
                ? router.push("/rooms")
                : index === 2
                  ? router.push("/tenants")
                  : index === 0
                    ? router.replace("/dashboard")
                    : Alert.alert(
                        "Coming soon",
                        `${label} will be connected to Firebase next.`,
                      )
            }
          >
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={index === 0 ? "#2864e8" : "#9aa8ba"}
            />
            <Text style={[styles.navText, index === 0 && styles.navActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
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
              <View style={styles.menuAvatar}>
                <Text style={styles.avatarText}>
                  {(user?.displayName || "CV").slice(0, 2).toUpperCase()}
                </Text>
              </View>
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
                Alert.alert(
                  "Profile Settings",
                  "Profile settings will be connected to Firebase next.",
                );
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
  breadcrumb: { fontSize: 10, color: "#8090a5", marginTop: 3 },
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
  statLabel: { fontSize: 10, color: "#8390a2", marginTop: 4 },
  statFoot: { fontSize: 9, marginTop: 12 },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 9,
  },
  sectionText: { fontSize: 13, fontWeight: "700", color: "#253149" },
  see: { fontSize: 10, color: "#2864e8" },
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
  detail: { fontSize: 10, color: "#78879b" },
  type: { fontSize: 9, color: "#8390a2" },
  review: {
    backgroundColor: "#fff4c9",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reviewText: { fontSize: 10, color: "#9c6b00", fontWeight: "600" },
  quickTitle: {
    fontSize: 10,
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
  quickText: { fontSize: 10, color: "#536783" },
  overdue: { backgroundColor: "#fff1f3", borderRadius: 10, padding: 10 },
  due: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "#f5d7dd",
  },
  late: { fontSize: 9, color: "#e94762", marginTop: 3 },
  remind: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ffb9c4",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  remindText: { fontSize: 9, color: "#e94762" },
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
  navText: { fontSize: 9, color: "#9aa8ba" },
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
  profileEmail: { fontSize: 10, color: "#8390a2", marginTop: 2 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  menuText: { fontSize: 13, color: "#253149" },
  logoutText: { fontSize: 13, color: "#e94762", fontWeight: "600" },
});
