import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AssignedTenantNav } from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function TenantPayments() {
  const { user } = useAuth();
  const [proofOpen, setProofOpen] = React.useState(false);
  const [reference, setReference] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("");
  const [amount, setAmount] = React.useState("₱3,500.00");

  async function submitProof() {
    if (!reference.trim() || !date.trim() || !time.trim() || !amount.trim()) {
      Alert.alert(
        "Incomplete payment proof",
        "Complete all payment fields first.",
      );
      return;
    }
    try {
      if (db && user) {
        await addDoc(collection(db, "payments"), {
          tenantId: user.uid,
          tenantName: user.displayName || user.email || "Tenant",
          reference: reference.trim(),
          date: date.trim(),
          time: time.trim(),
          amount: amount.trim(),
          status: "pending",
          createdAt: serverTimestamp(),
        });
      }
      setProofOpen(false);
      Alert.alert(
        "Proof submitted",
        "Your payment is waiting for landlord verification.",
      );
      setReference("");
    } catch {
      Alert.alert(
        "Unable to submit proof",
        "Please check your Firebase connection and try again.",
      );
    }
  }
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BOARDEASE</Text>
            <Text style={styles.title}>Payments</Text>
          </View>
          <Ionicons name="notifications-outline" size={21} color="#253149" />
        </View>
        <View style={styles.propertyRow}>
          <View style={styles.dot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.property}>ROOM 201 • TWIN SHARING</Text>
            <Text style={styles.tenant}>{user?.displayName || "Tenant"}</Text>
          </View>
          <Text style={styles.cycle}>Cycle: Oct 01 - 31</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.badge}>DUE IN 4 DAYS</Text>
            <Text style={styles.deadline}>
              Payment Deadline{"\n"}Oct 05, 2026
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Monthly Rent Due</Text>
          <Text style={styles.total}>₱3,500.00</Text>
          <Text style={styles.muted}>
            Base billing for current active tenancy cycle
          </Text>
          <Line
            icon="bed-outline"
            label="Twin Sharing Bed Space"
            value="₱3,000.00"
          />
          <Line
            icon="water-outline"
            label="Fiber Wi-Fi & Facility Surcharge"
            value="₱500.00"
          />
          <Pressable
            style={styles.payButton}
            onPress={() => setProofOpen(true)}
          >
            <Ionicons name="flash" size={15} color="#fff" />
            <Text style={styles.payText}>Pay ₱3,500.00 Now</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Submeter Readings</Text>
            <Text style={styles.smallBadge}>Due Oct 10</Text>
          </View>
          <Text style={styles.muted}>Measured independently for Room 201</Text>
          <Line
            icon="flash"
            label="Electricity (142 kWh)"
            value="₱1,136.00"
            detail="Rate: ₱8.00 / kWh"
          />
          <Line
            icon="water"
            label="Clean Water (4.2 m³)"
            value="₱210.00"
            detail="Rate: ₱50.00 / m³"
          />
          <View style={styles.bundle}>
            <Text style={styles.bundleText}>
              Bundle with Rent (Total: ₱4,846.00)
            </Text>
            <Text>→</Text>
          </View>
        </View>

        <View style={styles.gcashCard}>
          <View style={styles.gcashHeading}>
            <Ionicons name="wallet-outline" size={18} color="#2864e8" />
            <Text style={styles.gcashTitle}>Direct GCash Transfer</Text>
          </View>
          <Text style={styles.gcashLabel}>RECEIVER GCASH ACCOUNT</Text>
          <View style={styles.gcashReceiver}>
            <View>
              <Text style={styles.gcashName}>Kuya Bert Morales</Text>
              <Text style={styles.muted}>Casa Verde Management & Admin</Text>
              <Text style={styles.gcashNumber}>0917 554 8921</Text>
            </View>
            <Pressable onPress={() => Alert.alert("GCash number copied", "0917 554 8921") }>
              <Text style={styles.copyText}>Copy</Text>
            </Pressable>
          </View>
          <Text style={styles.gcashLabel}>TRANSFER INSTRUCTIONS</Text>
          <Text style={styles.instruction}>1. Open your GCash app and tap Send Money.</Text>
          <Text style={styles.instruction}>2. Send exactly the amount shown above.</Text>
          <Text style={styles.instruction}>3. Keep your GCash reference number.</Text>
          <Pressable style={styles.proofButton} onPress={() => setProofOpen(true)}>
            <Ionicons name="receipt-outline" size={15} color="#fff" />
            <Text style={styles.proofButtonText}>Submit GCash Payment Proof</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Preferences</Text>
          <Line
            icon="phone-portrait-outline"
            label="Auto-Debit via GCash"
            value="ON"
            detail={`Linked: ${user?.displayName || "Tenant"}`}
          />
          <Line
            icon="alarm-outline"
            label="SMS & In-App Reminders"
            value="ACTIVE"
            detail="3 days prior to due dates"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Receipts Archive</Text>
            <Ionicons name="refresh-outline" size={16} color="#71809a" />
          </View>
          <Text style={styles.muted}>Verified BIR official receipts</Text>
          {["OR-0892", "OR-0741", "OR-0610"].map((receipt, index) => (
            <View style={styles.receipt} key={receipt}>
              <View>
                <Text style={styles.receiptAmount}>
                  ₱3,500.00 <Text style={styles.paid}>PAID</Text>
                </Text>
                <Text style={styles.muted}>
                  {index === 0
                    ? "Sep 04, 2026"
                    : index === 1
                      ? "Aug 05, 2026"
                      : "Jul 04, 2026"}{" "}
                  • Rent & Wi-Fi
                </Text>
              </View>
              <View>
                <Text style={styles.receiptId}>{receipt}</Text>
                <Text style={styles.download}>
                  {index === 0 ? "⇩ Download Receipt" : "▣ View Details"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <AssignedTenantNav active="Payments" />
      <Modal
        visible={proofOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setProofOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.proofModal}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Payment Proof Submission</Text>
              <Pressable onPress={() => setProofOpen(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.modalHint}>
              Send your GCash payment for landlord verification.
            </Text>
            <Text style={styles.inputLabel}>GCash Reference No.</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. 1002 8492 7104"
            />
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Date Sent</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="10/01/2026"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Time Sent</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="10:30 AM"
                />
              </View>
            </View>
            <Text style={styles.inputLabel}>Amount Transferred</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <View style={styles.uploadBox}>
              <Text style={styles.uploadIcon}>▧</Text>
              <Text style={styles.uploadTitle}>Tap to upload receipt</Text>
              <Text style={styles.modalHint}>PNG/JPG, max 10MB</Text>
            </View>
            <Pressable style={styles.submitButton} onPress={submitProof}>
              <Text style={styles.submitText}>
                ▷ Submit GCash Payment Proof
              </Text>
            </Pressable>
            <Text style={styles.notice}>
              Payments are manually verified by the landlord. You will receive
              an update after approval.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Line({
  icon,
  label,
  value,
  detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <View style={styles.line}>
      <Ionicons name={icon} size={17} color="#16805d" />
      <View style={{ flex: 1 }}>
        <Text style={styles.lineLabel}>{label}</Text>
        {detail && <Text style={styles.muted}>{detail}</Text>}
      </View>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 12, paddingBottom: 90 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brand: { fontSize: 10, color: "#a44c35", fontWeight: "700" },
  title: { fontSize: 20, fontWeight: "700", color: "#172033" },
  propertyRow: {
    backgroundColor: "#fff",
    borderRadius: 9,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#a44c35" },
  property: { fontSize: 10, color: "#a44c35", fontWeight: "700" },
  tenant: { fontSize: 12, color: "#253149", marginTop: 2 },
  cycle: { fontSize: 10, color: "#526174" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badge: {
    backgroundColor: "#ffe6d9",
    color: "#a44c35",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "700",
  },
  deadline: { textAlign: "right", color: "#a44c35", fontSize: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0d382c",
    marginTop: 8,
  },
  total: { fontSize: 29, color: "#0d382c", fontWeight: "700", marginTop: 10 },
  muted: { fontSize: 10, color: "#78879b", marginTop: 3 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderColor: "#eef1f5",
    marginTop: 7,
  },
  lineLabel: { fontSize: 11, color: "#42526a" },
  lineValue: { fontSize: 11, fontWeight: "700", color: "#253149" },
  payButton: {
    backgroundColor: "#a44c35",
    borderRadius: 8,
    padding: 11,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  payText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardTitle: { fontSize: 13, color: "#0d382c", fontWeight: "700" },
  smallBadge: {
    backgroundColor: "#f1eee7",
    borderRadius: 8,
    padding: 4,
    fontSize: 9,
    color: "#526174",
  },
  bundle: {
    backgroundColor: "#f1eee7",
    borderRadius: 7,
    padding: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  bundleText: { fontSize: 10, color: "#42526a" },
  receipt: {
    backgroundColor: "#f7f5f0",
    borderRadius: 7,
    padding: 9,
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptAmount: { fontSize: 12, fontWeight: "700", color: "#253149" },
  paid: {
    backgroundColor: "#d9eee6",
    color: "#16805d",
    fontSize: 9,
    padding: 3,
  },
  receiptId: { fontSize: 9, color: "#526174", textAlign: "right" },
  download: { fontSize: 9, color: "#a44c35", marginTop: 8 },
  gcashCard: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  gcashHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  gcashTitle: { color: "#0d382c", fontSize: 14, fontWeight: "700" },
  gcashLabel: { color: "#8997a6", fontSize: 9, fontWeight: "700", marginTop: 13 },
  gcashReceiver: {
    backgroundColor: "#f7f9fc",
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gcashName: { color: "#253149", fontSize: 12, fontWeight: "700" },
  gcashNumber: { color: "#a44c35", fontSize: 14, fontWeight: "700", marginTop: 5 },
  copyText: { color: "#2864e8", fontSize: 11, fontWeight: "700" },
  instruction: { color: "#526174", fontSize: 10, lineHeight: 16, marginTop: 4 },
  proofButton: {
    backgroundColor: "#a44c35",
    borderRadius: 8,
    padding: 11,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  proofButtonText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  nav: {
    height: 64,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  navItem: { alignItems: "center", gap: 3 },
  navText: { fontSize: 10, color: "#9aa8ba" },
  navActive: { color: "#e07a38" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.45)",
    justifyContent: "flex-end",
  },
  proofModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 28,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#0d382c" },
  close: { fontSize: 28, color: "#526174" },
  modalHint: { color: "#78879b", fontSize: 10, marginTop: 4 },
  inputLabel: {
    color: "#526174",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#d8e0e8",
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#253149",
    backgroundColor: "#fbfcfd",
  },
  inputRow: { flexDirection: "row", gap: 8 },
  uploadBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#c9d4df",
    borderRadius: 9,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  uploadIcon: { color: "#a44c35", fontSize: 22 },
  uploadTitle: {
    color: "#42526a",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: "#a44c35",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  notice: { color: "#78879b", fontSize: 10, marginTop: 10, lineHeight: 15 },
});
