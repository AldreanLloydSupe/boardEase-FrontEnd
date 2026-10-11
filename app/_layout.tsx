import { AppAlertProvider } from "@/components/app-alert";
import { OfflineBanner } from "@/components/offline-banner";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

void SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "index",
};

function SplashScreenGate() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  if (!loading) return null;

  return (
    <View pointerEvents="none" style={styles.splashPreview}>
      <Image
        source={require("@/assets/images/boardease-splash.png")}
        resizeMode="contain"
        style={styles.splashLogo}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppAlertProvider>
          <Stack
            screenOptions={{
              animation: "fade",
              contentStyle: { backgroundColor: "#ffffff" },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="welcome" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="landlord" options={{ headerShown: false }} />
            <Stack.Screen name="tenant" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: "modal", title: "Modal" }}
            />
          </Stack>
          <OfflineBanner />
          <StatusBar style="auto" />
          <SplashScreenGate />
        </AppAlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashPreview: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#2864e8",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  splashLogo: { width: 200, height: 200 },
});
