import { ProfilePictureButton } from "@/components/profile-picture-button";
import {
  ApplicantTenantNav,
  AssignedTenantNav,
} from "@/components/tenant-navigation";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { auth, db } from "@/lib/firebase";
import { vacateTenantRoom } from "@/lib/room-vacate";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
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

type Profile = {
  name: string;
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  roomNumber: string;
  roomType: string;
  roomRent: string;
};

export default function Account() {
  const {
    user,
    hasRoom,
    signOut,
    resetPassword,
    updateUserProfile,
  } = useAuth();

  const [notifications, setNotifications] = React.useState(true);
  const [paymentReminders, setPaymentReminders] = React.useState(true);
  const [maintenanceUpdates, setMaintenanceUpdates] = React.useState(true);
  const [applicationUpdates, setApplicationUpdates] = React.useState(true);
  const [tourUpdates, setTourUpdates] = React.useState(true);
  const [reminderTiming, setReminderTiming] = React.useState("3 days before");
  const [editOpen, setEditOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Dropdown states
  const [tenancyOpen, setTenancyOpen] = React.useState(false);
  const [personalOpen, setPersonalOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const [profile, setProfile] = React.useState<Profile>({
    name: user?.displayName || "Tenant",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
    roomNumber: "",
    roomType: "Room",
    roomRent: "",
  });

  const [draft, setDraft] = React.useState({
    name: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
  });

  React.useEffect(() => {
    if (!db || !user) return;

    return onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data() || {};

      setProfile((current) => ({
        ...current,
        name: String(data.name || user.displayName || current.name),
        phone: String(data.phone || ""),
        emergencyContact: String(data.emergencyContact || ""),
        emergencyPhone: String(data.emergencyPhone || ""),
        roomNumber: String(data.roomNumber || data.roomId || ""),
        roomType: String(data.roomType || "Room"),
        roomRent: String(data.roomRent || ""),
      }));
      setNotifications(data.notificationsEnabled !== false);
      setPaymentReminders(data.paymentReminders !== false);
      setMaintenanceUpdates(data.maintenanceUpdates !== false);
      setApplicationUpdates(data.applicationUpdates !== false);
      setTourUpdates(data.tourUpdates !== false);
      setReminderTiming(String(data.reminderTiming || "3 days before"));
    });
  }, [user]);

  async function savePreference(field: string, value: boolean | string) {
    if (!db || !user) return;
    try {
      await setDoc(doc(db, "users", user.uid), { [field]: value }, { merge: true });
    } catch {
      Alert.alert("Unable to save setting", "Please try again.");
    }
  }

  async function sendPasswordReset() {
    if (!user?.email) return;
    try {
      await resetPassword(user.email);
      Alert.alert("Password reset sent", `Check ${user.email} for the reset link.`);
    } catch {
      Alert.alert("Unable to send reset link", "Please try again later.");
    }
  }

  async function changePassword() {
    if (!auth?.currentUser || !user?.email) return;
    if (newPassword.length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords do not match", "Confirm your new password.");
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert("Password changed", "Your password was updated successfully.");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code || "")
        : "";
      Alert.alert(
        code === "auth/invalid-credential" ? "Incorrect current password" : "Unable to change password",
        code === "auth/invalid-credential" ? "Check your current password and try again." : "Please try again.",
      );
    }
  }

  function chooseReminderTiming() {
    Alert.alert("Payment reminder timing", "When should we remind you?", [
      ...["7 days before", "3 days before", "1 day before"].map((value) => ({
        text: value,
        onPress: () => {
          setReminderTiming(value);
          void savePreference("reminderTiming", value);
        },
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This signs you out and permanently deletes your Firebase account. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            if (!auth?.currentUser) return;
            try {
              await deleteUser(auth.currentUser);
              router.replace("/login");
            } catch {
              Alert.alert(
                "Recent sign-in required",
                "For your security, sign in again before deleting your account.",
              );
            }
          },
        },
      ],
    );
  }

  function openEdit() {
    setDraft({
      name: profile.name,
      phone: profile.phone,
      emergencyContact: profile.emergencyContact,
      emergencyPhone: profile.emergencyPhone,
    });

    setEditOpen(true);
  }

  async function saveProfile() {
    if (!draft.name.trim()) {
      Alert.alert("Missing name", "Enter your full name.");
      return;
    }
    if (draft.phone.trim() && !/^[+\d][\d\s()-]{6,}$/.test(draft.phone.trim())) {
      Alert.alert("Invalid phone number", "Enter a valid contact number.");
      return;
    }

    try {
      await updateUserProfile({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        emergencyContact: draft.emergencyContact.trim(),
        emergencyPhone: draft.emergencyPhone.trim(),
      });

      setEditOpen(false);

      Alert.alert(
        "Profile updated",
        "Your profile details were saved."
      );
    } catch {
      Alert.alert(
        "Unable to update profile",
        "Please try again."
      );
    }
  }

  async function logout() {
    await signOut();
    router.replace("/login");
  }

  async function leaveRoom() {
    if (!user || !profile.roomNumber) {
      Alert.alert("No room assigned", "You are not currently assigned to a room.");
      return;
    }

    Alert.alert(
      "Leave room?",
      `This will remove your assignment from Room ${profile.roomNumber}. The landlord will need to assign you to a new room again if needed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave room",
          style: "destructive",
          onPress: async () => {
            try {
              await vacateTenantRoom(user.uid, profile.roomNumber);
              Alert.alert("Room removed", "Your room assignment has been cleared.");
            } catch (error) {
              Alert.alert(
                "Unable to leave room",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  }

  const roomLabel = profile.roomNumber
    ? `Room ${profile.roomNumber} - ${profile.roomType}`
    : "No room assigned";

  return (
    <SafeAreaView style={styles.page}>
      <TenantPageHeader title="Account" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* PROFILE HEADER */}
        <View style={styles.profile}>
          <ProfilePictureButton
            fallback={profile.name.slice(0, 2).toUpperCase()}
            size={49}
          />

          <View style={styles.profileDetails}>
            <Text style={styles.name}>{profile.name}</Text>

            <Text style={styles.green}>
              Tenant ·{" "}
              {profile.roomNumber
                ? `Room ${profile.roomNumber}`
                : "No room assigned"}
            </Text>

            <Text style={styles.email}>
              {user?.email || ""}
            </Text>
          </View>

          <Pressable
            onPress={openEdit}
            accessibilityLabel="Edit profile"
            style={styles.editProfileButton}
          >
            <Ionicons
              name="create-outline"
              size={19}
              color="#526174"
            />
          </Pressable>
        </View>

        {/* TENANCY SUMMARY DROPDOWN */}
        <DropdownSection
          title="Tenancy Summary"
          subtitle={
            profile.roomNumber
              ? `Room ${profile.roomNumber}`
              : "No room assigned"
          }
          icon="home-outline"
          open={tenancyOpen}
          onPress={() => setTenancyOpen((current) => !current)}
        >
          <Info
            label="Assigned Room"
            value={roomLabel}
          />

          <Info
            label="Monthly Rent"
            value={
              profile.roomRent
                ? `₱${profile.roomRent} / month`
                : "—"
            }
          />

          <Info
            label="Rent Due Date"
            value="5th of every month"
          />

          <Setting
            icon="exit-outline"
            label="Leave Room"
            onPress={() => {
              void leaveRoom();
            }}
          />
        </DropdownSection>

        {/* PERSONAL & CONTACT INFO DROPDOWN */}
        <DropdownSection
          title="Personal & Contact Info"
          subtitle="Profile details"
          icon="person-outline"
          open={personalOpen}
          onPress={() => setPersonalOpen((current) => !current)}
          rightAction={
            <Pressable
              onPress={openEdit}
              hitSlop={8}
            >
              <Text style={styles.edit}>Edit</Text>
            </Pressable>
          }
        >
          <Info
            label="Full Name"
            value={profile.name}
          />

          <Info
            label="Contact Number"
            value={profile.phone}
          />

          <Info
            label="Email"
            value={user?.email || ""}
          />

          <Info
            label="Emergency Contact"
            value={profile.emergencyContact || "Not provided"}
          />

          <Info
            label="Emergency Contact Number"
            value={profile.emergencyPhone || "Not provided"}
          />

          <Info
            label="ID Verification"
            value="Verified Student ID"
          />
        </DropdownSection>

        {/* SETTINGS & PREFERENCES DROPDOWN */}
        <DropdownSection
          title="Settings & Preferences"
          subtitle="Security and notifications"
          icon="settings-outline"
          open={settingsOpen}
          onPress={() => setSettingsOpen((current) => !current)}
        >
          <Setting
            icon="lock-closed-outline"
            label="Change Password & Security"
            onPress={() => setPasswordOpen(true)}
          />

          <Setting
            icon="notifications-outline"
            label="Notification Settings"
            onPress={() => {
              const value = !notifications;
              setNotifications(value);
              void savePreference("notificationsEnabled", value);
            }}
          >
            <Switch
              value={notifications}
              onValueChange={(value) => {
                setNotifications(value);
                void savePreference("notificationsEnabled", value);
              }}
              trackColor={{
                false: "#d8dee8",
                true: "#9bb9f5",
              }}
              thumbColor={
                notifications ? "#2864e8" : "#f4f4f4"
              }
            />
          </Setting>

          <Setting
            icon="help-circle-outline"
            label="Help & House Rules Handbook"
            onPress={() =>
              Alert.alert(
                "House rules and help",
                "Quiet hours: 10:00 PM–6:00 AM. Keep shared areas clean, report maintenance issues promptly, and contact Kuya Bert for urgent concerns.",
                [{ text: "OK" }],
              )
            }
          />

          <Setting
            icon="cash-outline"
            label={`Payment Reminders · ${reminderTiming}`}
            onPress={() => {
              const value = !paymentReminders;
              setPaymentReminders(value);
              void savePreference("paymentReminders", value);
            }}
          >
            <Switch
              value={paymentReminders}
              onValueChange={(value) => {
                setPaymentReminders(value);
                void savePreference("paymentReminders", value);
              }}
              trackColor={{ false: "#d8dee8", true: "#9bb9f5" }}
              thumbColor={paymentReminders ? "#2864e8" : "#f4f4f4"}
            />
          </Setting>

          <Setting
            icon="calendar-outline"
            label="Change Reminder Timing"
            onPress={chooseReminderTiming}
          />

          <Setting
            icon="wallet-outline"
            label="Payment Preferences & History"
            onPress={() => {
              if (!hasRoom) {
                Alert.alert(
                  "Room assignment required",
                  "Payment preferences and history are available after you are assigned a room.",
                );
                return;
              }
              router.push("/tenant/payments" as any);
            }}
          />

          <Setting
            icon="time-outline"
            label="Notification History"
            onPress={() => router.push("/tenant/notifications" as any)}
          />

          <Setting
            icon="construct-outline"
            label="Maintenance Updates"
            onPress={() => {
              const value = !maintenanceUpdates;
              setMaintenanceUpdates(value);
              void savePreference("maintenanceUpdates", value);
            }}
          >
            <Switch
              value={maintenanceUpdates}
              onValueChange={(value) => {
                setMaintenanceUpdates(value);
                void savePreference("maintenanceUpdates", value);
              }}
              trackColor={{ false: "#d8dee8", true: "#9bb9f5" }}
              thumbColor={maintenanceUpdates ? "#2864e8" : "#f4f4f4"}
            />
          </Setting>

          <Setting
            icon="document-text-outline"
            label="Application Updates"
            onPress={() => {
              const value = !applicationUpdates;
              setApplicationUpdates(value);
              void savePreference("applicationUpdates", value);
            }}
          >
            <Switch
              value={applicationUpdates}
              onValueChange={(value) => {
                setApplicationUpdates(value);
                void savePreference("applicationUpdates", value);
              }}
              trackColor={{ false: "#d8dee8", true: "#9bb9f5" }}
              thumbColor={applicationUpdates ? "#2864e8" : "#f4f4f4"}
            />
          </Setting>

          <Setting
            icon="calendar-outline"
            label="Tour Request Updates"
            onPress={() => {
              const value = !tourUpdates;
              setTourUpdates(value);
              void savePreference("tourUpdates", value);
            }}
          >
            <Switch
              value={tourUpdates}
              onValueChange={(value) => {
                setTourUpdates(value);
                void savePreference("tourUpdates", value);
              }}
              trackColor={{ false: "#d8dee8", true: "#9bb9f5" }}
              thumbColor={tourUpdates ? "#2864e8" : "#f4f4f4"}
            />
          </Setting>

          <Setting
            icon="shield-checkmark-outline"
            label="Privacy & ID Verification"
            onPress={() =>
              Alert.alert(
                "Privacy & verification",
                "ID status: Verified Student ID\n\nYour profile is visible to your landlord for tenancy management. Contact support to replace your verification document or request data deletion.",
                [{ text: "OK" }],
              )
            }
          />

          <Setting
            icon="trash-outline"
            label="Delete Account"
            onPress={confirmDeleteAccount}
          />
        </DropdownSection>

        {/* LOG OUT */}
        <Pressable
          style={styles.logout}
          onPress={logout}
        >
          <Ionicons
            name="log-out-outline"
            size={17}
            color="#d33f3f"
          />

          <Text style={styles.logoutText}>
            Log Out
          </Text>
        </Pressable>
      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      {hasRoom ? (
        <AssignedTenantNav active="Profile" />
      ) : (
        <ApplicantTenantNav active="Account" />
      )}

      {/* EDIT PROFILE MODAL */}
      <Modal
        visible={passwordOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setPasswordOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#526174" />
              </Pressable>
            </View>
            <Text style={styles.modalHint}>Enter your current password, then choose a new one.</Text>
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Current password"
            />
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="At least 6 characters"
            />
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Repeat new password"
            />
            <Pressable style={styles.saveButton} onPress={() => void changePassword()}>
              <Text style={styles.saveText}>Update Password</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit Profile
              </Text>

              <Pressable
                onPress={() => setEditOpen(false)}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#526174"
                />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>
              Full Name
            </Text>

            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(name) =>
                setDraft((current) => ({
                  ...current,
                  name,
                }))
              }
            />

            <Text style={styles.inputLabel}>
              Contact Number
            </Text>

            <TextInput
              style={styles.input}
              value={draft.phone}
              onChangeText={(phone) =>
                setDraft((current) => ({
                  ...current,
                  phone,
                }))
              }
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>
              Emergency Contact
            </Text>

            <TextInput
              style={styles.input}
              value={draft.emergencyContact}
              onChangeText={(emergencyContact) =>
                setDraft((current) => ({
                  ...current,
                  emergencyContact,
                }))
              }
            />

            <Text style={styles.inputLabel}>Emergency Contact Number</Text>
            <TextInput
              style={styles.input}
              value={draft.emergencyPhone}
              onChangeText={(emergencyPhone) =>
                setDraft((current) => ({ ...current, emergencyPhone }))
              }
              keyboardType="phone-pad"
            />

            <Pressable
              style={styles.saveButton}
              onPress={saveProfile}
            >
              <Text style={styles.saveText}>
                Save Changes
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   DROPDOWN SECTION
========================================================= */

function DropdownSection({
  title,
  subtitle,
  icon,
  open,
  onPress,
  children,
  rightAction,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  open: boolean;
  onPress: () => void;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
}) {
  return (
    <View style={styles.dropdownCard}>
      <Pressable
        style={styles.dropdownHeader}
        onPress={onPress}
        android_ripple={{
          color: "#edf3ff",
        }}
      >
        <View style={styles.dropdownIcon}>
          <Ionicons
            name={icon}
            size={18}
            color="#2864e8"
          />
        </View>

        <View style={styles.dropdownTitleArea}>
          <Text style={styles.dropdownTitle}>
            {title}
          </Text>

          {!open && (
            <Text style={styles.dropdownSubtitle}>
              {subtitle}
            </Text>
          )}
        </View>

        {rightAction && open ? (
          <View style={styles.dropdownRightAction}>
            {rightAction}
          </View>
        ) : null}

        <View style={styles.chevronContainer}>
          <Ionicons
            name={
              open
                ? "chevron-up"
                : "chevron-down"
            }
            size={18}
            color="#71809a"
          />
        </View>
      </Pressable>

      {open && (
        <View style={styles.dropdownContent}>
          {children}
        </View>
      )}
    </View>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.info}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text style={styles.value}>
        {value}
      </Text>
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
    <Pressable
      style={styles.setting}
      onPress={onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons
          name={icon}
          size={17}
          color="#2864e8"
        />
      </View>

      <Text style={styles.settingLabel}>
        {label}
      </Text>

      {children || (
        <Ionicons
          name="chevron-forward"
          size={16}
          color="#71809a"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f3f7fd",
  },

  content: {
    padding: 14,
    paddingBottom: 100,
  },

  /* HEADER */
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -14,
    marginHorizontal: -14,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 22,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#173b80",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 7,
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  headerIdentity: { flexDirection: "row", alignItems: "center", gap: 11 },

  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  profile: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e1eafa",
    shadowColor: "#173b80",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },

  profileDetails: {
    flex: 1,
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#253149",
  },

  green: {
    color: "#2458c7",
    fontSize: 12,
    marginTop: 2,
  },

  email: {
    color: "#78879b",
    fontSize: 11,
    marginTop: 2,
  },

  editProfileButton: {
    padding: 5,
  },

  dropdownCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e1eafa",
    overflow: "hidden",
    shadowColor: "#173b80",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.035,
    shadowRadius: 6,
    elevation: 1,
  },

  dropdownHeader: {
    minHeight: 67,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dropdownIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownTitleArea: {
    flex: 1,
    justifyContent: "center",
  },

  dropdownTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#253149",
  },

  dropdownSubtitle: {
    fontSize: 11,
    color: "#8793a5",
    marginTop: 3,
  },

  dropdownRightAction: {
    marginRight: 2,
  },

  chevronContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f3f6fb",
    alignItems: "center",
    justifyContent: "center",
  },

  dropdownContent: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#edf1f7",
  },

  info: {
    minHeight: 43,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
    paddingVertical: 9,
  },

  label: {
    color: "#71809a",
    fontSize: 12,
  },

  value: {
    color: "#253149",
    fontSize: 12,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },

  /* EDIT */
  edit: {
    color: "#2864e8",
    fontSize: 12,
    fontWeight: "700",
  },

  /* SETTINGS */
  setting: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#edf1f7",
    gap: 9,
  },

  settingIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#eaf1ff",
    alignItems: "center",
    justifyContent: "center",
  },

  settingLabel: {
    flex: 1,
    color: "#42526a",
    fontSize: 12,
  },

  /* LOGOUT */
  logout: {
    height: 45,
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#f0dada",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  logoutText: {
    color: "#d33f3f",
    fontWeight: "700",
    fontSize: 12,
  },

  /* MODAL */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.4)",
    justifyContent: "center",
    padding: 16,
  },

  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    paddingBottom: 30,
    maxHeight: "90%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#172033",
  },

  modalHint: {
    color: "#71809a",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },

  inputLabel: {
    fontSize: 11,
    color: "#536783",
    marginTop: 9,
    marginBottom: 5,
  },

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
    backgroundColor: "#2864e8",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  saveText: {
    color: "#fff",
    fontWeight: "700",
  },
});
