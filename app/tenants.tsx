import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const tenants = [
  [
    "Carlos Núñez",
    "Room 204 · Solo Studio",
    "₱3,500",
    "OVERDUE ₱3,500",
    "#ffe0e0",
  ],
  [
    "Maria Santos",
    "Room 201-A · Twin Sharing",
    "₱3,500",
    "GOOD STANDING",
    "#d9f7e8",
  ],
  [
    "Bea Santos",
    "Room 102-B · Twin Sharing",
    "₱4,200",
    "OVERDUE ₱4,200",
    "#ffe0e0",
  ],
  ["Darren Lim", "Room 305 · Bedspace", "₱3,500", "1 DAY OVERDUE", "#fff0c2"],
  ["Ana Reyes", "Room 201-B · Twin Sharing", "₱3,500", "PAID", "#d9f7e8"],
  [
    "Juan Dela Cruz",
    "Applied for Room 301",
    "₱3,000",
    "PENDING REVIEW",
    "#fff0c2",
  ],
];
const endingTenant = [
  "Sofia Mendoza",
  "Room 201-C - Bedspace",
  "₱3,500",
  "LEASE ENDING SOON",
  "#e6e0ff",
];
const allTenants = [...tenants, endingTenant];

export default function Tenants() {
  const [filter, setFilter] = useState<
    "all" | "overdue" | "ending" | "pending"
  >("all");
  const filteredTenants = allTenants.filter(
    (tenant) =>
      filter === "all" ||
      (filter === "overdue"
        ? tenant[3].includes("OVERDUE")
        : filter === "ending"
          ? tenant[3].includes("ENDING")
          : tenant[3].includes("PENDING")),
  );
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>BOARDEASE</Text>
          <Text style={styles.title}>Tenants</Text>
          <Text style={styles.subtitle}>
            22 Active Tenants · 3 Overdue · 5 Pending Applications
          </Text>
        </View>
        <Pressable
          style={styles.register}
          onPress={() =>
            Alert.alert(
              "Register tenant",
              "Tenant registration will be connected to Firebase later.",
            )
          }
        >
          <Ionicons name="person-add-outline" size={15} color="#fff" />
          <Text style={styles.registerText}>Register</Text>
        </Pressable>
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
              All Tenants (22)
            </Text>
          </Pressable>
          <Pressable onPress={() => setFilter("overdue")}>
            <Text
              style={[
                styles.filter,
                filter === "overdue" && styles.filterActive,
              ]}
            >
              Overdue (3)
            </Text>
          </Pressable>
          <Pressable onPress={() => setFilter("ending")}>
            <Text
              style={[
                styles.filter,
                filter === "ending" && styles.filterActive,
              ]}
            >
              Lease Ending Soon (4)
            </Text>
          </Pressable>
          <Pressable onPress={() => setFilter("pending")}>
            <Text
              style={[
                styles.filter,
                filter === "pending" && styles.filterActive,
              ]}
            >
              Pending (5)
            </Text>
          </Pressable>
        </View>
        <View style={styles.alert}>
          <Ionicons name="alert-circle" size={23} color="#a84b2f" />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>ATTENTION REQUIRED</Text>
            <Text style={styles.alertValue}>
              3 Overdue Collections{" "}
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
        {filteredTenants.map(([name, room, rent, status, color]) => (
          <View key={name} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.avatar}>👤</Text>
              <View style={styles.person}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.room}>{room}</Text>
                <Text style={styles.phone}>+63 917 555 1234</Text>
              </View>
              <Text style={[styles.badge, { backgroundColor: color }]}>
                {status}
              </Text>
            </View>
            <View style={styles.tenantActions}>
              <Text style={styles.rent}>
                {rent}
                <Text style={styles.month}>/mo</Text>
              </Text>
              <Pressable
                style={styles.smallButton}
                onPress={() => Alert.alert("Call tenant", `Call ${name}?`)}
              >
                <Ionicons name="call-outline" size={12} color="#173b36" />
                <Text>Call</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.smallButton,
                  status.includes("OVERDUE") && styles.notifyButton,
                ]}
                onPress={() =>
                  Alert.alert("Notification", `A reminder was sent to ${name}.`)
                }
              >
                <Ionicons
                  name="notifications-outline"
                  size={12}
                  color={status.includes("OVERDUE") ? "#fff" : "#173b36"}
                />
                <Text
                  style={status.includes("OVERDUE") && styles.notifyButtonText}
                >
                  {status.includes("OVERDUE") ? "Notify" : "Profile"}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}
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
              ? router.replace("/dashboard")
              : index === 1
                ? router.push("/rooms")
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
  page: { flex: 1, backgroundColor: "#f7f5f1" },
  header: {
    minHeight: 70,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e8e3dc",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: { fontSize: 8, color: "#b65c43" },
  title: { fontSize: 17, fontWeight: "700", color: "#172033" },
  subtitle: { fontSize: 9, color: "#76869a", marginTop: 3, maxWidth: 210 },
  register: {
    backgroundColor: "#173b36",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  registerText: { color: "#fff", fontSize: 10, fontWeight: "600" },
  content: { padding: 12, paddingBottom: 24 },
  search: {
    height: 38,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4dfd7",
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchText: { fontSize: 10, color: "#8997a6" },
  filters: { flexDirection: "row", gap: 7, marginVertical: 11 },
  filterActive: {
    fontSize: 9,
    color: "#fff",
    backgroundColor: "#173b36",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filter: {
    fontSize: 9,
    color: "#66768a",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e5e0d8",
  },
  alert: {
    backgroundColor: "#ffe0d4",
    borderRadius: 10,
    padding: 11,
    flexDirection: "row",
    gap: 9,
    flexWrap: "wrap",
    marginBottom: 11,
  },
  alertTitle: { fontSize: 8, color: "#a84b2f", fontWeight: "700" },
  alertValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7e3623",
    marginTop: 2,
  },
  alertAmount: { marginLeft: 38 },
  alertText: { fontSize: 9, color: "#875445", marginTop: 3 },
  notifyAll: {
    flexBasis: "100%",
    backgroundColor: "#a84b2f",
    borderRadius: 6,
    alignItems: "center",
    paddingVertical: 7,
  },
  notifyText: { color: "#fff", fontSize: 9, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e8e3dc",
    padding: 10,
    marginBottom: 8,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { fontSize: 27 },
  person: { flex: 1 },
  name: { fontSize: 11, fontWeight: "700", color: "#253149" },
  room: { fontSize: 9, color: "#728197", marginTop: 2 },
  phone: { fontSize: 8, color: "#8997a6", marginTop: 2 },
  badge: {
    fontSize: 8,
    color: "#53602f",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  tenantActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginTop: 9,
  },
  rent: {
    fontSize: 12,
    fontWeight: "700",
    color: "#173b36",
    marginRight: "auto",
  },
  month: { fontSize: 8, fontWeight: "400" },
  smallButton: {
    borderRadius: 6,
    backgroundColor: "#f4f1ed",
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  smallButtonText: { fontSize: 9 },
  notifyButton: { backgroundColor: "#a84b2f" },
  notifyButtonText: { color: "#fff" },
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
  navText: { fontSize: 9, color: "#9aa8ba" },
  navActive: { color: "#2864e8" },
});
