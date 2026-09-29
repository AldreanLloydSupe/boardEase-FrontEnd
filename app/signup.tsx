import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
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
  Animated,
} from "react-native";

export default function Signup() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    emergencyName: "",
    emergencyPhone: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [loadingSkeleton, setLoadingSkeleton] = useState(true);
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

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    setErrorMsg("");
    if (
      !form.name ||
      !form.email ||
      !form.password ||
      form.password !== form.confirm
    ) {
      setErrorMsg("Complete the form and make sure your passwords match.");
      Alert.alert(
        "Check your details",
        "Complete the form and make sure your passwords match.",
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setFieldErrors((prev) => ({ ...prev, email: true }));
      setErrorMsg("Please enter a valid email address (mobile numbers are not accepted).");
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address (mobile numbers are not accepted).",
      );
      return;
    }

    if (!agreedToTerms) {
      setErrorMsg("Please agree to the Terms of Service and Privacy Policy.");
      Alert.alert(
        "Agreement required",
        "Please agree to the Terms of Service and Privacy Policy before creating your account.",
      );
      return;
    }
    try {
      setBusy(true);
      await signUp(form.name, form.email, form.password, form.phone);
      router.replace("/");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      setErrorMsg(msg);
      Alert.alert("Unable to create account", msg);
    } finally {
      setBusy(false);
    }
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
            <Animated.View style={[styles.skeletonSub, { opacity: pulseAnim }]} />
            
            {Array.from({ length: 5 }).map((_, i) => (
              <View style={styles.field} key={i}>
                <Animated.View style={[styles.skeletonLabel, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
              </View>
            ))}
            
            <Animated.View style={[styles.skeletonSection, { opacity: pulseAnim }]} />
            
            {Array.from({ length: 2 }).map((_, i) => (
              <View style={styles.field} key={`em-${i}`}>
                <Animated.View style={[styles.skeletonLabel, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
              </View>
            ))}

            <Animated.View style={[styles.skeletonButton, { opacity: pulseAnim, marginTop: 14 }]} />
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
          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          <Field
            label="Full Name"
            placeholder="Enter your full name"
            value={form.name}
            onChangeText={(t) => { 
              const lettersOnly = t.replace(/[^a-zA-Z\s]/g, "");
              if (t !== lettersOnly) triggerFeedback("name");
              update("name")(lettersOnly); 
              setErrorMsg(""); 
            }}
            error={(!!errorMsg && !form.name) || fieldErrors.name}
          />
          <Field
            label="Contact Number"
            placeholder="09175551234"
            value={form.phone}
            onChangeText={(t) => { 
              const numbersOnly = t.replace(/[^0-9]/g, "");
              if (t !== numbersOnly) triggerFeedback("phone");
              update("phone")(numbersOnly); 
              setErrorMsg(""); 
            }}
            keyboardType="phone-pad"
            error={(!!errorMsg && !form.phone) || fieldErrors.phone}
          />
          <Field
            label="Email Address"
            placeholder="juan.delacruz@email.com"
            value={form.email}
            onChangeText={(t) => { 
              update("email")(t); 
              setErrorMsg(""); 
              setFieldErrors((prev) => ({ ...prev, email: false }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={(!!errorMsg && !form.email) || fieldErrors.email}
          />
          <PasswordField
            label="Password"
            placeholder="********"
            value={form.password}
            onChangeText={(t) => { update("password")(t); setErrorMsg(""); }}
            secureTextEntry={!showPassword}
            showPassword={showPassword}
            onToggle={() => setShowPassword((visible) => !visible)}
            error={!!errorMsg && (!form.password || form.password !== form.confirm)}
          />
          <PasswordField
            label="Confirm Password"
            placeholder="********"
            value={form.confirm}
            onChangeText={(t) => { update("confirm")(t); setErrorMsg(""); }}
            secureTextEntry={!showConfirm}
            showPassword={showConfirm}
            onToggle={() => setShowConfirm((visible) => !visible)}
            error={!!errorMsg && (!form.confirm || form.password !== form.confirm)}
          />
          <Text style={styles.section}>EMERGENCY CONTACT</Text>
          <Field
            label="Contact Name & Relationship"
            placeholder="Maria Dela Cruz Mother"
            value={form.emergencyName}
            onChangeText={(t) => {
              const lettersOnly = t.replace(/[^a-zA-Z\s]/g, "");
              if (t !== lettersOnly) triggerFeedback("emergencyName");
              update("emergencyName")(lettersOnly);
              setErrorMsg("");
            }}
            error={fieldErrors.emergencyName}
          />
          <Field
            label="Emergency Contact Number"
            placeholder="09182223344"
            keyboardType="phone-pad"
            value={form.emergencyPhone}
            onChangeText={(t) => {
              const numbersOnly = t.replace(/[^0-9]/g, "");
              if (t !== numbersOnly) triggerFeedback("emergencyPhone");
              update("emergencyPhone")(numbersOnly);
              setErrorMsg("");
            }}
            error={fieldErrors.emergencyPhone}
          />
          <Pressable
            style={styles.check}
            onPress={() => setAgreedToTerms((checked) => !checked)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
          >
            <View style={[styles.box, agreedToTerms && styles.checkedBox]}>
              {agreedToTerms && <Text style={styles.checkMark}>✓</Text>}
            </View>
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
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string; error?: boolean }) {
  const [isFocused, setIsFocused] = React.useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, isFocused && styles.labelFocused, error && styles.labelError]}>{label}</Text>
      <TextInput
        style={[styles.input, isFocused && styles.inputFocused, error && styles.inputError]}
        placeholderTextColor="#99a8bd"
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
          placeholderTextColor="#99a8bd"
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
  label: { fontSize: 12, color: "#2f415d", marginBottom: 6, fontWeight: "600" },
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
  checkedBox: {
    backgroundColor: "#2864e8",
    borderColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 15 },
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
  // Skeleton Styles
  skeletonLogo: { width: 54, height: 54, borderRadius: 16, backgroundColor: '#d1d8e0' },
  skeletonBrandName: { width: 120, height: 22, borderRadius: 4, backgroundColor: '#d1d8e0', marginTop: 10 },
  skeletonTagline: { width: 220, height: 14, borderRadius: 4, backgroundColor: '#d1d8e0', marginTop: 6 },
  skeletonTitle: { width: 150, height: 22, borderRadius: 4, backgroundColor: '#d1d8e0' },
  skeletonSub: { width: '80%', height: 14, borderRadius: 4, backgroundColor: '#d1d8e0', marginTop: 5, marginBottom: 18 },
  skeletonLabel: { width: 80, height: 12, borderRadius: 4, backgroundColor: '#d1d8e0', marginBottom: 6 },
  skeletonInput: { height: 43, borderRadius: 4, backgroundColor: '#e2e8f0' },
  skeletonSection: { width: 140, height: 12, borderRadius: 4, backgroundColor: '#d1d8e0', alignSelf: 'center', marginVertical: 16 },
  skeletonButton: { height: 44, borderRadius: 8, backgroundColor: '#d1d8e0' },
});
