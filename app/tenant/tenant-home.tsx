import { TenantHeaderMark } from "@/components/tenant-header-mark";
import { AssignedTenantNav } from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TenantHome() {
  const { user } = useAuth();
  const [tenantRoom, setTenantRoom] = React.useState({
    number: "",
    type: "Room",
    rent: "",
  });

  React.useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data() || {};
      setTenantRoom({
        number: String(data.roomNumber || data.roomId || ""),
        type: String(data.roomType || "Room"),
        rent: String(data.roomRent || ""),
      });
    });
  }, [user]);

  const roomLabel = tenantRoom.number
    ? `Room ${tenantRoom.number} - ${tenantRoom.type}`
    : "No room assigned";
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <TenantHeaderMark />
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>BOARDEASE</Text>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.push("/tenant/account" as any)}>
                <Text style={styles.welcome}>Welcome back,</Text>
                <Text style={styles.name}>{user?.displayName || "Tenant"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.due}>
          <View>
            <Text style={styles.dueLabel}>· Rent Due</Text>
            <Text style={styles.amount}>₱3,500.00</Text>
            <Text style={styles.muted}>
              Period: October 2026 ·{" "}
              <Text style={styles.bold}>Includes basic Wi-Fi</Text>
            </Text>
          </View>
          <Text style={styles.dueBadge}>DUE OCT 5</Text>
        </View>
        <View style={styles.roomCard}>
          <View style={styles.roomTop}>
            <View>
              <Text style={styles.cardLabel}>YOUR ROOM</Text>
              <Text style={styles.roomTitle}>{roomLabel}</Text>
              <Text style={styles.muted}>
                BoardEase Boarding House · 2nd Floor
              </Text>
            </View>
            <Text style={styles.lease}>● Active Lease</Text>
          </View>
          <View style={styles.roomDetails}>
            <View>
              <Text style={styles.cardLabel}>ASSIGNED SPACE</Text>
              <Text style={styles.detail}>Bed A (Window Side)</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>ROOMMATE</Text>
              <Text style={styles.detail}>Ana Reyes (Bed B)</Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          {[
            ["construct-outline", "Maintenance", "1 Pending"],
            ["notifications-outline", "Notifications", "2 New"],
            ["person-outline", "Profile", "Tenant Info"],
          ].map(([icon, label, sub]) => (
            <Pressable
              style={styles.action}
              key={label}
              onPress={() => {
                if (label === "Profile") router.push("/tenant/account" as any);
                if (label === "Maintenance") router.push("/tenant/applications" as any);
                if (label === "Notifications") router.push("/tenant/applications" as any);
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
        <View style={styles.reading}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>⚡ Submeter Readings</Text>
            <Text style={styles.history}>History</Text>
          </View>
          <View style={styles.readingRow}>
            <Reading label="Electricity" value="142 kWh" />
            <Reading label="Water" value="4.2 m³" />
          </View>
        </View>
        <View style={styles.bulletin}>
          <Text style={styles.sectionTitle}>📣 BoardEase Bulletin</Text>
          <Text style={styles.bulletinText}>
            Monthly General Cleaning & Inspection
          </Text>
          <Text style={styles.muted}>
            Saturday, 9:00 AM · 12:00 PM. Common kitchen and 2nd floor balcony
            areas will be sanitized.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          Kuya Bert ·{" "}
          {tenantRoom.number ? `Room ${tenantRoom.number}` : "No room"}
        </Text>
        <Pressable
          style={styles.call}
          onPress={() => void Linking.openURL("tel:+639175548921")}
        >
          <Ionicons name="call" size={13} color="#fff" />
          <Text style={styles.callText}>Call</Text>
        </Pressable>
      </View>
      <AssignedTenantNav active="Home" />
    </SafeAreaView>
  );
}
function Reading({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readingBox}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.readingValue}>{value}</Text>
      <View style={styles.progress} />
    </View>
  );
}
const styles = StyleSheet.create({
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
  kicker: { fontSize: 11, color: "#d9e5ff", fontWeight: "700", letterSpacing: 1.4 },
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
    flexDirection: "row",
    justifyContent: "space-between",
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
    alignSelf: "flex-start",
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
    fontWeight: "600",
    color: "#1d4ed8",
    marginTop: 8,
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
