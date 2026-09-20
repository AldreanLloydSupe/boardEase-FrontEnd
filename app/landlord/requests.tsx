import { Ionicons } from "@expo/vector-icons";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LandlordNavigation } from "@/components/landlord-navigation";
import { db } from "@/lib/firebase";

type MaintenanceRequest = {
  id: string;
  tenantName?: string;
  roomNumber?: string;
  title?: string;
  details?: string;
  status?: "in_progress" | "parts_sourced" | "completed";
};

const statuses: MaintenanceRequest["status"][] = [
  "in_progress",
  "parts_sourced",
  "completed",
];

export default function LandlordRequests() {
  const [requests, setRequests] = React.useState<MaintenanceRequest[]>([]);

  React.useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "maintenanceRequests"),
      (snapshot) =>
        setRequests(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as MaintenanceRequest[],
        ),
      () => setRequests([]),
    );
  }, []);

  async function changeStatus(request: MaintenanceRequest) {
    if (!db) return;
    const current = statuses.indexOf(request.status || "in_progress");
    const next = statuses[(current + 1) % statuses.length];
    try {
      await updateDoc(doc(db, "maintenanceRequests", request.id), {
        status: next,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      Alert.alert("Unable to update request", "Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>BOARDEASE</Text>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.title}>Maintenance Requests</Text>
            <Text style={styles.subtitle}>Review tenant requests and update their progress.</Text>
          </View>
          <Ionicons name="construct-outline" size={24} color="#2864e8" />
        </View>
        {requests.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={34} color="#16805d" />
            <Text style={styles.emptyTitle}>No maintenance requests</Text>
            <Text style={styles.emptyText}>New tenant requests will appear here.</Text>
          </View>
        ) : (
          requests.map((request) => (
            <View style={styles.card} key={request.id}>
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}><Ionicons name="construct-outline" size={18} color="#2864e8" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestTitle}>{request.title || "Maintenance request"}</Text>
                  <Text style={styles.meta}>{request.tenantName || "Tenant"} · Room {request.roomNumber || "—"}</Text>
                </View>
                <Text style={styles.status}>{labelFor(request.status)}</Text>
              </View>
              <Text style={styles.details}>{request.details || "No details provided."}</Text>
              <Pressable style={styles.updateButton} onPress={() => changeStatus(request)}>
                <Ionicons name="sync-outline" size={16} color="#fff" />
                <Text style={styles.updateText}>Mark as {nextLabel(request.status)}</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
      <LandlordNavigation active="Dashboard" />
    </SafeAreaView>
  );
}

function labelFor(status?: MaintenanceRequest["status"]) {
  if (status === "parts_sourced") return "PARTS SOURCED";
  if (status === "completed") return "COMPLETED";
  return "IN PROGRESS";
}

function nextLabel(status?: MaintenanceRequest["status"]) {
  if (status === "in_progress" || !status) return "Parts Sourced";
  if (status === "parts_sourced") return "Completed";
  return "In Progress";
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 14, paddingBottom: 95 },
  brand: { color: "#2864e8", fontSize: 11, fontWeight: "700" },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7, marginBottom: 16 },
  title: { color: "#172033", fontSize: 21, fontWeight: "700" },
  subtitle: { color: "#7a8799", fontSize: 11, marginTop: 3 },
  empty: { backgroundColor: "#fff", borderRadius: 12, padding: 30, alignItems: "center", borderWidth: 1, borderColor: "#e5eaf1" },
  emptyTitle: { color: "#253149", fontSize: 15, fontWeight: "700", marginTop: 10 },
  emptyText: { color: "#7a8799", fontSize: 11, marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "#e5eaf1" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eaf1ff", alignItems: "center", justifyContent: "center" },
  requestTitle: { color: "#253149", fontSize: 13, fontWeight: "700" },
  meta: { color: "#7a8799", fontSize: 10, marginTop: 3 },
  status: { color: "#a44c35", fontSize: 9, fontWeight: "700" },
  details: { color: "#526174", fontSize: 11, lineHeight: 16, marginTop: 12 },
  updateButton: { backgroundColor: "#2864e8", borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 12 },
  updateText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
