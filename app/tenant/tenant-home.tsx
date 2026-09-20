import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { AssignedTenantNav } from "@/components/tenant-navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { router } from "expo-router";

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
        <Text style={styles.kicker}>• BOARDEASE</Text>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.push("/tenant/account" as any)}>
            <Text style={styles.welcome}>Welcome back,</Text>
            <Text style={styles.name}>{user?.displayName || "Tenant"}</Text>
          </Pressable>
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
                Casa Verde Boarding House · 2nd Floor
              </Text>
            </View>
            <Text style={styles.lease}>Active Lease</Text>
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
              onPress={() =>
                label === "Profile"
                  ? router.push("/tenant/account" as any)
                  : Alert.alert(label, `${label} will be connected later.`)
              }
            >
              <Ionicons
                name={icon as keyof typeof Ionicons.glyphMap}
                size={22}
                color={label === "Notifications" ? "#e09a00" : "#536783"}
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
          <Text style={styles.sectionTitle}>ðŸ“¢ BoardEase Bulletin</Text>
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
          {user?.displayName || "Tenant"} ·{" "}
          {tenantRoom.number ? `Room ${tenantRoom.number}` : "No room"}
        </Text>
        <Pressable
          style={styles.call}
          onPress={() =>
            Alert.alert("Call caretaker", "Calling the caretaker...")
          }
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
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  header: {
    backgroundColor: "#fff",
    padding: 14,
    borderBottomWidth: 1,
    borderColor: "#e6ebf1",
  },
  kicker: { fontSize: 11, color: "#237759", fontWeight: "700" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 7,
  },
  headerProfileActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  welcome: { fontSize: 12, color: "#8390a2" },
  name: { fontSize: 19, fontWeight: "700", color: "#172033" },
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
    backgroundColor: "#fff4ce",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  dueLabel: { color: "#9a6500", fontSize: 12 },
  amount: { fontSize: 21, fontWeight: "700", color: "#172033", marginTop: 8 },
  muted: { fontSize: 11, color: "#78879b", marginTop: 3 },
  bold: { fontWeight: "700" },
  dueBadge: {
    color: "#a87500",
    fontSize: 11,
    backgroundColor: "#ffe39a",
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  roomCard: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e5eaf1",
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
  },
  detail: { fontSize: 12, color: "#253149", fontWeight: "600", marginTop: 4 },
  roomDetails: { flexDirection: "row", gap: 9, marginTop: 14 },
  actions: { flexDirection: "row", gap: 8, marginVertical: 12 },
  action: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    paddingVertical: 12,
    alignItems: "center",
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
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: "#253149" },
  history: { fontSize: 11, color: "#d9634b" },
  readingRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  readingBox: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    borderRadius: 7,
    padding: 9,
  },
  readingValue: {
    fontSize: 12,
    color: "#e07a38",
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    padding: 12,
    marginTop: 12,
  },
  bulletinText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a87500",
    marginTop: 8,
  },
  bottomBar: {
    position: "absolute",
    bottom: 66,
    left: 10,
    right: 10,
    backgroundColor: "#172033",
    borderRadius: 10,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomText: { color: "#fff", fontSize: 12 },
  call: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#f0a300",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  callText: { color: "#fff", fontSize: 12 },
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
  navActive: { color: "#e07a38" },
});
