import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const applications = [
  {
    name: "Juan Dela Cruz",
    applied: "Target Move-in: Nov 1, 20",
    room: "Room 301 · Bedspace",
    rent: "₱3,000",
    badge: "Needs Review",
    badgeColor: "#fff0c2",
    avatar: "👨🏻",
  },
  {
    name: "Ana Reyes",
    applied: "Target Move-in: Nov 1, 20",
    room: "Room 104 · Solo Studio",
    rent: "₱4,800",
    badge: "Ready for Decision",
    badgeColor: "#d9f7e8",
    avatar: "👩🏻",
  },
  {
    name: "Mark Bautista",
    applied: "Target Move-in: Nov 5, 20",
    room: "Room 202 · Twin Sharing",
    rent: "₱3,200",
    badge: "Needs Review",
    badgeColor: "#fff0c2",
    avatar: "👨🏻‍💼",
  },
  {
    name: "Sofia Mendoza",
    applied: "Target Move-in: Dec 1, 20",
    room: "Room 201 · Bed A (Twin)",
    rent: "₱3,500",
    badge: "Under Evaluation",
    badgeColor: "#eee8d7",
    avatar: "👩🏼",
  },
  {
    name: "Leo Ramos",
    applied: "Target Move-in: Nov 20",
    room: "Room 105 · Solo Occupancy",
    rent: "₱3,200",
    badge: "Priority Review",
    badgeColor: "#ffe0e0",
    avatar: "👨🏽",
  },
];

export default function PendingApplications() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={21} color="#172033" />
        </Pressable>
        <Text style={styles.title}>Pending Applications</Text>
        <View style={styles.headerActions}>
          <Ionicons name="search-outline" size={20} color="#536783" />
          <Ionicons name="options-outline" size={20} color="#536783" />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>TRIAGE PIPELINE</Text>
            <Text style={styles.summaryValue}>5</Text>
            <Text style={styles.summarySub}>Total Pending</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>NEEDS REVIEW</Text>
            <Text style={[styles.summaryValue, { color: "#a87500" }]}>3</Text>
            <Text style={styles.summarySub}>Needs Review</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>READY</Text>
            <Text style={[styles.summaryValue, { color: "#138a5b" }]}>2</Text>
            <Text style={styles.summarySub}>Verified & Ready</Text>
          </View>
        </View>
        <View style={styles.filters}>
          <Text style={styles.filterActive}>All (5)</Text>
          <Text style={styles.filter}>Solo Studio · 2</Text>
          <Text style={styles.filter}>Bedspace · 2</Text>
        </View>
        {applications.map((application) => (
          <Pressable
            key={application.name}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/application/[name]",
                params: { name: application.name },
              })
            }
          >
            <View style={styles.cardTop}>
              <Text style={styles.avatar}>{application.avatar}</Text>
              <View style={styles.person}>
                <Text style={styles.name}>{application.name}</Text>
                <Text style={styles.applied}>{application.applied}</Text>
              </View>
              <Text
                style={[
                  styles.badge,
                  { backgroundColor: application.badgeColor },
                ]}
              >
                {application.badge}
              </Text>
            </View>
            <View style={styles.roomRow}>
              <Text style={styles.room}>{application.room}</Text>
              <Text style={styles.rent}>
                {application.rent}
                <Text style={styles.month}> /mo</Text>
              </Text>
            </View>
            <View style={styles.checks}>
              <Text>✓ ID Verified</Text>
              <Text>✓ Payslip Attached</Text>
            </View>
            <Pressable
              style={styles.reviewRow}
              onPress={() =>
                router.push({
                  pathname: "/application/[name]",
                  params: { name: application.name },
                })
              }
            >
              <Text style={styles.reviewText}>Review Application Dossier</Text>
              <Ionicons name="chevron-forward" size={17} color="#536783" />
            </Pressable>
          </Pressable>
        ))}
        <View style={styles.assignment}>
          <Ionicons name="sparkles-outline" size={23} color="#298b69" />
          <View>
            <Text style={styles.assignmentTitle}>
              Automatic Room Assignment
            </Text>
            <Text style={styles.assignmentText}>
              Approving an application automatically updates room occupancy and
              reserves the requested bed in real-time.
            </Text>
          </View>
        </View>
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
                : index === 2
                  ? router.push("/tenants")
                  : undefined
          }
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={index === 3 ? "#2864e8" : "#9aa8ba"}
          />
          <Text style={[styles.navText, index === 3 && styles.navActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  header: {
    height: 58,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e8edf2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 14,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: "#172033" },
  headerActions: { flexDirection: "row", gap: 15 },
  content: { padding: 12, paddingBottom: 24 },
  summary: {
    backgroundColor: "#fff",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  summaryLabel: { fontSize: 8, color: "#8c9aaa" },
  summaryValue: {
    fontSize: 19,
    fontWeight: "700",
    color: "#2864e8",
    textAlign: "center",
    marginTop: 3,
  },
  summarySub: {
    fontSize: 9,
    color: "#728197",
    textAlign: "center",
    marginTop: 2,
  },
  filters: { flexDirection: "row", gap: 7, marginVertical: 12 },
  filterActive: {
    color: "#fff",
    backgroundColor: "#173b36",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 9,
  },
  filter: {
    color: "#66768a",
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 9,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    padding: 11,
    marginBottom: 9,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { fontSize: 28 },
  person: { flex: 1 },
  name: { fontSize: 12, fontWeight: "700", color: "#253149" },
  applied: { fontSize: 9, color: "#8592a3", marginTop: 2 },
  badge: {
    fontSize: 8,
    color: "#53602f",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  roomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fbfcfd",
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
  },
  room: { fontSize: 10, color: "#394b61" },
  rent: { fontSize: 13, fontWeight: "700", color: "#18735c" },
  month: { fontSize: 8, fontWeight: "400", color: "#76869a" },
  checks: { flexDirection: "row", gap: 12, paddingVertical: 8 },
  reviewRow: {
    borderTopWidth: 1,
    borderColor: "#edf0f4",
    paddingTop: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewText: { fontSize: 10, color: "#253149", fontWeight: "600" },
  assignment: {
    backgroundColor: "#f1f8f5",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  assignmentTitle: { fontSize: 11, color: "#227057", fontWeight: "700" },
  assignmentText: {
    fontSize: 9,
    color: "#708579",
    marginTop: 3,
    lineHeight: 14,
    maxWidth: 270,
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
  navText: { fontSize: 9, color: "#9aa8ba" },
  navActive: { color: "#2864e8" },
});
