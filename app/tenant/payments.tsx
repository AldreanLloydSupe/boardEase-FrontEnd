import { AppAlert as Alert } from "@/components/app-alert";
import DateTimePicker from "@/components/date-time-picker";
import { AssignedTenantNav } from "@/components/tenant-navigation";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { cycleDetails, peso, timestampMillis } from "@/lib/billing";
import { db } from "@/lib/firebase";
import { sharedImage } from "@/lib/image-data";
import { usePropertySettings } from "@/lib/use-property-settings";
import { useTenantData } from "@/lib/use-tenant-data";
import { Ionicons } from "@expo/vector-icons";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import React from "react";
import {
  ActivityIndicator,
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
  reference: string;
  method: string;
  period: string;
  tenantName: string;
  roomNumber: string;
};

export default function TenantPayments() {
  const { user } = useAuth();
  const { profile, payments, loading, error } = useTenantData();
  const { settings, error: settingsError } = usePropertySettings();
  const receiverNumber = String(settings.gcashNumber || "");
  const receiverName = String(settings.gcashName || "");
  const cycle = cycleDetails(profile, payments);
  const [paymentMethod, setPaymentMethod] = React.useState<"gcash" | "cash">(
    "gcash",
  );
  const [cashAmount, setCashAmount] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [proofOpen, setProofOpen] = React.useState(false);
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [sentAt, setSentAt] = React.useState(() => new Date());
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [timePickerOpen, setTimePickerOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] =
    React.useState<ImagePicker.ImagePickerAsset | null>(null);
  const [amount, setAmount] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedReceipt, setSelectedReceipt] = React.useState<Receipt | null>(
    null,
  );
  const [receiptDetailsOpen, setReceiptDetailsOpen] = React.useState(false);

  const receipts: Receipt[] = payments
    .filter((p) => p.status === "approved")
    .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt))
    .map((p) => ({
      id: p.id,
      date: String(p.dateSent || "Not recorded"),
      amount: peso(p.amount),
      reference: String(p.referenceNumber || p.reference || "Not recorded"),
      method: p.paymentMethod === "cash" ? "Cash" : "GCash",
      period: String(p.billingPeriod || "Not allocated"),
      tenantName: String(
        p.tenantName || profile.name || user?.displayName || "Tenant",
      ),
      roomNumber: String(p.roomNumber || "Not recorded"),
    }));

  async function downloadReceipt(receipt: Receipt) {
    try {
      const contents = [
        "BOARDEASE PAYMENT RECEIPT",
        "-------------------------",
        `Payment Record: ${receipt.id}`,
        `Tenant: ${receipt.tenantName}`,
        `Amount Paid: ${receipt.amount}`,
        `Payment Date: ${receipt.date}`,
        `Payment Method: ${receipt.method}`,
        `Room: ${receipt.roomNumber}`,
        `Billing period: ${receipt.period}`,
        `Payment reference: ${receipt.reference}`,
        "BoardEase payment acknowledgement; not a BIR tax invoice.",
        "Status: PAID",
      ].join("\n");
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([contents], { type: "text/plain;charset=utf-8" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = `boardease-${receipt.id}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }
      const directory =
        FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (!directory) throw new Error("Receipt storage is unavailable.");
      const fileUri = `${directory}boardease-${receipt.id}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, contents);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: `Download ${receipt.id}`,
          mimeType: "text/plain",
          UTI: "public.plain-text",
        });
      } else {
        Alert.alert(
          "Receipt saved",
          `Receipt ${receipt.id} was saved on this device.`,
        );
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
    if (loading || error || !profile.hasRoom || cycle.balance <= 0) return;
    setAmount(cycle.balance.toFixed(2));
    setFeedback("");
    setSentAt(new Date());
    setDatePickerOpen(false);
    setTimePickerOpen(false);
    setProofOpen(true);
  }

  function handleDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
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

  function handleTimeChange(event: DateTimePickerEvent, selectedTime?: Date) {
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
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      if (asset.base64.length > 500_000) {
        Alert.alert(
          "Image too large for Firestore",
          "Choose or crop a smaller receipt photo, then try again.",
        );
        return;
      }
      setSelectedImage(asset);
    } catch {
      Alert.alert(
        "Unable to open photos",
        "Please try selecting the receipt again.",
      );
    }
  }

  async function submitProof() {
    if (isSubmitting) return;
    if (!/^[0-9]{13}$/.test(referenceNumber.trim())) {
      Alert.alert(
        "Reference number required",
        "Enter the 13-digit GCash reference number (numbers only).",
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
    if (!profile.hasRoom || !profile.roomId) {
      setFeedback("An active room assignment is required.");
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
      const receiptUrl = sharedImage(selectedImage);
      const ref = doc(db, "payments", user.uid + "__" + referenceNumber.trim());
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists() && existing.data().status !== "rejected")
          throw new Error(
            "This reference was already submitted. Wait for management review.",
          );

        tx.set(ref, {
          tenantId: user.uid,
          tenantName: String(profile.name || user.displayName || "Tenant"),
          roomId: String(profile.roomId || ""),
          roomNumber: String(profile.roomNumber || ""),
          billingPeriod: cycle.period,
          amount: parsedAmount,
          paymentMethod: "gcash",
          referenceNumber: referenceNumber.trim(),
          dateSent: formatDate(sentAt),
          timeSent: formatTime(sentAt),
          receiptUrl,
          status: "pending",
          createdAt: serverTimestamp(),
        });
      });
      setFeedback("Payment proof submitted for review.");
      setReferenceNumber("");
      setSelectedImage(null);

      setProofOpen(false);
      Alert.alert(
        "Proof submitted",
        "Your payment is waiting for landlord verification.",
      );
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
  async function submitCashPayment() {
    if (isSubmitting) return;
    if (!profile.hasRoom || !profile.roomId) {
      Alert.alert("Active room required", "An active room assignment is required.");
      return;
    }
    const parsedAmount = Number(cashAmount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }
    if (parsedAmount > cycle.balance) {
      Alert.alert(
        "Amount exceeds rent due",
        `Enter ${peso(cycle.balance)} or less.`,
      );
      return;
    }
    if (!db || !user) {
      Alert.alert("Firebase unavailable", "Sign in again and try again.");
      return;
    }
    setIsSubmitting(true);
    try {
      const referenceNumber = `CASH-${Date.now()}`;
      const submittedAt = new Date();
      const ref = doc(db, "payments", user.uid + "__" + referenceNumber);
      await runTransaction(db, async (tx) => {
        const existing = await tx.get(ref);
        if (existing.exists() && existing.data().status !== "rejected")
          throw new Error("This cash payment was already submitted.");
        tx.set(ref, {
          tenantId: user.uid,
          tenantName: String(profile.name || user.displayName || "Tenant"),
          roomId: String(profile.roomId || ""),
          roomNumber: String(profile.roomNumber || ""),
          billingPeriod: cycle.period,
          amount: parsedAmount,
          paymentMethod: "cash",
          referenceNumber,
          dateSent: formatDate(submittedAt),
          timeSent: formatTime(submittedAt),
          receiptUrl: "",
          status: "pending",
          createdAt: serverTimestamp(),
        });
      });
      setCashAmount("");
      setFeedback("Cash payment submitted for landlord approval.");
      Alert.alert(
        "Cash payment submitted",
        "Your payment is waiting for landlord approval.",
      );
    } catch (error: unknown) {
      Alert.alert(
        "Unable to submit cash payment",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader title="Payments" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.methodChoices}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: paymentMethod === "gcash" }}
            style={[
              styles.methodChoice,
              paymentMethod === "gcash" && styles.methodChoiceActive,
            ]}
            onPress={() => setPaymentMethod("gcash")}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={17}
              color={paymentMethod === "gcash" ? "#fff" : "#2864e8"}
            />
            <Text
              style={[
                styles.methodChoiceText,
                paymentMethod === "gcash" && styles.methodChoiceTextActive,
              ]}
            >
              GCash
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: paymentMethod === "cash" }}
            style={[
              styles.methodChoice,
              paymentMethod === "cash" && styles.methodChoiceActive,
            ]}
            onPress={() => {
              setPaymentMethod("cash");
              setCashAmount(cycle.balance > 0 ? cycle.balance.toFixed(2) : "");
            }}
          >
            <Ionicons
              name="cash-outline"
              size={17}
              color={paymentMethod === "cash" ? "#fff" : "#2864e8"}
            />
            <Text
              style={[
                styles.methodChoiceText,
                paymentMethod === "cash" && styles.methodChoiceTextActive,
              ]}
            >
              Cash
            </Text>
          </Pressable>
        </View>
        {!!(error || feedback) && (
          <Text accessibilityRole="alert">{error || feedback}</Text>
        )}
        {!!settingsError && (
          <Text accessibilityRole="alert">{settingsError}</Text>
        )}
        {loading && <ActivityIndicator />}

        <View style={styles.card}>
          <Text style={styles.badge}>
            {cycle.balance === 0
              ? "NO BALANCE"
              : cycle.daysUntilDue < 0
                ? "OVERDUE"
                : `DUE IN ${cycle.daysUntilDue} DAYS`}
          </Text>
          <Text style={styles.deadline}>
            Payment deadline: {cycle.due.toLocaleDateString("en-PH")}
          </Text>
          <Text style={styles.sectionTitle}>Monthly Rent Due</Text>
          <Text style={styles.total}>
            {loading || error ? "—" : peso(cycle.balance)}
          </Text>
          <Text style={styles.muted}>
            Base billing for current active tenancy cycle
          </Text>
          <Line
            icon="bed-outline"
            label="Monthly rent"
            value={peso(cycle.rent)}
          />
          <Line
            icon="checkmark-circle-outline"
            label="Approved this billing period"
            value={peso(cycle.paid)}
          />
          {paymentMethod === "gcash" && (
            <Pressable
              disabled={
                loading || !!error || !profile.hasRoom || cycle.balance <= 0
              }
              style={styles.payButton}
              onPress={openProof}
            >
              <Ionicons name="flash" size={15} color="#fff" />
              <Text style={styles.payText}>Pay {peso(cycle.balance)} Now</Text>
            </Pressable>
          )}
        </View>

        {paymentMethod === "cash" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cash payment</Text>
            <Text style={styles.muted}>
              Enter the amount you will pay directly to property management.
              The payment will remain pending until approved.
            </Text>
            <Text style={styles.inputLabel}>Amount you will pay</Text>
            <TextInput
              style={styles.input}
              value={cashAmount}
              onChangeText={setCashAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              editable={!isSubmitting}
              accessibilityLabel="Cash payment amount"
            />
            <Pressable
              style={[
                styles.payButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={() => void submitCashPayment()}
              disabled={
                isSubmitting ||
                loading ||
                !!error ||
                !profile.hasRoom ||
                cycle.balance <= 0
              }
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payText}>
                  Send Cash Payment for Approval
                </Text>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment submissions</Text>
          <Text style={styles.muted}>
            Contact management for any separately billed utilities.
          </Text>
          {payments
            .filter((p) => p.status !== "approved")
            .map((p) => (
              <Text key={p.id} style={styles.muted}>
                {p.paymentMethod === "cash" ? "Cash · " : "GCash · "}
                {peso(p.amount)} · {String(p.status || "pending")} · Ref{" "}
                {String(p.referenceNumber || "—")}
              </Text>
            ))}
        </View>
        {paymentMethod === "gcash" && (
          <View style={styles.gcashCard}>
            <View style={styles.gcashHeading}>
              <Ionicons name="wallet-outline" size={18} color="#2864e8" />
              <Text style={styles.gcashTitle}>Direct GCash Transfer</Text>
            </View>
            <Text style={styles.gcashLabel}>RECEIVER GCASH ACCOUNT</Text>
            <View style={styles.gcashReceiver}>
              <View>
                <Text style={styles.gcashName}>
                  {receiverName || "Receiver not configured"}
                </Text>
                <Text style={styles.muted}>BoardEase Management & Admin</Text>
                <Text style={styles.gcashNumber}>
                  {receiverNumber || "Contact management for payment details"}
                </Text>
              </View>
              <Pressable
                disabled={!receiverNumber}
                onPress={() =>
                  void Clipboard.setStringAsync(receiverNumber)
                    .then(() => setFeedback("GCash number copied."))
                    .catch(() =>
                      setFeedback(
                        "Could not copy. Please copy the displayed number manually.",
                      ),
                    )
                }
              >
                <Text style={styles.copyText}>Copy</Text>
              </Pressable>
            </View>
            <Text style={styles.gcashLabel}>TRANSFER INSTRUCTIONS</Text>
            <Text style={styles.instruction}>
              1. Open your GCash app and tap Send Money.
            </Text>
            <Text style={styles.instruction}>
              2. Confirm the receiver account name in GCash before sending.
            </Text>
            <Text style={styles.instruction}>
              3. Keep your reference number and submit proof using Pay Now.
            </Text>
          </View>
        )}

        {paymentMethod === "gcash" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Preferences</Text>
            <Line
              icon="phone-portrait-outline"
              label="Manual GCash transfer"
              value="MANUAL"
              detail="Send your transfer and submit proof for review"
            />
            <Line
              icon="alarm-outline"
              label="In-App Payment Reminders"
              value={
                profile.notificationsEnabled === false ||
                profile.paymentReminders === false
                  ? "OFF"
                  : "ON"
              }
              detail={`${String(profile.reminderTiming || "3 days before")} · while the app is open`}
            />
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Receipts Archive</Text>
            <Ionicons name="refresh-outline" size={16} color="#71809a" />
          </View>
          <Text style={styles.muted}>Landlord-approved payment records</Text>
          {!receipts.length && (
            <Text style={styles.muted}>No approved payments yet.</Text>
          )}
          {receipts.map((receipt) => (
            <View style={styles.receipt} key={receipt.id}>
              <View>
                <Text style={styles.receiptAmount}>
                  {receipt.amount} <Text style={styles.paid}>PAID</Text>
                </Text>
                <Text style={styles.muted}>
                  {receipt.date} · Period {receipt.period}
                </Text>
              </View>
              <View style={styles.receiptActions}>
                <Text style={styles.receiptId}>{receipt.id}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => viewReceipt(receipt)}
                    accessibilityRole="button"
                    accessibilityLabel="View receipt details"
                    style={{
                      minHeight: 44,
                      minWidth: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="eye-outline" size={20} color="#2864e8" />
                    <Text style={styles.download}>Details</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void downloadReceipt(receipt)}
                    accessibilityRole="button"
                    accessibilityLabel="Download receipt"
                    style={{
                      minHeight: 44,
                      minWidth: 44,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name="download-outline"
                      size={20}
                      color="#2864e8"
                    />
                    <Text style={styles.download}>Download</Text>
                  </Pressable>
                </View>
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
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.rowBetween}>
                <Text style={styles.modalTitle}>Receipt Details</Text>
                <Pressable onPress={() => setReceiptDetailsOpen(false)}>
                  <Text style={styles.close}>×</Text>
                </Pressable>
              </View>
              <Text style={styles.modalHint}>
                Landlord-approved payment acknowledgement
              </Text>
              <Text style={styles.inputLabel}>Payment record ID</Text>
              <Text style={styles.detailValue}>
                {selectedReceipt?.id || "—"}
              </Text>
              <Text style={styles.inputLabel}>Tenant</Text>
              <Text style={styles.detailValue}>
                {selectedReceipt?.tenantName || "Tenant"}
              </Text>
              <Text style={styles.inputLabel}>Amount paid</Text>
              <Text style={styles.detailValue}>
                {selectedReceipt?.amount || "—"}
              </Text>
              <Text style={styles.inputLabel}>Payment date</Text>
              <Text style={styles.detailValue}>
                {selectedReceipt?.date || "—"}
              </Text>
              <Text style={styles.inputLabel}>Payment method</Text>
              <Text style={styles.detailValue}>
                {selectedReceipt?.method || "—"}
              </Text>
              <Text style={styles.inputLabel}>Description</Text>
              <Text style={styles.detailValue}>
                Period {selectedReceipt?.period} · Room{" "}
                {selectedReceipt?.roomNumber}
              </Text>
              <Text style={styles.inputLabel}>Payment reference</Text>
              <Text style={styles.detailValue}>
                {selectedReceipt?.reference}
              </Text>
            </ScrollView>
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
            <ScrollView keyboardShouldPersistTaps="handled">
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
                placeholder="13-digit reference"
                keyboardType="number-pad"
                maxLength={13}
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
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#526174"
                    />
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
                accessibilityLabel={
                  selectedImage
                    ? "Change receipt image"
                    : "Upload receipt image"
                }
              >
                {selectedImage ? (
                  <>
                    {selectedImage.uri ? (
                      <Image
                        source={{ uri: selectedImage.uri }}
                        style={styles.receiptPreview}
                      />
                    ) : null}
                    <Text style={styles.uploadTitle}>Receipt selected</Text>
                    <Text style={styles.changeReceipt}>Tap to change</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={22}
                      color="#2864e8"
                    />
                    <Text style={styles.uploadTitle}>
                      Tap to upload receipt
                    </Text>
                    <Text style={styles.modalHint}>
                      Compressed JPEG receipt
                    </Text>
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
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
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
            </ScrollView>
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
  methodChoices: { flexDirection: "row", gap: 10, marginBottom: 12 },
  methodChoice: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce7f5",
    borderRadius: 9,
  },
  methodChoiceActive: { backgroundColor: "#2864e8", borderColor: "#2864e8" },
  methodChoiceText: { color: "#2864e8", fontSize: 13, fontWeight: "700" },
  methodChoiceTextActive: { color: "#fff" },
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
  brand: {
    fontSize: 10,
    color: "#d9e5ff",
    fontWeight: "700",
    letterSpacing: 1.3,
  },
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
  deadline: {
    color: "#526174",
    fontSize: 11,
    marginTop: 8,
    flexShrink: 1,
  },
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
  gcashLabel: {
    color: "#8997a6",
    fontSize: 9,
    fontWeight: "700",
    marginTop: 13,
  },
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
  gcashNumber: {
    color: "#2458c7",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
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
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
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
