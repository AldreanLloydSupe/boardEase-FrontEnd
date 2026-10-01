import { TenantPageHeader } from "@/components/tenant-page-header";
import { ApplicantTenantNav } from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { getFavoriteRooms, setFavoriteRooms } from "@/lib/favorite-rooms";
import { db } from "@/lib/firebase";
import { roomFromFirestore, roomKey, type TenantRoom } from "@/lib/room-data";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const filters = ["All Rooms", "Twin Sharing", "Single Occupancy"];

const SkeletonCard = () => {
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
      ])
    ).start();
  }, [anim]);

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.roomImage, { backgroundColor: '#e4ebf3', opacity: anim }]} />
      <View style={styles.roomContent}>
        <View style={styles.roomHead}>
          <Animated.View style={{ height: 20, width: 140, backgroundColor: '#e4ebf3', borderRadius: 4, opacity: anim }} />
          <Animated.View style={{ height: 24, width: 70, backgroundColor: '#e4ebf3', borderRadius: 12, opacity: anim }} />
        </View>
        <Animated.View style={{ height: 28, width: 110, backgroundColor: '#e4ebf3', borderRadius: 4, marginTop: 12, opacity: anim }} />
        <View style={styles.tags}>
          <Animated.View style={{ height: 26, width: 80, backgroundColor: '#e4ebf3', borderRadius: 8, opacity: anim }} />
          <Animated.View style={{ height: 26, width: 100, backgroundColor: '#e4ebf3', borderRadius: 8, opacity: anim }} />
        </View>
        <Animated.View style={{ height: 46, borderRadius: 12, backgroundColor: '#e4ebf3', marginTop: 8, opacity: anim }} />
      </View>
    </View>
  );
};

export default function RoomBrowser() {
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState(filters[0]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [rooms, setRooms] = React.useState<TenantRoom[]>([]);
  const [loadingRoom, setLoadingRoom] = React.useState<string | null>(null);
  const [isLoadingRooms, setIsLoadingRooms] = React.useState(true);

  const handleViewRoom = (room: TenantRoom) => {
    if (loadingRoom) return;
    setLoadingRoom(room.number);
    setTimeout(() => {
      router.push({
        pathname: "/tenant/room-details",
        params: {
          number: room.number,
          type: room.type,
          price: room.price,
          image: room.image,
        },
      } as any);
      setLoadingRoom(null);
    }, 400);
  };

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
        setIsLoadingRooms(false);
      },
      () => {
        setRooms([]);
        setIsLoadingRooms(false);
      },
    );
  }, []);

  React.useEffect(() => {
    if (user?.uid) {
      getFavoriteRooms(user.uid)
        .then(setFavorites)
        .catch(() => undefined);
    }
  }, [user?.uid]);

  async function toggleFavorite(number: string) {
    if (!user?.uid) return;
    const next = favorites.includes(number)
      ? favorites.filter((item) => item !== number)
      : [...favorites, number];
    setFavorites(next);
    await setFavoriteRooms(user.uid, next);
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
      <TenantPageHeader title="Find your next room" backHref="/tenant/account" />
      <View style={styles.searchContainer}>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color="#8ea4c7" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search rooms, amenities, floors..."
            placeholderTextColor="#8ea4c7"
            style={styles.searchInput}
          />
          <Ionicons name="options-outline" size={20} color="#8ea4c7" />
        </View>
      </View>
      
      <View style={styles.mainContainer}>
        <ScrollView contentContainerStyle={styles.content}>
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

          {isLoadingRooms ? (
            <View style={styles.roomsGrid}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : visibleRooms.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={48} color="#2864e8" />
              </View>
              <Text style={styles.emptyTitle}>No rooms found</Text>
              <Text style={styles.emptyText}>We couldn't find any rooms matching your search criteria. Try adjusting your filters.</Text>
            </View>
          ) : (
            <View style={styles.roomsGrid}>
            {visibleRooms.map((room) => {
              return (
              <Pressable
                style={styles.card}
                key={roomKey(room)}
                onPress={() => handleViewRoom(room)}
                disabled={loadingRoom !== null}
                accessibilityRole="button"
                accessibilityLabel={`View details for Room ${room.number}`}
              >
                <View style={styles.imageWrap}>
                  {room.image ? (
                    <Image source={{ uri: room.image }} style={styles.roomImage} />
                  ) : null}
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
                
                <View style={styles.roomContent}>
                  <View style={styles.roomHead}>
                    <Text style={styles.roomTitle}>
                      Room {room.number} - {room.type}
                    </Text>
                    <View style={styles.availableBadge}>
                      <Text style={styles.available}>Available</Text>
                    </View>
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
                  
                </View>
              </Pressable>
            )})}
            </View>
          )}
        </ScrollView>
      </View>
      <ApplicantTenantNav active="Rooms" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7fb" },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: { flex: 1, color: "#172033", fontSize: 15, paddingVertical: 0 },
  mainContainer: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  roomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  filters: { flexDirection: "row", gap: 10, paddingVertical: 6, marginBottom: 16 },
  activeFilter: {
    backgroundColor: "#2864e8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#2864e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  filter: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e9f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  activeFilterText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  filterText: { color: "#71809a", fontSize: 14, fontWeight: "500" },
  card: {
    width: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e6ebf2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  imageWrap: { position: "relative" },
  roomImage: { width: "100%", height: 120 },
  heartButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomContent: { padding: 10 },
  roomHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomTitle: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: "700", color: "#172033" },
  availableBadge: {
    backgroundColor: "#e6f8ef",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  available: {
    color: "#109968",
    fontSize: 10,
    fontWeight: "600",
  },
  price: { color: "#2864e8", fontSize: 19, fontWeight: "800", marginTop: 8 },
  month: { fontSize: 11, fontWeight: "500", color: "#8390a2" },
  tags: { flexDirection: "row", gap: 5, marginVertical: 10, flexWrap: "wrap" },
  tag: {
    fontSize: 10,
    color: "#526174",
    backgroundColor: "#f4f7fb",
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "500"
  },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 40,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#eff4ff",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#172033", marginBottom: 8 },
  emptyText: { color: "#71809a", fontSize: 14, textAlign: "center", lineHeight: 22 },
});
