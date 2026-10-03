import { RevenueChart } from "@/components/revenue-chart";
import { paymentAmount as amountValue, paymentTime } from "@/lib/finance-chart";
import { AppAlert as Alert } from "@/components/app-alert";
import { LandlordNavigation } from "@/components/landlord-navigation";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notification-data";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@/components/date-time-picker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Payment = {
  id: string;
  tenantId?: string;
  tenantName?: string;
  amount?: number | string;
  referenceNumber?: string;
  reference?: string;
  dateSent?: string;
  timeSent?: string;
  receiptUrl?: string;
  status?: string;
  createdAt?: { toMillis: () => number } | Date | string | null;
};

function formatCurrency(amount: number) {
  return amount.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  });
}

function formatMonth(value: Date) {
  return value.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function paymentDate(payment: Payment) {
  if (payment.dateSent) return payment.dateSent;
  const timestamp = paymentTime(payment);
  return timestamp
    ? new Date(timestamp).toLocaleDateString("en-PH")
    : "Date unavailable";
}

export default function Finance() {
  const [allPayments, setAllPayments] = React.useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(
    null,
  );
  const [showAllPayments, setShowAllPayments] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(Boolean(db));
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [loadError, setLoadError] = React.useState(!db);
  const [selectedMonth, setSelectedMonth] = React.useState(() => new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (!db) {
      return;
    }

    return onSnapshot(
      collection(db, "payments"),
      (snapshot) => {
        const allPayments = snapshot.docs.map((paymentDoc) => ({
          id: paymentDoc.id,
          ...(paymentDoc.data() as DocumentData),
        })) as Payment[];
        allPayments.sort(
          (left, right) => paymentTime(right) - paymentTime(left),
        );
        setAllPayments(allPayments);
        setLoadError(false);
        setIsLoading(false);
      },
      () => {
        setLoadError(true);
        setIsLoading(false);
      },
    );
  }, []);

  const selectedMonthPayments = allPayments.filter((payment) => {
    const timestamp = paymentTime(payment);
    if (!timestamp) return false;
    const date = new Date(timestamp);
    return (
      date.getFullYear() === selectedMonth.getFullYear() &&
      date.getMonth() === selectedMonth.getMonth()
    );
  });
  const selectedPendingPayments = selectedMonthPayments.filter(
    (payment) => payment.status === "pending",
  );
  const selectedApprovedPayments = selectedMonthPayments.filter(
    (payment) => payment.status === "approved",
  );
  const pendingTotal = selectedPendingPayments.reduce(
    (total, payment) => total + amountValue(payment.amount),
    0,
  );
  const approvedTotal = selectedApprovedPayments.reduce(
    (total, payment) => total + amountValue(payment.amount),
    0,
  );
  const projectedRevenue = approvedTotal + pendingTotal;
  const recentPayments = selectedMonthPayments.slice(0, 8);

  function handleMonthChange(event: DateTimePickerEvent, date?: Date) {
    setIsDatePickerOpen(false);
    if (event.type === "set" && date) setSelectedMonth(date);
  }

  async function updatePaymentStatus(
    payment: Payment,
    status: "approved" | "rejected",
  ) {
    if (!db || isUpdating) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, "payments", payment.id), {
        status,
        updatedAt: serverTimestamp(),
        [status === "approved" ? "approvedAt" : "rejectedAt"]:
          serverTimestamp(),
      });
      if (payment.tenantId) {
        await createNotification(payment.tenantId, {
          type: "payment_update",
          title:
            status === "approved" ? "Payment approved" : "Payment rejected",
          body:
            status === "approved"
              ? "Your payment proof was verified by the landlord."
              : "Your payment proof was rejected. Please review and submit it again.",
          route: "/tenant/payments",
        }).catch(() =>
          Alert.alert(
            "Payment saved",
            "The notification could not be sent. The updated payment is still visible to the tenant.",
          ),
        );
      }
      setSelectedPayment(null);
      Alert.alert(
        status === "approved" ? "Payment approved" : "Payment rejected",
        status === "approved"
          ? "The payment is now included in collected revenue."
          : "The payment submission has been rejected.",
      );
    } catch {
      Alert.alert(
        "Unable to update payment",
        "Check your connection and try again.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerLogo}>
            <Ionicons name="business" size={24} color="#fff" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>BOARDEASE</Text>
            <Text style={styles.title}>Financial Overview</Text>
          </View>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Pressable
          style={styles.period}
          onPress={() => setIsDatePickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Select finance month, ${formatMonth(selectedMonth)}`}
        >
          <Text>{formatMonth(selectedMonth)}</Text>
          <Ionicons name="calendar-outline" size={16} color="#66768a" />
        </Pressable>
        {isDatePickerOpen && (
          <DateTimePicker
            value={selectedMonth}
            mode="date"
            display={Platform.OS === "ios" ? "compact" : "default"}
            onChange={handleMonthChange}
          />
        )}
        <RevenueChart
          payments={allPayments}
          anchor={selectedMonth}
          loading={isLoading}
          error={loadError}
        />
        <Text style={styles.sectionLabel}>
          COLLECTED REVENUE · {formatMonth(selectedMonth)}
        </Text>
        <View style={styles.revenue}>
          <View>
            <Text style={styles.revenueValue}>
              {formatCurrency(approvedTotal)}
            </Text>
            <Text style={styles.muted}>
              {selectedApprovedPayments.length} approved payments
            </Text>
          </View>
        </View>
        <View style={styles.smallGrid}>
          <Metric
            label="PENDING/OVERDUE"
            value={formatCurrency(pendingTotal)}
            sub={`${selectedPendingPayments.length} pending payments`}
            color="#d9634b"
          />
          <Metric
            label="PROJECTED REVENUE"
            value={formatCurrency(projectedRevenue)}
            sub={`${selectedMonthPayments.length} submitted payments`}
            color="#536783"
          />
        </View>
        <Section
          title="Inflow Composition"
          action={`Total: ${formatCurrency(approvedTotal)}`}
        />
        <View style={styles.composition}>
          <View
            style={[
              styles.bar,
              {
                width: approvedTotal > 0 ? "100%" : "0%",
                backgroundColor: "#2864e8",
              },
            ]}
          />
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Approved payments</Text>
            <Text style={styles.lineValue}>
              {formatCurrency(approvedTotal)}
            </Text>
          </View>
        </View>
        <Section
          title="Overdue Watchlist"
          action={`${selectedPendingPayments.length} Payments`}
        />
        {isLoading ? (
          <ActivityIndicator color="#2864e8" />
        ) : selectedPendingPayments.length === 0 ? (
          <Text style={styles.emptyText}>
            No pending tenant payments for {formatMonth(selectedMonth)}.
          </Text>
        ) : (
          selectedPendingPayments.slice(0, 4).map((payment) => (
            <Pressable
              style={styles.overdue}
              key={payment.id}
              onPress={() => setSelectedPayment(payment)}
              accessibilityRole="button"
              accessibilityLabel={`Review pending payment from ${payment.tenantName || "Tenant"}`}
            >
              <View style={styles.round}>
                <Text>
                  {(payment.tenantName || "Tenant").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.person}>
                  {payment.tenantName || "Tenant"}
                </Text>
                <Text style={styles.muted}>
                  {paymentDate(payment)} · Pending review
                </Text>
              </View>
              <Text style={styles.overdueAmount}>
                {formatCurrency(amountValue(payment.amount))}
              </Text>
            </Pressable>
          ))
        )}
        <Section
          title="Recent Payments"
          action={`See all (${selectedMonthPayments.length})`}
          onPress={() => setShowAllPayments(true)}
        />
        {loadError ? (
          <Text style={styles.emptyText}>
            Unable to load payments. Check your Firebase connection and
            permissions.
          </Text>
        ) : isLoading ? (
          <ActivityIndicator color="#2864e8" />
        ) : recentPayments.length === 0 ? (
          <Text style={styles.emptyText}>
            No tenant payments recorded for {formatMonth(selectedMonth)}.
          </Text>
        ) : (
          recentPayments.map((payment) => {
            const row = (
              <View style={styles.payment}>
                <Ionicons
                  name={
                    payment.status === "approved"
                      ? "checkmark-circle-outline"
                      : payment.status === "pending"
                        ? "time-outline"
                        : "close-circle-outline"
                  }
                  size={22}
                  color={
                    payment.status === "approved"
                      ? "#168866"
                      : payment.status === "pending"
                        ? "#d9634b"
                        : "#71809a"
                  }
                />
                <View style={styles.flex}>
                  <Text style={styles.person}>
                    {payment.tenantName || "Tenant"}
                  </Text>
                  <Text style={styles.muted}>{paymentDate(payment)}</Text>
                </View>
                <View style={styles.paymentTrailing}>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(amountValue(payment.amount))}
                  </Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      payment.status === "approved"
                        ? styles.approvedBadge
                        : payment.status === "pending"
                          ? styles.pendingBadge
                          : styles.rejectedBadge,
                    ]}
                  >
                    {payment.status === "approved"
                      ? "Approved"
                      : payment.status === "pending"
                        ? "Pending"
                        : "Rejected"}
                  </Text>
                </View>
              </View>
            );
            return payment.status === "pending" ? (
              <Pressable
                key={payment.id}
                onPress={() => setSelectedPayment(payment)}
                accessibilityRole="button"
              >
                {row}
              </Pressable>
            ) : (
              <View key={payment.id}>{row}</View>
            );
          })
        )}
      </ScrollView>
      <LandlordNavigation active="Finance" />
      <Modal
        visible={showAllPayments}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAllPayments(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.historyModal}>
            <View style={styles.detailHeader}>
              <View style={styles.flex}>
                <Text style={styles.detailTitle}>Payment History</Text>
                <Text style={styles.muted}>
                  {selectedMonthPayments.length} submissions ·{" "}
                  {formatMonth(selectedMonth)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAllPayments(false)}
                style={styles.closeHistoryButton}
                accessibilityRole="button"
                accessibilityLabel="Close payment history"
              >
                <Ionicons name="close" size={22} color="#526174" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.historyList}>
              {selectedMonthPayments.length === 0 ? (
                <Text style={styles.emptyText}>
                  No tenant payments recorded for {formatMonth(selectedMonth)}.
                </Text>
              ) : (
                selectedMonthPayments.map((payment) => (
                  <TouchableOpacity
                    key={payment.id}
                    style={styles.historyItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setShowAllPayments(false);
                      if (payment.status === "pending")
                        setSelectedPayment(payment);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${payment.tenantName || "Tenant"}, ${formatCurrency(amountValue(payment.amount))}, ${payment.status || "unknown"}`}
                  >
                    <View style={styles.flex}>
                      <Text style={styles.person}>
                        {payment.tenantName || "Tenant"}
                      </Text>
                      <Text style={styles.muted}>{paymentDate(payment)}</Text>
                    </View>
                    <View style={styles.paymentTrailing}>
                      <Text style={styles.paymentAmount}>
                        {formatCurrency(amountValue(payment.amount))}
                      </Text>
                      <Text
                        style={[
                          styles.statusBadge,
                          payment.status === "approved"
                            ? styles.approvedBadge
                            : payment.status === "pending"
                              ? styles.pendingBadge
                              : styles.rejectedBadge,
                        ]}
                      >
                        {payment.status === "approved"
                          ? "Approved"
                          : payment.status === "pending"
                            ? "Pending"
                            : "Rejected"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={selectedPayment !== null}
        transparent
        animationType="slide"
        onRequestClose={() => !isUpdating && setSelectedPayment(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={styles.flex}>
                <Text style={styles.detailTitle}>Payment Review</Text>
                <Text style={styles.muted}>
                  {selectedPayment?.tenantName || "Tenant"} ·{" "}
                  {selectedPayment ? paymentDate(selectedPayment) : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedPayment(null)}
                disabled={isUpdating}
                accessibilityLabel="Close payment details"
              >
                <Ionicons name="close" size={22} color="#526174" />
              </Pressable>
            </View>
            <Text style={styles.detailLabel}>GCash Reference Number</Text>
            <Text style={styles.detailValue}>
              {selectedPayment?.referenceNumber ||
                selectedPayment?.reference ||
                "Not provided"}
            </Text>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>
              {selectedPayment
                ? formatCurrency(amountValue(selectedPayment.amount))
                : ""}
            </Text>
            {selectedPayment?.receiptUrl ? (
              <Image
                source={
                  selectedPayment.receiptUrl
                    ? { uri: selectedPayment.receiptUrl }
                    : undefined
                }
                style={styles.detailReceipt}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.emptyReceipt}>
                No receipt image attached.
              </Text>
            )}
            <View style={styles.reviewActions}>
              <Pressable
                style={[
                  styles.rejectButton,
                  isUpdating && styles.disabledButton,
                ]}
                onPress={() =>
                  selectedPayment &&
                  updatePaymentStatus(selectedPayment, "rejected")
                }
                disabled={isUpdating}
              >
                <Text style={styles.rejectText}>
                  {isUpdating ? "Updating..." : "Reject"}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.approveButton,
                  isUpdating && styles.disabledButton,
                ]}
                onPress={() =>
                  selectedPayment &&
                  updatePaymentStatus(selectedPayment, "approved")
                }
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.approveText}>Approve</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function Metric({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.muted}>{sub}</Text>
    </View>
  );
}
function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress ? (
        <TouchableOpacity
          style={styles.sectionActionButton}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.sectionAction}>{action}</Text>
      )}
    </View>
  );
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BottomNav() {
  return (
    <View style={styles.nav}>
      {[
        ["grid-outline", "Dashboard"],
        ["business-outline", "Rooms"],
        ["people-outline", "Tenants"],
        ["bar-chart-outline", "Finance"],
      ].map(([icon, label], index) => (
        <Pressable
          key={label}
          style={styles.navItem}
          onPress={() =>
            index === 0
              ? router.replace("/landlord/dashboard" as any)
              : index === 1
                ? router.push("/landlord/rooms" as any)
                : index === 2
                  ? router.push("/landlord/tenants" as any)
                  : undefined
          }
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={index === 3 ? "#2864e8" : "#9aa8ba"}
          />
          <Text style={[styles.navText, index === 3 && styles.navActive]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  header: {
    minHeight: 94,
    backgroundColor: "#2864e8",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 0,
    marginBottom: 8,
  },
  headerBrand: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  kicker: {
    fontSize: 11,
    color: "#d9e5ff",
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 3 },
  paymentButton: {
    backgroundColor: "#173b36",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  paymentText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 18, paddingBottom: 25 },
  period: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dce7f5",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 11,
    color: "#64748b",
    letterSpacing: 1,
    fontWeight: "700",
  },
  revenue: {
    backgroundColor: "#eaf1ff",
    borderColor: "#ccdcff",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    minHeight: 96,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  revenueValue: { fontSize: 28, fontWeight: "800", color: "#1d4ed8" },
  muted: { fontSize: 11, color: "#8390a2", marginTop: 3 },
  emptyText: {
    fontSize: 12,
    color: "#71809a",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    padding: 16,
    textAlign: "center",
    marginBottom: 12,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  growth: {
    backgroundColor: "#d9f7e8",
    color: "#168866",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  revenuePercent: {
    position: "absolute",
    right: 12,
    top: 17,
    fontSize: 11,
    color: "#2458c7",
    fontWeight: "600",
  },
  smallGrid: { flexDirection: "row", gap: 10, marginTop: 10 },
  metric: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e1eafa",
    minHeight: 96,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metricValue: { fontSize: 19, fontWeight: "800", marginTop: 8 },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 23,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#253149" },
  sectionAction: { fontSize: 11, color: "#2864e8", fontWeight: "600" },
  sectionActionButton: {
    minHeight: 36,
    minWidth: 48,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 2,
  },
  composition: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    padding: 14,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  bar: { height: 8, borderRadius: 4, marginBottom: 10 },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
  },
  lineLabel: { fontSize: 12, color: "#536783" },
  lineValue: { fontSize: 12, fontWeight: "700", color: "#253149" },
  overdue: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffd8d3",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  round: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffe0d4",
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, marginLeft: 9 },
  person: { fontSize: 11, color: "#253149", fontWeight: "600" },
  overdueAmount: { color: "#d9634b", fontSize: 11, fontWeight: "700" },
  payment: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentAmount: { color: "#2458c7", fontSize: 12, fontWeight: "700" },
  paymentTrailing: { alignItems: "flex-end", gap: 5 },
  statusBadge: {
    overflow: "hidden",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 9,
    fontWeight: "700",
  },
  approvedBadge: { backgroundColor: "#d9f7e8", color: "#168866" },
  pendingBadge: { backgroundColor: "#fff0dc", color: "#a75b12" },
  rejectedBadge: { backgroundColor: "#eef1f5", color: "#64748b" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  detailModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 30,
    maxHeight: "85%",
  },
  historyModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 28,
    height: "82%",
  },
  historyList: { paddingBottom: 20 },
  historyItem: {
    minHeight: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  closeHistoryButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  detailTitle: { color: "#253149", fontSize: 18, fontWeight: "700" },
  detailLabel: { color: "#64748b", fontSize: 11, marginTop: 10 },
  detailValue: {
    color: "#253149",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },
  detailReceipt: {
    width: "100%",
    height: 240,
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: "#f3f7fd",
  },
  emptyReceipt: {
    color: "#71809a",
    textAlign: "center",
    padding: 20,
    marginTop: 14,
    backgroundColor: "#f3f7fd",
    borderRadius: 8,
  },
  reviewActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d9634b",
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectText: { color: "#b54835", fontSize: 13, fontWeight: "700" },
  approveButton: {
    flex: 1,
    backgroundColor: "#168866",
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  approveText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  disabledButton: { opacity: 0.6 },
  nav: {
    height: 66,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },
  navItem: { alignItems: "center", gap: 3 },
  navText: { fontSize: 11, color: "#9aa8ba" },
  navActive: { color: "#2864e8" },
});
