import { AppAlert as Alert } from "@/components/app-alert";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notification-data";
import { vacateTenantRoom } from "@/lib/room-vacate";
import { Ionicons } from "@expo/vector-icons";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Pressable, StyleSheet, Text, View } from "react-native";
export function TenantManagement({
  selectedTenant,
  onDone,
}: {
  selectedTenant: any;
  onDone: () => void;
}) {
  const setSelectedTenant = (_value: null) => onDone();
  return (
    <View style={styles.dangerZone}>
      <Text style={styles.dangerTitle}>Landlord Actions</Text>

      <Pressable
        style={[styles.evictBtn, { marginBottom: 12 }]}
        onPress={() => {
          Alert.alert(
            "Remove tenant from room?",
            `This will immediately remove ${selectedTenant.name} from their rented room. Continue?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Remove Tenant",
                style: "destructive",
                onPress: async () => {
                  try {
                    const tenantId =
                      selectedTenant.id || selectedTenant.raw?.id;
                    const roomNumber =
                      selectedTenant.raw?.roomNumber ||
                      selectedTenant.raw?.roomId ||
                      "";
                    if (!tenantId) {
                      throw new Error(
                        "This tenant record is missing a user id.",
                      );
                    }
                    await vacateTenantRoom(tenantId, roomNumber);
                    await createNotification(tenantId, {
                      type: "room_update",
                      title: "Room assignment removed",
                      body: roomNumber
                        ? `Your room assignment for Room ${roomNumber} was removed by the landlord.`
                        : "Your room assignment was removed by the landlord.",
                      route: "/tenant/account",
                    });
                    Alert.alert(
                      "Tenant removed",
                      "The tenant was successfully removed from the room.",
                    );
                    setSelectedTenant(null);
                  } catch (error) {
                    Alert.alert(
                      "Unable to remove tenant",
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                    );
                  }
                },
              },
            ],
          );
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#c62828" />
        <Text style={styles.evictBtnText}>Remove Tenant from Room</Text>
      </Pressable>

      <Pressable
        style={styles.evictBtn}
        onPress={() => {
          Alert.alert(
            "30-Day Notice",
            `Are you sure you want to issue a 30-day notice to remove ${selectedTenant.name}?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Issue Notice",
                style: "destructive",
                onPress: async () => {
                  try {
                    const tenantId =
                      selectedTenant.id || selectedTenant.raw?.id;
                    const roomNumber =
                      selectedTenant.raw?.roomNumber ||
                      selectedTenant.raw?.roomId ||
                      "";
                    if (!tenantId) {
                      throw new Error(
                        "This tenant record is missing a user id.",
                      );
                    }
                    if (!db) throw new Error("Firebase unavailable.");
                    const ends = new Date();
                    ends.setDate(ends.getDate() + 30);
                    await updateDoc(doc(db, "users", tenantId), {
                      noticeIssuedAt: serverTimestamp(),
                      noticeEndsAt: ends,
                    });
                    await createNotification(tenantId, {
                      type: "room_update",
                      title: "Move-out notice issued",
                      body: roomNumber
                        ? `Management issued a move-out notice for Room ${roomNumber}. Please contact management about the date and next steps.`
                        : "Please contact management about your move-out notice.",
                      route: "/tenant/account",
                    });
                    Alert.alert(
                      "Notice Issued",
                      "The notice was recorded. The tenant remains assigned until management confirms move-out.",
                    );
                    setSelectedTenant(null);
                  } catch (error) {
                    Alert.alert(
                      "Unable to remove tenant",
                      error instanceof Error
                        ? error.message
                        : "Please try again.",
                    );
                  }
                },
              },
            ],
          );
        }}
      >
        <Ionicons name="warning-outline" size={18} color="#c62828" />
        <Text style={styles.evictBtnText}>Issue 30-Day Removal Notice</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  dangerZone: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#f3d3d3",
    borderRadius: 14,
    backgroundColor: "#fff",
    gap: 12,
  },
  dangerTitle: { fontSize: 16, fontWeight: "700", color: "#a42b2b" },
  evictBtn: {
    minHeight: 44,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff3f3",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  evictBtnText: { color: "#a42b2b", fontWeight: "600", flexShrink: 1 },
});
