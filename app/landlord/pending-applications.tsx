import { Ionicons } from "@expo/vector-icons";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { router } from "expo-router";
import { LandlordNavigation } from "@/components/landlord-navigation";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "@/lib/firebase";

type Application = {
  id: string;
  tenantName?: string;
  roomNumber?: string;
  roomType?: string;
  price?: string;
  status?: string;
};
type TourRequest = {
  id: string;
  tenantName?: string;
  roomNumber?: string;
  requestedDate?: string;
  note?: string;
};

export default function PendingApplications() {
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [tourRequests, setTourRequests] = React.useState<TourRequest[]>([]);
  const [selectedTour, setSelectedTour] = React.useState<TourRequest | null>(
    null,
  );
  const [loading, setLoading] = React.useState(Boolean(db));
  React.useEffect(() => {
    if (!db) return;
    Promise.all([
      getDocs(collection(db, "applications")),
      getDocs(collection(db, "tourRequests")),
    ])
      .then(([snapshot, tours]) => {
        setApplications(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .filter(
              (item: any) => !item.status || item.status === "pending",
            ) as Application[],
        );
        setTourRequests(
          tours.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .filter(
              (item: any) => !item.status || item.status === "pending",
            ) as TourRequest[],
        );
      })
      .catch(() => {
        setApplications([]);
        setTourRequests([]);
      })
      .finally(() => setLoading(false));
  }, []);
  async function respondToTour(status: "accepted" | "declined") {
    if (!db || !selectedTour) return;
    try {
      await updateDoc(doc(db, "tourRequests", selectedTour.id), { status });
      setTourRequests((current) =>
        current.filter((tour) => tour.id !== selectedTour.id),
      );
      setSelectedTour(null);
      Alert.alert(
        status === "accepted" ? "Tour accepted" : "Tour declined",
        `The tour request from ${selectedTour.tenantName || "the tenant"} was ${status}.`,
      );
    } catch {
      Alert.alert(
        "Unable to update tour",
        "Check your Firebase connection and try again.",
      );
    }
  }
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#172033" />
        </Pressable>
        <Text style={styles.title}>Pending Applications</Text>
        <Ionicons name="notifications-outline" size={21} color="#536783" />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Metric label="Total Pending" value={String(applications.length)} />
          <Metric
            label="Needs Review"
            value={String(applications.length)}
            color="#a87500"
          />
          <Metric label="Ready" value="0" color="#138a5b" />
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.activeFilter}>All ({applications.length})</Text>
          <Text style={styles.filter}>Pending Review</Text>
        </View>
        {loading ? (
          <ActivityIndicator color="#16805d" style={styles.loader} />
        ) : applications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={34} color="#8a98aa" />
            <Text style={styles.emptyTitle}>No pending applications</Text>
            <Text style={styles.emptyText}>
              Tenant applications will appear here after they apply for a room.
            </Text>
          </View>
        ) : (
          applications.map((application) => (
            <Pressable
              key={application.id}
              style={styles.card}
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
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(application.tenantName || "T").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.person}>
                  <Text style={styles.name}>
                    {application.tenantName || "Tenant"}
                  </Text>
                  <Text style={styles.sub}>Submitted for review</Text>
                </View>
                <Text style={styles.badge}>
                  {application.status || "Pending Review"}
                </Text>
              </View>
              <View style={styles.roomRow}>
                <Text style={styles.room}>
                  Room {application.roomNumber} · {application.roomType}
                </Text>
                <Text style={styles.rent}>₱{application.price} /mo</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewText}>
                  Review Application Dossier
                </Text>
                <Ionicons name="chevron-forward" size={17} color="#536783" />
              </View>
            </Pressable>
          ))
        )}
        {tourRequests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Tour Requests</Text>
            {tourRequests.map((tour) => (
              <Pressable
                style={styles.tourCard}
                key={tour.id}
                onPress={() => setSelectedTour(tour)}
              >
                <View style={styles.tourTop}>
                  <Ionicons name="calendar-outline" size={20} color="#2864e8" />
                  <Text style={styles.tourStatus}>Pending Tour</Text>
                </View>
                <Text style={styles.name}>
                  {tour.tenantName || "Tenant"} requested to tour Room{" "}
                  {tour.roomNumber}
                </Text>
                <Text style={styles.sub}>
                  {tour.requestedDate || "Date not selected"}
                </Text>
                <Text style={styles.tourNote}>
                  {tour.note || "No note provided."}
                </Text>
                <View style={styles.tourTapRow}>
                  <Text style={styles.tourTapText}>Review Tour Request</Text>
                  <Ionicons name="chevron-forward" size={16} color="#2864e8" />
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
      <Modal
        visible={Boolean(selectedTour)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTour(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Review Tour Request</Text>
              <Pressable onPress={() => setSelectedTour(null)}>
                <Ionicons name="close" size={22} color="#536783" />
              </Pressable>
            </View>
            <Text style={styles.modalName}>
              {selectedTour?.tenantName || "Tenant"}
            </Text>
            <Text style={styles.modalRoom}>
              Requested tour for Room {selectedTour?.roomNumber || "—"}
            </Text>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Preferred date</Text>
              <Text style={styles.detailValue}>
                {selectedTour?.requestedDate || "Not selected"}
              </Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Tenant note</Text>
              <Text style={styles.detailValue}>
                {selectedTour?.note || "No note provided."}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.declineButton}
                onPress={() => respondToTour("declined")}
              >
                <Text style={styles.declineText}>Decline</Text>
              </Pressable>
              <Pressable
                style={styles.acceptButton}
                onPress={() => respondToTour("accepted")}
              >
                <Ionicons name="checkmark" size={17} color="#fff" />
                <Text style={styles.acceptText}>Accept Tour</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <LandlordNavigation active="Dashboard" />
    </SafeAreaView>
  );
}
function Metric({
  label,
  value,
  color = "#253149",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BottomNav() {
  const items = [
    ["grid-outline", "Dashboard"],
    ["business-outline", "Rooms"],
    ["people-outline", "Tenants"],
    ["bar-chart-outline", "Finance"],
  ] as const;
  return (
    <View style={styles.nav}>
      {items.map(([icon, label], index) => (
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
                  : router.push("/landlord/finance" as any)
          }
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={21}
            color={index === 0 ? "#2864e8" : "#9aa8ba"}
          />
          <Text style={styles.navText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  header: {
    height: 64,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderColor: "#e5eaf1",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#172033" },
  content: { padding: 14, paddingBottom: 90 },
  summary: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  metricLabel: { fontSize: 11, color: "#8c9aaa" },
  metricValue: { fontSize: 24, fontWeight: "700", marginTop: 5 },
  filterRow: { flexDirection: "row", gap: 7, marginVertical: 14 },
  activeFilter: {
    color: "#fff",
    backgroundColor: "#0d382c",
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 11,
  },
  filter: {
    color: "#71809a",
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
    fontSize: 11,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  loader: { marginTop: 30 },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#253149",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#71809a",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#253149",
    marginTop: 20,
    marginBottom: 10,
  },
  tourCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#dbe8f4",
  },
  tourTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  tourStatus: {
    color: "#2864e8",
    backgroundColor: "#e8f0ff",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
  },
  tourNote: { color: "#71809a", fontSize: 11, marginTop: 7 },
  tourTapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#e8eef5",
  },
  tourTapText: { color: "#2864e8", fontSize: 12, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(18, 29, 48, 0.45)",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 19, fontWeight: "700", color: "#253149" },
  modalName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#253149",
    marginTop: 22,
  },
  modalRoom: { fontSize: 12, color: "#71809a", marginTop: 4 },
  detailBox: {
    backgroundColor: "#f7f9fc",
    borderRadius: 9,
    padding: 12,
    marginTop: 13,
  },
  detailLabel: { fontSize: 11, color: "#71809a" },
  detailValue: {
    fontSize: 13,
    color: "#253149",
    fontWeight: "600",
    marginTop: 5,
  },
  modalActions: { flexDirection: "row", gap: 9, marginTop: 22 },
  declineButton: {
    flex: 1,
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#d7dfeb",
    alignItems: "center",
    justifyContent: "center",
  },
  declineText: { color: "#b65745", fontSize: 13, fontWeight: "700" },
  acceptButton: {
    flex: 1,
    height: 46,
    borderRadius: 9,
    backgroundColor: "#0d382c",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 13,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  cardTop: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#d9eee6",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#16805d", fontWeight: "700" },
  person: { flex: 1, marginLeft: 10 },
  name: { fontSize: 14, fontWeight: "700", color: "#253149" },
  sub: { fontSize: 11, color: "#7a8799", marginTop: 3 },
  badge: {
    color: "#9b6700",
    backgroundColor: "#fff0c2",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 10,
  },
  roomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#eef1f5",
  },
  room: { fontSize: 12, color: "#526174" },
  rent: { fontSize: 12, fontWeight: "700", color: "#253149" },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#eef1f5",
  },
  reviewText: { fontSize: 12, color: "#253149", fontWeight: "600" },
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
});
