import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfilePictureButton } from "@/components/profile-picture-button";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
  ApplicantTenantNav,
  AssignedTenantNav,
} from "@/components/tenant-navigation";

type Profile = {
  name: string;
  phone: string;
  emergencyContact: string;
  roomNumber: string;
  roomType: string;
  roomRent: string;
};

export default function Account() {
  const { user, hasRoom, signOut, updateUserProfile } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<Profile>({
    name: user?.displayName || "Tenant",
    phone: "+63 917 555 1234",
    emergencyContact: "Maria Dela Cruz",
    roomNumber: "",
    roomType: "Room",
    roomRent: "",
  });
  const [draft, setDraft] = React.useState({
    name: "",
    phone: "",
    emergencyContact: "",
  });

  React.useEffect(() => {
    if (!db || !user) return;
    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data() || {};
      setProfile((current) => ({
        ...current,
        name: String(data.name || user.displayName || current.name),
        phone: String(data.phone || current.phone),
        emergencyContact: String(
          data.emergencyContact || current.emergencyContact,
        ),
        roomNumber: String(data.roomNumber || data.roomId || ""),
        roomType: String(data.roomType || "Room"),
        roomRent: String(data.roomRent || ""),
      }));
    });
  }, [user]);

  function openEdit() {
    setDraft({
      name: profile.name,
      phone: profile.phone,
      emergencyContact: profile.emergencyContact,
    });
    setEditOpen(true);
  }

  async function saveProfile() {
    if (!draft.name.trim()) {
      Alert.alert("Missing name", "Enter your full name.");
      return;
    }
    try {
      await updateUserProfile({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        emergencyContact: draft.emergencyContact.trim(),
      });
      setEditOpen(false);
      Alert.alert("Profile updated", "Your profile details were saved.");
    } catch {
      Alert.alert("Unable to update profile", "Please try again.");
    }
  }

  async function logout() {
    await signOut();
    router.replace("/login");
  }

  const roomLabel = profile.roomNumber
    ? `Room ${profile.roomNumber} - ${profile.roomType}`
    : "No room assigned";

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>Account</Text>
          <Ionicons name="notifications-outline" size={21} color="#253149" />
        </View>
        <View style={styles.profile}>
          <ProfilePictureButton
            fallback={profile.name.slice(0, 2).toUpperCase()}
            size={49}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.green}>
              Tenant ·{" "}
              {profile.roomNumber
                ? `Room ${profile.roomNumber}`
                : "No room assigned"}
            </Text>
            <Text style={styles.email}>{user?.email || ""}</Text>
          </View>
          <Pressable onPress={openEdit} accessibilityLabel="Edit profile">
            <Ionicons name="create-outline" size={19} color="#526174" />
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Tenancy Summary <Text style={styles.active}>Active Lease</Text>
          </Text>
          <Info label="Assigned Room" value={roomLabel} />
          <Info
            label="Monthly Rent"
            value={profile.roomRent ? `₱${profile.roomRent} / month` : "—"}
          />
          <Info label="Rent Due Date" value="5th of every month" />
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Personal & Contact Info</Text>
            <Pressable onPress={openEdit}>
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          </View>
          <Info label="Full Name" value={profile.name} />
          <Info label="Contact Number" value={profile.phone} />
          <Info label="Email" value={user?.email || ""} />
          <Info label="Emergency Contact" value={profile.emergencyContact} />
          <Info label="ID Verification" value="Verified Student ID" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings & Preferences</Text>
          <Setting
            icon="lock-closed-outline"
            label="Change Password & Security"
            onPress={() =>
              Alert.alert(
                "Change password",
                "A password reset link will be sent to your email.",
              )
            }
          />
          <Setting icon="notifications-outline" label="Notification Settings">
            <Switch value={notifications} onValueChange={setNotifications} />
          </Setting>
          <Setting
            icon="help-circle-outline"
            label="Help & House Rules Handbook"
            onPress={() =>
              Alert.alert("Help", "House rules will be connected later.")
            }
          />
        </View>

        <Pressable style={styles.logout} onPress={logout}>
          <Ionicons name="log-out-outline" size={17} color="#d33f3f" />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      {hasRoom ? (
        <AssignedTenantNav active="Profile" />
      ) : (
        <ApplicantTenantNav active="Account" />
      )}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setEditOpen(false)}>
                <Ionicons name="close" size={22} color="#526174" />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(name) =>
                setDraft((current) => ({ ...current, name }))
              }
            />
            <Text style={styles.inputLabel}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={draft.phone}
              onChangeText={(phone) =>
                setDraft((current) => ({ ...current, phone }))
              }
              keyboardType="phone-pad"
            />
            <Text style={styles.inputLabel}>Emergency Contact</Text>
            <TextInput
              style={styles.input}
              value={draft.emergencyContact}
              onChangeText={(emergencyContact) =>
                setDraft((current) => ({ ...current, emergencyContact }))
              }
            />
            <Pressable style={styles.saveButton} onPress={saveProfile}>
              <Text style={styles.saveText}>Save Changes</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

function Setting({
  icon,
  label,
  onPress,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.setting} onPress={onPress}>
      <Ionicons name={icon} size={17} color="#526174" />
      <Text style={styles.settingLabel}>{label}</Text>
      {children || (
        <Ionicons name="chevron-forward" size={16} color="#71809a" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f7f9fc" },
  content: { padding: 14, paddingBottom: 90 },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: { fontSize: 21, fontWeight: "700", color: "#172033" },
  profile: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  name: { fontSize: 15, fontWeight: "700", color: "#253149" },
  green: { color: "#16805d", fontSize: 12, marginTop: 2 },
  email: { color: "#78879b", fontSize: 11, marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 11,
    padding: 13,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e5eaf1",
  },
  cardTitleRow: { flexDirection: "row", justifyContent: "space-between" },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#253149",
    marginBottom: 5,
  },
  active: {
    color: "#16805d",
    backgroundColor: "#d9f7e8",
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  edit: { color: "#16805d", fontSize: 12, fontWeight: "700" },
  info: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#eef1f5",
    paddingVertical: 9,
  },
  label: { color: "#71809a", fontSize: 12 },
  value: {
    color: "#253149",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  setting: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#eef1f5",
    gap: 9,
  },
  settingLabel: { flex: 1, color: "#42526a", fontSize: 12 },
  logout: {
    height: 43,
    backgroundColor: "#fff",
    borderRadius: 9,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  logoutText: { color: "#d33f3f", fontWeight: "700", fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.4)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 19, fontWeight: "700", color: "#172033" },
  inputLabel: { fontSize: 11, color: "#536783", marginTop: 9, marginBottom: 5 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#ccd7e4",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#172033",
  },
  saveButton: {
    height: 45,
    backgroundColor: "#16805d",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  saveText: { color: "#fff", fontWeight: "700" },
});
