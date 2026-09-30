import { TenantHeaderMark } from "@/components/tenant-header-mark";
import { NotificationBell } from "@/components/notification-bell";
import { AssignedTenantNav } from "@/components/tenant-navigation";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
    addDoc,
    collection,
    serverTimestamp,
} from "firebase/firestore";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
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

type Receipt = {
  id: string;
  date: string;
  amount: string;
};

export default function TenantPayments() {
  const { user } = useAuth();
  const [proofOpen, setProofOpen] = React.useState(false);
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [sentAt, setSentAt] = React.useState(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [timePickerOpen, setTimePickerOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] =
    React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [amount, setAmount] = React.useState("₱3,500.00");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedReceipt, setSelectedReceipt] = React.useState<Receipt | null>(null);
  const [receiptDetailsOpen, setReceiptDetailsOpen] = React.useState(false);

  const receipts: Receipt[] = [
    { id: "OR-0892", date: "Sep 04, 2026", amount: "₱3,500.00" },
    { id: "OR-0741", date: "Aug 05, 2026", amount: "₱3,500.00" },
    { id: "OR-0610", date: "Jul 04, 2026", amount: "₱3,500.00" },
  ];

  async function downloadReceipt(receipt: Receipt) {
    try {
      const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!directory) throw new Error("Receipt storage is unavailable.");
      const fileUri = `${directory}${receipt.id}.txt`;
      const contents = [
        "BOARDEASE PAYMENT RECEIPT",
        "-------------------------",
        `Official Receipt: ${receipt.id}`,
        `Tenant: ${user?.displayName || "Tenant"}`,
        `Amount Paid: ${receipt.amount}`,
        `Payment Date: ${receipt.date}`,
        "Description: Rent & Wi-Fi",
        "Status: PAID",
      ].join("\\n");
      await FileSystem.writeAsStringAsync(fileUri, contents);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: `Download ${receipt.id}`,
          mimeType: "text/plain",
          UTI: "public.plain-text",
        });
      } else {
        Alert.alert("Receipt saved", `Receipt ${receipt.id} was saved on this device.`);
      }
    } catch (error) {
      Alert.alert(
        "Unable to download receipt",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  function viewReceipt(receipt: Receipt) {
    setSelectedReceipt(receipt);
    setReceiptDetailsOpen(true);
  }

  function openProof() {
    setSentAt(new Date());
    setDatePickerOpen(false);
    setTimePickerOpen(false);
    setProofOpen(true);
  }

  function handleDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) {
    if (Platform.OS === "android") setDatePickerOpen(false);
    if (event.type === "set" && selectedDate) {
      setSentAt((current) => {
        const next = new Date(current);
        next.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
        );
        return next;
      });
    }
  }

  function handleTimeChange(
    event: DateTimePickerEvent,
    selectedTime?: Date,
  ) {
    if (Platform.OS === "android") setTimePickerOpen(false);
    if (event.type === "set" && selectedTime) {
      setSentAt((current) => {
        const next = new Date(current);
        next.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
        return next;
      });
    }
  }

  async function chooseReceipt() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo access needed",
          "Allow access to your photos to attach a payment receipt.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri || !asset.base64) {
        Alert.alert("Unable to read image", "Choose another receipt photo.");
        return;
      }
      if (asset.base64.length > 900_000) {
        Alert.alert(
          "Image too large for Firestore",
          "Choose or crop a smaller receipt photo, then try again.",
        );
        return;
      }
      setSelectedImage(asset);
    } catch {
      Alert.alert("Unable to open photos", "Please try selecting the receipt again.");
    }
  }

  async function submitProof() {
    if (!referenceNumber.trim()) {
      Alert.alert(
        "Reference number required",
        "Enter the GCash reference number before submitting.",
      );
      return;
    }
    if (!selectedImage?.base64) {
      Alert.alert(
        "Receipt required",
        "Choose a photo of your payment receipt before submitting.",
      );
      return;
    }
    const parsedAmount = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount greater than zero.");
      return;
    }
    if (!db || !user) {
      Alert.alert(
        "Firebase unavailable",
        "Sign in and check the Firebase configuration before submitting payment proof.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const receiptBase64 = `data:image/jpeg;base64,${selectedImage.base64}`;

      await addDoc(collection(db, "payments"), {
        tenantId: user.uid,
        tenantName: user.displayName || user.email || "Tenant",
        amount: parsedAmount,
        referenceNumber: referenceNumber.trim(),
        dateSent: formatDate(sentAt),
        timeSent: formatTime(sentAt),
        receiptUrl: receiptBase64,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setProofOpen(false);
      Alert.alert(
        "Proof submitted",
        "Your payment is waiting for landlord verification.",
      );
      setReferenceNumber("");
      setSelectedImage(null);
    } catch (error: unknown) {
      Alert.alert(
        "Unable to submit proof",
        error instanceof Error
          ? error.message
          : "Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TenantHeaderMark />
          <View style={styles.headerCopy}>
            <Text style={styles.brand}>BOARDEASE</Text>
            <Text style={styles.title}>Payments</Text>
          </View>
          <NotificationBell />
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
            onPress={openProof}
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
              <Text style={styles.muted}>BoardEase Management & Admin</Text>
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
            label="In-App Payment Reminders"
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
          {receipts.map((receipt, index) => (
            <View style={styles.receipt} key={receipt.id}>
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
              <View style={styles.receiptActions}>
                <Text style={styles.receiptId}>{receipt.id}</Text>
                <Text
                  style={styles.download}
                  onPress={() =>
                    index === 0 ? downloadReceipt(receipt) : viewReceipt(receipt)
                  }
                >
                  {index === 0 ? "⇩ Download Receipt" : "▣ View Details"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <AssignedTenantNav active="Payments" />
      <Modal
        visible={receiptDetailsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptDetailsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.proofModal}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Receipt Details</Text>
              <Pressable onPress={() => setReceiptDetailsOpen(false)}>
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <Text style={styles.modalHint}>BoardEase verified payment receipt</Text>
            <Text style={styles.inputLabel}>Official receipt</Text>
            <Text style={styles.detailValue}>{selectedReceipt?.id || "—"}</Text>
            <Text style={styles.inputLabel}>Tenant</Text>
            <Text style={styles.detailValue}>{user?.displayName || "Tenant"}</Text>
            <Text style={styles.inputLabel}>Amount paid</Text>
            <Text style={styles.detailValue}>{selectedReceipt?.amount || "—"}</Text>
            <Text style={styles.inputLabel}>Payment date</Text>
            <Text style={styles.detailValue}>{selectedReceipt?.date || "—"}</Text>
            <Text style={styles.inputLabel}>Description</Text>
            <Text style={styles.detailValue}>Rent & Wi-Fi · PAID</Text>
          </View>
        </View>
      </Modal>
      <Modal
        visible={proofOpen}
        transparent
        animationType="fade"
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
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholder="e.g. 1002 8492 7104"
            />
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Date Sent</Text>
                <Pressable
                  style={styles.pickerButton}
                  onPress={() => {
                    setDatePickerOpen((open) => !open);
                    setTimePickerOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Date sent, ${formatDate(sentAt)}`}
                >
                  <Text style={styles.pickerText}>{formatDate(sentAt)}</Text>
                  <Ionicons name="calendar-outline" size={16} color="#526174" />
                </Pressable>
                {datePickerOpen && (
                  <DateTimePicker
                    value={sentAt}
                    mode="date"
                    display={Platform.OS === "ios" ? "compact" : "default"}
                    onChange={handleDateChange}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Time Sent</Text>
                <Pressable
                  style={styles.pickerButton}
                  onPress={() => {
                    setTimePickerOpen((open) => !open);
                    setDatePickerOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Time sent, ${formatTime(sentAt)}`}
                >
                  <Text style={styles.pickerText}>{formatTime(sentAt)}</Text>
                  <Ionicons name="time-outline" size={16} color="#526174" />
                </Pressable>
                {timePickerOpen && (
                  <DateTimePicker
                    value={sentAt}
                    mode="time"
                    display={Platform.OS === "ios" ? "compact" : "default"}
                    onChange={handleTimeChange}
                  />
                )}
              </View>
            </View>
            <Text style={styles.inputLabel}>Amount Transferred</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            <Pressable
              style={styles.uploadBox}
              onPress={chooseReceipt}
              accessibilityRole="button"
              accessibilityLabel={selectedImage ? "Change receipt image" : "Upload receipt image"}
            >
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.receiptPreview} />
                  <Text style={styles.uploadTitle}>Receipt selected</Text>
                  <Text style={styles.changeReceipt}>Tap to change</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={22} color="#2864e8" />
                  <Text style={styles.uploadTitle}>Tap to upload receipt</Text>
                  <Text style={styles.modalHint}>Compressed JPEG receipt</Text>
                </>
              )}
            </Pressable>
            {selectedImage && (
              <Pressable
                style={styles.removeReceiptButton}
                onPress={() => setSelectedImage(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove receipt image"
              >
                <Text style={styles.removeReceiptText}>Remove receipt</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={submitProof}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  ▷ Submit GCash Payment Proof
                </Text>
              )}
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

function formatDate(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${month}/${day}/${value.getFullYear()}`;
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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
    paddingTop: 18,
    paddingBottom: 20,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
  },
  headerCopy: { flex: 1, marginLeft: 11 },
  brand: { fontSize: 10, color: "#d9e5ff", fontWeight: "700", letterSpacing: 1.3 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  propertyRow: {
    backgroundColor: "#fff",
    borderRadius: 9,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2864e8" },
  property: { fontSize: 10, color: "#2458c7", fontWeight: "700" },
  tenant: { fontSize: 12, color: "#253149", marginTop: 2 },
  cycle: { fontSize: 10, color: "#526174" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e1eafa",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badge: {
    backgroundColor: "#eaf1ff",
    color: "#2458c7",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "700",
  },
  deadline: { textAlign: "right", color: "#2458c7", fontSize: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#253149",
    marginTop: 8,
  },
  total: { fontSize: 30, color: "#1d4ed8", fontWeight: "800", marginTop: 10 },
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
    backgroundColor: "#2864e8",
    borderRadius: 8,
    padding: 11,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  payText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardTitle: { fontSize: 13, color: "#253149", fontWeight: "700" },
  smallBadge: {
    backgroundColor: "#f3f7fd",
    borderRadius: 8,
    padding: 4,
    fontSize: 9,
    color: "#526174",
  },
  bundle: {
    backgroundColor: "#f3f7fd",
    borderRadius: 7,
    padding: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  bundleText: { fontSize: 10, color: "#42526a" },
  receipt: {
    backgroundColor: "#f3f7fd",
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
  receiptId: { fontSize: 10, color: "#526174", textAlign: "right" },
  receiptActions: { alignItems: "flex-end", gap: 2 },
  download: {
    fontSize: 11,
    color: "#2864e8",
    fontWeight: "700",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  gcashCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e1eafa",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  gcashHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  gcashTitle: { color: "#253149", fontSize: 14, fontWeight: "700" },
  gcashLabel: { color: "#8997a6", fontSize: 9, fontWeight: "700", marginTop: 13 },
  gcashReceiver: {
    backgroundColor: "#f3f7fd",
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gcashName: { color: "#253149", fontSize: 12, fontWeight: "700" },
  gcashNumber: { color: "#2458c7", fontSize: 14, fontWeight: "700", marginTop: 5 },
  copyText: { color: "#2864e8", fontSize: 11, fontWeight: "700" },
  instruction: { color: "#526174", fontSize: 10, lineHeight: 16, marginTop: 4 },
  proofButton: {
    backgroundColor: "#2864e8",
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
  navActive: { color: "#2563eb" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.45)",
    justifyContent: "center",
    padding: 16,
  },
  proofModal: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    paddingBottom: 28,
    maxHeight: "92%",
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: "#253149" },
  close: { fontSize: 28, color: "#526174" },
  modalHint: { color: "#78879b", fontSize: 10, marginTop: 4 },
  inputLabel: {
    color: "#526174",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 5,
  },
  detailValue: {
    color: "#253149",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#d4e0f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#253149",
    backgroundColor: "#fbfcfd",
  },
  pickerButton: {
    height: 42,
    borderWidth: 1,
    borderColor: "#d4e0f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fbfcfd",
  },
  pickerText: { color: "#253149", fontSize: 13 },
  inputRow: { flexDirection: "row", gap: 8 },
  uploadBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b9ccef",
    borderRadius: 9,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  receiptPreview: {
    width: 190,
    height: 84,
    borderRadius: 6,
    resizeMode: "cover",
  },
  changeReceipt: { color: "#2864e8", fontSize: 10, marginTop: 2 },
  removeReceiptButton: { alignSelf: "flex-end", paddingVertical: 6 },
  removeReceiptText: { color: "#c0392b", fontSize: 11, fontWeight: "700" },
  uploadIcon: { color: "#2864e8", fontSize: 22 },
  uploadTitle: {
    color: "#42526a",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  submitButton: {
    backgroundColor: "#2864e8",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  notice: { color: "#78879b", fontSize: 10, marginTop: 10, lineHeight: 15 },
});
