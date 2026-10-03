import { backOrReplace } from "@/lib/navigation";
import { AppAlert as Alert } from "@/components/app-alert";
import { usePropertySettings } from "@/lib/use-property-settings";
import { db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default function PropertySettings() {
  const { settings, error, loading } = usePropertySettings();
  if (loading)
    return (
      <SafeAreaView>
        <Text>Loading property settings…</Text>
      </SafeAreaView>
    );
  if (error)
    return (
      <SafeAreaView>
        <Text accessibilityRole="alert">{error}</Text>
        <Pressable onPress={() => backOrReplace(router, "/landlord/dashboard")}>
          <Text>Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  return <SettingsForm initial={settings} />;
}
function SettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const [draft, setDraft] = React.useState({
    caretakerName: String(initial.caretakerName || ""),
    caretakerPhone: String(initial.caretakerPhone || ""),
    gcashName: String(initial.gcashName || ""),
    gcashNumber: String(initial.gcashNumber || ""),
    houseRules: String(initial.houseRules || ""),
    bulletin: String(initial.bulletin || ""),
  });
  const [saving, setSaving] = React.useState(false);
  async function save() {
    if (!db || saving) return;
    const data = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()]),
    );
    if (data.gcashNumber && !/^09\d{9}$/.test(data.gcashNumber)) {
      Alert.alert(
        "Invalid GCash number",
        "Use an 11-digit Philippine mobile number starting with 09.",
      );
      return;
    }
    if (data.caretakerPhone && !/^(\+63|0)9\d{9}$/.test(data.caretakerPhone)) {
      Alert.alert(
        "Invalid phone number",
        "Use 09 followed by 9 digits, or +639 followed by 9 digits.",
      );
      return;
    }
    if (data.gcashNumber && !data.gcashName) {
      Alert.alert(
        "Account name required",
        "Enter the registered GCash receiver name.",
      );
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, "propertySettings", "main"),
        { ...data, updatedAt: serverTimestamp() },
        { merge: true },
      );
      Alert.alert(
        "Settings saved",
        "Tenant contact and payment details have been updated.",
      );
    } catch {
      Alert.alert(
        "Could not save",
        "Please check your connection and permissions.",
      );
    } finally {
      setSaving(false);
    }
  }
  const fields: [keyof typeof draft, string][] = [
    ["caretakerName", "Caretaker name"],
    ["caretakerPhone", "Caretaker phone"],
    ["gcashName", "GCash receiver name"],
    ["gcashNumber", "GCash receiver number"],
    ["houseRules", "House rules"],
    ["bulletin", "Bulletin"],
  ];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f7fd" }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          gap: 14,
          maxWidth: 680,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Pressable
          onPress={() => backOrReplace(router, "/landlord/dashboard")}
          style={{ paddingVertical: 12 }}
        >
          <Text style={{ color: "#2864e8" }}>Back to dashboard</Text>
        </Pressable>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>
          Property settings
        </Text>
        {fields.map(([key, label]) => (
          <View key={key}>
            <Text style={{ marginBottom: 6 }}>{label}</Text>
            <TextInput
              value={draft[key]}
              onChangeText={(value) => {
                setDraft((d) => ({ ...d, [key]: value }));
              }}
              multiline={key === "houseRules" || key === "bulletin"}
              maxLength={
                key === "houseRules" || key === "bulletin" ? 4000 : 100
              }
              style={{
                backgroundColor: "#fff",
                borderRadius: 8,
                padding: 12,
                minHeight: 48,
                borderWidth: 1,
                borderColor: "#dce7f5",
              }}
            />
          </View>
        ))}
        <Pressable
          disabled={saving}
          onPress={() => void save()}
          style={{ backgroundColor: "#2864e8", padding: 14, borderRadius: 8 }}
        >
          <Text
            style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}
          >
            {saving ? "Saving…" : "Save settings"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
