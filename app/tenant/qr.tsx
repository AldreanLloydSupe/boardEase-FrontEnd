import { AppAlert as Alert } from "@/components/app-alert";
import { TenantPageHeader } from "@/components/tenant-page-header";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QRScanner() {
  const { hasRoom } = useAuth();
  const safeBackHref = hasRoom ? "/tenant/tenant-home" : "/tenant/room-browser";
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = React.useState(false);

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
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
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

  const handleBarcodeScanned = ({
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    setScanned(true);
    Alert.alert("QR Code Scanned!", `Type: ${type}\nData: ${data}`, [
      { text: "Scan Again", onPress: () => setScanned(false) },
      { text: "Close", onPress: () => router.replace(safeBackHref as any) },
    ]);
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
