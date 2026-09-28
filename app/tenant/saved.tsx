import { TenantHeaderMark } from "@/components/tenant-header-mark";
import {
    ApplicantTenantNav,
    AssignedTenantNav,
} from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { getFavoriteRooms, setFavoriteRooms } from "@/lib/favorite-rooms";
import { db } from "@/lib/firebase";
import { roomFromFirestore, roomKey, type TenantRoom } from "@/lib/room-data";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import React from "react";
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SavedRooms() {
  const { hasRoom, user } = useAuth();
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [rooms, setRooms] = React.useState<TenantRoom[]>([]);

  React.useEffect(() => {
    if (user?.uid) {
      getFavoriteRooms(user.uid)
        .then(setFavorites)
        .catch(() => undefined);
    }
  }, [user?.uid]);

  React.useEffect(() => {
    if (!db) {
      return;
    }
    return onSnapshot(
      collection(db, "rooms"),
      (snapshot) =>
        setRooms(
          snapshot.docs.map((item) => roomFromFirestore(item.id, item.data())),
        ),
      () => setRooms([]),
    );
  }, []);

  async function removeFavorite(number: string) {
    if (!user?.uid) return;
    const next = favorites.filter((item) => item !== number);
    setFavorites(next);
    await setFavoriteRooms(user.uid, next);
  }

  const saved = rooms.filter((room) => favorites.includes(room.number));
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color="#fff" />
          </Pressable>
          <View style={styles.headerTitleGroup}>
            <TenantHeaderMark />
            <Text style={styles.title}>Saved Rooms</Text>
          </View>
          <View style={{ width: 21 }} />
        </View>
        {saved.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={38} color="#8ea4c7" />
            <Text style={styles.emptyTitle}>No saved rooms yet</Text>
            <Text style={styles.emptyText}>
              Tap the heart on a room to save it here.
            </Text>
            <Pressable
              style={styles.browse}
              onPress={() =>
                router.replace(
                  (hasRoom
                    ? "/tenant/tenant-home"
                    : "/tenant/room-browser") as any,
                )
              }
            >
              <Text style={styles.browseText}>
                {hasRoom ? "Go to Dashboard" : "Browse Rooms"}
              </Text>
            </Pressable>
          </View>
        ) : (
          saved.map((room) => (
            <View style={styles.card} key={roomKey(room)}>
              <Image source={{ uri: room.image }} style={styles.image} />
              <Pressable
                style={styles.remove}
                onPress={() => removeFavorite(room.number)}
              >
                <Ionicons name="heart" size={20} color="#e45862" />
              </Pressable>
              <Text
                style={styles.room}
              >{`Room ${room.number} - ${room.type}`}</Text>
              <Text style={styles.price}>
                ₱{room.price}
                <Text style={styles.month}> /month</Text>
              </Text>
              <Pressable
                style={styles.button}
                onPress={() =>
                  router.push({
                    pathname: "/tenant/room-details",
                    params: room,
                  } as any)
                }
              >
                <Text style={styles.buttonText}>View Details & Apply →</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
      {hasRoom ? (
        <AssignedTenantNav active="Home" />
      ) : (
        <ApplicantTenantNav active="Saved" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  content: { padding: 14, paddingBottom: 90 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -14,
    marginHorizontal: -14,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerTitleGroup: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  empty: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e1eafa",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
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
    marginTop: 6,
    textAlign: "center",
  },
  browse: {
    backgroundColor: "#2864e8",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 18,
  },
  browseText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e1eafa",
    position: "relative",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  image: { width: "100%", height: 150, borderRadius: 8 },
  remove: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  room: { fontSize: 14, fontWeight: "700", color: "#253149", marginTop: 10 },
  price: { color: "#2864e8", fontSize: 15, fontWeight: "700", marginTop: 5 },
  month: { fontSize: 11, fontWeight: "400", color: "#8390a2" },
  button: {
    height: 36,
    backgroundColor: "#2864e8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
