import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  ApplicantTenantNav,
  AssignedTenantNav,
} from "@/components/tenant-navigation";

type ApplicationRecord = {
  id: string;
  roomNumber: string;
  roomType: string;
  price: string;
  image?: string;
};

type TourRequestRecord = {
  id: string;
  roomNumber?: string;
  roomType?: string;
  requestedDate?: string;
  note?: string;
  status?: "pending" | "accepted" | "declined" | "cancelled";
};

export default function Applications() {
  const params = useLocalSearchParams<{
    number?: string;
    type?: string;
    price?: string;
    image?: string;
  }>();
  const { user, hasRoom } = useAuth();
  const [storedApplication, setStoredApplication] =
    React.useState<ApplicationRecord | null>(null);
  const [tourRequests, setTourRequests] = React.useState<TourRequestRecord[]>(
    [],
  );
  React.useEffect(() => {
    if (!db || !user) return;
    const applicationQuery = query(
      collection(db, "applications"),
      where("tenantId", "==", user.uid),
    );
    const tourQuery = query(
      collection(db, "tourRequests"),
      where("tenantId", "==", user.uid),
    );
    const unsubscribeApplication = onSnapshot(applicationQuery, (snapshot) => {
      const record = snapshot.docs[0];
      if (!record) {
        setStoredApplication(null);
        return;
      }
      const data = record.data();
      setStoredApplication({
        id: record.id,
        roomNumber: data.roomNumber,
        roomType: data.roomType,
        price: data.price,
        image: data.image,
      });
    });
    const unsubscribeTours = onSnapshot(tourQuery, (snapshot) => {
      setTourRequests(
        snapshot.docs.map((record) => ({
          id: record.id,
          ...record.data(),
        })) as TourRequestRecord[],
      );
    });
    return () => {
      unsubscribeApplication();
      unsubscribeTours();
    };
  }, [user]);

  async function cancelTour(tour: TourRequestRecord) {
    if (!db) return;
    try {
      await updateDoc(doc(db, "tourRequests", tour.id), {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
    } catch {
      Alert.alert("Unable to cancel tour", "Please try again.");
    }
  }
  const room = storedApplication?.roomNumber ?? params.number ?? "";
  const type = storedApplication?.roomType ?? params.type ?? "";
  const price = storedApplication?.price ?? params.price ?? "";
  const applicationImage = storedApplication?.image || params.image;
  const hasApplication = Boolean(storedApplication || params.number);
  const image =
    applicationImage ||
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900";
  if (hasRoom) {
    return (
      <CareRequests
        tenantName={user?.displayName || "Tenant"}
        tenantId={user?.uid || ""}
        roomNumber={storedApplication?.roomNumber || "201"}
        roomType={storedApplication?.roomType || "Twin Sharing"}
      />
    );
  }
  const pageTitle = hasRoom ? "Requests & Care" : "My Applications";
  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>BOARDEASE</Text>
          <Ionicons name="notifications-outline" size={20} color="#253149" />
        </View>
        <Text style={styles.title}>{pageTitle}</Text>
        <Text style={styles.subtitle}>
          {hasRoom
            ? "Report issues, request help, and track maintenance."
            : "Track your room applications and review status."}
        </Text>
        {hasApplication ? (
          <>
            <View style={styles.filters}>
              <Text style={styles.activeFilter}>All Applications (1)</Text>
              <Text style={styles.filter}>Under Review (1)</Text>
            </View>
            <ApplicationCard
              image={image}
              room={`Room ${room} - ${type}`}
              price={price}
              status="Under Review"
              code={`APP-${storedApplication?.id.slice(0, 4).toUpperCase() || "8492"}`}
              onPress={() =>
                router.push({
                  pathname: "/tenant/application-details",
                  params: { room, type, price, image },
                } as any)
              }
            />
          </>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={32}
                color="#16805d"
              />
            </View>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>
              When you apply for a room, your application and its status will
              appear here.
            </Text>
            <Pressable
              style={styles.browseButton}
              onPress={() => router.replace("/tenant/room-browser" as any)}
            >
              <Text style={styles.browseText}>Browse Available Rooms</Text>
            </Pressable>
          </View>
        )}
        {tourRequests.length > 0 && (
          <View style={styles.toursSection}>
            <Text style={styles.sectionTitle}>Tour Requests</Text>
            {tourRequests.map((tour) => (
              <TourCard key={tour.id} tour={tour} onCancel={cancelTour} />
            ))}
          </View>
        )}
        <View style={styles.helpCard}>
          <Ionicons name="chatbubbles-outline" size={25} color="#16805d" />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Looking for another unit?</Text>
            <Text style={styles.helpText}>
              Browse verified rooms with instant application approval.
            </Text>
            <Pressable
              onPress={() => router.replace("/tenant/room-browser" as any)}
            >
              <Text style={styles.helpLink}>Explore Available Rooms →</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {hasRoom ? (
        <AssignedTenantNav active="Requests" />
      ) : (
        <ApplicantTenantNav active="Applied" />
      )}
    </SafeAreaView>
  );
}

function CareRequests({
  tenantName,
  tenantId,
  roomNumber,
  roomType,
}: {
  tenantName: string;
  tenantId: string;
  roomNumber: string;
  roomType: string;
}) {
  const [requests, setRequests] = React.useState<
    { id: string; title: string; details: string }[]
  >([]);
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [requestTitle, setRequestTitle] = React.useState("");
  const [requestDetails, setRequestDetails] = React.useState("");

  React.useEffect(() => {
    if (!db || !tenantId) return;
    const requestQuery = query(
      collection(db, "maintenanceRequests"),
      where("tenantId", "==", tenantId),
    );
    return onSnapshot(requestQuery, (snapshot) => {
      setRequests(
        snapshot.docs.map((record) => {
          const data = record.data();
          return {
            id: record.id,
            title: String(data.title || "Maintenance request"),
            details: String(data.details || "Awaiting caretaker review."),
          };
        }),
      );
    });
  }, [tenantId]);

  async function submitRequest() {
    if (!requestTitle.trim()) {
      Alert.alert("Missing request", "Enter what needs to be fixed.");
      return;
    }
    const request = {
      id: `local-${Date.now()}`,
      title: requestTitle.trim(),
      details: requestDetails.trim() || "Awaiting caretaker review.",
    };
    try {
      if (db && tenantId) {
        const saved = await addDoc(collection(db, "maintenanceRequests"), {
          tenantId,
          tenantName,
          roomNumber,
          roomType,
          title: request.title,
          details: request.details,
          status: "in_progress",
          createdAt: serverTimestamp(),
        });
        request.id = saved.id;
      } else {
        setRequests((current) => [request, ...current]);
      }
      setRequestTitle("");
      setRequestDetails("");
      setNewRequestOpen(false);
    } catch {
      Alert.alert("Unable to send request", "Please try again.");
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.requestContent}>
        <View style={styles.requestHeader}>
          <View>
            <Text style={styles.brand}>BOARDEASE</Text>
            <Text style={styles.requestTitle}>Requests & Care</Text>
            <Text style={styles.requestSubtitle}>
              Room {roomNumber} · {roomType}
            </Text>
          </View>
          <Ionicons name="notifications-outline" size={21} color="#253149" />
        </View>
        <View style={styles.requestTitleRow}>
          <Text style={styles.sectionHeading}>Requests</Text>
          <Pressable
            style={styles.newRequestButton}
            onPress={() => setNewRequestOpen(true)}
          >
            <Ionicons name="add" size={15} color="#fff" />
            <Text style={styles.newRequestText}>New Request</Text>
          </Pressable>
        </View>
        <View style={styles.requestFilters}>
          <Text style={styles.requestFilterActive}>All {requests.length}</Text>
          <Text style={styles.requestFilter}>In Progress {requests.length}</Text>
          <Text style={styles.requestFilter}>Pending 0</Text>
          <Text style={styles.requestFilter}>Resolved 0</Text>
        </View>
        <View style={styles.urgentCard}>
          <View style={styles.urgentIcon}><Ionicons name="alert" size={17} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.urgentTitle}>Urgent Issue?</Text>
            <Text style={styles.urgentText}>Call the caretaker for emergencies.</Text>
            <Pressable style={styles.callCaretaker} onPress={() => Alert.alert("Call caretaker", "Calling the caretaker...")}>
              <Ionicons name="call" size={13} color="#fff" />
              <Text style={styles.callCaretakerText}>Call Caretaker</Text>
            </Pressable>
          </View>
        </View>
        {requests.map((request) => (
          <View style={styles.activeRequestCard} key={request.id}>
            <View style={styles.requestCardTop}>
              <Text style={styles.requestStatus}>IN PROGRESS</Text>
              <Text style={styles.requestCode}>NEW REQUEST</Text>
            </View>
            <Text style={styles.requestName}>{request.title}</Text>
            <View style={styles.requestMeta}>
              <Text>Maintenance · Room {roomNumber}</Text>
              <Text>Just now</Text>
            </View>
            <View style={styles.progressBar}><View style={styles.progressFill} /></View>
            <View style={styles.progressLabels}><Text>Reported</Text><Text>Parts Sourced</Text><Text>Completion</Text></View>
            <View style={styles.caretakerRow}>
              <View style={styles.caretakerAvatar}><Text>KB</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.caretakerName}>Kuya Bert (Caretaker)</Text>
                <Text style={styles.muted}>{request.details}</Text>
              </View>
            </View>
            <View style={styles.requestActions}>
              <Pressable style={styles.replyButton} onPress={() => Alert.alert("Reply", `Replying as ${tenantName}.`)}>
                <Text style={styles.replyText}>Reply to Bert</Text>
              </Pressable>
            </View>
          </View>
        ))}
        {false && <View style={styles.activeRequestCard}>
          <View style={styles.requestCardTop}>
            <Text style={styles.requestStatus}>IN PROGRESS</Text>
            <Text style={styles.requestCode}>#REQ-2026-042</Text>
          </View>
          <Text style={styles.requestName}>Bathroom Faucet Leaking</Text>
          <View style={styles.requestMeta}><Text>🔧 Plumbing · Room 201</Text><Text>Today at 2:00 PM</Text></View>
          <View style={styles.progressBar}><View style={styles.progressFill} /></View>
          <View style={styles.progressLabels}><Text>Reported</Text><Text>Parts Sourced</Text><Text>Completion</Text></View>
          <View style={styles.caretakerRow}>
            <View style={styles.caretakerAvatar}><Text>KB</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.caretakerName}>Kuya Bert (Caretaker)</Text><Text style={styles.muted}>Parts purchased, replacing the faucet soon.</Text></View>
          </View>
          <View style={styles.requestActions}><Pressable style={styles.secondaryButton} onPress={() => Alert.alert("Reschedule", "Rescheduling will be connected later.")}><Text>Reschedule</Text></Pressable><Pressable style={styles.replyButton} onPress={() => Alert.alert("Reply", `Replying as ${tenantName}.`)}><Text style={styles.replyText}>Reply to Bert</Text></Pressable></View>
         </View>}
        <Text style={styles.historyTitle}>Request History</Text>
        <View style={styles.emptyRequestCard}>
          <Ionicons name="time-outline" size={20} color="#9aa8ba" />
          <Text style={styles.muted}>Completed requests will appear here.</Text>
        </View>
        {false && <>
        {["Wi-Fi Router Reset on 2nd Floor", "Window Latch Tightening (Bed A)"].map((item, index) => (
          <View style={styles.historyCard} key={item}>
            <View style={styles.historyIcon}><Ionicons name={index === 0 ? "wifi-outline" : "construct-outline"} size={16} color="#16805d" /></View>
            <View style={{ flex: 1 }}><Text style={styles.historyName}>{item}</Text><Text style={styles.muted}>Ticket #REQ-2026-0{38 + index} · Utility</Text><Text style={styles.completed}>Completed {index === 0 ? "Sep 28, 2025" : "Aug 15, 2025"}</Text></View><Text style={styles.resolved}>RESOLVED</Text>
          </View>
        ))}
        <View style={styles.rulesCard}><Text style={styles.cardTitle}>House Rules & Protocols</Text><Text style={styles.rule}>◷ Same-Day Cutoff: Log requests before 5:00 PM for same-day evaluation.</Text><Text style={styles.rule}>⌂ Quiet Hours: Heavy maintenance is restricted between 10:00 PM and 7:00 AM.</Text><Text style={styles.rule}>✓ Accompanied Entry: Staff will always accompany or provide a signed log when accessing occupied twin rooms.</Text></View>
        </>}
        <Pressable style={styles.rulesCard} onPress={() => Alert.alert("House Rules & Protocols", "Same-day requests must be submitted before 5:00 PM. Quiet hours are from 10:00 PM to 7:00 AM. Staff will accompany or log access to occupied rooms.")}>
          <Text style={styles.cardTitle}>House Rules & Protocols</Text>
          <Text style={styles.rule}>Tap to view maintenance and room-access rules.</Text>
        </Pressable>
      </ScrollView>
      <AssignedTenantNav active="Requests" />
      <Modal
        visible={newRequestOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNewRequestOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Maintenance Request</Text>
              <Pressable onPress={() => setNewRequestOpen(false)}>
                <Ionicons name="close" size={22} color="#526174" />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>What needs attention?</Text>
            <TextInput
              style={styles.input}
              value={requestTitle}
              onChangeText={setRequestTitle}
              placeholder="e.g. Bathroom faucet leaking"
            />
            <Text style={styles.inputLabel}>Details</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={requestDetails}
              onChangeText={setRequestDetails}
              placeholder="Add details for the caretaker"
              multiline
            />
            <Pressable style={styles.saveButton} onPress={submitRequest}>
              <Text style={styles.saveButtonText}>Submit Request</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TourCard({
  tour,
  onCancel,
}: {
  tour: TourRequestRecord;
  onCancel: (tour: TourRequestRecord) => void;
}) {
  const status = tour.status || "pending";
  const statusLabel =
    status === "accepted"
      ? "Tour Confirmed"
      : status === "declined"
        ? "Tour Declined"
        : status === "cancelled"
          ? "Tour Cancelled"
          : "Pending Review";

  return (
    <View style={styles.tourCard}>
      <View style={styles.tourHeader}>
        <View style={styles.tourIcon}>
          <Ionicons
            name={status === "accepted" ? "checkmark" : "calendar-outline"}
            size={18}
            color={status === "accepted" ? "#16805d" : "#2864e8"}
          />
        </View>
        <View style={styles.tourHeading}>
          <Text style={styles.tourRoom}>
            Room {tour.roomNumber} - {tour.roomType}
          </Text>
          <Text style={styles.tourDate}>
            {status === "accepted" ? "Confirmed for " : "Requested for "}
            {tour.requestedDate || "a date to be confirmed"}
          </Text>
        </View>
        <Text
          style={[
            styles.tourStatus,
            status === "accepted"
              ? styles.tourAccepted
              : status === "declined" || status === "cancelled"
                ? styles.tourInactive
                : styles.tourPending,
          ]}
        >
          {statusLabel}
        </Text>
      </View>
      <Text style={styles.tourNote}>{tour.note || "No note provided."}</Text>
      {status === "accepted" && (
        <View style={styles.confirmedMessage}>
          <Ionicons name="notifications-outline" size={15} color="#16805d" />
          <Text style={styles.confirmedText}>
            The landlord accepted your tour request. Please arrive on time.
          </Text>
        </View>
      )}
      {(status === "pending" || status === "accepted") && (
        <View style={styles.tourActions}>
          {status === "accepted" && (
            <Pressable
              style={styles.contactButton}
              onPress={() =>
                Alert.alert(
                  "Contact landlord",
                  "You can contact the landlord through your property’s messaging channel.",
                )
              }
            >
              <Ionicons name="chatbubble-outline" size={14} color="#253149" />
              <Text style={styles.contactText}>Contact Landlord</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.cancelTourButton}
            onPress={() =>
              Alert.alert(
                status === "accepted"
                  ? "Cancel confirmed tour?"
                  : "Cancel tour request?",
                "This cannot be undone.",
                [
                  { text: "Keep it", style: "cancel" },
                  {
                    text: "Cancel Tour",
                    style: "destructive",
                    onPress: () => onCancel(tour),
                  },
                ],
              )
            }
          >
            <Text style={styles.cancelTourText}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ApplicationCard({
  image,
  room,
  price,
  status,
  code,
  onPress,
}: {
  image: string;
  room: string;
  price: string;
  status: string;
  code: string;
  onPress: () => void;
}) {
  const approved = status === "Approved";
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: image }} style={styles.image} />
      <View style={styles.cardMain}>
        <View style={styles.cardTop}>
          <Text
            style={[
              styles.status,
              approved
                ? styles.approved
                : status === "Waitlisted"
                  ? styles.waitlisted
                  : styles.review,
            ]}
          >
            {status}
          </Text>
          <Text style={styles.code}>#{code}</Text>
        </View>
        <Text style={styles.room}>{room}</Text>
        <Text style={styles.house}>Casa Verde Boarding House</Text>
        <View style={styles.meta}>
          <Text style={styles.metaLabel}>Monthly Rent</Text>
          <Text style={styles.metaValue}>₱{price} /mo</Text>
        </View>
        {approved ? (
          <Text style={styles.approvedNote}>
            Your application was approved. Continue to reserve this room.
          </Text>
        ) : (
          <Text style={styles.small}>
            Submitted today · Review status updates will appear here.
          </Text>
        )}
        <View style={styles.cardAction}>
          <Text>{approved ? "View Reservation" : "View Details"} →</Text>
          <Ionicons name="chevron-forward" size={15} color="#253149" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 14, paddingBottom: 95 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  brand: { fontSize: 12, fontWeight: "700", color: "#16805d" },
  title: { fontSize: 21, fontWeight: "700", color: "#172033" },
  subtitle: { fontSize: 12, color: "#7a8799", marginTop: 3 },
  filters: { flexDirection: "row", gap: 6, marginVertical: 12 },
  activeFilter: {
    backgroundColor: "#0d382c",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 11,
  },
  filter: {
    backgroundColor: "#fff",
    color: "#71809a",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 11,
    borderWidth: 1,
    borderColor: "#e2e8ee",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  image: { width: "100%", height: 130 },
  cardMain: { padding: 11 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  status: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "700",
  },
  review: { backgroundColor: "#fff0c9", color: "#9b6700" },
  approved: { backgroundColor: "#d9f7e8", color: "#16805d" },
  waitlisted: { backgroundColor: "#edf0f4", color: "#68768a" },
  code: { color: "#9aa8ba", fontSize: 11 },
  room: { fontSize: 14, fontWeight: "700", color: "#253149", marginTop: 8 },
  house: { color: "#78879b", fontSize: 11, marginTop: 3 },
  meta: {
    backgroundColor: "#f7f9fc",
    borderRadius: 7,
    padding: 8,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: { fontSize: 11, color: "#71809a" },
  metaValue: { fontSize: 11, fontWeight: "700", color: "#253149" },
  small: { fontSize: 11, color: "#78879b", marginTop: 9 },
  approvedNote: {
    fontSize: 11,
    color: "#a05632",
    backgroundColor: "#fff2e8",
    padding: 8,
    borderRadius: 7,
    marginTop: 9,
  },
  cardAction: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 7,
    backgroundColor: "#f1f4f6",
  },
  helpCard: {
    backgroundColor: "#f0f4f1",
    borderRadius: 12,
    padding: 13,
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  toursSection: { marginTop: 18 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#253149",
    marginBottom: 10,
  },
  tourCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  tourHeader: { flexDirection: "row", alignItems: "center" },
  tourIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eaf2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  tourHeading: { flex: 1, marginLeft: 9 },
  tourRoom: { fontSize: 13, fontWeight: "700", color: "#253149" },
  tourDate: { fontSize: 11, color: "#71809a", marginTop: 3 },
  tourStatus: {
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: "700",
  },
  tourPending: { backgroundColor: "#fff0c9", color: "#9b6700" },
  tourAccepted: { backgroundColor: "#d9f7e8", color: "#16805d" },
  tourInactive: { backgroundColor: "#edf0f4", color: "#68768a" },
  tourNote: { fontSize: 11, color: "#71809a", marginTop: 9, lineHeight: 16 },
  confirmedMessage: {
    backgroundColor: "#eef9f3",
    borderRadius: 7,
    padding: 8,
    marginTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confirmedText: { flex: 1, fontSize: 11, color: "#16805d" },
  tourActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f1f4f6",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  contactText: { color: "#253149", fontSize: 11, fontWeight: "600" },
  cancelTourButton: { paddingHorizontal: 8, paddingVertical: 8 },
  cancelTourText: { color: "#b65745", fontSize: 11, fontWeight: "600" },
  helpTitle: { fontSize: 11, fontWeight: "700", color: "#253149" },
  helpText: { fontSize: 11, color: "#71809a", marginTop: 3 },
  helpLink: { fontSize: 11, color: "#16805d", fontWeight: "700", marginTop: 5 },
  requestContent: { padding: 14, paddingBottom: 95 },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  requestTitle: { fontSize: 21, fontWeight: "700", color: "#172033", marginTop: 3 },
  requestSubtitle: { fontSize: 12, color: "#7a8799", marginTop: 3 },
  requestTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },
  sectionHeading: { fontSize: 16, fontWeight: "700", color: "#253149" },
  newRequestButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d382c",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  newRequestText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  requestFilters: { flexDirection: "row", gap: 6, marginBottom: 12 },
  requestFilterActive: {
    backgroundColor: "#0d382c",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 10,
    fontWeight: "700",
  },
  requestFilter: {
    backgroundColor: "#fff",
    color: "#71809a",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 10,
    borderWidth: 1,
    borderColor: "#e2e8ee",
  },
  urgentCard: {
    flexDirection: "row",
    gap: 9,
    backgroundColor: "#fff1ee",
    borderRadius: 12,
    padding: 11,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3d6cf",
  },
  urgentIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#b55339",
    alignItems: "center",
    justifyContent: "center",
  },
  urgentTitle: { fontSize: 12, fontWeight: "700", color: "#7d3326" },
  urgentText: { fontSize: 11, color: "#8b655c", marginTop: 2 },
  callCaretaker: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#b55339",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 7,
  },
  callCaretakerText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  activeRequestCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    marginBottom: 16,
  },
  requestCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestStatus: { fontSize: 10, fontWeight: "700", color: "#b55339" },
  requestCode: { fontSize: 10, color: "#9aa8ba" },
  requestName: { fontSize: 14, fontWeight: "700", color: "#253149", marginTop: 8 },
  requestMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e9edf1",
    marginTop: 13,
    overflow: "hidden",
  },
  progressFill: { width: "58%", height: "100%", backgroundColor: "#b55339" },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  muted: { fontSize: 10, color: "#71809a", marginTop: 3 },
  caretakerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f7f9fc",
    borderRadius: 8,
    padding: 8,
    marginTop: 12,
  },
  caretakerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#dce9df",
    alignItems: "center",
    justifyContent: "center",
  },
  caretakerName: { fontSize: 11, fontWeight: "700", color: "#253149" },
  requestActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  secondaryButton: {
    backgroundColor: "#f1f4f6",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replyButton: {
    backgroundColor: "#0d382c",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replyText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  historyTitle: { fontSize: 15, fontWeight: "700", color: "#253149", marginBottom: 8 },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  historyIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e8f7ef",
    alignItems: "center",
    justifyContent: "center",
  },
  historyName: { fontSize: 11, fontWeight: "700", color: "#253149" },
  completed: { fontSize: 10, color: "#71809a", marginTop: 3 },
  resolved: { fontSize: 9, fontWeight: "700", color: "#16805d" },
  rulesCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  emptyRequestCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#253149", marginBottom: 7 },
  rule: { fontSize: 10, lineHeight: 15, color: "#71809a", marginTop: 5 },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
    padding: 28,
    alignItems: "center",
    marginTop: 12,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#e4f4ed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#253149",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#71809a",
    textAlign: "center",
    marginTop: 7,
  },
  browseButton: {
    backgroundColor: "#0d382c",
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 18,
  },
  browseText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  nav: {
    height: 65,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e5eaf1",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 9,
  },
  navItem: { alignItems: "center", gap: 3 },
  navText: { fontSize: 11, color: "#9aa8ba" },
  navActive: { color: "#16805d" },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 29, 40, 0.35)",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#253149" },
  inputLabel: { fontSize: 11, fontWeight: "700", color: "#526174", marginTop: 8, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#dce4ea",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 12,
    color: "#253149",
  },
  multilineInput: { minHeight: 70, textAlignVertical: "top" },
  saveButton: {
    backgroundColor: "#0d382c",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 16,
  },
  saveButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
