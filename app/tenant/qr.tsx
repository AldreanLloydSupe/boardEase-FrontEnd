import { AppAlert as Alert } from "@/components/app-alert";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { router } from "expo-router";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QRScanner() {
  const { hasRoom } = useAuth();
  const safeBackHref = hasRoom ? "/tenant/tenant-home" : "/tenant/room-browser";
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = React.useState(false);
  const askForCamera = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        "Camera permission denied",
        result.canAskAgain
          ? "Allow camera access to scan a room QR code."
          : "Enable camera access for BoardEase in your device settings to scan room QR codes.",
        [{ text: "OK" }, ...(!result.canAskAgain ? [{ text: "Settings", onPress: () => { void Linking.openSettings(); } }] : [])],
      );
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionPage}>
        <TenantPageHeader title="Scan QR Code" backHref={safeBackHref} />
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={48} color="#2864e8" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need your permission to use the camera to scan QR codes for
            payments or boarding house links.
          </Text>
          <Pressable style={styles.permissionBtn} onPress={askForCamera}>
            <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
          </Pressable>
          <Pressable
            style={styles.permissionCancelBtn}
            onPress={() => router.replace(safeBackHref as any)}
          >
            <Text style={styles.permissionCancelText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleBarcodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;
    setScanned(true);
    if (data.startsWith("http://") || data.startsWith("https://")) {
      Linking.openURL(data).catch(() => {
        Alert.alert("Error", "Could not open the link provided by the QR code.", [
          { text: "Scan Again", onPress: () => setScanned(false) },
          { text: "Close", onPress: () => router.replace(safeBackHref as any) },
        ]);
      });
    } else if (data.startsWith("ROOM:")) {
      const roomId = data.replace("ROOM:", "");
      router.push({
        pathname: "/tenant/room-details",
        params: { id: roomId },
      } as any);
    } else {
      try {
        const payload: unknown = JSON.parse(data);
        if (!payload || typeof payload !== "object") throw new Error("Invalid QR");
        const roomPayload = payload as { type?: unknown; roomId?: unknown; roomNumber?: unknown };
        if (roomPayload.type !== "BOARDING_ROOM" || typeof roomPayload.roomId !== "string" || !roomPayload.roomId.trim()) throw new Error("Invalid QR");
        if (!db) throw new Error("Room services are unavailable right now.");
        const roomSnapshot = await getDoc(doc(db, "rooms", roomPayload.roomId));
        if (!roomSnapshot.exists()) throw new Error("This room is no longer listed.");
        router.push({ pathname: "/tenant/room-details", params: { id: roomPayload.roomId, number: String(roomSnapshot.data().number ?? roomPayload.roomNumber ?? "") } } as any);
        return;
      } catch (error) {
        Alert.alert("Invalid QR Code", error instanceof SyntaxError || (error instanceof Error && error.message === "Invalid QR")
          ? "This code is not a valid BoardEase room QR code."
          : error instanceof Error ? error.message : "We couldn't load this room.", [
          { text: "Scan Again", onPress: () => setScanned(false) },
          { text: "Close", onPress: () => router.replace(safeBackHref as any) },
        ]);
        return;
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      <View style={styles.fullOverlay} pointerEvents="none">
        <View style={styles.cutout}>
          <View style={styles.scannerArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      <SafeAreaView
        style={styles.uiWrapper}
        edges={["top", "bottom"]}
        pointerEvents="box-none"
      >
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace(safeBackHref as any)}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <View style={styles.titleGroup}>
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
            <Text style={styles.title}>Scan QR</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Position the QR code inside the frame to scan it automatically.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionPage: {
    flex: 1,
    backgroundColor: "#f7f9fc",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172033",
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    color: "#71809a",
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: "#2864e8",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  permissionBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  permissionCancelBtn: {
    marginTop: 20,
    padding: 10,
  },
  permissionCancelText: {
    color: "#71809a",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  titleGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  uiWrapper: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "space-between",
  },
  fullOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cutout: {
    width: 2250,
    height: 2250,
    borderWidth: 1000,
    borderColor: "rgba(0,0,0,0.6)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerArea: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "#fff",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  footer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  footerText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
