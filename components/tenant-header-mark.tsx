import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

export function TenantHeaderMark() {
  return (
    <View style={styles.mark}>
      <Ionicons name="business" size={22} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
