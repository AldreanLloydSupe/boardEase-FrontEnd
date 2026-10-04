import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function LandlordDashboardSkeleton() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Animated.View style={[styles.logo, { opacity: pulseAnim }]} />
        <View style={styles.headerCopy}>
          <Animated.View style={[styles.brand, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.title, { opacity: pulseAnim }]} />
        </View>
        <Animated.View style={[styles.headerAction, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.headerAction, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.avatar, { opacity: pulseAnim }]} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.stats}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={styles.stat}>
              <View style={styles.statTop}>
                <Animated.View style={[styles.statValue, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.statIcon, { opacity: pulseAnim }]} />
              </View>
              <Animated.View style={[styles.statLabel, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.statFoot, { opacity: pulseAnim }]} />
            </View>
          ))}
        </View>
        <View style={styles.maintenance}>
          <Animated.View style={[styles.maintenanceIcon, { opacity: pulseAnim }]} />
          <View style={styles.maintenanceCopy}>
            <Animated.View style={[styles.maintenanceTitle, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.maintenanceDetail, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.maintenanceFoot, { opacity: pulseAnim }]} />
          </View>
          <Animated.View style={[styles.chevron, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.sectionHeading}>
          <Animated.View style={[styles.sectionTitle, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.sectionAction, { opacity: pulseAnim }]} />
        </View>
        {[0, 1].map((item) => (
          <View key={item} style={styles.application}>
            <Animated.View style={[styles.applicationIcon, { opacity: pulseAnim }]} />
            <View style={styles.applicationCopy}>
              <Animated.View style={[styles.applicationName, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.applicationDetail, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.applicationType, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.review, { opacity: pulseAnim }]} />
          </View>
        ))}
        <Animated.View style={[styles.quickHeading, { opacity: pulseAnim }]} />
        <View style={styles.quickActions}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.quickAction}>
              <Animated.View style={[styles.quickIcon, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.quickLabel, { opacity: pulseAnim }]} />
            </View>
          ))}
        </View>
        <View style={styles.sectionHeading}>
          <Animated.View style={[styles.sectionTitleWide, { opacity: pulseAnim }]} />
        </View>
        {[0, 1].map((item) => (
          <View key={item} style={styles.message}>
            <Animated.View style={[styles.messageTitle, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.messageDetail, { opacity: pulseAnim }]} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.nav}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.navItem}>
            <Animated.View style={[styles.navIcon, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.navLabel, { opacity: pulseAnim }]} />
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f7fd" },
  header: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2864e8",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logo: { width: 38, height: 38, borderRadius: 11, backgroundColor: "#1d4ed8" },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  brand: { width: 72, height: 8, borderRadius: 4, backgroundColor: "#9bbaf6" },
  title: { width: 78, height: 17, borderRadius: 4, backgroundColor: "#578af0" },
  headerAction: { width: 34, height: 38, borderRadius: 10, backgroundColor: "#578af0" },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#9bbaf6" },
  content: { padding: 16, paddingBottom: 24 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: {
    width: "48%",
    minHeight: 124,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  statTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
  statValue: { width: 74, height: 24, borderRadius: 4, backgroundColor: "#e4ebf3" },
  statIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#eaf1ff" },
  statLabel: { width: "88%", height: 10, borderRadius: 4, backgroundColor: "#e4ebf3" },
  statFoot: { width: "72%", height: 8, borderRadius: 4, backgroundColor: "#edf1f6", marginTop: 9 },
  maintenance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    marginBottom: 4,
    padding: 18,
    borderWidth: 1,
    borderColor: "#dbe5f4",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  maintenanceIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: "#eaf1ff" },
  maintenanceCopy: { flex: 1, gap: 8 },
  maintenanceTitle: { width: "72%", height: 12, borderRadius: 4, backgroundColor: "#e4ebf3" },
  maintenanceDetail: { width: "88%", height: 9, borderRadius: 4, backgroundColor: "#e4ebf3" },
  maintenanceFoot: { width: "94%", height: 8, borderRadius: 4, backgroundColor: "#edf1f6" },
  chevron: { width: 10, height: 18, borderRadius: 4, backgroundColor: "#d5e5ff" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 10 },
  sectionTitle: { width: 142, height: 13, borderRadius: 4, backgroundColor: "#e4ebf3" },
  sectionTitleWide: { width: 204, height: 13, borderRadius: 4, backgroundColor: "#e4ebf3" },
  sectionAction: { width: 52, height: 10, borderRadius: 4, backgroundColor: "#d5e5ff" },
  application: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  applicationIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#eaf1ff" },
  applicationCopy: { flex: 1, gap: 7 },
  applicationName: { width: "68%", height: 11, borderRadius: 4, backgroundColor: "#e4ebf3" },
  applicationDetail: { width: "92%", height: 9, borderRadius: 4, backgroundColor: "#e4ebf3" },
  applicationType: { width: 48, height: 8, borderRadius: 4, backgroundColor: "#edf1f6" },
  review: { width: 54, height: 28, borderRadius: 7, backgroundColor: "#d5e5ff" },
  quickHeading: { width: 96, height: 9, borderRadius: 4, backgroundColor: "#e4ebf3", marginTop: 18, marginBottom: 10 },
  quickActions: { flexDirection: "row", gap: 10 },
  quickAction: { flex: 1, minHeight: 72, alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#e1eafa", borderRadius: 8, backgroundColor: "#fff" },
  quickIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#eaf1ff" },
  quickLabel: { width: "74%", height: 9, borderRadius: 4, backgroundColor: "#e4ebf3" },
  message: { gap: 8, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: "#e1eafa", borderRadius: 8, backgroundColor: "#fff" },
  messageTitle: { width: "72%", height: 11, borderRadius: 4, backgroundColor: "#e4ebf3" },
  messageDetail: { width: "52%", height: 8, borderRadius: 4, backgroundColor: "#edf1f6" },
  nav: { height: 70, flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start", paddingTop: 9, borderTopWidth: 1, borderColor: "#e8edf2", backgroundColor: "#fff" },
  navItem: { flex: 1, alignItems: "center", gap: 4 },
  navIcon: { width: 34, height: 28, borderRadius: 10, backgroundColor: "#e4ebf3" },
  navLabel: { width: 42, height: 7, borderRadius: 4, backgroundColor: "#d2dce9" },
});