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

export default function Login() {
  const { signIn, resetPassword, firebaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    try {
      setBusy(true);
      await signIn(email, password);
      router.replace("/");
    } catch (error) {
      Alert.alert(
        "Unable to log in",
        error instanceof Error ? error.message : "Please check your details.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    try {
      await resetPassword(email);
      Alert.alert(
        "Password reset sent",
        "Check your email for a Firebase password reset link.",
      );
    } catch (error) {
      Alert.alert(
        "Unable to reset password",
        error instanceof Error ? error.message : "Please try again.",
      );
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
          <Text style={styles.title}>Welcome back</Text>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <PasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            secureTextEntry={!showPassword}
            showPassword={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
          />
          <Pressable style={styles.forgot} onPress={forgotPassword}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={submit} disabled={busy}>
            <Text style={styles.buttonText}>
              {busy ? "Logging in..." : "Log In"}
            </Text>
          </Pressable>
          <Text style={styles.bottomText}>
            Don&apos;t have an account?{" "}
            <Link href="/signup" style={styles.link}>
              Sign up
            </Link>
          </Text>
        </View>
        {!firebaseReady && (
          <Text style={styles.setup}>
            Add your Firebase values to frontend/.env, then restart Expo.
          </Text>
        )}
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
        placeholderTextColor="#9aa8ba"
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
          placeholderTextColor="#9aa8ba"
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
  content: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 42,
    paddingBottom: 36,
    justifyContent: "center",
  },
  brand: { alignItems: "center", marginBottom: 30 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { color: "#fff", fontSize: 26, fontWeight: "700" },
  brandName: { fontSize: 23, fontWeight: "700", color: "#172033" },
  tagline: { fontSize: 12, color: "#738199", marginTop: 7 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dfe6ef",
    borderRadius: 18,
    padding: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: "#172033",
    marginBottom: 22,
  },
  field: { marginBottom: 17 },
  label: { fontSize: 12, color: "#536783", marginBottom: 7 },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#cfd9e6",
    borderRadius: 9,
    paddingHorizontal: 13,
    fontSize: 15,
    color: "#1f2b40",
  },
  passwordWrap: {
    height: 45,
    borderWidth: 1,
    borderColor: "#cfd9e6",
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    height: 43,
    paddingHorizontal: 13,
    fontSize: 15,
    color: "#1f2b40",
  },
  eye: {
    paddingHorizontal: 13,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
  },
  forgot: { alignItems: "flex-end", marginTop: -2, marginBottom: 17 },
  link: { color: "#2864e8", fontSize: 12 },
  button: {
    height: 46,
    borderRadius: 9,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  bottomText: { fontSize: 12, color: "#71809a", marginTop: 17 },
  setup: { fontSize: 12, color: "#8b98aa", textAlign: "center", marginTop: 18 },
});
