import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function TenantHomeSkeleton() {
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
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Animated.View style={[styles.headerMark, { opacity: pulseAnim }]} />
        <View style={styles.headerCopy}>
          <Animated.View style={[styles.headerBrand, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.headerTitle, { opacity: pulseAnim }]} />
        </View>
        <Animated.View style={[styles.headerIcon, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.headerIcon, { opacity: pulseAnim }]} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.due}>
          <View style={styles.dueCopy}>
            <Animated.View style={[styles.dueLabel, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.dueAmount, { opacity: pulseAnim }]} />
            <Animated.View style={[styles.dueDetails, { opacity: pulseAnim }]} />
          </View>
          <Animated.View style={[styles.dueBadge, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.roomCard}>
          <View style={styles.roomTop}>
            <View style={styles.roomCopy}>
              <Animated.View style={[styles.label, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.roomTitle, { opacity: pulseAnim }]} />
            </View>
            <Animated.View style={[styles.lease, { opacity: pulseAnim }]} />
          </View>
          <View style={styles.roomDetails}>
            {[0, 1].map((item) => (
              <View key={item} style={styles.detailColumn}>
                <Animated.View style={[styles.label, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.detail, { opacity: pulseAnim }]} />
              </View>
            ))}
          </View>
        </View>
        <View style={styles.actions}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.action}>
              <Animated.View style={[styles.actionIcon, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.actionTitle, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.actionSub, { opacity: pulseAnim }]} />
            </View>
          ))}
        </View>
        <View style={styles.panel}>
          <Animated.View style={[styles.sectionTitle, { opacity: pulseAnim }]} />
          <View style={styles.readings}>
            {[0, 1].map((item) => (
              <View key={item} style={styles.reading}>
                <Animated.View style={[styles.readingLabel, { opacity: pulseAnim }]} />
                <Animated.View style={[styles.readingValue, { opacity: pulseAnim }]} />
              </View>
            ))}
          </View>
        </View>
        <View style={styles.panel}>
          <Animated.View style={[styles.sectionTitle, { opacity: pulseAnim }]} />
          {[0, 1].map((item) => (
            <View key={item} style={styles.announcement}>
              <Animated.View style={[styles.announcementTitle, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.announcementDate, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.announcementBody, { opacity: pulseAnim }]} />
              <Animated.View style={[styles.announcementBodyShort, { opacity: pulseAnim }]} />
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.nav}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={[styles.navItem, item === 2 && styles.qrItem]}>
            <Animated.View
              style={[
                item === 2 ? styles.qrIcon : styles.navIcon,
                { opacity: pulseAnim },
              ]}
            />
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
  headerMark: { width: 34, height: 38, borderRadius: 10, backgroundColor: "#578af0" },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  headerBrand: { width: 68, height: 8, borderRadius: 4, backgroundColor: "#9bbaf6" },
  headerTitle: { width: 54, height: 17, borderRadius: 4, backgroundColor: "#578af0" },
  headerIcon: { width: 34, height: 38, borderRadius: 10, backgroundColor: "#578af0" },
  content: { padding: 12, paddingBottom: 24 },
  due: {
    minHeight: 102,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d5e5ff",
    borderRadius: 8,
    backgroundColor: "#eaf2ff",
  },
  dueCopy: { flex: 1, gap: 8 },
  dueLabel: { width: 62, height: 10, borderRadius: 4, backgroundColor: "#b7cdf5" },
  dueAmount: { width: 118, height: 25, borderRadius: 4, backgroundColor: "#c5d8f5" },
  dueDetails: { width: 200, maxWidth: "90%", height: 9, borderRadius: 4, backgroundColor: "#d5e5ff" },
  dueBadge: { width: 62, height: 20, borderRadius: 8, backgroundColor: "#d5e5ff" },
  roomCard: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#dce7f5",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  roomTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  roomCopy: { flex: 1, gap: 7 },
  label: { width: 84, height: 9, borderRadius: 4, backgroundColor: "#e4ebf3" },
  roomTitle: { width: 152, maxWidth: "90%", height: 15, borderRadius: 4, backgroundColor: "#e4ebf3" },
  lease: { width: 92, height: 20, borderRadius: 10, backgroundColor: "#d9f7e8" },
  roomDetails: { flexDirection: "row", gap: 12, marginTop: 16 },
  detailColumn: { flex: 1, gap: 7 },
  detail: { width: "78%", height: 12, borderRadius: 4, backgroundColor: "#e4ebf3" },
  actions: { flexDirection: "row", gap: 8, marginVertical: 12 },
  action: {
    flex: 1,
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  actionIcon: { width: 22, height: 22, borderRadius: 6, backgroundColor: "#d5e5ff" },
  actionTitle: { width: "76%", height: 9, borderRadius: 4, backgroundColor: "#e4ebf3" },
  actionSub: { width: "62%", height: 8, borderRadius: 4, backgroundColor: "#edf1f6" },
  panel: {
    marginTop: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e1eafa",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  sectionTitle: { width: 138, height: 12, borderRadius: 4, backgroundColor: "#e4ebf3" },
  readings: { flexDirection: "row", gap: 8, marginTop: 12 },
  reading: { flex: 1, gap: 8, padding: 10, borderRadius: 7, backgroundColor: "#f3f7fd" },
  readingLabel: { width: "65%", height: 8, borderRadius: 4, backgroundColor: "#e4ebf3" },
  readingValue: { width: "45%", height: 13, borderRadius: 4, backgroundColor: "#c5d8f5" },
  announcement: { gap: 8, marginTop: 14, padding: 12, borderRadius: 8, backgroundColor: "#f8faff" },
  announcementTitle: { width: "68%", height: 12, borderRadius: 4, backgroundColor: "#e4ebf3" },
  announcementDate: { width: 104, height: 8, borderRadius: 4, backgroundColor: "#edf1f6" },
  announcementBody: { width: "100%", height: 9, borderRadius: 4, backgroundColor: "#e4ebf3" },
  announcementBodyShort: { width: "72%", height: 9, borderRadius: 4, backgroundColor: "#e4ebf3" },
  nav: {
    height: 72,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#e8edf2",
    backgroundColor: "#fff",
  },
  navItem: { minWidth: 50, alignItems: "center", gap: 4 },
  navIcon: { width: 30, height: 28, borderRadius: 10, backgroundColor: "#e4ebf3" },
  qrItem: { marginTop: -21 },
  qrIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#c5d8f5" },
  navLabel: { width: 34, height: 7, borderRadius: 4, backgroundColor: "#d2dce9" },
});