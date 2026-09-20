import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ApplicationReview() {
  const { name, applicationId } = useLocalSearchParams<{
    name: string;
    applicationId?: string;
  }>();
  const applicant = decodeURIComponent(name || "Juan Dela Cruz");
  const [application, setApplication] = React.useState<Record<string, string>>(
    {},
  );
  React.useEffect(() => {
    if (!db || !applicationId) return;
    getDoc(doc(db, "applications", applicationId))
      .then((snapshot) => {
        if (snapshot.exists())
          setApplication(snapshot.data() as Record<string, string>);
      })
      .catch(() => undefined);
  }, [applicationId]);
  const roomLabel = application.roomNumber
    ? `Room ${application.roomNumber} ï¿½ ${application.roomType || "Room"}`
    : "Room details pending";
  const cleanRoomLabel = application.roomNumber
    ? `Room ${application.roomNumber} - ${application.roomType || "Room"}`
    : roomLabel;
  const displayPrice = application.price
    ? `₱${application.price} / month`
    : "Not specified";
  async function approveApplication() {
    if (
      !db ||
      !applicationId ||
      !application.roomNumber ||
      !application.tenantId
    ) {
      Alert.alert(
        "Unable to approve",
        "This application is missing its Firebase details.",
      );
      return;
    }
    try {
      await updateDoc(doc(db, "applications", applicationId), {
        status: "approved",
        approvedAt: serverTimestamp(),
        roomId: application.roomNumber,
      });
      await setDoc(
        doc(db, "rooms", application.roomNumber),
        {
          number: application.roomNumber,
          type: application.roomType || "Room",
          rent: application.price || "0",
          status: "Occupied",
          tenant: applicant,
          tenantId: application.tenantId,
          applicationId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      await setDoc(
        doc(db, "users", application.tenantId),
        {
          hasRoom: true,
          roomId: application.roomNumber,
          roomNumber: application.roomNumber,
          roomType: application.roomType || "Room",
          roomRent: application.price || "0",
          applicationId,
        },
        { merge: true },
      );
      Alert.alert(
        "Application approved",
        `${applicant} was assigned to ${cleanRoomLabel}. The room is now occupied.`,
      );
      router.back();
    } catch (error) {
      Alert.alert(
        "Unable to approve",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }
  async function rejectApplication() {
    if (!db || !applicationId) return;
    const firestore = db;
    Alert.alert(
      "Reject application?",
      `This will reject ${applicant}'s application for ${cleanRoomLabel}.`,
      [
        { text: "Keep Application", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(firestore, "applications", applicationId), {
                status: "rejected",
                rejectedAt: serverTimestamp(),
              });
              Alert.alert(
                "Application rejected",
                "The application was removed from pending review.",
              );
              router.back();
            } catch (error) {
              Alert.alert(
                "Unable to reject",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={21} color="#172033" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Review Applicant</Text>
          <Text style={styles.subtitle}>BoardEase Ref: #APP-2026-89</Text>
        </View>
        <Text style={styles.pending}>● Pending Review</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.initials}>
            <Text style={styles.initialsText}>
              {applicant.slice(0, 2).toUpperCase()}
            </Text>
            <View style={styles.verified}>
              <Ionicons name="checkmark" size={11} color="#fff" />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{applicant}</Text>
            <Text style={styles.role}>Student</Text>
            <Text style={styles.applied}>Applied for {cleanRoomLabel}</Text>
            <Text style={styles.muted}>
              DLSU Dasmariñas · 3rd Year Eng&apos;g
            </Text>
          </View>
        </View>
        <View style={styles.contactRow}>
          <Action icon="call-outline" label="Call" />
          <Action icon="chatbubble-outline" label="Chat" />
          <Action icon="mail-outline" label="Email" />
        </View>
        <Card
          title="Tenancy Summary"
          icon="briefcase-outline"
          tag="Active Lease"
        >
          <View style={styles.summaryRow}>
            <InfoBox label="Requested Room" value={cleanRoomLabel} />
            <InfoBox label="Monthly Rent" value={displayPrice} />
          </View>
          <View style={styles.dueBox}>
            <Text style={styles.boxLabel}>Rent Due Date</Text>
            <Text style={styles.boxValue}>
              5th of every month{" "}
              <Text style={styles.muted}>(Next due: Dec 5, 2026)</Text>
            </Text>
          </View>
        </Card>
        <Card title="Personal & Contact Info" icon="person-outline" tag="Edit">
          <InfoLine label="Full Name" value={applicant} />
          <InfoLine label="Contact Number" value="+63 917 555 1234" />
          <InfoLine label="Email" value="juan.delacruz@email.com" />
          <InfoLine
            label="Emergency Contact"
            value="Maria Dela Cruz\n(Mother) 0918 222 3344"
          />
        </Card>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable style={styles.reject} onPress={rejectApplication}>
          <Text style={styles.rejectText}>Reject</Text>
        </Pressable>
        <Pressable
          style={styles.request}
          onPress={() =>
            Alert.alert(
              "Request sent",
              "More information was requested from the applicant.",
            )
          }
        >
          <Text style={styles.requestText}>Request Info</Text>
        </Pressable>
        <Pressable style={styles.approve} onPress={approveApplication}>
          <Ionicons name="checkmark" size={17} color="#fff" />
          <Text style={styles.approveText}>Approve & Assign</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
function Action({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Pressable
      style={styles.action}
      onPress={() =>
        Alert.alert(label, `${label} action will be connected later.`)
      }
    >
      <Ionicons name={icon} size={17} color="#173b36" />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}
function Card({
  title,
  icon,
  tag,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTitle}>
        <Ionicons name={icon} size={19} color="#536783" />
        <Text style={styles.cardHeading}>{title}</Text>
        <Text style={styles.tag}>{tag}</Text>
      </View>
      {children}
    </View>
  );
}
function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={styles.boxValue}>{value}</Text>
    </View>
  );
}
function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8f6f2" },
  header: {
    minHeight: 62,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e8e3dc",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: "700", color: "#172033" },
  subtitle: { fontSize: 11, color: "#8390a2", marginTop: 3 },
  pending: {
    color: "#a87500",
    backgroundColor: "#fff1c7",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 11,
  },
  content: { padding: 14, paddingBottom: 100 },
  profile: {
    backgroundColor: "#fff",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#e7e1d9",
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  initials: {
    width: 47,
    height: 47,
    borderRadius: 12,
    backgroundColor: "#245448",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  initialsText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  verified: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: "#159568",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#253149" },
  role: {
    alignSelf: "flex-start",
    fontSize: 11,
    color: "#207454",
    borderWidth: 1,
    borderColor: "#a8ddc6",
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 3,
  },
  applied: { fontSize: 12, color: "#617083", marginTop: 5 },
  muted: { color: "#8390a2", fontSize: 11 },
  contactRow: { flexDirection: "row", gap: 8, marginVertical: 12 },
  action: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "#eee7df",
  },
  actionText: { fontSize: 11, color: "#253149" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#e7e1d9",
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#eee9e3",
  },
  cardHeading: { flex: 1, fontSize: 14, fontWeight: "700", color: "#253149" },
  tag: {
    fontSize: 11,
    color: "#237759",
    backgroundColor: "#d8f1e6",
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  summaryRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  infoBox: {
    flex: 1,
    backgroundColor: "#f5f1eb",
    borderRadius: 9,
    padding: 10,
    minHeight: 68,
  },
  boxLabel: { fontSize: 12, color: "#68778a" },
  boxValue: { fontSize: 12, fontWeight: "600", color: "#253149", marginTop: 6 },
  dueBox: {
    backgroundColor: "#f5f1eb",
    borderRadius: 9,
    padding: 10,
    marginTop: 9,
  },
  infoLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f0ece7",
  },
  lineLabel: { fontSize: 12, color: "#68778a" },
  lineValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#253149",
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e7e1d9",
    padding: 12,
    flexDirection: "row",
    gap: 8,
  },
  request: {
    flex: 1,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#d9d0c6",
    alignItems: "center",
    justifyContent: "center",
  },
  reject: {
    flex: 0.85,
    height: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#e7a8ad",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectText: { fontSize: 11, color: "#c04350", fontWeight: "600" },
  requestText: { fontSize: 11, color: "#53635e" },
  approve: {
    flex: 1.5,
    height: 42,
    borderRadius: 9,
    backgroundColor: "#173b36",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  approveText: { color: "#fff", fontSize: 11, fontWeight: "600" },
});
