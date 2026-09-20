import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const items = [
  ["grid-outline", "Dashboard", "/landlord/dashboard"],
  ["business-outline", "Rooms", "/landlord/rooms"],
  ["people-outline", "Tenants", "/landlord/tenants"],
  ["bar-chart-outline", "Finance", "/landlord/finance"],
] as const;

export function LandlordNavigation({ active }: { active: string }) {
  return (
    <View style={styles.nav}>
      {items.map(([icon, label, path]) => {
        const selected = active === label;
        return (
          <Pressable
            key={label}
            style={styles.item}
            onPress={() => router.replace(path as any)}
          >
            <View style={[styles.icon, selected && styles.selectedIcon]}>
              <Ionicons
                name={icon}
                size={19}
                color={selected ? "#2864e8" : "#9aa8ba"}
              />
            </View>
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 70,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#e8edf2",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingTop: 9,
    shadowColor: "#172033",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  item: { minWidth: 66, alignItems: "center", gap: 3 },
  icon: {
    width: 34,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  selectedIcon: { backgroundColor: "#eaf1ff" },
  label: { fontSize: 10, color: "#9aa8ba" },
  selectedLabel: { color: "#2864e8", fontWeight: "700" },
});
