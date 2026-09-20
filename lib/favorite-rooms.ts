import AsyncStorage from "@react-native-async-storage/async-storage";

const FAVORITES_KEY = "boardease-favorite-rooms";

export async function getFavoriteRooms() {
  const saved = await AsyncStorage.getItem(FAVORITES_KEY);
  return saved ? (JSON.parse(saved) as string[]) : [];
}

export async function setFavoriteRooms(roomNumbers: string[]) {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(roomNumbers));
}
