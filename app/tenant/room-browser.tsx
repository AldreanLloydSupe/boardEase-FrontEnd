import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot } from "firebase/firestore";
import { getFavoriteRooms, setFavoriteRooms } from "@/lib/favorite-rooms";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { roomFromFirestore, roomKey, type TenantRoom } from "@/lib/room-data";
import { ApplicantTenantNav } from "@/components/tenant-navigation";

const filters = ["All Rooms", "Twin Sharing", "Single Occupancy"];

export default function RoomBrowser() {
  const { signOut } = useAuth();
  const [search, setSearch] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState(filters[0]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [rooms, setRooms] = React.useState<TenantRoom[]>([]);

  React.useEffect(() => {
    if (!db) {
      return;
    }
    return onSnapshot(
      collection(db, "rooms"),
      (snapshot) => {
        setRooms(
          snapshot.docs
            .map((item) => roomFromFirestore(item.id, item.data()))
            .filter((room) => room.status === "available"),
        );
      },
      () => setRooms([]),
    );
  }, []);

  React.useEffect(() => {
    getFavoriteRooms()
      .then(setFavorites)
      .catch(() => undefined);
  }, []);

  async function toggleFavorite(number: string) {
    const next = favorites.includes(number)
      ? favorites.filter((item) => item !== number)
      : [...favorites, number];
    setFavorites(next);
    await setFavoriteRooms(next);
  }

  async function logout() {
    await signOut();
    router.replace("/login");
  }

  const visibleRooms = rooms.filter((room) => {
    const matchesFilter =
      selectedFilter === "All Rooms" || room.type === selectedFilter;
    const text =
      `${room.number} ${room.type} ${room.amenities.join(" ")}`.toLowerCase();
    return matchesFilter && text.includes(search.trim().toLowerCase());
  });

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.kicker}>BOARDEASE</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Find your next room</Text>
          <Pressable onPress={logout}>
            <Ionicons name="log-out-outline" size={19} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={17} color="#8ea4c7" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search rooms, amenities, floors..."
            placeholderTextColor="#8ea4c7"
            style={styles.searchInput}
          />
          <Ionicons name="options-outline" size={16} color="#8ea4c7" />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.caption}>
          24/7 CCTV & Biometrics · Free Water Dispenser · Study Area
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {filters.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setSelectedFilter(filter)}
              style={
                selectedFilter === filter ? styles.activeFilter : styles.filter
              }
            >
              <Text
                style={
                  selectedFilter === filter
                    ? styles.activeFilterText
                    : styles.filterText
                }
              >
                {filter}
                {filter === "All Rooms" ? ` (${rooms.length})` : ""}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {visibleRooms.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={30} color="#8ea4c7" />
            <Text style={styles.emptyText}>No rooms match your search.</Text>
          </View>
        ) : (
          visibleRooms.map((room) => (
            <View style={styles.card} key={roomKey(room)}>
              <View style={styles.imageWrap}>
                <Image source={{ uri: room.image }} style={styles.roomImage} />
                <Pressable
                  accessibilityLabel={`Save Room ${room.number}`}
                  style={styles.heartButton}
                  onPress={() => toggleFavorite(room.number)}
                >
                  <Ionicons
                    name={
                      favorites.includes(room.number)
                        ? "heart"
                        : "heart-outline"
                    }
                    size={20}
                    color={
                      favorites.includes(room.number) ? "#e45862" : "#253149"
                    }
                  />
                </Pressable>
              </View>
              <View style={styles.roomHead}>
                <Text style={styles.roomTitle}>
                  Room {room.number} - {room.type}
                </Text>
                <Text style={styles.available}>Available</Text>
              </View>
              <Text style={styles.price}>
                ₱{room.price}
                <Text style={styles.month}> /month</Text>
              </Text>
              <View style={styles.tags}>
                {room.amenities.map((amenity) => (
                  <Text style={styles.tag} key={amenity}>
                    {amenity}
                  </Text>
                ))}
              </View>
              <Pressable
                style={styles.viewButton}
                onPress={() =>
                  router.push({
                    pathname: "/tenant/room-details",
                    params: {
                      number: room.number,
                      type: room.type,
                      price: room.price,
                      image: room.image,
                    },
                  } as any)
                }
              >
                <Text style={styles.viewText}>View Details & Apply →</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
      <ApplicantTenantNav active="Rooms" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  header: {
    backgroundColor: "#2864e8",
    paddingHorizontal: 15,
    paddingTop: 6,
    paddingBottom: 15,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  kicker: { color: "#d9e5ff", fontSize: 12 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  search: {
    height: 38,
    backgroundColor: "#fff",
    borderRadius: 9,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 10,
  },
  searchInput: { flex: 1, color: "#253149", fontSize: 12, paddingVertical: 0 },
  content: { padding: 12, paddingBottom: 20 },
  caption: { fontSize: 11, color: "#78879b", marginVertical: 5 },
  filters: { flexDirection: "row", gap: 7, paddingVertical: 4 },
  activeFilter: {
    backgroundColor: "#2864e8",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filter: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e9f0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeFilterText: { color: "#fff", fontSize: 11 },
  filterText: { color: "#71809a", fontSize: 11 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 9,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#e6ebf2",
  },
  imageWrap: { position: "relative" },
  roomImage: { width: "100%", height: 142, borderRadius: 8 },
  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  roomHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  roomTitle: { fontSize: 11, fontWeight: "700", color: "#253149" },
  available: {
    color: "#14805f",
    backgroundColor: "#d9f7e8",
    borderRadius: 9,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 12,
  },
  price: { color: "#2864e8", fontSize: 15, fontWeight: "700", marginTop: 5 },
  month: { fontSize: 11, fontWeight: "400", color: "#8390a2" },
  tags: { flexDirection: "row", gap: 6, marginVertical: 7, flexWrap: "wrap" },
  tag: { fontSize: 11, color: "#526174" },
  viewButton: {
    height: 33,
    borderRadius: 7,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  viewText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 30,
    alignItems: "center",
    marginTop: 12,
  },
  emptyText: { color: "#71809a", fontSize: 12, marginTop: 8 },
  nav: {
    height: 65,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },
  navItem: { alignItems: "center", gap: 3 },
  navText: { fontSize: 11, color: "#a0aabd" },
  navActive: { color: "#2864e8" },
});
