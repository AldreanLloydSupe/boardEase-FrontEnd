import { Redirect, Stack, useSegments } from "expo-router";
import { useAuth } from "@/lib/auth-context";

export default function TenantLayout() {
  const { user, hasRoom, loading } = useAuth();
  const segments = useSegments();
  const isRoomBrowser = segments[1] === "room-browser";

  if (!loading && user && hasRoom && isRoomBrowser) {
    return <Redirect href="/tenant/tenant-home" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
