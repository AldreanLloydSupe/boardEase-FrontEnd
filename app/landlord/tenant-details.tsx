import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/lib/firebase";
import { cycleDetails, peso, timestampMillis } from "@/lib/billing";
import { TenantManagement } from "@/components/tenant-management";
import { LandlordNavigation } from "@/components/landlord-navigation";
import { MeterReadings } from "@/components/meter-readings";

function date(value: unknown) {
  const time = timestampMillis(value);
  return time ? new Date(time).toLocaleDateString() : "Not recorded";
}
function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <View style={styles.row}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text selectable style={styles.infoValue}>
        {String(value || "Not provided")}
      </Text>
    </View>
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
    <View style={styles.card}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}
export default function TenantDetails() {
  const { tenantId } = useLocalSearchParams<{ tenantId: string }>();
  const [attempt, setAttempt] = React.useState(0);
  return (
    <TenantDetailsView
      key={`${tenantId}:${attempt}`}
      tenantId={tenantId}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
function TenantDetailsView({
  tenantId,
  onRetry,
}: {
  tenantId: string;
  onRetry: () => void;
}) {
  const [tenant, setTenant] = React.useState<any>(null);
  const [payments, setPayments] = React.useState<any[]>([]);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [accountRequests, setAccountRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(Boolean(db && tenantId));
  const [errors, setErrors] = React.useState<Record<string, string>>(
    !db || !tenantId ? { profile: "Tenant record unavailable." } : {},
  );
  const [receiptId, setReceiptId] = React.useState<string | null>(null);
  React.useEffect(() => {
    const firestore = db;
    if (!firestore || !tenantId) return;
    const fail = (key: string) => (error: { code: string }) => {
      setErrors((previous) => ({
        ...previous,
        [key]: `Unable to load ${key} (${error.code}).`,
      }));
      if (key === "profile") setLoading(false);
    };
    const clear = (key: string) =>
      setErrors((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
    const stops = [
      onSnapshot(
        doc(firestore, "users", tenantId),
        (snapshot) => {
          setTenant(
            snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null,
          );
          setLoading(false);
          clear("profile");
        },
        fail("profile"),
      ),
      ...[
        ["payments", setPayments],
        ["maintenanceRequests", setRequests],
        ["accountRequests", setAccountRequests],
      ].map(([name, save]) =>
        onSnapshot(
          query(
            collection(firestore, name as string),
            where("tenantId", "==", tenantId),
          ),
          (snapshot) => {
            (save as React.Dispatch<React.SetStateAction<any[]>>)(
              snapshot.docs.map((record) => ({
                ...record.data(),
                id: record.id,
              })),
            );
            clear(name as string);
          },
          fail(name as string),
        ),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [tenantId]);
  const cycle = cycleDetails(tenant || {}, payments);
  const receipt = payments.find((payment) => payment.id === receiptId);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/landlord/tenants");
  const message = () =>
    router.push({ pathname: "/landlord/messages", params: { tenantId } });
  const action = (
    label: string,
    onPress: () => void,
    icon: React.ComponentProps<typeof Ionicons>["name"] = "chevron-forward",
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
    >
      <Ionicons name={icon} size={19} color="#2864e8" />
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        {action("Back", back, "arrow-back")}
        <Text style={styles.brand}>BOARDEASE</Text>
        <Text style={styles.title}>Tenant Details</Text>
        {Object.values(errors).map((error) => (
          <Text key={error} accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ))}
        {!!Object.keys(errors).length && action("Retry", onRetry, "refresh")}
        {loading ? (
          <ActivityIndicator />
        ) : !tenant ? (
          <Text style={styles.muted}>Tenant not found.</Text>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.identity}>
                {tenant.photoURL ? (
                  <Image
                    source={{ uri: tenant.photoURL }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatar, styles.initials]}>
                    <Text style={styles.link}>
                      {String(tenant.name || "Tenant")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.section}>{tenant.name || "Tenant"}</Text>
                  <Text style={styles.muted}>
                    Room {tenant.roomNumber || "Unassigned"} ·{" "}
                    {tenant.assignedSpace ||
                      tenant.roomType ||
                      "Space not specified"}
                  </Text>
                  <Text style={styles.link}>
                    {!tenant.hasRoom
                      ? "No active room assignment"
                      : cycle.balance > 0 && cycle.daysUntilDue < 0
                        ? "Overdue"
                        : tenant.noticeEndsAt
                          ? "Move-out notice recorded"
                          : "Active lease"}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                {action("Message", message, "chatbubble-outline")}
              </View>
            </View>
            <Section title="Personal Information">
              <Info label="Full name" value={tenant.name} />
              <Info label="Phone" value={tenant.phone} />
              <Info label="Email" value={tenant.email} />
              <Info label="Emergency contact" value={tenant.emergencyContact} />
              <Info label="Emergency phone" value={tenant.emergencyPhone} />
            </Section>
            <Section title="Tenancy">
              <Info label="Room" value={tenant.roomNumber} />
              <Info label="Room type" value={tenant.roomType} />
              <Info label="Assigned space" value={tenant.assignedSpace} />
              <Info label="Move-in date" value={date(tenant.leaseStartedAt)} />
              <Info label="Monthly rent" value={peso(tenant.roomRent)} />
              <Info
                label="Rent due day"
                value={`Day ${cycle.due.getDate()} each month`}
              />
              <Info
                label="Lease end"
                value={date(tenant.leaseEndDate || tenant.leaseEnd)}
              />
              {!!tenant.noticeEndsAt && (
                <Info label="Notice ends" value={date(tenant.noticeEndsAt)} />
              )}
            </Section>
            <Section title="Payments">
              <Info
                label={`Balance for ${cycle.period}`}
                value={tenant.hasRoom ? peso(cycle.balance) : "No active lease"}
              />
              <Info
                label="Due date"
                value={
                  tenant.hasRoom
                    ? cycle.due.toLocaleDateString()
                    : "No active lease"
                }
              />
              <Info
                label="Proofs awaiting review"
                value={String(
                  payments.filter((p) => p.status === "pending").length,
                )}
              />
              <Text style={styles.muted}>
                Current-period rent balance only. Unallocated or pending
                payments do not settle this balance.
              </Text>
              {payments.length === 0 && !errors.payments && (
                <Text style={styles.muted}>No payment records yet.</Text>
              )}
              {[...payments]
                .sort(
                  (a, b) =>
                    timestampMillis(b.createdAt) - timestampMillis(a.createdAt),
                )
                .map((payment) => (
                  <Pressable
                    key={payment.id}
                    accessibilityRole="button"
                    onPress={() => setReceiptId(payment.id)}
                    style={styles.record}
                  >
                    <View style={styles.paymentHeading}>
                      <Text style={styles.paymentAmount}>
                        {peso(payment.amount)}
                      </Text>
                      <Text
                        style={[
                          styles.paymentStatus,
                          payment.status === "approved"
                            ? styles.approved
                            : payment.status === "rejected"
                              ? styles.rejected
                              : styles.pending,
                        ]}
                      >
                        {String(payment.status || "pending").toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.muted}>
                      Billing period: {payment.billingPeriod || "Not allocated"}
                    </Text>
                    <Text style={styles.muted}>
                      Submitted: {payment.dateSent || date(payment.createdAt)}
                    </Text>
                    <Text style={styles.link}>
                      View payment / receipt details ›
                    </Text>
                  </Pressable>
                ))}
              {action(
                "Review payments in Finance",
                () => router.push("/landlord/finance"),
                "wallet-outline",
              )}
            </Section>
            <MeterReadings
              key={String(tenant.roomId || "")}
              roomId={tenant.hasRoom ? String(tenant.roomId || "") : ""}
              roomNumber={String(tenant.roomNumber || "")}
              editable
            />
            <Section title="Maintenance">
              {requests.length === 0 && !errors.maintenanceRequests && (
                <Text style={styles.muted}>No maintenance requests yet.</Text>
              )}
              {[...requests]
                .sort(
                  (a, b) =>
                    timestampMillis(b.createdAt) - timestampMillis(a.createdAt),
                )
                .map((request) => (
                  <View key={request.id} style={styles.record}>
                    <Text style={styles.value}>
                      {request.title || "Maintenance request"}
                    </Text>
                    <Text style={styles.muted}>
                      {String(request.status || "in_progress").replaceAll(
                        "_",
                        " ",
                      )}{" "}
                      · {date(request.createdAt)}
                    </Text>
                    <Text style={styles.muted} numberOfLines={2}>
                      {request.details}
                    </Text>
                    <View style={styles.actions}>
                      {action(
                        "View request",
                        () =>
                          router.push({
                            pathname: "/landlord/requests",
                            params: { requestId: request.id },
                          }),
                        "construct-outline",
                      )}
                      {action(
                        "Conversation",
                        () =>
                          router.push({
                            pathname: "/landlord/messages",
                            params: { requestId: request.id },
                          }),
                        "chatbubbles-outline",
                      )}
                    </View>
                  </View>
                ))}
            </Section>
            <Section title="Verification">
              <Info
                label="ID status"
                value={tenant.verificationStatus || "Not submitted"}
              />
              <Text style={styles.muted}>
                Private records are available only to authorized management.
              </Text>
              {action(
                "Review application records",
                () => router.push("/landlord/pending-applications"),
                "document-text-outline",
              )}
            </Section>
            <Section title="Management">
              <Text style={styles.muted}>
                Room assignments and account requests must be reviewed before
                making changes.
              </Text>
              {accountRequests.map((request) => (
                <Text key={request.id} style={styles.value}>
                  {request.kind === "vacate" ? "Move-out" : "Account deletion"}{" "}
                  request · {request.status || "pending"}
                </Text>
              ))}
              {!!accountRequests.length &&
                action("Review account requests", () =>
                  router.push("/landlord/tenants"),
                )}
              {action(
                "Manage room assignments",
                () => router.push("/landlord/rooms"),
                "business-outline",
              )}
            </Section>
            {!!tenant.hasRoom && (
              <TenantManagement
                selectedTenant={{
                  id: tenantId,
                  name: tenant.name,
                  raw: tenant,
                }}
                onDone={() => router.replace("/landlord/tenants")}
              />
            )}
          </>
        )}
      </ScrollView>
      <Modal
        visible={!!receiptId}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptId(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <ScrollView>
              {action("Close", () => setReceiptId(null), "close")}
              <Text style={styles.section}>Payment / Receipt Details</Text>
              {receipt ? (
                <>
                  <Info label="Record ID" value={receipt.id} />
                  <Info label="Amount" value={peso(receipt.amount)} />
                  <Info label="Status" value={receipt.status} />
                  <Info label="Billing period" value={receipt.billingPeriod} />
                  <Info
                    label="Submitted"
                    value={receipt.dateSent || date(receipt.createdAt)}
                  />
                  <Info
                    label="Reference number"
                    value={receipt.referenceNumber || receipt.reference}
                  />
                  <Info
                    label="Payment method"
                    value={receipt.method || receipt.paymentMethod}
                  />
                  {receipt.receiptUrl ? (
                    <Image
                      source={{ uri: receipt.receiptUrl }}
                      style={styles.proof}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.muted}>
                      No payment proof image attached.
                    </Text>
                  )}
                </>
              ) : (
                <Text>Payment record unavailable.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <LandlordNavigation active="Tenants" />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f5f7ff" },
  content: {
    padding: 20,
    paddingBottom: 100,
    gap: 20,
    width: "100%",
    maxWidth: 880,
    alignSelf: "center",
  },
  brand: { fontSize: 11, fontWeight: "700", color: "#2864e8" },
  title: { fontSize: 24, fontWeight: "700", color: "#172033" },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dfe7f4",
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  section: {
    fontSize: 19,
    fontWeight: "700",
    color: "#253149",
    lineHeight: 26,
  },
  muted: { fontSize: 14, color: "#536783", lineHeight: 22 },
  value: {
    fontSize: 15,
    color: "#253149",
    fontWeight: "500",
    flexShrink: 1,
    lineHeight: 23,
  },
  infoLabel: { fontSize: 13, color: "#637794", lineHeight: 20 },
  infoValue: {
    fontSize: 15,
    color: "#253149",
    fontWeight: "600",
    lineHeight: 23,
  },
  row: {
    gap: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
  },
  button: {
    minHeight: 44,
    alignSelf: "flex-start",
    padding: 10,
    borderWidth: 1,
    borderColor: "#dfe7f4",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
  },
  link: { color: "#2864e8", fontSize: 14, fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  initials: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf0ff",
  },
  record: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: "#e0e8f4",
    backgroundColor: "#f8faff",
    gap: 8,
  },
  paymentHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentAmount: { fontSize: 18, fontWeight: "700", color: "#253149" },
  paymentStatus: {
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  approved: { backgroundColor: "#dcf5e8", color: "#126848" },
  rejected: { backgroundColor: "#fee9e7", color: "#a42b2b" },
  pending: { backgroundColor: "#fff2d6", color: "#825a0b" },
  error: { color: "#b42318" },
  backdrop: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "85%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
  },
  proof: { width: "100%", height: 300, marginTop: 12 },
});
