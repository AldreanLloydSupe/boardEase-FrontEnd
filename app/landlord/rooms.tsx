import { AppAlert as Alert } from "@/components/app-alert";
import { LandlordNavigation } from "@/components/landlord-navigation";
import { LandlordPageHeader } from "@/components/landlord-page-header";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { sharedImage } from "@/lib/image-data";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    where,
} from "firebase/firestore";
import React, { useState } from "react";
import {
    Animated,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [amenityInput, setAmenityInput] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
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
    setAmenities(room.amenities || []);
    setAmenityInput("");
    setImageUri(room.image || "");
    setModalOpen(true);
  };

  const openAddModal = () => {
    setEditingRoomId(null);
    setNumber("");
    setType("");
    setRent("");
    setGuidelines("");
    setAmenityInput("");
    setAmenities([]);
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
              const firestore = db;
              const ref = doc(firestore, "rooms", id);
              await runTransaction(firestore, async (tx) => {
                const room = await tx.get(ref);
                if (!room.exists()) return;
                if (
                  room.data().tenantId ||
                  String(room.data().status).toLowerCase() === "occupied"
                )
                  throw new Error(
                    "Move the tenant out before deleting an occupied room.",
                  );
                tx.delete(ref);
              });
              Alert.alert("Success", `Room ${roomNumber} has been deleted.`);
            } catch (error) {
              Alert.alert(
                "Could not delete room",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setImageUri(sharedImage(result.assets[0]));
      }
    } catch (error) {
      Alert.alert(
        "Unable to add photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  function addAmenity() {
    const amenity = amenityInput.trim();
    if (!amenity) return;
    setAmenities((current) =>
      current.some((item) => item.toLowerCase() === amenity.toLowerCase())
        ? current
        : [...current, amenity],
    );
    setAmenityInput("");
  }

  async function saveRoom() {
    if (isAddingRoom) return;
    if (!number.trim() || !type.trim() || !rent.trim()) {
      Alert.alert(
        "Missing details",
        "Enter the room number, type, and monthly rent.",
      );
      return;
    }
    const normalizedNumber = number.trim();
    const normalizedType = type.trim();
    const parsedRent = Number(rent.replace(/[^0-9.]/g, ""));
    if (
      !/^[A-Za-z0-9 -]{1,30}$/.test(normalizedNumber) ||
      !Number.isFinite(parsedRent) ||
      parsedRent <= 0
    ) {
      Alert.alert(
        "Invalid room details",
        "Enter a valid room number and a rent greater than zero.",
      );
      return;
    }
    const normalizedRent = String(parsedRent);
    const normalizedGuidelines = guidelines.trim();
    const pendingAmenity = amenityInput.trim();
    const normalizedAmenities = [...amenities];
    if (
      pendingAmenity &&
      !normalizedAmenities.some(
        (amenity) => amenity.toLowerCase() === pendingAmenity.toLowerCase(),
      )
    ) {
      normalizedAmenities.push(pendingAmenity);
    }

    if (
      rooms.some(
        (room) => room.number === normalizedNumber && room.id !== editingRoomId,
      )
    ) {
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
      amenities: normalizedAmenities,
      guidelines: normalizedGuidelines,
      image: imageUri,
    };

    setIsAddingRoom(true);

    try {
      if (db) {
        if (editingRoomId) {
          const matches = await getDocs(
            query(
              collection(db, "rooms"),
              where("number", "==", normalizedNumber),
            ),
          );
          if (matches.docs.some((room) => room.id !== editingRoomId))
            throw new Error("Another room already has this number.");
          const original = await getDoc(doc(db, "rooms", editingRoomId));
          if (!original.exists()) throw new Error("Room no longer exists.");
          if (String(original.data().number) !== normalizedNumber)
            throw new Error(
              "Room numbers cannot be changed. Create a new room instead.",
            );
          const { updateDoc } = await import("firebase/firestore");
          await updateDoc(doc(db, "rooms", editingRoomId), roomData);
          setRooms((current) =>
            current.map((r) =>
              r.id === editingRoomId ? { ...r, ...roomData } : r,
            ),
          );
          Alert.alert("Success", `Room ${number} updated.`);
        } else {
          const firestore = db;
          const matches = await getDocs(
            query(
              collection(firestore, "rooms"),
              where("number", "==", normalizedNumber),
            ),
          );
          if (!matches.empty)
            throw new Error(
              "This room number already exists. Refresh before adding another room.",
            );
          const saved = doc(firestore, "rooms", "room_" + normalizedNumber);
          await runTransaction(firestore, async (tx) => {
            if ((await tx.get(saved)).exists())
              throw new Error("This room was already created.");
            tx.set(saved, {
              ...roomData,
              status: "available",
              createdBy: user?.uid || "",
              createdAt: serverTimestamp(),
            });
          });
          setRooms((current) => [
            ...current,
            {
              ...roomData,
              id: saved.id,
              status: "Available" as const,
              attention: false,
            },
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
    } catch (error) {
      Alert.alert(
        "Unable to save room",
        error instanceof Error
          ? error.message
          : "Check your connection and try again.",
      );
    } finally {
      setIsAddingRoom(false);
    }
  }
  return (
    <SafeAreaView style={styles.page}>
      <LandlordPageHeader
        title="Rooms"
        rightAction={
          <Pressable style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={17} color="#fff" />
            <Text style={styles.addText}>Add Room</Text>
          </Pressable>
        }
      />
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
        <View style={styles.roomGrid}>
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
                <View style={styles.roomImageWrap}>
                  {room.image ? (
                    <Image
                      source={{ uri: room.image }}
                      style={styles.roomImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.roomImagePlaceholder}>
                      <Ionicons
                        name="image-outline"
                        size={25}
                        color="#7394d6"
                      />
                      <Text style={styles.placeholderText}>No room photo</Text>
                    </View>
                  )}
                  <View style={styles.roomImageActions}>
                    <Pressable
                      accessibilityLabel={`Edit room ${room.number}`}
                      onPress={() => openEditModal(room)}
                      style={styles.imageAction}
                    >
                      <Ionicons name="pencil" size={15} color="#2458c7" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Delete room ${room.number}`}
                      onPress={() => deleteRoom(room.id, room.number)}
                      style={styles.imageAction}
                    >
                      <Ionicons name="trash" size={15} color="#dc3545" />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.roomCardBody}>
                  <View style={styles.roomHeader}>
                    <View style={styles.roomHeading}>
                      <Text style={styles.roomName} numberOfLines={1}>
                        Room {room.number}
                      </Text>
                      <Text style={styles.roomType} numberOfLines={1}>
                        {room.type}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.status,
                        room.status === "Available"
                          ? styles.available
                          : styles.occupied,
                      ]}
                    >
                      {room.status === "Available" ? "Available" : "Occupied"}
                    </Text>
                  </View>
                  <View style={styles.roomInfo}>
                    <View style={styles.tenantInfo}>
                      <Text style={styles.label}>TENANT</Text>
                      <Text style={styles.tenant} numberOfLines={1}>
                        {room.tenant || "Ready for Tenant"}
                      </Text>
                    </View>
                    <View style={styles.rentBox}>
                      <Text style={styles.label}>RENT</Text>
                      <Text style={styles.rent} numberOfLines={1}>
                        ₱{room.rent}
                        <Text style={styles.month}>/mo</Text>
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
                      size={13}
                      color={
                        room.status === "Available" ? "#2458c7" : "#536783"
                      }
                    />
                    <Text
                      style={[
                        styles.roomActionText,
                        room.status === "Available" && styles.assignText,
                      ]}
                    >
                      {room.status === "Available"
                        ? "Available · Auto-assign"
                        : "Occupied · Assigned"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
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
              <Text style={styles.modalTitle}>
                {editingRoomId ? "Edit Room" : "Add Room"}
              </Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={23} color="#536783" />
              </Pressable>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.inputLabel}>Room Image</Text>
              {imageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imagePreview}
                  />
                  <Pressable
                    onPress={() => setImageUri("")}
                    style={styles.removeImageBtn}
                  >
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
              <View style={styles.amenityInputRow}>
                <TextInput
                  style={[styles.input, styles.amenityInput]}
                  value={amenityInput}
                  onChangeText={setAmenityInput}
                  onSubmitEditing={addAmenity}
                  returnKeyType="done"
                  placeholder="e.g. Wi-Fi, air conditioner"
                />
                <Pressable
                  style={styles.addAmenityButton}
                  onPress={addAmenity}
                  accessibilityRole="button"
                  accessibilityLabel="Add amenity"
                >
                  <Ionicons name="add" size={22} color="#fff" />
                  <Text style={styles.addAmenityText}>Add</Text>
                </Pressable>
              </View>
              <View style={styles.amenitiesContainer}>
                {amenities.map((amenity, index) => (
                  <Pressable
                    key={`${amenity}-${index}`}
                    style={styles.amenityChip}
                    onPress={() =>
                      setAmenities((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${amenity}`}
                  >
                    <Text style={styles.amenityChipText}>{amenity}</Text>
                    <Ionicons name="close" size={14} color="#526174" />
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[
                  styles.saveButton,
                  isAddingRoom && { backgroundColor: "#e0e0e0" },
                ]}
                onPress={saveRoom}
                disabled={isAddingRoom}
              >
                <Text
                  style={[
                    styles.saveText,
                    isAddingRoom && { color: "#9e9e9e" },
                  ]}
                >
                  {isAddingRoom
                    ? "Saving..."
                    : editingRoomId
                      ? "Save Changes"
                      : "Add Room"}
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
        Animated.timing(anim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [anim]);

  return (
    <View style={styles.roomCard}>
      <Animated.View style={[styles.skeletonImage, { opacity: anim }]} />
      <View style={styles.roomCardBody}>
        <View style={styles.roomHeader}>
          <View>
            <Animated.View
              style={{
                height: 14,
                width: 55,
                backgroundColor: "#e4ebf3",
                borderRadius: 4,
                opacity: anim,
              }}
            />
            <Animated.View
              style={{
                height: 10,
                width: 42,
                backgroundColor: "#e4ebf3",
                borderRadius: 4,
                marginTop: 5,
                opacity: anim,
              }}
            />
          </View>
          <Animated.View
            style={{
              height: 20,
              width: 48,
              backgroundColor: "#e4ebf3",
              borderRadius: 10,
              opacity: anim,
            }}
          />
        </View>
        <View style={styles.roomInfo}>
          <View>
            <Animated.View
              style={{
                height: 10,
                width: 36,
                backgroundColor: "#e4ebf3",
                borderRadius: 4,
                marginBottom: 6,
                opacity: anim,
              }}
            />
            <Animated.View
              style={{
                height: 12,
                width: 56,
                backgroundColor: "#e4ebf3",
                borderRadius: 4,
                opacity: anim,
              }}
            />
          </View>
          <View style={styles.rentBox}>
            <Animated.View
              style={{
                height: 10,
                width: 30,
                backgroundColor: "#e4ebf3",
                borderRadius: 4,
                marginBottom: 6,
                opacity: anim,
              }}
            />
            <Animated.View
              style={{
                height: 14,
                width: 45,
                backgroundColor: "#e4ebf3",
                borderRadius: 4,
                opacity: anim,
              }}
            />
          </View>
        </View>
        <Animated.View
          style={{
            height: 34,
            borderRadius: 7,
            backgroundColor: "#e4ebf3",
            opacity: anim,
          }}
        />
      </View>
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
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor: warning
              ? "#fff5d6"
              : green
                ? "#e8f8f1"
                : "#eaf1ff",
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={17}
          color={warning ? "#d98a00" : green ? "#12916a" : "#2864e8"}
        />
      </View>
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
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  header: {
    minHeight: 92,
    backgroundColor: "#2864e8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1,
  },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontSize: 11,
    color: "#d9e5ff",
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 2 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  content: { padding: 16, paddingBottom: 24 },
  overview: { fontSize: 16, fontWeight: "700", color: "#253149", marginTop: 4 },
  caption: { fontSize: 11, color: "#78879b", marginTop: 4, marginBottom: 2 },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 12,
  },
  summaryItem: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e1eafa",
    minHeight: 92,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryActive: {
    borderColor: "#2864e8",
    backgroundColor: "#f5f8ff",
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: { fontSize: 11, color: "#64748b", marginTop: 7 },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#253149",
    marginTop: 2,
  },
  search: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dce7f5",
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    marginBottom: 12,
  },
  searchText: { fontSize: 12, color: "#9aa8ba" },
  roomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  roomCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    overflow: "hidden",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  roomImageWrap: { position: "relative" },
  roomImage: { width: "100%", aspectRatio: 1.4 },
  roomImagePlaceholder: {
    width: "100%",
    aspectRatio: 1.4,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  placeholderText: { fontSize: 10, color: "#647da9", fontWeight: "600" },
  skeletonImage: {
    width: "100%",
    aspectRatio: 1.4,
    backgroundColor: "#e4ebf3",
  },
  roomImageActions: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
  },
  imageAction: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  roomCardBody: { padding: 11 },
  roomHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 5,
  },
  roomHeading: { flex: 1, minWidth: 0 },
  roomName: { fontSize: 13, fontWeight: "700", color: "#253149" },
  roomType: { fontSize: 10, fontWeight: "400", color: "#8390a2", marginTop: 2 },
  status: {
    fontSize: 9,
    fontWeight: "700",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    flexShrink: 0,
  },
  available: { color: "#087f5b", backgroundColor: "#e8f8f1" },
  occupied: { color: "#2458c7", backgroundColor: "#eaf1ff" },
  roomInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 6,
    marginTop: 12,
    marginBottom: 10,
  },
  tenantInfo: { flex: 1, minWidth: 0 },
  label: { fontSize: 9, color: "#8d9aaa", marginBottom: 3, fontWeight: "600" },
  tenant: { fontSize: 10, fontWeight: "600", color: "#253149" },
  rentBox: { alignItems: "flex-end", flexShrink: 0 },
  rent: { fontSize: 12, fontWeight: "700", color: "#2458c7" },
  month: { fontSize: 9, fontWeight: "400", color: "#71809a" },
  roomAction: {
    minHeight: 34,
    borderRadius: 7,
    backgroundColor: "#f3f7fd",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  roomActionText: {
    flexShrink: 1,
    fontSize: 9,
    color: "#394b61",
    textAlign: "center",
  },
  assignAction: { backgroundColor: "#eaf1ff" },
  assignText: { color: "#2458c7" },
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
  amenityInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  amenityInput: { flex: 1, minWidth: 0 },
  addAmenityButton: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: "#2864e8",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addAmenityText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f4f7fb",
    borderWidth: 1,
    borderColor: "#e4e9f0",
  },
  amenityChipText: {
    fontSize: 12,
    color: "#526174",
    fontWeight: "500",
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
