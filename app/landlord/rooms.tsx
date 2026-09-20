import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { router } from "expo-router";
import { LandlordNavigation } from "@/components/landlord-navigation";
import React, { useState } from "react";
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
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

type Room = {
  id: string;
  number: string;
  type: string;
  status: "Available" | "Occupied";
  rent: string;
  tenant?: string;
  attention?: boolean;
};
export default function Rooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");
  const [rent, setRent] = useState("");
  const [filter, setFilter] = useState<
    "all" | "available" | "occupied" | "attention"
  >("all");
  React.useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        setRooms(
          snapshot.docs.map((item) => ({
            id: item.id,
            number: String(item.data().number ?? ""),
            type: String(item.data().type ?? "Room"),
            status:
              String(item.data().status ?? "available").toLowerCase() ===
              "occupied"
                ? "Occupied"
                : "Available",
            rent: String(item.data().rent ?? item.data().price ?? "0"),
            tenant: item.data().tenant,
            attention: item.data().attention === true,
          })),
        );
      },
      () => setRooms([]),
    );
  }, []);
  const filteredRooms = rooms.filter(
    (room) =>
      filter === "all" ||
      (filter === "attention"
        ? room.attention
        : room.status.toLowerCase() === filter),
  );
  async function addRoom() {
    if (!number || !type || !rent) {
      Alert.alert(
        "Missing details",
        "Enter the room number, type, and monthly rent.",
      );
      return;
    }
    const normalizedNumber = number.trim();
    const normalizedType = type.trim();
    const normalizedRent = rent.trim();
    if (rooms.some((room) => room.number === normalizedNumber)) {
      Alert.alert(
        "Room already exists",
        `Room ${normalizedNumber} is already listed.`,
      );
      return;
    }
    const room = {
      number: normalizedNumber,
      type: normalizedType,
      status: "Available" as const,
      rent: normalizedRent,
      price: normalizedRent,
      amenities: ["WiFi"],
      createdBy: user?.uid ?? null,
    };
    try {
      if (db) {
        const saved = await addDoc(collection(db, "rooms"), {
          ...room,
          createdAt: serverTimestamp(),
        });
        setRooms((current) => [
          ...current,
          { ...room, id: saved.id, status: "Available" },
        ]);
      } else {
        Alert.alert(
          "Firebase unavailable",
          "Connect Firebase before adding rooms.",
        );
        return;
      }
      setNumber("");
      setType("");
      setRent("");
      setAddOpen(false);
      Alert.alert("Room added", `Room ${number} is now available.`);
    } catch {
      Alert.alert(
        "Unable to add room",
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
        <View style={styles.headerTitle}>
          <Text style={styles.kicker}>BOARDEASE</Text>
          <Text style={styles.title}>Rooms</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={17} color="#fff" />
          <Text style={styles.addText}>Add Room</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.overview}>Overview</Text>
        <Text style={styles.caption}>24 total units across 3 floors</Text>
        <View style={styles.summary}>
          <Summary
            icon="business-outline"
            label="Total Rooms"
            value={String(rooms.length)}
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Summary
            icon="checkmark-circle-outline"
            label="Available"
            value={String(
              rooms.filter((room) => room.status === "Available").length,
            )}
            green
            active={filter === "available"}
            onPress={() => setFilter("available")}
          />
          <Summary
            icon="radio-button-on-outline"
            label="Occupied"
            value={String(
              rooms.filter((room) => room.status === "Occupied").length,
            )}
            green
            active={filter === "occupied"}
            onPress={() => setFilter("occupied")}
          />
          <Summary
            icon="warning-outline"
            label="Attention"
            value={String(rooms.filter((room) => room.attention).length)}
            warning
            active={filter === "attention"}
            onPress={() => setFilter("attention")}
          />
        </View>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={17} color="#8a99a9" />
          <Text style={styles.searchText}>Search room number or tenant...</Text>
        </View>
        {filteredRooms.map((room) => (
          <View key={room.id} style={styles.roomCard}>
            <View style={styles.roomHeader}>
              <Text style={styles.roomName}>
                Room {room.number}{" "}
                <Text style={styles.roomType}>· {room.type}</Text>
              </Text>
              <Text
                style={[
                  styles.status,
                  room.status === "Available"
                    ? styles.available
                    : styles.occupied,
                ]}
              >
                {room.status === "Available" ? "● Available" : "● Occupied"}
              </Text>
            </View>
            <View style={styles.roomInfo}>
              <View>
                <Text style={styles.label}>TENANT</Text>
                <Text style={styles.tenant}>
                  {room.tenant || "Ready for Tenant"}
                </Text>
              </View>
              <View style={styles.rentBox}>
                <Text style={styles.label}>RENT</Text>
                <Text style={styles.rent}>
                  ₱{room.rent}
                  <Text style={styles.month}> /mo</Text>
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.roomAction,
                room.status === "Available" && styles.assignAction,
              ]}
            >
              <Ionicons
                name={
                  room.status === "Available"
                    ? "checkmark-circle-outline"
                    : "lock-closed-outline"
                }
                size={14}
                color={room.status === "Available" ? "#fff" : "#536783"}
              />
              <Text
                style={[
                  styles.roomActionText,
                  room.status === "Available" && styles.assignText,
                ]}
              >
                {room.status === "Available"
                  ? "Available · Approval assigns automatically"
                  : "Occupied · Assigned through approval"}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <LandlordNavigation active="Rooms" />
      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAddOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Add Room</Text>
              <Pressable onPress={() => setAddOpen(false)}>
                <Ionicons name="close" size={23} color="#536783" />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Room Number</Text>
            <TextInput
              style={styles.input}
              value={number}
              onChangeText={setNumber}
              placeholder="e.g. 305"
              keyboardType="number-pad"
            />
            <Text style={styles.inputLabel}>Room Type</Text>
            <TextInput
              style={styles.input}
              value={type}
              onChangeText={setType}
              placeholder="e.g. Single Room"
            />
            <Text style={styles.inputLabel}>Monthly Rent</Text>
            <TextInput
              style={styles.input}
              value={rent}
              onChangeText={setRent}
              placeholder="e.g. 5000"
              keyboardType="number-pad"
            />
            <Pressable style={styles.saveButton} onPress={addRoom}>
              <Text style={styles.saveText}>Add Room</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function Summary({
  icon,
  label,
  value,
  green,
  warning,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  green?: boolean;
  warning?: boolean;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.summaryItem, active && styles.summaryActive]}
    >
      <Ionicons
        name={icon}
        size={17}
        color={warning ? "#d98a00" : green ? "#12916a" : "#536783"}
      />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </Pressable>
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
              : index === 2
                ? router.push("/landlord/tenants" as any)
                : index === 3
                  ? router.push("/landlord/finance" as any)
                  : undefined
          }
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={index === 1 ? "#2864e8" : "#9aa8ba"}
          />
          <Text style={[styles.navText, index === 1 && styles.navActive]}>
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
    minHeight: 62,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e8edf2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 12,
  },
  headerTitle: { flex: 1 },
  kicker: { fontSize: 12, color: "#b65c43" },
  title: { fontSize: 17, fontWeight: "700", color: "#172033" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#173b36",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  content: { padding: 12, paddingBottom: 20 },
  overview: { fontSize: 15, fontWeight: "700", color: "#253149", marginTop: 4 },
  caption: { fontSize: 11, color: "#78879b", marginTop: 4 },
  summary: { flexDirection: "row", gap: 8, marginVertical: 12 },
  summaryItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 9,
    padding: 9,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    minHeight: 72,
  },
  summaryActive: {
    borderColor: "#2864e8",
    borderWidth: 2,
    backgroundColor: "#f2f6ff",
  },
  summaryLabel: { fontSize: 12, color: "#8390a2", marginTop: 5 },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#253149",
    marginTop: 3,
  },
  search: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    marginBottom: 10,
  },
  searchText: { fontSize: 12, color: "#9aa8ba" },
  roomCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    padding: 11,
    marginBottom: 9,
  },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomName: { fontSize: 12, fontWeight: "700", color: "#253149" },
  roomType: { fontSize: 11, fontWeight: "400", color: "#8390a2" },
  status: {
    fontSize: 11,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },
  available: { color: "#087f5b", backgroundColor: "#dff8ed" },
  occupied: { color: "#087f5b", backgroundColor: "#dff8ed" },
  roomInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 11,
  },
  label: { fontSize: 12, color: "#8d9aaa", marginBottom: 3 },
  tenant: { fontSize: 12, fontWeight: "600", color: "#253149" },
  rentBox: { alignItems: "flex-end" },
  rent: { fontSize: 13, fontWeight: "700", color: "#14795f" },
  month: { fontSize: 11, fontWeight: "400", color: "#71809a" },
  roomAction: {
    height: 32,
    borderRadius: 7,
    backgroundColor: "#eeeae7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  roomActionText: { fontSize: 12, color: "#394b61" },
  assignAction: { backgroundColor: "#173b36" },
  assignText: { color: "#fff" },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: { fontSize: 19, fontWeight: "700", color: "#172033" },
  inputLabel: { fontSize: 11, color: "#536783", marginBottom: 6, marginTop: 8 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#ccd7e4",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#172033",
  },
  saveButton: {
    height: 46,
    backgroundColor: "#2864e8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
