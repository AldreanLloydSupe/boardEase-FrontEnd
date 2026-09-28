import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LandlordNavigation } from "@/components/landlord-navigation";
import React, { useState } from "react";
import {
  Animated,
  Alert,
  Modal,
  Image,
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
  amenities?: string[];
  guidelines?: string;
  image?: string;
};

const AMENITIES = [
  "WiFi",
  "Aircon",
  "Private Bath",
  "Balcony",
  "Study Desk",
  "Water Dispenser",
];

export default function Rooms() {
  const { user } = useAuth();
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  
  const [number, setNumber] = useState("");
  const [type, setType] = useState("");
  const [rent, setRent] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState("");
  
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
            amenities: item.data().amenities || [],
            guidelines: item.data().guidelines || "",
            image: item.data().image || "",
          })),
        );
        setIsLoadingRooms(false);
      },
      () => {
        setRooms([]);
        setIsLoadingRooms(false);
      },
    );
  }, []);
  const filteredRooms = rooms.filter(
    (room) =>
      filter === "all" ||
      (filter === "attention"
        ? room.attention
        : room.status.toLowerCase() === filter),
  );
  const openEditModal = (room: Room) => {
    setEditingRoomId(room.id);
    setNumber(room.number);
    setType(room.type);
    setRent(room.rent);
    setGuidelines(room.guidelines || "");
    setSelectedAmenities(room.amenities || []);
    setImageUri(room.image || "");
    setModalOpen(true);
  };

  const openAddModal = () => {
    setEditingRoomId(null);
    setNumber("");
    setType("");
    setRent("");
    setGuidelines("");
    setSelectedAmenities([]);
    setImageUri("");
    setModalOpen(true);
  };

  const deleteRoom = (id: string, roomNumber: string) => {
    Alert.alert(
      "Delete Room",
      `Are you sure you want to delete Room ${roomNumber}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!db) return;
              const { doc, deleteDoc } = await import("firebase/firestore");
              await deleteDoc(doc(db, "rooms", id));
              Alert.alert("Success", `Room ${roomNumber} has been deleted.`);
            } catch (error) {
              Alert.alert("Error", "Could not delete room. Please try again.");
            }
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  async function saveRoom() {
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
    const normalizedGuidelines = guidelines.trim();
    
    if (!editingRoomId && rooms.some((room) => room.number === normalizedNumber)) {
      Alert.alert(
        "Room already exists",
        `Room ${normalizedNumber} is already listed.`,
      );
      return;
    }
    
    const roomData = {
      number: normalizedNumber,
      type: normalizedType,
      rent: normalizedRent,
      price: normalizedRent,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : [],
      guidelines: normalizedGuidelines,
      image: imageUri,
    };
    
    setIsAddingRoom(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    try {
      if (db) {
        if (editingRoomId) {
          const { doc, updateDoc } = await import("firebase/firestore");
          await updateDoc(doc(db, "rooms", editingRoomId), roomData);
          setRooms((current) => current.map(r => r.id === editingRoomId ? { ...r, ...roomData } : r));
          Alert.alert("Success", `Room ${number} updated.`);
        } else {
          const saved = await addDoc(collection(db, "rooms"), {
            ...roomData,
            status: "Available" as const,
            createdBy: user?.uid ?? null,
            createdAt: serverTimestamp(),
          });
          setRooms((current) => [
            ...current,
            { ...roomData, id: saved.id, status: "Available" as const, attention: false },
          ]);
          Alert.alert("Room added", `Room ${number} is now available.`);
        }
      } else {
        Alert.alert(
          "Firebase unavailable",
          "Connect Firebase before saving rooms.",
        );
        return;
      }
      setModalOpen(false);
    } catch {
      Alert.alert(
        "Unable to save room",
        "Check your Firebase connection and try again.",
      );
    } finally {
      setIsAddingRoom(false);
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
        <Pressable style={styles.addButton} onPress={openAddModal}>
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
        {isLoadingRooms ? (
          <>
            <SkeletonRoomCard />
            <SkeletonRoomCard />
            <SkeletonRoomCard />
            <SkeletonRoomCard />
          </>
        ) : (
          filteredRooms.map((room) => (
            <View key={room.id} style={styles.roomCard}>
            <View style={styles.roomHeader}>
              <View>
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
              <View style={styles.actionButtons}>
                <Pressable onPress={() => openEditModal(room)} style={styles.editButton}>
                   <Ionicons name="pencil" size={16} color="#8a99a9" />
                </Pressable>
                <Pressable onPress={() => deleteRoom(room.id, room.number)} style={styles.editButton}>
                   <Ionicons name="trash" size={16} color="#ff3b30" />
                </Pressable>
              </View>
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
          ))
        )}
      </ScrollView>
      <LandlordNavigation active="Rooms" />
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>{editingRoomId ? "Edit Room" : "Add Room"}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={23} color="#536783" />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            
            <Text style={styles.inputLabel}>Room Image</Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <Pressable onPress={() => setImageUri("")} style={styles.removeImageBtn}>
                  <Ionicons name="close-circle" size={24} color="#ff3b30" />
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.imagePickerBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={24} color="#2864e8" />
                <Text style={styles.imagePickerText}>Upload Image</Text>
              </Pressable>
            )}
            
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
            <Text style={styles.inputLabel}>Room Guidelines (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={guidelines}
              onChangeText={setGuidelines}
              placeholder="e.g. No smoking, No pets allowed"
              multiline
              numberOfLines={3}
            />
            <Text style={styles.inputLabel}>Amenities</Text>
            <View style={styles.amenitiesContainer}>
              {AMENITIES.map((amenity) => (
                <Pressable
                  key={amenity}
                  style={[
                    styles.amenityChip,
                    selectedAmenities.includes(amenity) && styles.amenityChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedAmenities((prev) =>
                      prev.includes(amenity)
                        ? prev.filter((a) => a !== amenity)
                        : [...prev, amenity]
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.amenityChipText,
                      selectedAmenities.includes(amenity) &&
                        styles.amenityChipTextSelected,
                    ]}
                  >
                    {amenity}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable 
              style={[styles.saveButton, isAddingRoom && { backgroundColor: '#e0e0e0' }]} 
              onPress={saveRoom}
              disabled={isAddingRoom}
            >
              <Text style={[styles.saveText, isAddingRoom && { color: '#9e9e9e' }]}>
                {isAddingRoom ? "Saving..." : editingRoomId ? "Save Changes" : "Add Room"}
              </Text>
            </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SkeletonRoomCard = () => {
  const anim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <View style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <Animated.View style={{ height: 16, width: 100, backgroundColor: '#e4ebf3', borderRadius: 4, opacity: anim }} />
        <Animated.View style={{ height: 20, width: 70, backgroundColor: '#e4ebf3', borderRadius: 10, opacity: anim }} />
      </View>
      <View style={styles.roomInfo}>
        <View>
          <Animated.View style={{ height: 12, width: 50, backgroundColor: '#e4ebf3', borderRadius: 4, marginBottom: 6, opacity: anim }} />
          <Animated.View style={{ height: 14, width: 80, backgroundColor: '#e4ebf3', borderRadius: 4, opacity: anim }} />
        </View>
        <View style={styles.rentBox}>
          <Animated.View style={{ height: 12, width: 40, backgroundColor: '#e4ebf3', borderRadius: 4, marginBottom: 6, opacity: anim }} />
          <Animated.View style={{ height: 16, width: 70, backgroundColor: '#e4ebf3', borderRadius: 4, opacity: anim }} />
        </View>
      </View>
      <Animated.View style={{ height: 32, borderRadius: 7, backgroundColor: '#e4ebf3', opacity: anim }} />
    </View>
  );
};

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
  actionButtons: {
    flexDirection: "row",
    gap: 8,
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "#e4e9f0",
  },
  amenityChipSelected: {
    backgroundColor: "#2864e8",
    borderColor: "#2864e8",
  },
  amenityChipText: {
    fontSize: 12,
    color: "#526174",
    fontWeight: "500",
  },
  amenityChipTextSelected: {
    color: "#fff",
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
  editButton: {
    padding: 6,
    backgroundColor: "#f4f7fb",
    borderRadius: 8,
  },
  imagePickerBtn: {
    height: 100,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#ccd7e4",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7fb",
    marginBottom: 8,
  },
  imagePickerText: {
    color: "#536783",
    fontSize: 12,
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: "relative",
    height: 140,
    width: "100%",
    borderRadius: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageBtn: {
    position: "absolute",
    top: -10,
    right: -10,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
});
