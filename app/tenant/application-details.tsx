import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";

export default function ApplicationDetails() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    room?: string;
    type?: string;
    price?: string;
    image?: string;
  }>();
  const room = params.room ?? "201";
  const type = params.type ?? "Twin Sharing";
  const price = params.price ?? "3,500";
  const image =
    params.image ||
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900";
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={21} color="#253149" />
          </Pressable>
          <Text style={styles.topTitle}>Application Details</Text>
          <Ionicons name="notifications-outline" size={20} color="#253149" />
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.title}>Application Details</Text>
          <Text style={styles.status}>PENDING REVIEW</Text>
        </View>
        <Text style={styles.sub}>
          Submitted today · Application #{`APP-${room}92`}
        </Text>
        <View style={styles.notice}>
          <Ionicons name="hourglass-outline" size={17} color="#9b6700" />
          <Text style={styles.noticeText}>
            Your application is being reviewed by the landlord. You will receive
            an update when a decision is made.
          </Text>
        </View>
        <Image source={{ uri: image }} style={styles.hero} />
        <View style={styles.roomCard}>
          <Text style={styles.kicker}>{type.toUpperCase()}</Text>
          <Text style={styles.roomTitle}>Room {room}</Text>
          <Text style={styles.house}>
            Casa Verde Boarding House · 2nd Floor, East Wing
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly rent</Text>
            <Text style={styles.value}>₱{price}</Text>
          </View>
          <Text style={styles.small}>Selected space: Bed A (Window Side)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Applicant Profile</Text>
          <Info label="Applicant Name" value={user?.displayName || "Tenant"} />
          <Info label="Contact Number" value="+63 917 555 1234" />
          <Info label="Email Address" value={user?.email || ""} />
          <Info
            label="Identity Document"
            value="Student ID (UST · 2024-****)"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Initial Payment Breakdown</Text>
          <Info label="1st Month Rent" value={`₱${price}`} />
          <Info label="Security Deposit (Refundable)" value="₱3,500.00" />
          <Info label="Utility Initial Buffer" value="₱500.00" />
          <View style={styles.total}>
            <Text style={styles.label}>Total Due Upon Approval</Text>
            <Text style={styles.totalValue}>₱7,500.00</Text>
          </View>
        </View>
        <Pressable
          style={styles.message}
          onPress={() =>
            Alert.alert(
              "Message landlord",
              "Messaging will be connected to Firebase later.",
            )
          }
        >
          <Ionicons name="chatbubble-outline" size={17} color="#fff" />
          <Text style={styles.messageText}>Message Property Management</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Cancel application",
              "Application cancellation will be connected later.",
            )
          }
        >
          <Text style={styles.cancel}>Cancel Application</Text>
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
    backgroundColor: "#0d382c",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  messageText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cancel: {
    textAlign: "center",
    color: "#b65745",
    fontSize: 11,
    marginTop: 15,
  },
});
