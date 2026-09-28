import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getFavoriteRooms(userId: string) {
  if (!userId) return [];
  const key = `boardease-favorite-rooms-${userId}`;
  const saved = await AsyncStorage.getItem(key);
  return saved ? (JSON.parse(saved) as string[]) : [];
}

export async function setFavoriteRooms(userId: string, roomNumbers: string[]) {
  if (!userId) return;
  const key = `boardease-favorite-rooms-${userId}`;
  await AsyncStorage.setItem(key, JSON.stringify(roomNumbers));
}
