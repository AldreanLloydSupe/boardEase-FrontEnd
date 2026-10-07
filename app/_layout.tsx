import { AppAlertProvider } from "@/components/app-alert";
import { OfflineBanner } from "@/components/offline-banner";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";

export const unstable_settings = {
  anchor: "index",
};

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
        </AppAlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
