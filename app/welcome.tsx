import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Welcome() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const buttonSlideAnim = useRef(new Animated.Value(30)).current;

  const [loadingAction, setLoadingAction] = useState<
    "/login" | "/signup" | null
  >(null);

  useEffect(() => {
    Animated.stagger(200, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [fadeAnim, slideAnim, buttonFadeAnim, buttonSlideAnim]);

  const handlePress = (route: "/login" | "/signup") => {
    if (loadingAction) return;
    setLoadingAction(route);
    setTimeout(() => {
      router.push(route);
      setLoadingAction(null);
    }, 400); // Wait 400ms to show the disabled grey state
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.Text style={[styles.welcomeText, { opacity: fadeAnim }]}>
        WELCOME
      </Animated.Text>

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="business" size={40} color="#2864e8" />
        </View>

        <Text style={styles.title}>Board Ease</Text>
        <Text style={styles.subtitle}>
          Manage your{"\n"}boarding house,{"\n"}simplified.
        </Text>

        <View style={styles.graphicContainer}>
          <Ionicons
            name="home-outline"
            size={48}
            color="#e6efff"
            style={{ marginHorizontal: 8 }}
          />
          <Ionicons
            name="business-outline"
            size={64}
            color="#e6efff"
            style={{ marginHorizontal: 8 }}
          />
          <Ionicons
            name="home-outline"
            size={40}
            color="#e6efff"
            style={{ marginHorizontal: 8 }}
          />
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonFadeAnim,
            transform: [{ translateY: buttonSlideAnim }],
          },
        ]}
      >
        <Pressable
          style={[
            styles.primaryButton,
            loadingAction === "/login" && styles.buttonDisabled,
          ]}
          onPress={() => handlePress("/login")}
          disabled={loadingAction !== null}
        >
          <Text
            style={[
              styles.primaryButtonText,
              loadingAction === "/login" && styles.textDisabled,
            ]}
          >
            {loadingAction === "/login" ? "Loading..." : "Log in"}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.secondaryButton,
            loadingAction === "/signup" && styles.buttonDisabled,
          ]}
          onPress={() => handlePress("/signup")}
          disabled={loadingAction !== null}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              loadingAction === "/signup" && styles.textDisabled,
            ]}
          >
            {loadingAction === "/signup" ? "Loading..." : "Create account"}
          </Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "space-between",
    padding: 24,
  },
  welcomeText: {
    textAlign: "center",
    color: "#2864e8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: Platform.OS === "android" ? 40 : 20,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 88,
    height: 88,
    backgroundColor: "#ffffff",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    shadowColor: "#2864e8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e6efff",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2864e8",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 44,
    marginBottom: 48,
  },
  graphicContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 80,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: Platform.OS === "android" ? 32 : 12,
  },
  primaryButton: {
    backgroundColor: "#2864e8",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#2864e8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e6efff",
  },
  secondaryButtonText: {
    color: "#2864e8",
    fontSize: 18,
    fontWeight: "700",
  },
  buttonDisabled: {
    backgroundColor: "#e0e0e0",
    borderColor: "#e0e0e0",
    shadowOpacity: 0,
    elevation: 0,
  },
  textDisabled: {
    color: "#9e9e9e",
  },
});
