import { TenantHeaderMark } from "@/components/tenant-header-mark";
import { ApplicantTenantNav } from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { getFavoriteRooms, setFavoriteRooms } from "@/lib/favorite-rooms";
import { db } from "@/lib/firebase";
import { roomFromFirestore, roomKey, type TenantRoom } from "@/lib/room-data";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
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
  const { user, signOut } = useAuth();
  const [search, setSearch] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState(filters[0]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [rooms, setRooms] = React.useState<TenantRoom[]>([]);
  const [applications, setApplications] = React.useState<any[]>([]);
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

  React.useEffect(() => {
    if (!db || !user) return;
    const q = query(
      collection(db, "applications"),
      where("tenantId", "==", user.uid)
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const apps = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setApplications(apps);
      }
    );
  }, [user]);

  async function toggleFavorite(number: string) {
    if (!user?.uid) return;
    const next = favorites.includes(number)
      ? favorites.filter((item) => item !== number)
      : [...favorites, number];
    setFavorites(next);
    await setFavoriteRooms(user.uid, next);
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
        <View style={styles.headerTop}>
          <View style={styles.headerIdentity}>
            <TenantHeaderMark />
            <View style={styles.headerCopy}>
              <Text style={styles.kicker}>BOARDEASE</Text>
              <Text style={styles.title}>Find your next room</Text>
            </View>
          </View>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </Pressable>
        </View>
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

          {isLoadingRooms ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : visibleRooms.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={48} color="#2864e8" />
              </View>
              <Text style={styles.emptyTitle}>No rooms found</Text>
              <Text style={styles.emptyText}>We couldn't find any rooms matching your search criteria. Try adjusting your filters.</Text>
            </View>
          ) : (
            visibleRooms.map((room) => {
              const hasApplied = applications.some((app) => app.roomNumber === room.number && (!app.status || app.status === "pending"));
              return (
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
                  
                  <Pressable
                    style={[
                      styles.viewButton,
                      (loadingRoom === room.number || hasApplied) && styles.viewButtonDisabled
                    ]}
                    onPress={() => handleViewRoom(room)}
                    disabled={loadingRoom !== null}
                  >
                    <Text style={[
                      styles.viewText,
                      (loadingRoom === room.number || hasApplied) && styles.viewTextDisabled
                    ]}>
                      {loadingRoom === room.number ? "Loading..." : hasApplied ? "View Details (Applied) →" : "View Details & Apply →"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )})
          )}
        </ScrollView>
      </View>
      <ApplicantTenantNav active="Rooms" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7fb" },
  header: {
    backgroundColor: "#2864e8",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  kicker: { color: "#d9e5ff", fontSize: 13, fontWeight: "700", letterSpacing: 1.5, marginBottom: 4 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  headerIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 11 },
  headerCopy: { flex: 1, minWidth: 0 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 26, fontWeight: "800", color: "#fff" },
  logoutButton: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
  },
  search: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginTop: 20,
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
  caption: { fontSize: 13, color: "#78879b", marginBottom: 12, fontWeight: "500" },
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
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 16,
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
  roomImage: { width: "100%", height: 180 },
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
  roomContent: { padding: 16 },
  roomHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roomTitle: { fontSize: 16, fontWeight: "700", color: "#172033" },
  availableBadge: {
    backgroundColor: "#e6f8ef",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  available: {
    color: "#109968",
    fontSize: 12,
    fontWeight: "600",
  },
  price: { color: "#2864e8", fontSize: 22, fontWeight: "800", marginTop: 8 },
  month: { fontSize: 14, fontWeight: "500", color: "#8390a2" },
  tags: { flexDirection: "row", gap: 8, marginVertical: 12, flexWrap: "wrap" },
  tag: { 
    fontSize: 12, 
    color: "#526174", 
    backgroundColor: "#f4f7fb", 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "500" 
  },
  viewButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#2864e8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  viewText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  viewButtonDisabled: {
    backgroundColor: "#cbd5e1",
    shadowOpacity: 0,
    elevation: 0,
  },
  viewTextDisabled: {
    color: "#64748b",
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
