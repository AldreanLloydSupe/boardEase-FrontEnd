import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Login() {
  const { signIn, resetPassword, firebaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [loadingSkeleton, setLoadingSkeleton] = useState(true);
  const [successDelay, setSuccessDelay] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const triggerFeedback = (field: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: true }));
    setTimeout(() => {
      setFieldErrors((prev) => ({ ...prev, [field]: false }));
    }, 1000);
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      setLoadingSkeleton(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  async function submit() {
    try {
      setBusy(true);
      setErrorMsg("");
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setFieldErrors((prev) => ({ ...prev, email: true }));
        setErrorMsg("Please enter a valid email address (mobile numbers are not accepted).");
        Alert.alert(
          "Invalid Email",
          "Please enter a valid email address (mobile numbers are not accepted)."
        );
        setBusy(false);
        return;
      }
      await signIn(email, password);
      setSuccessDelay(true);
      setTimeout(() => {
        router.replace("/");
      }, 2000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please check your details.";
      setErrorMsg(msg);
      Alert.alert("Unable to log in", msg);
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

  if (successDelay) {
    return (
      <View style={styles.dashboardSkeletonPage}>
        <View style={styles.dashboardSkeletonHeader}>
          <Animated.View style={[styles.skeletonHeaderTitle, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.skeletonHeaderSubtitle, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.dashboardSkeletonContent}>
          <Animated.View style={[styles.skeletonCardLarge, { opacity: pulseAnim }]} />
          <View style={styles.skeletonGrid}>
            <Animated.View style={[styles.skeletonCardSmall, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonCardSmall, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonCardSmall, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonCardSmall, { opacity: pulseAnim }]} />
          </View>
        </View>
      </View>
    );
  }

  if (loadingSkeleton) {
    return (
      <View style={styles.page}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Animated.View style={[styles.skeletonLogo, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonBrandName, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonTagline, { opacity: pulseAnim }]} />
          </View>
          <View style={styles.card}>
            <Animated.View style={[styles.skeletonTitle, { opacity: pulseAnim }]} />
            <View style={styles.field}>
              <Animated.View style={[styles.skeletonLabel, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
            </View>
            <View style={styles.field}>
              <Animated.View style={[styles.skeletonLabel, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.skeletonForgot, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonButton, { opacity: pulseAnim }]} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="business" size={32} color="#fff" />
          </View>
          <Text style={styles.brandName}>BoardEase</Text>
          <Text style={styles.tagline}>
            Manage your boarding house, simplified
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          <Field
            label="Email"
            value={email}
            onChangeText={(t) => { 
              setEmail(t); 
              setErrorMsg(""); 
              setFieldErrors((prev) => ({ ...prev, email: false }));
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            error={(!!errorMsg && !email) || fieldErrors.email}
          />
          <PasswordField
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorMsg(""); }}
            placeholder="Enter your Password"
            secureTextEntry={!showPassword}
            showPassword={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
            error={!!errorMsg && !fieldErrors.email}
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
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; error?: boolean }) {
  const [isFocused, setIsFocused] = React.useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, isFocused && styles.labelFocused, error && styles.labelError]}>{label}</Text>
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused, error && styles.inputError]}
        placeholderTextColor="#9aa8ba"
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}

function PasswordField({
  label,
  showPassword,
  onToggle,
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  showPassword: boolean;
  onToggle: () => void;
  error?: boolean;
}) {
  const [isFocused, setIsFocused] = React.useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, isFocused && styles.labelFocused, error && styles.labelError]}>{label}</Text>
      <View style={[styles.passwordWrap, isFocused && styles.inputFocused, error && styles.inputError]}>
        <TextInput
          style={styles.passwordInput}
          placeholderTextColor="#9aa8ba"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
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
            color={isFocused ? "#2864e8" : "#71809a"}
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
  label: { fontSize: 12, color: "#536783", marginBottom: 7, fontWeight: "600" },
  labelFocused: { color: "#2864e8" },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#cfd9e6",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1f2b40",
    backgroundColor: "#fff",
  },
  inputFocused: {
    borderColor: "#2864e8",
    backgroundColor: "#f4f8ff",
  },
  labelError: { color: "#e11d48" },
  inputError: {
    borderColor: "#e11d48",
    backgroundColor: "#fff1f2",
  },
  errorText: {
    color: "#e11d48",
    fontSize: 13,
    marginBottom: 15,
    marginTop: -10,
    backgroundColor: "#fff1f2",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fbcfe8",
  },
  passwordWrap: {
    height: 48,
    borderWidth: 1.5,
    borderColor: "#cfd9e6",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
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
  // Skeleton Styles
  skeletonLogo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#d1d8e0', marginBottom: 12 },
  skeletonBrandName: { width: 120, height: 24, borderRadius: 4, backgroundColor: '#d1d8e0', marginBottom: 10 },
  skeletonTagline: { width: 220, height: 14, borderRadius: 4, backgroundColor: '#d1d8e0' },
  skeletonTitle: { width: 140, height: 22, borderRadius: 4, backgroundColor: '#d1d8e0', marginBottom: 22 },
  skeletonLabel: { width: 60, height: 12, borderRadius: 4, backgroundColor: '#d1d8e0', marginBottom: 7 },
  skeletonInput: { height: 45, borderRadius: 9, backgroundColor: '#e2e8f0' },
  skeletonForgot: { width: 100, height: 12, borderRadius: 4, backgroundColor: '#d1d8e0', alignSelf: 'flex-end', marginTop: -2, marginBottom: 17 },
  skeletonButton: { height: 46, borderRadius: 9, backgroundColor: '#d1d8e0' },
  dashboardSkeletonPage: { flex: 1, backgroundColor: "#f3f7fd" },
  dashboardSkeletonHeader: {
    height: 140,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    justifyContent: "flex-end",
  },
  skeletonHeaderTitle: { width: 150, height: 28, borderRadius: 6, backgroundColor: "#578af0", marginBottom: 8 },
  skeletonHeaderSubtitle: { width: 100, height: 16, borderRadius: 4, backgroundColor: "#578af0" },
  dashboardSkeletonContent: { padding: 16, marginTop: 10, gap: 16 },
  skeletonCardLarge: { width: "100%", height: 120, borderRadius: 12, backgroundColor: "#e2e8f0" },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  skeletonCardSmall: { width: "48%", height: 100, borderRadius: 12, backgroundColor: "#e2e8f0" },
});
