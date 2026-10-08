import Constants from "expo-constants";
import type { Notification } from "expo-notifications";
import { doc, setDoc } from "firebase/firestore";
import React from "react";
import { Platform } from "react-native";
import { router } from "expo-router";
import { db } from "./firebase";
import { useAuth } from "./auth-context";

function useNotificationNavigation() {
  React.useEffect(() => {
    if (Platform.OS === "web" || Constants.expoGoConfig !== null) return;
    let cancelled = false;
    let subscription: { remove: () => void } | undefined;
    async function observeResponses() {
      const Notifications = await import("expo-notifications");
      if (cancelled) return;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      const openNotification = (notification: Notification) => {
        const url = notification.request.content.data?.url;
        if (typeof url === "string" && url.startsWith("/tenant/")) {
          router.push(url as never);
        }
      };
      const last = Notifications.getLastNotificationResponse();
      if (last) openNotification(last.notification);
      subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => openNotification(response.notification),
      );
    }
    void observeResponses().catch((error) => {
      console.warn("Push notification listener setup failed", error);
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);
}

export function PushNotifications() {
  const { user, role, hasRoom } = useAuth();
  useNotificationNavigation();

  React.useEffect(() => {
    if (
      !user ||
      role !== "user" ||
      !hasRoom ||
      !db ||
      Platform.OS === "web" ||
      Constants.expoGoConfig !== null
    )
      return;
    let cancelled = false;
    async function register() {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (typeof projectId !== "string" || !projectId) return;
      const Notifications = await import("expo-notifications");
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("announcements", {
          name: "Announcements",
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await Notifications.requestPermissionsAsync();
      }
      if (permission.status !== "granted") return;
      const token = (
        await Notifications.getExpoPushTokenAsync({ projectId })
      ).data;
      if (cancelled || !db || !user) return;
      await setDoc(doc(db, "users", user.uid, "pushTokens", token), {
        token,
        platform: Platform.OS,
        updatedAt: new Date().toISOString(),
      });
    }
    void register().catch((error) => {
      console.warn("Push notification registration failed", error);
    });
    return () => {
      cancelled = true;
    };
  }, [hasRoom, role, user]);

  return null;
}
