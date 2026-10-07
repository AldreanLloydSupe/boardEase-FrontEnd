import { AppAlert as Alert } from "@/components/app-alert";
import {
  ApplicantTenantNav,
  AssignedTenantNav,
} from "@/components/tenant-navigation";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { timestampMillis } from "@/lib/billing";
import { db } from "@/lib/firebase";
import { uploadImageDataUrl } from "@/lib/firebase-storage";
import { sharedImage } from "@/lib/image-data";
import { usePropertySettings } from "@/lib/use-property-settings";
import { useTenantData } from "@/lib/use-tenant-data";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import React from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ApplicationRecord = {
  id: string;
  tenantId?: string;
  roomNumber: string;
  roomType: string;
  price: string;
  image?: string;
  propertyName?: string;
  location?: string;
  floor?: string;
  unit?: string;
  status?: string;
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
  const { user, hasRoom } = useAuth();
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useTenantData();
  const [storedApplications, setStoredApplications] = React.useState<
    ApplicationRecord[]
  >([]);
  const [applicationError, setApplicationError] = React.useState("");
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
    const unsubscribeApplication = onSnapshot(
      applicationQuery,
      (snapshot) => {
        setStoredApplications(
          [...snapshot.docs]
            .sort(
              (a, b) =>
                timestampMillis(b.data().createdAt) -
                timestampMillis(a.data().createdAt),
            )
            .map((record) => ({
              ...record.data(),
              id: record.id,
            })) as ApplicationRecord[],
        );
      },
      () =>
        setApplicationError(
          "Unable to load applications. Check your connection and permissions.",
        ),
    );
    const unsubscribeTours = onSnapshot(
      tourQuery,
      (snapshot) => {
        setTourRequests(
          snapshot.docs.map((record) => ({
            id: record.id,
            ...record.data(),
          })) as TourRequestRecord[],
        );
      },
      () => setApplicationError("Unable to load tour requests."),
    );
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
  function deleteApplication(application: ApplicationRecord) {
    const status = String(application.status || "").toLowerCase();
    if (
      !db ||
      !user ||
      application.tenantId !== user.uid ||
      !["approved", "cancelled"].includes(status)
    ) return;
    const firestore = db;
    Alert.alert(
      "Delete application?",
      "This will permanently remove the application from your list.",
      [
        { text: "Keep application", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, "applications", application.id));
            } catch (error) {
              const code =
                typeof error === "object" && error !== null && "code" in error
                  ? String(error.code)
                  : "unknown";
              console.error("Application deletion failed:", code);
              Alert.alert(
                "Unable to delete application",
                `Request failed (${code}). Please try again.`,
              );
            }
          },
        },
      ],
    );
  }
  const hasApplication = storedApplications.length > 0;
  if (hasRoom && (profileLoading || profileError || !profile.roomNumber))
    return (
      <SafeAreaView>
        <Text>{profileError || "Loading your assigned room…"}</Text>
      </SafeAreaView>
    );
  if (hasRoom) {
    return (
      <CareRequests
        tenantName={String(profile.name || user?.displayName || "Tenant")}
        tenantId={user?.uid || ""}
        roomNumber={String(profile.roomNumber || "")}
        roomType={String(profile.roomType || "Room")}
        applications={storedApplications.filter(
          (application) =>
            application.tenantId === user?.uid &&
            ["approved", "cancelled"].includes(
              String(application.status || "").toLowerCase(),
            ),
        )}
        onDeleteApplication={deleteApplication}
      />
    );
  }
  const pageTitle = "My Applications";
  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader
        title={pageTitle}
        backHref={hasRoom ? "/tenant/tenant-home" : "/tenant/room-browser"}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!!applicationError && (
          <Text accessibilityRole="alert">{applicationError}</Text>
        )}
        {hasApplication ? (
          <>
            <View style={styles.filters}>
              <Text style={styles.activeFilter}>
                All Applications ({storedApplications.length})
              </Text>
              <Text style={styles.filter}>
                Under Review (
                {
                  storedApplications.filter((a) => a.status === "pending")
                    .length
                }
                )
              </Text>
            </View>
            {storedApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                image={application.image || ""}
                room={`Room ${application.roomNumber} - ${application.roomType}`}
                price={application.price}
                location={[
                  application.propertyName,
                  application.location,
                  application.floor ? `Floor ${application.floor}` : "",
                  application.unit ? `Unit ${application.unit}` : "",
                ].filter(Boolean).join(" · ") || "Location unavailable"}
                status={String(application.status || "pending").replaceAll(
                  "_",
                  " ",
                )}
                code={`APP-${application.id.slice(-8).toUpperCase()}`}
                onDelete={() => deleteApplication(application)}
                onPress={() =>
                  router.push({
                    pathname: "/tenant/application-details",
                    params: { applicationId: application.id },
                  })
                }
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="document-text-outline"
                size={32}
                color="#2864e8"
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
          <Ionicons name="chatbubbles-outline" size={25} color="#2864e8" />
          <View style={{ flex: 1 }}>
            <Text style={styles.helpTitle}>Looking for another unit?</Text>
            <Text style={styles.helpText}>
              Browse available rooms and apply for landlord review.
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

const MAINTENANCE_CATEGORIES = [
  { id: "Plumbing", label: "Plumbing", icon: "water-outline" },
  { id: "Electrical", label: "Electrical", icon: "flash-outline" },
  { id: "Bed & Furniture", label: "Furniture", icon: "bed-outline" },
  { id: "Aircon & Fan", label: "Aircon/Fan", icon: "snow-outline" },
  { id: "Wi-Fi & Utility", label: "Wi-Fi", icon: "wifi-outline" },
  { id: "General Repair", label: "General", icon: "construct-outline" },
] as const;

type MaintenanceTicket = {
  id: string;
  title: string;
  details: string;
  category?: string;
  priority?: "normal" | "urgent";
  photoUri?: string | null;
  allowEntry?: boolean;
  preferredTime?: string;
  dateNeeded?: string;
  status?: "in_progress" | "parts_sourced" | "completed";
  createdAt?: any;
};

function categoryIcon(category?: string) {
  switch (category) {
    case "Plumbing":
      return "🚿";
    case "Electrical":
      return "⚡";
    case "Bed & Furniture":
      return "🛏️";
    case "Aircon & Fan":
      return "❄️";
    case "Wi-Fi & Utility":
      return "📶";
    default:
      return "🔧";
  }
}

function CareRequests({
  tenantName,
  tenantId,
  roomNumber,
  roomType,
  applications,
  onDeleteApplication,
}: {
  tenantName: string;
  tenantId: string;
  roomNumber: string;
  roomType: string;
  applications: ApplicationRecord[];
  onDeleteApplication: (application: ApplicationRecord) => void;
}) {
  const { settings } = usePropertySettings();
  const [loadError, setLoadError] = React.useState("");
  const [requests, setRequests] = React.useState<MaintenanceTicket[]>([]);
  const [newRequestOpen, setNewRequestOpen] = React.useState(false);
  const [activeFilter, setActiveFilter] = React.useState<
    "all" | "in_progress" | "urgent" | "completed"
  >("all");

  // Form states
  const [requestTitle, setRequestTitle] = React.useState("");
  const [requestDetails, setRequestDetails] = React.useState("");
  const [requestDate, setRequestDate] = React.useState("");
  const [category, setCategory] = React.useState("Plumbing");
  const [priority, setPriority] = React.useState<"normal" | "urgent">("normal");
  const [photoUri, setPhotoUri] = React.useState<string | null>(null);
  const [allowEntry, setAllowEntry] = React.useState(true);
  const [preferredTime, setPreferredTime] = React.useState("Anytime");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!db || !tenantId) return;
    const requestQuery = query(
      collection(db, "maintenanceRequests"),
      where("tenantId", "==", tenantId),
    );
    return onSnapshot(
      requestQuery,
      (snapshot) => {
        setRequests(
          snapshot.docs.map((record) => {
            const data = record.data();
            return {
              id: record.id,
              title: String(data.title || "Maintenance request"),
              details: String(data.details || "Awaiting caretaker review."),
              category: data.category ? String(data.category) : "Plumbing",
              priority: data.priority === "urgent" ? "urgent" : "normal",
              photoUri: data.photoUri ? String(data.photoUri) : null,
              allowEntry: data.allowEntry !== false,
              preferredTime: data.preferredTime
                ? String(data.preferredTime)
                : "Anytime",
              dateNeeded: data.dateNeeded ? String(data.dateNeeded) : "",
              status: (data.status as any) || "in_progress",
              createdAt: data.createdAt,
            };
          }),
        );
      },
      () =>
        setLoadError(
          "Unable to load maintenance requests. Check your connection and permissions.",
        ),
    );
  }, [tenantId]);

  async function pickPhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo library access in device settings to attach a photo.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.3,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(sharedImage(result.assets[0]));
      }
    } catch (error) {
      Alert.alert(
        "Unable to pick photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Camera permission needed",
          "Please allow camera access in device settings to snap a picture.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.3,
        base64: true,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(sharedImage(result.assets[0]));
      }
    } catch {
      Alert.alert("Unable to open camera", "Please try again.");
    }
  }

  function handlePhotoOption() {
    if (Platform.OS === "web") {
      void pickPhoto();
      return;
    }
    Alert.alert("Attach Photo Proof", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickPhoto },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function submitRequest() {
    if (isSubmitting) return;
    if (!db || !tenantId || !roomNumber) {
      Alert.alert(
        "Cannot submit",
        "Sign in and wait for your assigned room to load.",
      );
      return;
    }
    if (!requestTitle.trim()) {
      Alert.alert(
        "Missing title",
        "Please state what needs attention (e.g. Bathroom sink leaking).",
      );
      return;
    }
    if (requestTitle.trim().length > 200) {
      Alert.alert("Title too long", "Use at most 200 characters.");
      return;
    }
    setIsSubmitting(true);
    const requestData = {
      tenantId,
      tenantName,
      roomNumber,
      roomType,
      title: requestTitle.trim(),
      details: requestDetails.trim() || "Awaiting caretaker review.",
      dateNeeded: requestDate.trim(),
      category,
      priority,
      photoUri: photoUri || null,
      allowEntry,
      preferredTime,
      status: "in_progress" as const,
    };
    try {
      const requestRef = doc(collection(db, "maintenanceRequests"));
      const storedPhoto = photoUri
        ? await uploadImageDataUrl(
            `maintenance-photos/${tenantId}/${requestRef.id}.jpg`,
            photoUri,
          )
        : null;
      await setDoc(requestRef, {
        ...requestData,
        photoUri: storedPhoto,
        createdAt: serverTimestamp(),
      });
      // Reset form
      setRequestTitle("");
      setRequestDetails("");
      setRequestDate("");
      setCategory("Plumbing");
      setPriority("normal");
      setPhotoUri(null);
      setAllowEntry(true);
      setPreferredTime("Anytime");
      setNewRequestOpen(false);
      Alert.alert(
        "Request Logged",
        `Your ${priority === "urgent" ? "urgent " : ""}maintenance ticket for Room ${roomNumber} has been saved. You can follow up in Messages.`,
      );
    } catch {
      Alert.alert("Unable to send request", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (activeFilter === "in_progress") return req.status !== "completed";
    if (activeFilter === "urgent")
      return req.priority === "urgent" && req.status !== "completed";
    if (activeFilter === "completed") return req.status === "completed";
    return true;
  });

  const inProgressCount = requests.filter(
    (r) => r.status !== "completed",
  ).length;
  const urgentCount = requests.filter(
    (r) => r.priority === "urgent" && r.status !== "completed",
  ).length;
  const completedCount = requests.filter(
    (r) => r.status === "completed",
  ).length;

  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader
        title="Requests & Care"
        subtitle={`Room ${roomNumber} · ${roomType}`}
      />
      <ScrollView contentContainerStyle={styles.requestContent}>
        {!!loadError && <Text accessibilityRole="alert">{loadError}</Text>}
        {applications.length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Applications</Text>
            {applications.map((application) => (
              <ApplicationCard
                key={application.id}
                image={application.image || ""}
                room={`Room ${application.roomNumber} - ${application.roomType}`}
                price={application.price}
                location={[
                  application.propertyName,
                  application.location,
                  application.floor ? `Floor ${application.floor}` : "",
                  application.unit ? `Unit ${application.unit}` : "",
                ].filter(Boolean).join(" · ") || "Location unavailable"}
                status={String(application.status || "")}
                code={`APP-${application.id.slice(-8).toUpperCase()}`}
                onDelete={() => onDeleteApplication(application)}
                onPress={() =>
                  router.push({
                    pathname: "/tenant/application-details",
                    params: { applicationId: application.id },
                  })
                }
              />
            ))}
          </>
        )}
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
          <Pressable onPress={() => setActiveFilter("all")}>
            <Text
              style={
                activeFilter === "all"
                  ? styles.requestFilterActive
                  : styles.requestFilter
              }
            >
              All ({requests.length})
            </Text>
          </Pressable>
          <Pressable onPress={() => setActiveFilter("in_progress")}>
            <Text
              style={
                activeFilter === "in_progress"
                  ? styles.requestFilterActive
                  : styles.requestFilter
              }
            >
              In Progress ({inProgressCount})
            </Text>
          </Pressable>
          <Pressable onPress={() => setActiveFilter("urgent")}>
            <Text
              style={
                activeFilter === "urgent"
                  ? styles.requestFilterActive
                  : styles.requestFilter
              }
            >
              Urgent ({urgentCount})
            </Text>
          </Pressable>
          <Pressable onPress={() => setActiveFilter("completed")}>
            <Text
              style={
                activeFilter === "completed"
                  ? styles.requestFilterActive
                  : styles.requestFilter
              }
            >
              Resolved ({completedCount})
            </Text>
          </Pressable>
        </View>

        <View style={styles.urgentCard}>
          <View style={styles.urgentIcon}>
            <Ionicons name="alert" size={17} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.urgentTitle}>Urgent Issue?</Text>
            <Text style={styles.urgentText}>
              Active water leak or electrical spark? Call your caretaker
              immediately.
            </Text>
            <Pressable
              style={styles.callCaretaker}
              onPress={() => {
                const phone = String(settings.caretakerPhone || "");
                if (phone)
                  void Linking.openURL(
                    `tel:${phone.replace(/[^+0-9]/g, "")}`,
                  ).catch(() =>
                    Alert.alert(
                      "Cannot place call",
                      "Use the caretaker number in your phone app.",
                    ),
                  );
                else
                  Alert.alert(
                    "Contact not configured",
                    "Ask management to add the caretaker phone number.",
                  );
              }}
            >
              <Ionicons name="call" size={13} color="#fff" />
              <Text style={styles.callCaretakerText}>Call Caretaker Now</Text>
            </Pressable>
          </View>
        </View>

        {filteredRequests.length === 0 ? (
          <View style={styles.emptyRequestCard}>
            <Ionicons name="construct-outline" size={28} color="#9aa8ba" />
            <Text style={[styles.muted, { marginTop: 6 }]}>
              No requests under this filter.
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => {
            const isCompleted = request.status === "completed";
            const isPartsSourced = request.status === "parts_sourced";
            const progressPercent = isCompleted
              ? "100%"
              : isPartsSourced
                ? "66%"
                : "33%";
            const statusColor = isCompleted
              ? "#16805d"
              : isPartsSourced
                ? "#d97706"
                : "#2864e8";
            const statusText = isCompleted
              ? "COMPLETED"
              : isPartsSourced
                ? "PARTS SOURCED"
                : "IN PROGRESS";

            return (
              <View style={styles.activeRequestCard} key={request.id}>
                <View style={styles.requestCardTop}>
                  <View style={styles.requestTopBadges}>
                    <Text
                      style={[
                        styles.requestStatus,
                        {
                          color: statusColor,
                          backgroundColor: isCompleted
                            ? "#e6f8f0"
                            : isPartsSourced
                              ? "#fef3c7"
                              : "#eaf1ff",
                        },
                      ]}
                    >
                      {statusText}
                    </Text>
                    {request.priority === "urgent" && (
                      <View style={styles.urgentBadge}>
                        <Ionicons name="flame" size={11} color="#dc2626" />
                        <Text style={styles.urgentBadgeText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.requestCode}>
                    #REQ-{request.id.slice(0, 4).toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.requestName}>{request.title}</Text>

                <View style={styles.requestMeta}>
                  <Text style={styles.requestMetaCategory}>
                    {categoryIcon(request.category)}{" "}
                    {request.category || "General"} · Room {roomNumber}
                  </Text>
                  <Text style={styles.requestMetaTime}>
                    {request.dateNeeded
                      ? `${request.dateNeeded} · ${request.preferredTime || "Anytime"}`
                      : request.preferredTime || "Anytime"}
                  </Text>
                </View>

                {request.photoUri && (
                  <View style={styles.cardPhotoThumbWrap}>
                    {request.photoUri ? (
                      <Image
                        source={{ uri: request.photoUri }}
                        style={styles.cardPhotoThumb}
                      />
                    ) : null}
                    <Text style={styles.cardPhotoNote}>
                      Photo attached for caretaker
                    </Text>
                  </View>
                )}

                {request.allowEntry && (
                  <View style={styles.entryAllowedBadge}>
                    <Ionicons name="key-outline" size={12} color="#16805d" />
                    <Text style={styles.entryAllowedText}>
                      Entry permitted if you are away
                    </Text>
                  </View>
                )}

                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: progressPercent as any,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text
                    style={[
                      styles.progressStepLabel,
                      !isPartsSourced &&
                        !isCompleted &&
                        styles.progressStepActive,
                    ]}
                  >
                    Reported
                  </Text>
                  <Text
                    style={[
                      styles.progressStepLabel,
                      isPartsSourced && styles.progressStepActive,
                    ]}
                  >
                    Parts Sourced
                  </Text>
                  <Text
                    style={[
                      styles.progressStepLabel,
                      isCompleted && styles.progressStepActive,
                    ]}
                  >
                    Completed
                  </Text>
                </View>

                <View style={styles.caretakerRow}>
                  <View style={styles.caretakerAvatar}>
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#16805d"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.caretakerName}>Reported issue</Text>
                    <Text style={styles.muted}>{request.details}</Text>
                  </View>
                </View>

                <View style={styles.requestActions}>
                  <Pressable
                    style={styles.replyButton}
                    onPress={() =>
                      router.push({
                        pathname: "/tenant/messages",
                        params: { requestId: request.id },
                      })
                    }
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={13}
                      color="#fff"
                    />
                    <Text style={styles.replyText}>Message caretaker</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.historyTitle}>
          House Rules & Maintenance Protocols
        </Text>
        <Pressable
          style={styles.rulesCard}
          onPress={() =>
            Alert.alert(
              "House Rules & Protocols",
              "1. Same-day requests must be logged before 5:00 PM.\n2. Quiet hours: 10:00 PM – 7:00 AM (no noisy maintenance).\n3. Accompanied Entry: Staff always logs room visits for occupied rooms.",
            )
          }
        >
          <Text style={styles.cardTitle}>View Maintenance Guidelines</Text>
          <Text style={styles.rule}>
            Tap to view quiet hours, same-day cutoffs, and security protocols.
          </Text>
        </Pressable>
      </ScrollView>

      <AssignedTenantNav active="Requests" />

      {/* Enhanced New Maintenance Request Modal */}
      <Modal
        visible={newRequestOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNewRequestOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalCardEnhanced}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>New Maintenance Request</Text>
                <Text style={styles.modalSubtitle}>
                  Room {roomNumber} · Log an issue for Kuya Bert
                </Text>
              </View>
              <Pressable
                onPress={() => setNewRequestOpen(false)}
                hitSlop={8}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={22} color="#526174" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Category Selector */}
              <Text style={styles.fieldSectionLabel}>ISSUE CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {MAINTENANCE_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                      ]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={15}
                        color={isSelected ? "#ffffff" : "#475569"}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          isSelected && styles.categoryTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Urgency Level */}
              <Text style={styles.fieldSectionLabel}>URGENCY LEVEL</Text>
              <View style={styles.urgencyRow}>
                <Pressable
                  style={[
                    styles.urgencyCard,
                    priority === "normal" && styles.urgencyCardNormalActive,
                  ]}
                  onPress={() => setPriority("normal")}
                >
                  <Ionicons
                    name={
                      priority === "normal"
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={18}
                    color={priority === "normal" ? "#16805d" : "#94a3b8"}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text
                      style={[
                        styles.urgencyTitle,
                        priority === "normal" && { color: "#16805d" },
                      ]}
                    >
                      Normal Routine
                    </Text>
                    <Text style={styles.urgencySub}>24–48h evaluation</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.urgencyCard,
                    priority === "urgent" && styles.urgencyCardUrgentActive,
                  ]}
                  onPress={() => setPriority("urgent")}
                >
                  <Ionicons
                    name={
                      priority === "urgent" ? "alert-circle" : "ellipse-outline"
                    }
                    size={18}
                    color={priority === "urgent" ? "#dc2626" : "#94a3b8"}
                  />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text
                      style={[
                        styles.urgencyTitle,
                        priority === "urgent" && { color: "#dc2626" },
                      ]}
                    >
                      Urgent / Leak
                    </Text>
                    <Text style={styles.urgencySub}>Immediate dispatch</Text>
                  </View>
                </Pressable>
              </View>

              {/* What needs attention */}
              <Text style={styles.fieldSectionLabel}>
                WHAT NEEDS ATTENTION? *
              </Text>
              <TextInput
                style={styles.inputEnhanced}
                value={requestTitle}
                onChangeText={setRequestTitle}
                placeholder="e.g. Bathroom sink faucet dripping"
                placeholderTextColor="#94a3b8"
              />

              {/* Details & Location */}
              <Text style={styles.fieldSectionLabel}>
                DETAILS & EXACT LOCATION
              </Text>
              <TextInput
                style={[styles.inputEnhanced, styles.multilineInputEnhanced]}
                value={requestDetails}
                onChangeText={setRequestDetails}
                placeholder="Describe where it is located and when the issue started..."
                placeholderTextColor="#94a3b8"
                multiline
              />

              {/* Photo Proof */}
              <Text style={styles.fieldSectionLabel}>
                PHOTO OF THE ISSUE (OPTIONAL)
              </Text>
              {photoUri ? (
                <View style={styles.photoAttachedBox}>
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.photoAttachedThumb}
                    />
                  ) : null}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.photoAttachedTitle}>
                      Photo Attached
                    </Text>
                    <Text style={styles.photoAttachedSub}>
                      Caretaker can inspect this image
                    </Text>
                  </View>
                  <Pressable
                    style={styles.removePhotoButton}
                    onPress={() => setPhotoUri(null)}
                  >
                    <Ionicons name="trash-outline" size={15} color="#dc2626" />
                    <Text style={styles.removePhotoText}>Remove</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.addPhotoDashed}
                  onPress={handlePhotoOption}
                >
                  <Ionicons name="camera-outline" size={20} color="#2864e8" />
                  <Text style={styles.addPhotoDashedText}>
                    Take Photo or Upload Image Proof
                  </Text>
                </Pressable>
              )}

              {/* Preferred Visit Time */}
              <Text style={styles.fieldSectionLabel}>PREFERRED VISIT TIME</Text>
              <View style={styles.timeSlotRow}>
                {["Anytime", "Morning (8am-12pm)", "Afternoon (1pm-5pm)"].map(
                  (slot) => {
                    const isSelected = preferredTime === slot;
                    return (
                      <Pressable
                        key={slot}
                        style={[
                          styles.timeChip,
                          isSelected && styles.timeChipSelected,
                        ]}
                        onPress={() => setPreferredTime(slot)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            isSelected && styles.timeChipTextSelected,
                          ]}
                        >
                          {slot}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              {/* Permission to enter */}
              <Pressable
                style={styles.permissionCard}
                onPress={() => setAllowEntry(!allowEntry)}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.permissionTitle}>
                    Permission to enter room
                  </Text>
                  <Text style={styles.permissionSub}>
                    Allow Kuya Bert to enter with staff if you are away during
                    repair
                  </Text>
                </View>
                <Switch
                  value={allowEntry}
                  onValueChange={setAllowEntry}
                  trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
                  thumbColor={allowEntry ? "#2864e8" : "#f1f5f9"}
                />
              </Pressable>

              <Text style={styles.fieldSectionLabel}>DATE NEEDED</Text>
              <TextInput
                style={styles.inputEnhanced}
                value={requestDate}
                onChangeText={setRequestDate}
                placeholder="e.g. ASAP, Tomorrow, Specific Date"
                placeholderTextColor="#94a3b8"
              />

              {/* Submit Button */}
              <Pressable
                style={[
                  styles.submitButtonEnhanced,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={submitRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#fff" />
                    <Text style={styles.submitButtonTextEnhanced}>
                      Submit Maintenance Request
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  location,
  status,
  code,
  onDelete,
  onPress,
}: {
  image: string;
  room: string;
  price: string;
  location: string;
  status: string;
  code: string;
  onDelete: () => void;
  onPress: () => void;
}) {
  const normalizedStatus = status.toLowerCase();
  const approved = normalizedStatus === "approved";
  const canDelete = approved || normalizedStatus === "cancelled";
  return (
    <View style={styles.card}>
      {image ? <Image source={{ uri: image }} style={styles.image} /> : null}
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
          <View style={styles.applicationCardActions}>
            {canDelete && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete application"
                hitSlop={8}
                style={styles.deleteApplicationButton}
                onPress={onDelete}
              >
                <Ionicons name="trash-outline" size={16} color="#b42318" />
              </Pressable>
            )}
            <Text style={styles.code}>#{code}</Text>
          </View>
        </View>
        <Pressable onPress={onPress}>
          <Text style={styles.room}>{room}</Text>
          <Text style={styles.house}>{location}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Monthly Rent</Text>
            <Text style={styles.metaValue}>₱{price} /month</Text>
          </View>
          {approved ? (
            <Text style={styles.approvedNote}>
              Your application was approved. View your assignment in Home.
            </Text>
          ) : (
            <Text style={styles.small}>
              Review status updates will appear here.
            </Text>
          )}
          <View style={styles.cardAction}>
            <Text style={styles.cardActionText}>
              {approved ? "View Assignment" : "View Details"} →
            </Text>
            <Ionicons name="chevron-forward" size={17} color="#fff" />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  content: { padding: 14, paddingBottom: 95 },
  heroHeader: {
    marginTop: -14,
    marginHorizontal: -14,
    marginBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brand: {
    fontSize: 10,
    fontWeight: "800",
    color: "#d9e5ff",
    letterSpacing: 1.5,
  },
  headerPageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 1,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: "#e1eaff",
    marginTop: 8,
    marginLeft: 2,
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#a7f3d0",
    borderWidth: 1,
    borderColor: "#2864e8",
  },
  filters: { flexDirection: "row", gap: 6, marginVertical: 12 },
  activeFilter: {
    backgroundColor: "#2864e8",
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
    borderColor: "#dce7f5",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dce7f8",
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  image: { width: "100%", height: 165, backgroundColor: "#eaf1ff" },
  cardMain: { padding: 15 },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  applicationCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  deleteApplicationButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#fff1f0",
    alignItems: "center",
    justifyContent: "center",
  },
  status: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "700",
  },
  review: { backgroundColor: "#eaf1ff", color: "#2864e8" },
  approved: { backgroundColor: "#dce9ff", color: "#2458c7" },
  waitlisted: { backgroundColor: "#edf0f4", color: "#68768a" },
  code: { color: "#9aa8ba", fontSize: 11 },
  room: { fontSize: 17, fontWeight: "800", color: "#172033", marginTop: 12 },
  house: { color: "#78879b", fontSize: 12, marginTop: 4 },
  meta: {
    backgroundColor: "#f4f8ff",
    borderColor: "#e4ecfb",
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: { fontSize: 12, color: "#71809a" },
  metaValue: { fontSize: 13, fontWeight: "800", color: "#2864e8" },
  small: { fontSize: 12, color: "#66758a", lineHeight: 18, marginTop: 12 },
  approvedNote: {
    fontSize: 12,
    color: "#2458c7",
    backgroundColor: "#edf4ff",
    padding: 11,
    borderRadius: 10,
    marginTop: 12,
  },
  cardAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2864e8",
  },
  cardActionText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  helpCard: {
    backgroundColor: "#eaf1ff",
    borderRadius: 8,
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
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  requestSubtitle: {
    fontSize: 11,
    color: "#e1eaff",
    marginTop: 3,
  },
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
    backgroundColor: "#2864e8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  newRequestText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  requestFilters: { flexDirection: "row", gap: 6, marginBottom: 12 },
  requestFilterActive: {
    backgroundColor: "#2864e8",
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
    borderColor: "#dce7f5",
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
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1eafa",
    marginBottom: 16,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 7,
    elevation: 2,
  },
  requestCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestStatus: { fontSize: 10, fontWeight: "700", color: "#b55339" },
  requestCode: { fontSize: 10, color: "#9aa8ba" },
  requestName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#253149",
    marginTop: 8,
  },
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
  progressFill: { width: "58%", height: "100%", backgroundColor: "#2864e8" },
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
  historyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#253149",
    marginBottom: 8,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
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
    borderColor: "#e1eafa",
  },
  emptyRequestCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e1eafa",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#253149",
    marginBottom: 7,
  },
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
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(15, 29, 40, 0.45)",
  },
  modalCardEnhanced: {
    backgroundColor: "#fff",
    borderRadius: 24,
    maxHeight: "88%",
    shadowColor: "#0f1d28",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: "#e8edf5",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#172033" },
  modalSubtitle: { fontSize: 11, color: "#64748b", marginTop: 2 },
  replyBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
    backgroundColor: "rgba(15, 29, 40, 0.45)",
  },
  replyModal: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    maxHeight: "84%",
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#e8edf5",
  },
  replyTitle: { color: "#172033", fontSize: 14, fontWeight: "800" },
  replySubtitle: { color: "#64748b", fontSize: 11, marginTop: 3 },
  replySafety: {
    color: "#9a5b13",
    backgroundColor: "#fff7df",
    borderRadius: 8,
    padding: 9,
    fontSize: 10,
    marginTop: 10,
  },
  messageList: { maxHeight: 250, marginTop: 10 },
  messageContent: { gap: 8, paddingVertical: 4 },
  emptyMessages: { alignItems: "center", paddingVertical: 28 },
  emptyMessageText: {
    color: "#42526a",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 7,
  },
  messageBubble: { maxWidth: "84%", borderRadius: 12, padding: 10 },
  myMessage: { alignSelf: "flex-end", backgroundColor: "#eaf1ff" },
  bertMessage: { alignSelf: "flex-start", backgroundColor: "#f3f7fd" },
  messageSender: {
    color: "#526174",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 3,
  },
  messageBody: { color: "#253149", fontSize: 12, lineHeight: 17 },
  quickReplies: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  quickReply: {
    borderWidth: 1,
    borderColor: "#b9ccef",
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  quickReplyText: { color: "#2864e8", fontSize: 10 },
  replyComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  replyInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 85,
    borderWidth: 1,
    borderColor: "#d4e0f0",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: "#253149",
    fontSize: 12,
  },
  sendReplyButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2864e8",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  fieldSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 7,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryChipSelected: {
    backgroundColor: "#2864e8",
    borderColor: "#2864e8",
  },
  categoryText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
  },
  categoryTextSelected: {
    color: "#ffffff",
    fontWeight: "700",
  },
  urgencyRow: {
    flexDirection: "row",
    gap: 10,
  },
  urgencyCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  urgencyCardNormalActive: {
    borderColor: "#16805d",
    backgroundColor: "#f0fdf4",
  },
  urgencyCardUrgentActive: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  urgencyTitle: { fontSize: 12, fontWeight: "700", color: "#1e293b" },
  urgencySub: { fontSize: 10, color: "#64748b", marginTop: 1 },
  inputEnhanced: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#1e293b",
    backgroundColor: "#fbfcfd",
  },
  multilineInputEnhanced: {
    minHeight: 74,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  photoAttachedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 8,
  },
  photoAttachedThumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
  },
  photoAttachedTitle: { fontSize: 12, fontWeight: "700", color: "#1e293b" },
  photoAttachedSub: { fontSize: 10, color: "#64748b", marginTop: 2 },
  removePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fee2e2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removePhotoText: { color: "#dc2626", fontSize: 11, fontWeight: "700" },
  addPhotoDashed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#93c5fd",
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: "#f8fbff",
  },
  addPhotoDashedText: {
    color: "#2864e8",
    fontSize: 12,
    fontWeight: "700",
  },
  timeSlotRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  timeChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  timeChipSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#2864e8",
  },
  timeChipText: { fontSize: 11, color: "#475569", fontWeight: "600" },
  timeChipTextSelected: { color: "#2864e8", fontWeight: "700" },
  permissionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  permissionTitle: { fontSize: 12, fontWeight: "700", color: "#1e293b" },
  permissionSub: { fontSize: 10, color: "#64748b", marginTop: 3 },
  submitButtonEnhanced: {
    backgroundColor: "#2864e8",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 18,
    shadowColor: "#173b80",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  submitButtonTextEnhanced: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  requestTopBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fee2e2",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    color: "#dc2626",
    fontSize: 9,
    fontWeight: "800",
  },
  requestMetaCategory: {
    fontSize: 11,
    color: "#334155",
    fontWeight: "600",
  },
  requestMetaTime: {
    fontSize: 10,
    color: "#64748b",
  },
  cardPhotoThumbWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#edf2f7",
  },
  cardPhotoThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
  },
  cardPhotoNote: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  entryAllowedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  entryAllowedText: {
    color: "#16805d",
    fontSize: 10,
    fontWeight: "600",
  },
  progressStepLabel: {
    fontSize: 10,
    color: "#94a3b8",
  },
  progressStepActive: {
    color: "#1e293b",
    fontWeight: "700",
  },
  caretakerInitials: {
    color: "#16805d",
    fontSize: 11,
    fontWeight: "700",
  },
});
