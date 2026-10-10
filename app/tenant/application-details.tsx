import { AppAlert as Alert } from "@/components/app-alert";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { peso, timestampMillis } from "@/lib/billing";
import { db } from "@/lib/firebase";
import { usePropertySettings } from "@/lib/use-property-settings";
import { useTenantData } from "@/lib/use-tenant-data";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import React from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ApplicationDetails() {
  const { user } = useAuth();
  const { profile } = useTenantData();
  const { settings } = usePropertySettings();
  const [application, setApplication] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [error, setError] = React.useState("");
  const params = useLocalSearchParams<{
    applicationId?: string;
    room?: string;
    type?: string;
    price?: string;
    image?: string;
  }>();
  React.useEffect(() => {
    if (!db || !params.applicationId || !user) return;
    return onSnapshot(
      doc(db, "applications", params.applicationId),
      (snapshot) => {
        if (snapshot.exists() && snapshot.data().tenantId === user.uid)
          setApplication(snapshot.data());
        else setError("Application not found.");
      },
      () =>
        setError(
          "Unable to load the application. Check your connection and permissions.",
        ),
    );
  }, [params.applicationId, user]);
  const room = String(application?.roomNumber || "");
  const type = String(application?.roomType || "Room");
  const price = peso(application?.price);
  const image = String(application?.image || "");
  const location = [
    application?.propertyName,
    application?.location,
    application?.floor ? `Floor ${String(application.floor)}` : "",
    application?.unit ? `Unit ${String(application.unit)}` : "",
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" · ");
  const status = String(application?.status || "Loading")
    .replaceAll("_", " ")
    .toUpperCase();
  async function cancelApplication() {
    if (!db || !params.applicationId || application?.status !== "pending")
      return;
    const firestore = db;
    Alert.alert(
      "Cancel application?",
      "This withdraws your application from landlord review.",
      [
        { text: "Keep application", style: "cancel" },
        {
          text: "Cancel application",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(
                doc(firestore, "applications", params.applicationId!),
                { status: "cancelled", updatedAt: serverTimestamp() },
              );
              router.replace("/tenant/applications");
            } catch {
              Alert.alert("Could not cancel", "Please try again.");
            }
          },
        },
      ],
    );
  }
  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader
        title="Application Details"
        showBack
        backHref="/tenant/applications"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!!error && <Text accessibilityRole="alert">{error}</Text>}
        {!params.applicationId && (
          <Text>Select an application from My Applications.</Text>
        )}
        <View style={styles.statusRow}>
          <Text style={styles.title}>Application Details</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        <Text style={styles.sub}>
          {timestampMillis(application?.createdAt)
            ? new Date(
                timestampMillis(application?.createdAt),
              ).toLocaleDateString("en-PH")
            : "Date unavailable"}{" "}
        </Text>
        <View style={styles.notice}>
          <Ionicons name="hourglass-outline" size={17} color="#9b6700" />
          <Text style={styles.noticeText}>
            {application?.status === "pending"
              ? "Your application is awaiting landlord review."
              : `Application status: ${status.toLowerCase()}.`}
          </Text>
        </View>
        {image ? <Image source={{ uri: image }} style={styles.hero} /> : null}
        <View style={styles.roomCard}>
          <Text style={styles.kicker}>{type.toUpperCase()}</Text>
          <Text style={styles.roomTitle}>Room {room}</Text>
          <Text style={styles.house}>{location || "Location unavailable"}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly rent</Text>
            <Text style={styles.value}>{price}</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Applicant Profile</Text>
          <Info
            label="Applicant Name"
            value={String(profile.name || user?.displayName || "Tenant")}
          />
          <Info
            label="Contact Number"
            value={String(profile.phone || "Not provided")}
          />
          <Info label="Email Address" value={user?.email || ""} />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Requested rent</Text>
          <Info label="Monthly rent" value={price} />
          <Text style={styles.small}>
            Management will confirm any deposit and utility charges before your
            tenancy starts.
          </Text>
        </View>
        <Pressable
          style={styles.message}
          onPress={() => {
            const phone = String(settings.caretakerPhone || "");
            if (phone)
              void Linking.openURL(
                `tel:${phone.replace(/[^+0-9]/g, "")}`,
              ).catch(() =>
                Alert.alert(
                  "Cannot call",
                  "Use the management number in your phone app.",
                ),
              );
            else
              Alert.alert(
                "Contact unavailable",
                "Management has not configured a contact number yet.",
              );
          }}
        >
          <Ionicons name="chatbubble-outline" size={17} color="#fff" />
          <Text style={styles.messageText}>Contact Property Management</Text>
        </Pressable>
        <Pressable
          style={styles.cancelContainer}
          disabled={application?.status !== "pending"}
          onPress={() => void cancelApplication()}
        >
          <Text style={styles.cancelText}>Cancel Application</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 14, paddingBottom: 30 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 17,
  },
  topTitle: { fontWeight: "700", color: "#253149" },
  headerTitleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { fontSize: 19, fontWeight: "700", color: "#172033" },
  status: {
    backgroundColor: "#fff0c9",
    color: "#9b6700",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  sub: { fontSize: 11, color: "#78879b", marginTop: 4 },
  notice: {
    backgroundColor: "#fff5e5",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 15, color: "#725a30" },
  hero: { height: 190, width: "100%", borderRadius: 11 },
  roomCard: {
    backgroundColor: "#fff",
    padding: 13,
    borderRadius: 11,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  kicker: { fontSize: 12, color: "#16805d", fontWeight: "700" },
  roomTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#253149",
    marginTop: 5,
  },
  house: { color: "#71809a", fontSize: 11, marginTop: 3 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: "#eef1f5",
  },
  label: { color: "#71809a", fontSize: 12 },
  value: { color: "#253149", fontSize: 12, fontWeight: "600" },
  small: { color: "#78879b", fontSize: 11, marginTop: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 13,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#253149",
    marginBottom: 9,
  },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderColor: "#eef1f5",
  },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#dce5df",
    marginTop: 4,
    paddingTop: 12,
  },
  totalValue: { color: "#16805d", fontSize: 17, fontWeight: "800" },
  message: {
    height: 45,
    borderRadius: 9,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  messageText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cancelContainer: {
    height: 45,
    borderRadius: 9,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  cancelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
