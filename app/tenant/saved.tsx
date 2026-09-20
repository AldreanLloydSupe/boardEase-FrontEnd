import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { collection, onSnapshot } from "firebase/firestore";
import { getFavoriteRooms, setFavoriteRooms } from "@/lib/favorite-rooms";
import { db } from "@/lib/firebase";
import { roomFromFirestore, roomKey, type TenantRoom } from "@/lib/room-data";
import { useAuth } from "@/lib/auth-context";
import {
  ApplicantTenantNav,
  AssignedTenantNav,
} from "@/components/tenant-navigation";

export default function SavedRooms() {
  const { hasRoom } = useAuth();
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [rooms, setRooms] = React.useState<TenantRoom[]>([]);

  React.useEffect(() => {
    getFavoriteRooms()
      .then(setFavorites)
      .catch(() => undefined);
  }, []);

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
    const next = favorites.filter((item) => item !== number);
    setFavorites(next);
    await setFavoriteRooms(next);
  }

  const saved = rooms.filter((room) => favorites.includes(room.number));
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color="#253149" />
          </Pressable>
          <Text style={styles.title}>Saved Rooms</Text>
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
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 14, paddingBottom: 90 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#172033" },
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
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    position: "relative",
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
