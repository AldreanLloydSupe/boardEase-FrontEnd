import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LandlordNavigation } from "@/components/landlord-navigation";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const overdue: string[][] = [];
const payments: string[][] = [];

export default function Finance() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>BOARDEASE · Casa Verde</Text>
          <Text style={styles.title}>Financial Overview</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.period}>
          <Text>October 2026</Text>
          <Ionicons name="calendar-outline" size={16} color="#66768a" />
        </View>
        <Text style={styles.sectionLabel}>COLLECTED REVENUE</Text>
        <View style={styles.revenue}>
          <View>
            <Text style={styles.revenueValue}>₱0</Text>
            <Text style={styles.muted}>No tenant payments yet</Text>
          </View>
          <Text style={styles.growth}>+12.4%</Text>
          <Text style={styles.revenuePercent}>66.2% Goal</Text>
        </View>
        <View style={styles.smallGrid}>
          <Metric
            label="PENDING/OVERDUE"
            value="₱0"
            sub="No unpaid units"
            color="#d9634b"
          />
          <Metric
            label="PROJECTED NET"
            value="₱0"
            sub="No payment data"
            color="#536783"
          />
        </View>
        <Section title="Inflow Composition" action="Total: ₱0" />
        <View style={styles.composition}>
          <View
            style={[styles.bar, { width: "86%", backgroundColor: "#173b36" }]}
          />
          <View
            style={[styles.bar, { width: "9%", backgroundColor: "#f0aa41" }]}
          />
          <View
            style={[styles.bar, { width: "5%", backgroundColor: "#e97e68" }]}
          />
          {[
            ["Base Room Rent", "₱72,500"],
            ["Utilities & Wi-Fi", "₱8,700"],
            ["Fines & Fees", "₱3,000"],
          ].map(([label, value]) => (
            <View style={styles.line} key={label}>
              <Text style={styles.lineLabel}>{label}</Text>
              <Text style={styles.lineValue}>{value}</Text>
            </View>
          ))}
        </View>
        <Section title="Overdue Watchlist" action="0 Payments" />
        {overdue.length === 0 && (
          <Text style={styles.emptyText}>No overdue tenant payments.</Text>
        )}
        {overdue.map(([name, detail, amount]) => (
          <View style={styles.overdue} key={name}>
            <View style={styles.round}>
              <Text>{name.slice(0, 2)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.person}>{name}</Text>
              <Text style={styles.muted}>{detail}</Text>
            </View>
            <Text style={styles.overdueAmount}>{amount}</Text>
          </View>
        ))}
        <Section title="Recent Payments" action="See all (0)" />
        {payments.length === 0 && (
          <Text style={styles.emptyText}>No tenant payments recorded yet.</Text>
        )}
        {payments.map(([name, detail, amount]) => (
          <View style={styles.payment} key={name}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#168866"
            />
            <View style={styles.flex}>
              <Text style={styles.person}>{name}</Text>
              <Text style={styles.muted}>{detail}</Text>
            </View>
            <Text style={styles.paymentAmount}>{amount}</Text>
          </View>
        ))}
        <Section title="Payables & Remittances" action="Due Early Nov" />
        {[
          ["Devon Light & Power", "Due Nov 03", "₱4,210"],
          ["Joshua Water Utility", "Due Nov 05", "₱2,140"],
          ["Caretaker Stipend", "Scheduled", "₱12,000"],
        ].map(([name, detail, amount]) => (
          <View style={styles.payment} key={name}>
            <Ionicons name="receipt-outline" size={21} color="#8f806a" />
            <View style={styles.flex}>
              <Text style={styles.person}>{name}</Text>
              <Text style={styles.muted}>{detail}</Text>
            </View>
            <Text style={styles.paymentAmount}>{amount}</Text>
          </View>
        ))}
      </ScrollView>
      <LandlordNavigation active="Finance" />
    </SafeAreaView>
  );
}
function Metric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.muted}>{sub}</Text>
    </View>
  );
}
function Section({ title, action }: { title: string; action: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionAction}>{action}</Text>
    </View>
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
                : index === 2
                  ? router.push("/landlord/tenants" as any)
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
  page: { flex: 1, backgroundColor: "#f7f5f1" },
  header: {
    minHeight: 66,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e8e3dc",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: { fontSize: 12, color: "#b65c43" },
  title: { fontSize: 17, fontWeight: "700", color: "#172033", marginTop: 3 },
  paymentButton: {
    backgroundColor: "#173b36",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  paymentText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  content: { padding: 12, paddingBottom: 25 },
  period: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e0d8",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 12, color: "#8997a6", letterSpacing: 0.5 },
  revenue: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  revenueValue: { fontSize: 21, fontWeight: "700", color: "#173b36" },
  muted: { fontSize: 11, color: "#8390a2", marginTop: 3 },
  emptyText: {
    fontSize: 12,
    color: "#71809a",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  growth: {
    backgroundColor: "#d9f7e8",
    color: "#168866",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  revenuePercent: {
    position: "absolute",
    right: 12,
    top: 17,
    fontSize: 11,
    color: "#536783",
  },
  smallGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  metric: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 9,
    padding: 11,
    borderWidth: 1,
    borderColor: "#e5e0d8",
  },
  metricLabel: { fontSize: 12, color: "#8997a6" },
  metricValue: { fontSize: 15, fontWeight: "700", marginTop: 5 },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 17,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#253149" },
  sectionAction: { fontSize: 11, color: "#a84b2f" },
  composition: { backgroundColor: "#fff", borderRadius: 10, padding: 12 },
  bar: { height: 8, borderRadius: 4, marginBottom: 10 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderColor: "#f0ece7",
  },
  lineLabel: { fontSize: 12, color: "#536783" },
  lineValue: { fontSize: 12, fontWeight: "700", color: "#253149" },
  overdue: {
    backgroundColor: "#fff",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#f0d5cf",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  round: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffe0d4",
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, marginLeft: 9 },
  person: { fontSize: 11, color: "#253149", fontWeight: "600" },
  overdueAmount: { color: "#d9634b", fontSize: 11, fontWeight: "700" },
  payment: {
    backgroundColor: "#fff",
    borderRadius: 9,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  paymentAmount: { color: "#168866", fontSize: 11, fontWeight: "700" },
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
});
