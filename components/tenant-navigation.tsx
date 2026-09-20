import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

type Item = readonly [keyof typeof Ionicons.glyphMap, string, string];

export function AssignedTenantNav({ active }: { active: string }) {
  const items: readonly Item[] = [
    ["home-outline", "Home", "/tenant/tenant-home"],
    ["card-outline", "Payments", "/tenant/payments"],
    ["qr-code-outline", "QR", "qr"],
    ["help-circle-outline", "Requests", "/tenant/applications"],
    ["person-outline", "Profile", "/tenant/account"],
  ];
  return <Navigation items={items} active={active} theme="assigned" />;
}

export function ApplicantTenantNav({ active }: { active: string }) {
  const items: readonly Item[] = [
    ["home-outline", "Rooms", "/tenant/room-browser"],
    ["document-text-outline", "Applied", "/tenant/applications"],
    ["qr-code-outline", "QR", "qr"],
    ["bookmark-outline", "Saved", "/tenant/saved"],
    ["person-outline", "Account", "/tenant/account"],
  ];
  return <Navigation items={items} active={active} theme="applicant" />;
}

function Navigation({
  items,
  active,
  theme,
}: {
  items: readonly Item[];
  active: string;
  theme: "assigned" | "applicant";
}) {
  return (
    <View
      style={[
        styles.nav,
        theme === "assigned" ? styles.assignedNav : styles.applicantNav,
      ]}
    >
      {items.map(([icon, label, path]) => {
        const isQr = label === "QR";
        const selected = active === label;
        return (
          <Pressable
            key={label}
            style={[styles.item, isQr && styles.qrItem]}
            onPress={() =>
              path === "qr"
                ? Alert.alert(
                    "QR Code",
                    "QR functionality will be connected later.",
                  )
                : router.replace(path as any)
            }
          >
            <View
              style={[
                styles.iconWrap,
                isQr && styles.qrIconWrap,
                selected && !isQr && styles.activeIconWrap,
              ]}
            >
              <Ionicons
                name={icon}
                size={isQr ? 22 : 18}
                color={isQr ? "#fff" : selected ? "#16805d" : "#9aa8ba"}
              />
            </View>
            <Text
              style={[
                styles.label,
                selected && styles.activeLabel,
                isQr && styles.qrLabel,
              ]}
            >
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
    height: 72,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#e8edf2",
    shadowColor: "#173b36",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  assignedNav: { backgroundColor: "#fff" },
  applicantNav: { backgroundColor: "#fff" },
  item: { minWidth: 50, alignItems: "center", gap: 2 },
  iconWrap: {
    width: 30,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeIconWrap: { backgroundColor: "#e7f6ef" },
  qrItem: { marginTop: -21 },
  qrIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16805d",
    borderWidth: 4,
    borderColor: "#f7f9fc",
    shadowColor: "#16805d",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  label: { fontSize: 10, color: "#9aa8ba" },
  activeLabel: { color: "#16805d", fontWeight: "700" },
  qrLabel: { color: "#16805d", marginTop: 1 },
});
