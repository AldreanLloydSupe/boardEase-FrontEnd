import { AppAlert as Alert } from "@/components/app-alert";
import DateTimePicker from "@/components/date-time-picker";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { getFavoriteRooms, setFavoriteRooms } from "@/lib/favorite-rooms";
import { db } from "@/lib/firebase";
import { createApplication, createTourRequest } from "@/lib/request-data";
import { roomFromFirestore } from "@/lib/room-data";
import { usePropertySettings } from "@/lib/use-property-settings";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import React from "react";
import {
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RoomDetails() {
  const { settings } = usePropertySettings();
  const params = useLocalSearchParams<{
    id?: string;
    number?: string;
    type?: string;
    price?: string;
    image?: string;
  }>();
  const [roomRecord, setRoomRecord] = React.useState<Record<string, unknown> | null>(null);
  React.useEffect(() => {
    let active = true;
    setRoomRecord(null);
    if (!db || !params.id) return;
    getDoc(doc(db, "rooms", params.id))
      .then((snapshot) => {
        if (active) setRoomRecord(snapshot.exists() ? snapshot.data() : null);
      })
      .catch(() => {
        if (active) setRoomRecord(null);
      });
    return () => {
      active = false;
    };
  }, [params.id]);
  const number = String(roomRecord?.number ?? params.number ?? "");
  const type = String(roomRecord?.type ?? params.type ?? "Room");
  const price = String(roomRecord?.price ?? roomRecord?.rent ?? params.price ?? "0");
  const property = String(
    roomRecord?.propertyName ?? roomRecord?.property ?? "",
  ).trim();
  const location = String(
    roomRecord?.location ?? roomRecord?.address ?? "",
  ).trim();
  const floor = roomRecord?.floor ? `Floor ${String(roomRecord.floor)}` : "";
  const locationLabel = [property, location, floor].filter(Boolean).join(" · ");
  const amenities = roomRecord
    ? roomFromFirestore(String(params.id ?? ""), roomRecord).amenities
    : [];
  const { user } = useAuth();
  const [tourModalVisible, setTourModalVisible] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [tourNote, setTourNote] = React.useState("");
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);
  const [hasApplied, setHasApplied] = React.useState(false);
  const [isRequestingTour, setIsRequestingTour] = React.useState(false);
  const [hasRequestedTour, setHasRequestedTour] = React.useState(false);

  React.useEffect(() => {
    if (user?.uid) {
      getFavoriteRooms(user.uid)
        .then((saved) => setIsFavorite(saved.includes(number)))
        .catch(() => undefined);
    }
  }, [number, user?.uid]);

  React.useEffect(() => {
    const checkStatus = async () => {
      if (!db || !user) return;
      try {
        const appsQuery = query(
          collection(db, "applications"),
          where("tenantId", "==", user.uid),
          where("roomNumber", "==", number),
        );
        const appsSnap = await getDocs(appsQuery);
        const applied = appsSnap.docs.some((doc) => {
          const status = doc.data().status;
          return !status || status === "pending" || status === "approved";
        });
        if (applied) setHasApplied(true);

        const toursQuery = query(
          collection(db, "tourRequests"),
          where("tenantId", "==", user.uid),
          where("roomNumber", "==", number),
        );
        const toursSnap = await getDocs(toursQuery);
        const requestedTour = toursSnap.docs.some((doc) => {
          const status = doc.data().status;
          return !status || status === "pending" || status === "accepted";
        });
        if (requestedTour) setHasRequestedTour(true);
      } catch {
        // ignore errors
      }
    };
    checkStatus();
  }, [user, number]);

  async function toggleFavorite() {
    if (!user?.uid) return;
    const saved = await getFavoriteRooms(user.uid);
    const next = saved.includes(number)
      ? saved.filter((item) => item !== number)
      : [...saved, number];
    setIsFavorite(next.includes(number));
    await setFavoriteRooms(user.uid, next);
  }

  function requestTour() {
    setSelectedDate(null);
    setShowDatePicker(false);
    setTourNote("");
    setTourModalVisible(true);
  }

  async function submitTourRequest() {
    if (isRequestingTour) return;
    if (!selectedDate || !tourNote.trim()) {
      Alert.alert(
        "Complete the request",
        "Select a date and add a note about the tour.",
      );
      return;
    }
    const dateLabel = selectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    setIsRequestingTour(true);

    try {
      if (!user)
        throw new Error("Please log in again before requesting a tour.");
      await createTourRequest(
        user,
        {
          roomId: params.id,
          roomNumber: number,
          roomType: type,
          price,
          image: params.image,
        },
        `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`,
        tourNote.trim(),
      );
      setTourModalVisible(false);
      setHasRequestedTour(true);
      Alert.alert(
        "Tour request sent",
        `Room ${number} tour requested for ${dateLabel}. The landlord will be notified.`,
      );
    } catch (error) {
      Alert.alert(
        "Unable to request tour",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsRequestingTour(false);
    }
  }

  const formattedDate = selectedDate
    ? `${String(selectedDate.getFullYear()).slice(-2)}/${String(selectedDate.getMonth() + 1).padStart(2, "0")}/${String(selectedDate.getDate()).padStart(2, "0")}`
    : "Select a date";

  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader
        title="Room Details"
        showBack
        backHref="/tenant/room-browser"
        rightAction={
          <Pressable onPress={toggleFavorite}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#e45862" : "#fff"}
            />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {params.image ? (
          <Image
            source={params.image ? { uri: params.image } : undefined}
            style={styles.hero}
          />
        ) : null}
        <View style={styles.headingRow}>
          <View style={styles.headingText}>
            <Text style={styles.kicker}>BOARDEASE · AVAILABLE ROOM</Text>
            <Text style={styles.title}>
              Room {number} - {type}
            </Text>
            {!!locationLabel && (
              <Text style={styles.location}>{locationLabel}</Text>
            )}
          </View>
          <Text style={styles.available}>AVAILABLE</Text>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.price}>
            ₱{price}
            <Text style={styles.month}> / month</Text>
          </Text>
          <Text style={styles.note}>
            Includes basic utilities · Subject to lease terms
          </Text>
        </View>

        <Section title="Occupancy & Bed Allocation">
          <InfoRow icon="people-outline" label="Occupancy" value={type} />
          <InfoRow
            icon="bed-outline"
            label="Bed allocation"
            value="Assigned after approval"
          />
        </Section>
        <Section title="Room Inclusions & Amenities">
          {amenities.length ? (
            <View style={styles.chips}>
              {amenities.map((amenity, index) => (
                <View style={styles.chip} key={`${amenity}-${index}`}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={15}
                    color="#16805d"
                  />
                  <Text style={styles.chipText}>{amenity}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.body}>No amenities listed for this room.</Text>
          )}
        </Section>
        <Section title="House Guidelines">
          <Text style={styles.body}>
            {String(
              settings.houseRules ||
                "Quiet hours are observed from 10:00 PM to 6:00 AM. Visitors must register with the landlord.",
            )}
          </Text>
        </Section>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.tourButton,
            hasRequestedTour && styles.tourButtonDisabled,
          ]}
          onPress={requestTour}
          disabled={hasRequestedTour}
        >
          <Ionicons
            name="calendar-outline"
            size={18}
            color={hasRequestedTour ? "#8390a2" : "#2864e8"}
          />
          <Text
            style={[
              styles.tourText,
              hasRequestedTour && styles.tourTextDisabled,
            ]}
          >
            {hasRequestedTour ? "Tour Requested ✓" : "Request a Tour"}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.applyButton,
            (isApplying || hasApplied) && styles.applyButtonDisabled,
          ]}
          disabled={isApplying || hasApplied}
          onPress={async () => {
            try {
              if (!user)
                throw new Error("Please log in again before applying.");

              setIsApplying(true);
              await new Promise((resolve) => setTimeout(resolve, 800));

              const application = await createApplication(user, {
                roomId: params.id,
                roomNumber: number,
                roomType: type,
                price,
                image: params.image,
              });

              setIsApplying(false);
              setHasApplied(true);

              setTimeout(() => {
                router.push({
                  pathname: "/tenant/applications",
                  params: {
                    applicationId: application.id,
                    number,
                    type,
                    price,
                    image: params.image ?? "",
                  },
                } as any);
              }, 1200);
            } catch (error) {
              setIsApplying(false);
              Alert.alert(
                "Unable to apply",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          }}
        >
          <Text
            style={[
              styles.applyText,
              (isApplying || hasApplied) && styles.applyTextDisabled,
            ]}
          >
            {isApplying
              ? "Submitting..."
              : hasApplied
                ? "Submitted ✓"
                : "Apply for this Room"}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={tourModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTourModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Request a Room Tour</Text>
                <Text style={styles.modalSubtitle}>
                  Room {number} · {type}
                </Text>
              </View>
              <Pressable onPress={() => setTourModalVisible(false)}>
                <Ionicons name="close" size={23} color="#71809a" />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>
              Choose when you would like to see the room.
            </Text>
            <Text style={styles.inputLabel}>Preferred date</Text>
            <Pressable
              style={styles.dateField}
              onPress={() => setShowDatePicker(true)}
            >
              <Text
                style={[
                  styles.dateText,
                  !selectedDate && styles.datePlaceholder,
                ]}
              >
                {formattedDate}
              </Text>
              <Ionicons name="calendar-outline" size={18} color="#2864e8" />
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate ?? new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}
            {Platform.OS === "ios" && showDatePicker && (
              <Pressable
                style={styles.dateConfirm}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.dateConfirmText}>Confirm date</Text>
              </Pressable>
            )}
            <Text style={styles.inputLabel}>Note for the landlord</Text>
            <TextInput
              style={[styles.modalInput, styles.noteInput]}
              value={tourNote}
              onChangeText={setTourNote}
              placeholder="Example: I want to check the bed space, bathroom, and study area."
              placeholderTextColor="#9aa8bb"
              multiline
              textAlignVertical="top"
            />
            <Pressable
              style={[
                styles.modalSubmit,
                isRequestingTour && styles.applyButtonDisabled,
              ]}
              onPress={submitTourRequest}
              disabled={isRequestingTour}
            >
              <Text
                style={[
                  styles.modalSubmitText,
                  isRequestingTour && styles.applyTextDisabled,
                ]}
              >
                {isRequestingTour ? "Sending Request..." : "Send Tour Request"}
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              onPress={() => setTourModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color="#2864e8" />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 15, paddingBottom: 120 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e3e8ef",
  },
  topTitle: { fontSize: 16, fontWeight: "700", color: "#253149" },
  headerTitleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  hero: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#e8edf3",
  },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 15,
  },
  headingText: { flex: 1 },
  kicker: {
    fontSize: 12,
    color: "#2864e8",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: { fontSize: 20, fontWeight: "700", color: "#253149", marginTop: 5 },
  location: { fontSize: 12, color: "#7a8799", marginTop: 4 },
  available: {
    color: "#16805d",
    backgroundColor: "#d9f7e8",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "700",
  },
  priceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  price: { fontSize: 23, fontWeight: "800", color: "#2864e8" },
  month: { fontSize: 11, fontWeight: "400", color: "#7a8799" },
  note: { fontSize: 12, color: "#6e7d91", marginTop: 4 },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#253149",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#eef1f5",
  },
  infoLabel: { flex: 1, marginLeft: 9, fontSize: 11, color: "#71809a" },
  infoValue: { fontSize: 11, fontWeight: "600", color: "#253149" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    width: "47%",
    minHeight: 36,
    backgroundColor: "#f5f8fb",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipText: { fontSize: 12, color: "#526174", flexShrink: 1 },
  body: { fontSize: 11, color: "#617086", lineHeight: 18 },
  actions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e3e8ef",
    padding: 12,
    flexDirection: "row",
    gap: 9,
  },
  tourButton: {
    flex: 1,
    height: 46,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  tourText: { color: "#2864e8", fontSize: 12, fontWeight: "700" },
  applyButton: {
    flex: 1,
    height: 46,
    borderRadius: 9,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  applyText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(18, 29, 48, 0.45)",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 19, fontWeight: "700", color: "#253149" },
  modalSubtitle: { fontSize: 11, color: "#71809a", marginTop: 4 },
  modalHint: {
    fontSize: 11,
    color: "#71809a",
    marginTop: 18,
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#42526a",
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderColor: "#d7dfeb",
    borderRadius: 9,
    paddingHorizontal: 13,
    fontSize: 13,
    color: "#253149",
  },
  noteInput: { height: 72, paddingTop: 12 },
  dateField: {
    height: 46,
    borderWidth: 1,
    borderColor: "#d7dfeb",
    borderRadius: 9,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: { fontSize: 13, color: "#253149" },
  datePlaceholder: { color: "#9aa8bb" },
  dateConfirm: { alignItems: "flex-end", paddingTop: 8 },
  dateConfirmText: { color: "#2864e8", fontSize: 12, fontWeight: "700" },
  modalSubmit: {
    height: 46,
    borderRadius: 9,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  modalSubmitText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  modalCancel: { alignItems: "center", paddingVertical: 13 },
  modalCancelText: { color: "#71809a", fontSize: 12, fontWeight: "600" },
  applyButtonDisabled: {
    backgroundColor: "#cbd5e1",
    borderColor: "#cbd5e1",
  },
  applyTextDisabled: {
    color: "#64748b",
  },
  tourButtonDisabled: {
    borderColor: "#cbd5e1",
    backgroundColor: "#f1f5f9",
  },
  tourTextDisabled: {
    color: "#64748b",
  },
});
