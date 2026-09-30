import { Ionicons } from "@expo/vector-icons";
import { collection, doc, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, query } from "firebase/firestore";
import React from "react";
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LandlordNavigation } from "@/components/landlord-navigation";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notification-data";

type MaintenanceRequest = {
  id: string;
  tenantId?: string;
  tenantName?: string;
  roomNumber?: string;
  title?: string;
  details?: string;
  status?: "in_progress" | "parts_sourced" | "completed";
};
type RequestMessage = { id: string; senderId?: string; senderName?: string; body: string };

const statuses: MaintenanceRequest["status"][] = [
  "in_progress",
  "parts_sourced",
  "completed",
];

export default function LandlordRequests() {
  const [requests, setRequests] = React.useState<MaintenanceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = React.useState<MaintenanceRequest | null>(null);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<RequestMessage[]>([]);
  const [replyText, setReplyText] = React.useState("");

  React.useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "maintenanceRequests"),
      (snapshot) =>
        setRequests(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as MaintenanceRequest[],
        ),
      () => setRequests([]),
    );
  }, []);

  React.useEffect(() => {
    if (!db || !selectedRequest) return;
    return onSnapshot(
      query(collection(db, "maintenanceRequests", selectedRequest.id, "messages"), orderBy("createdAt", "asc")),
      (snapshot) => setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as RequestMessage[]),
      () => setMessages([]),
    );
  }, [selectedRequest]);

  function openConversation(request: MaintenanceRequest) {
    setSelectedRequest(request);
    setReplyText("");
    setReplyOpen(true);
  }

  async function sendReply() {
    if (!db || !selectedRequest || !replyText.trim()) return;
    try {
      const senderId = "landlord";
      await addDoc(collection(db, "maintenanceRequests", selectedRequest.id, "messages"), {
        senderId,
        senderName: "BoardEase Caretaker",
        body: replyText.trim(),
        createdAt: serverTimestamp(),
      });
      if (selectedRequest.tenantId) {
        await createNotification(selectedRequest.tenantId, {
          type: "maintenance_message",
          title: "New message from Kuya Bert",
          body: replyText.trim(),
          route: "/tenant/applications",
        });
      }
      setReplyText("");
    } catch {
      Alert.alert("Unable to send reply", "Please try again.");
    }
  }

  async function changeStatus(request: MaintenanceRequest) {
    if (!db) return;
    const current = statuses.indexOf(request.status || "in_progress");
    const next = statuses[(current + 1) % statuses.length] || "in_progress";
    try {
      await updateDoc(doc(db, "maintenanceRequests", request.id), {
        status: next,
        updatedAt: new Date().toISOString(),
      });
      // The tenant's bell updates immediately through Firestore.
      const tenantId = request.tenantId;
      if (tenantId) {
        await createNotification(tenantId, {
          type: "maintenance_update",
          title: "Maintenance request updated",
          body: `${request.title || "Your maintenance request"} is now ${next.replace("_", " ")}.`,
          route: "/tenant/applications",
        });
      }
    } catch {
      Alert.alert("Unable to update request", "Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>BOARDEASE</Text>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.title}>Maintenance Requests</Text>
            <Text style={styles.subtitle}>Review tenant requests and update their progress.</Text>
          </View>
          <Ionicons name="construct-outline" size={24} color="#2864e8" />
        </View>
        {requests.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={34} color="#16805d" />
            <Text style={styles.emptyTitle}>No maintenance requests</Text>
            <Text style={styles.emptyText}>New tenant requests will appear here.</Text>
          </View>
        ) : (
          requests.map((request) => (
            <View style={styles.card} key={request.id}>
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}><Ionicons name="construct-outline" size={18} color="#2864e8" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestTitle}>{request.title || "Maintenance request"}</Text>
                  <Text style={styles.meta}>{request.tenantName || "Tenant"} · Room {request.roomNumber || "—"}</Text>
                </View>
                <Text style={styles.status}>{labelFor(request.status)}</Text>
              </View>
              <Text style={styles.details}>{request.details || "No details provided."}</Text>
              <Pressable style={styles.replyButton} onPress={() => openConversation(request)}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2864e8" />
                <Text style={styles.replyText}>View Conversation</Text>
              </Pressable>
              <Pressable style={styles.updateButton} onPress={() => changeStatus(request)}>
                <Ionicons name="sync-outline" size={16} color="#fff" />
                <Text style={styles.updateText}>Mark as {nextLabel(request.status)}</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
      <Modal visible={replyOpen} transparent animationType="fade" onRequestClose={() => setReplyOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Tenant Conversation</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedRequest?.tenantName || "Tenant"} · Room {selectedRequest?.roomNumber || "—"}
                </Text>
              </View>
              <Pressable onPress={() => setReplyOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#526174" />
              </Pressable>
            </View>
            <Text style={styles.requestContext}>{selectedRequest?.title || "Maintenance request"}</Text>
            <ScrollView style={styles.messageList} contentContainerStyle={styles.messageContent}>
              {messages.length === 0 ? (
                <Text style={styles.emptyMessage}>No messages yet. Send an update to the tenant.</Text>
              ) : messages.map((message) => (
                <View key={message.id} style={[styles.messageBubble, message.senderId === "landlord" ? styles.landlordMessage : styles.tenantMessage]}>
                  <Text style={styles.messageSender}>{message.senderName || (message.senderId === "landlord" ? "Kuya Bert" : "Tenant")}</Text>
                  <Text style={styles.messageBody}>{message.body}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.quickActions}>
              {["I’ll check it today.", "Parts are being sourced.", "The request is completed."].map((quick) => (
                <Pressable key={quick} style={styles.quickAction} onPress={() => setReplyText(quick)}>
                  <Text style={styles.quickActionText}>{quick}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.composer}>
              <TextInput style={styles.replyInput} value={replyText} onChangeText={setReplyText} placeholder="Reply to tenant..." multiline />
              <Pressable style={styles.sendButton} onPress={() => void sendReply()} disabled={!replyText.trim()}>
                <Ionicons name="send" size={17} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.callButton} onPress={() => void Linking.openURL("tel:+639175548921")}>
                <Ionicons name="call-outline" size={15} color="#2864e8" /><Text style={styles.callText}>Call caretaker</Text>
              </Pressable>
              <Pressable style={styles.completeButton} onPress={() => { if (selectedRequest) void changeStatus(selectedRequest); setReplyOpen(false); }}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#fff" /><Text style={styles.completeText}>Update Status</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <LandlordNavigation active="Dashboard" />
    </SafeAreaView>
  );
}

function labelFor(status?: MaintenanceRequest["status"]) {
  if (status === "parts_sourced") return "PARTS SOURCED";
  if (status === "completed") return "COMPLETED";
  return "IN PROGRESS";
}

function nextLabel(status?: MaintenanceRequest["status"]) {
  if (status === "in_progress" || !status) return "Parts Sourced";
  if (status === "parts_sourced") return "Completed";
  return "In Progress";
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 14, paddingBottom: 95 },
  brand: { color: "#2864e8", fontSize: 11, fontWeight: "700" },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7, marginBottom: 16 },
  title: { color: "#172033", fontSize: 21, fontWeight: "700" },
  subtitle: { color: "#7a8799", fontSize: 11, marginTop: 3 },
  empty: { backgroundColor: "#fff", borderRadius: 12, padding: 30, alignItems: "center", borderWidth: 1, borderColor: "#e5eaf1" },
  emptyTitle: { color: "#253149", fontSize: 15, fontWeight: "700", marginTop: 10 },
  emptyText: { color: "#7a8799", fontSize: 11, marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: "#e5eaf1" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 9 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#eaf1ff", alignItems: "center", justifyContent: "center" },
  requestTitle: { color: "#253149", fontSize: 13, fontWeight: "700" },
  meta: { color: "#7a8799", fontSize: 10, marginTop: 3 },
  status: { color: "#a44c35", fontSize: 9, fontWeight: "700" },
  details: { color: "#526174", fontSize: 11, lineHeight: 16, marginTop: 12 },
  replyButton: { marginTop: 10, borderWidth: 1, borderColor: "#b9ccef", borderRadius: 8, padding: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  replyText: { color: "#2864e8", fontSize: 11, fontWeight: "700" },
  updateButton: { backgroundColor: "#2864e8", borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 12 },
  updateText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,.45)", justifyContent: "center", padding: 16 },
  modal: { backgroundColor: "#fff", borderRadius: 20, padding: 16, maxHeight: "84%" },
  modalHeader: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: "#edf1f7", paddingBottom: 11 },
  modalTitle: { color: "#172033", fontSize: 18, fontWeight: "800" },
  modalSubtitle: { color: "#71809a", fontSize: 11, marginTop: 3 },
  requestContext: { color: "#2864e8", backgroundColor: "#eaf1ff", borderRadius: 8, padding: 9, marginTop: 10, fontSize: 12, fontWeight: "700" },
  messageList: { maxHeight: 260, marginTop: 10 },
  messageContent: { gap: 8, paddingVertical: 4 },
  emptyMessage: { color: "#71809a", textAlign: "center", paddingVertical: 26, fontSize: 12 },
  messageBubble: { maxWidth: "84%", borderRadius: 12, padding: 10 },
  landlordMessage: { alignSelf: "flex-end", backgroundColor: "#eaf1ff" },
  tenantMessage: { alignSelf: "flex-start", backgroundColor: "#f3f7fd" },
  messageSender: { color: "#526174", fontSize: 10, fontWeight: "700", marginBottom: 3 },
  messageBody: { color: "#253149", fontSize: 12, lineHeight: 17 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  quickAction: { borderWidth: 1, borderColor: "#b9ccef", borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  quickActionText: { color: "#2864e8", fontSize: 10 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 10 },
  replyInput: { flex: 1, minHeight: 42, maxHeight: 80, borderWidth: 1, borderColor: "#d4e0f0", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, color: "#253149" },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#2864e8" },
  modalActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  callButton: { flex: 1, borderWidth: 1, borderColor: "#b9ccef", borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  callText: { color: "#2864e8", fontSize: 11, fontWeight: "700" },
  completeButton: { flex: 1, backgroundColor: "#173b36", borderRadius: 8, padding: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  completeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
