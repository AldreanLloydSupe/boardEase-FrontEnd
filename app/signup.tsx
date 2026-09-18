import { Link, router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";

export default function Signup() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    if (
      !form.name ||
      !form.email ||
      !form.password ||
      form.password !== form.confirm
    ) {
      Alert.alert(
        "Check your details",
        "Complete the form and make sure your passwords match.",
      );
      return;
    }
    try {
      setBusy(true);
      await signUp(form.name, form.email, form.password, form.phone);
      router.replace("/dashboard");
    } catch (error) {
      Alert.alert(
        "Unable to create account",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.brandName}>BoardEase</Text>
          <Text style={styles.tagline}>
            Manage your boarding house, simplified
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.sub}>
            Fill in your personal & contact details to get started
          </Text>
          <Field
            label="Full Name"
            placeholder="Juan Dela Cruz"
            value={form.name}
            onChangeText={update("name")}
          />
          <Field
            label="Contact Number"
            placeholder="+63 917 555 1234"
            value={form.phone}
            onChangeText={update("phone")}
            keyboardType="phone-pad"
          />
          <Field
            label="Email Address"
            placeholder="juan.delacruz@email.com"
            value={form.email}
            onChangeText={update("email")}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <PasswordField
            label="Password"
            placeholder="********"
            value={form.password}
            onChangeText={update("password")}
            secureTextEntry={!showPassword}
            showPassword={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
          <PasswordField
            label="Confirm Password"
            placeholder="********"
            value={form.confirm}
            onChangeText={update("confirm")}
            secureTextEntry={!showConfirm}
            showPassword={showConfirm}
            onToggle={() => setShowConfirm((visible) => !visible)}
          />
          <Text style={styles.section}>EMERGENCY CONTACT</Text>
          <Field
            label="Contact Name & Relationship"
            placeholder="Maria Dela Cruz (Mother)"
          />
          <Field
            label="Emergency Contact Number"
            placeholder="0918 222 3344"
            keyboardType="phone-pad"
          />
          <Pressable style={styles.check}>
            <View style={styles.box} />
            <Text style={styles.checkText}>
              I agree to the <Text style={styles.link}>Terms of Service</Text>{" "}
              and <Text style={styles.link}>Privacy Policy</Text>
            </Text>
          </Pressable>
          <Pressable style={styles.button} onPress={submit} disabled={busy}>
            <Text style={styles.buttonText}>
              {busy ? "Creating..." : "Create Account"}
            </Text>
          </Pressable>
          <Text style={styles.bottom}>
            Already have an account?{" "}
            <Link href="/login" style={styles.link}>
              Log In
            </Link>
          </Text>
        </View>
        <Text style={styles.copy}>
          (c) 2025 BoardEase. All rights reserved.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#99a8bd"
        {...props}
      />
    </View>
  );
}
function PasswordField({
  label,
  showPassword,
  onToggle,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  showPassword: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholderTextColor="#99a8bd"
          {...props}
        />
        <Pressable
          style={styles.eye}
          onPress={onToggle}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={21}
            color="#71809a"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7fb" },
  content: { padding: 16, paddingTop: 28, paddingBottom: 34 },
  brand: { alignItems: "center", marginBottom: 24 },
  logo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 25, fontWeight: "700" },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#172033",
    marginTop: 10,
  },
  tagline: { fontSize: 12, color: "#738199", marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 1,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#172033" },
  sub: { fontSize: 11, color: "#738199", marginTop: 5, marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, color: "#2f415d", marginBottom: 6 },
  input: {
    height: 43,
    borderWidth: 1,
    borderColor: "#9aa6b8",
    borderRadius: 4,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1f2b40",
  },
  passwordWrap: {
    height: 43,
    borderWidth: 1,
    borderColor: "#9aa6b8",
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    height: 41,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1f2b40",
  },
  eye: {
    height: 41,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    fontSize: 11,
    color: "#9aa8bb",
    textAlign: "center",
    marginVertical: 16,
    letterSpacing: 1,
  },
  check: { flexDirection: "row", alignItems: "center", marginVertical: 6 },
  box: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: "#d6deea",
    borderRadius: 3,
    marginRight: 8,
  },
  checkText: { fontSize: 11, color: "#64748b" },
  link: { color: "#2864e8" },
  button: {
    height: 44,
    borderRadius: 8,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  bottom: {
    textAlign: "center",
    fontSize: 11,
    color: "#738199",
    marginTop: 16,
  },
  copy: { textAlign: "center", fontSize: 10, color: "#a6b1c0", marginTop: 20 },
});
