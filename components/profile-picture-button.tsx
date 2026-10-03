import { AppAlert as Alert } from "@/components/app-alert";
import { sharedImage } from "@/lib/image-data";
import { useAuth } from "@/lib/auth-context";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text } from "react-native";

type Props = {
  fallback: string;
  size?: number;
  onChanged?: () => void;
  interactive?: boolean;
};

export function ProfilePictureButton({
  fallback,
  size = 48,
  onChanged,
  interactive = true,
}: Props) {
  const { profilePhoto, updateProfilePhoto } = useAuth();

  async function choosePhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo permission needed",
          "Allow photo access in your device settings to choose a profile picture.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      await updateProfilePhoto(sharedImage(result.assets[0]));
      onChanged?.();
    } catch (error) {
      Alert.alert(
        "Unable to update photo",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  return (
    <Pressable
      onPress={interactive ? choosePhoto : undefined}
      pointerEvents={interactive ? "auto" : "none"}
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessibilityLabel="Change profile picture"
    >
      {profilePhoto ? (
        <Image
          source={profilePhoto ? { uri: profilePhoto } : undefined}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text
          style={[styles.initials, { fontSize: Math.max(12, size * 0.32) }]}
        >
          {fallback}
        </Text>
      )}
      <Text style={styles.camera}>✎</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#d9eee6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  initials: { color: "#16805d", fontWeight: "700" },
  camera: {
    display: "none",
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#fff",
    color: "#16805d",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
});
