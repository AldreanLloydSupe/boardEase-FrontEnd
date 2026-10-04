import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function RoomBrowserSkeleton() {
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
        <Animated.View style={[styles.headerLogo, { opacity: pulseAnim }]} />
        <View style={styles.headerCopy}>
          <Animated.View style={[styles.headerBrand, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.headerTitle, { opacity: pulseAnim }]} />
        </View>
        <Animated.View style={[styles.headerIcon, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.headerIcon, { opacity: pulseAnim }]} />
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.search}>
          <Animated.View style={[styles.searchIcon, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.searchText, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.searchOptions, { opacity: pulseAnim }]} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <View style={styles.activeFilter}>
            <Animated.View style={[styles.activeFilterBar, { opacity: pulseAnim }]} />
          </View>
          <View style={styles.filter}>
            <Animated.View
              style={[styles.filterBar, styles.twinFilterBar, { opacity: pulseAnim }]}
            />
          </View>
          <View style={styles.filter}>
            <Animated.View
              style={[styles.filterBar, styles.singleFilterBar, { opacity: pulseAnim }]}
            />
          </View>
        </ScrollView>
        <View style={styles.roomsGrid}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={styles.card}>
              <Animated.View style={[styles.roomImage, { opacity: pulseAnim }]} />
              <View style={styles.roomContent}>
                <View style={styles.roomHeading}>
                  <Animated.View style={[styles.roomTitle, { opacity: pulseAnim }]} />
                  <Animated.View style={[styles.roomBadge, { opacity: pulseAnim }]} />
                </View>
                <Animated.View style={[styles.roomPrice, { opacity: pulseAnim }]} />
                <View style={styles.tags}>
                  <Animated.View style={[styles.tag, { opacity: pulseAnim }]} />
                  <Animated.View style={[styles.wideTag, { opacity: pulseAnim }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.tabs}>
        <View style={styles.tab}>
          <Animated.View style={[styles.tabIcon, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.tabLabel, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.tab}>
          <Animated.View style={[styles.tabIcon, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.tabLabel, { opacity: pulseAnim }]} />
        </View>
        <View style={[styles.tab, styles.qrTab]}>
          <Animated.View style={[styles.qrIcon, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.qrLabel, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.tab}>
          <Animated.View style={[styles.tabIcon, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.tabLabel, { opacity: pulseAnim }]} />
        </View>
        <View style={styles.tab}>
          <Animated.View style={[styles.tabIcon, { opacity: pulseAnim }]} />
          <Animated.View style={[styles.tabLabel, { opacity: pulseAnim }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7fb" },
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
  headerLogo: {
    width: 34,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#578af0",
  },
  headerCopy: { flex: 1, minWidth: 0, gap: 6 },
  headerBrand: {
    width: 64,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9bbaf6",
  },
  headerTitle: {
    width: 142,
    height: 17,
    borderRadius: 4,
    backgroundColor: "#578af0",
  },
  headerIcon: {
    width: 34,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#578af0",
  },
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  search: {
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e4ebf3",
  },
  searchText: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#e4ebf3",
  },
  searchOptions: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: "#e4ebf3",
  },
  content: { padding: 16, paddingBottom: 30 },
  filters: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
    marginBottom: 16,
  },
  activeFilter: {
    backgroundColor: "#2864e8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  activeFilterBar: {
    width: 74,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#76a0f3",
  },
  filter: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e9f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterBar: {
    height: 14,
    borderRadius: 4,
    backgroundColor: "#e4ebf3",
  },
  twinFilterBar: { width: 78 },
  singleFilterBar: { width: 108 },
  roomsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e6ebf2",
    overflow: "hidden",
  },
  roomImage: { width: "100%", height: 120, backgroundColor: "#e4ebf3" },
  roomContent: { padding: 10 },
  roomHeading: { flexDirection: "row", alignItems: "center", gap: 5 },
  roomTitle: {
    flex: 1,
    minWidth: 0,
    height: 14,
    borderRadius: 4,
    backgroundColor: "#e4ebf3",
  },
  roomBadge: {
    width: 42,
    height: 18,
    borderRadius: 12,
    backgroundColor: "#e4ebf3",
  },
  roomPrice: {
    width: 68,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#e4ebf3",
    marginTop: 8,
  },
  tags: { flexDirection: "row", gap: 5, marginVertical: 10 },
  tag: {
    width: 42,
    height: 20,
    borderRadius: 8,
    backgroundColor: "#e4ebf3",
  },
  wideTag: {
    width: 54,
    height: 20,
    borderRadius: 8,
    backgroundColor: "#e4ebf3",
  },
  tabs: {
    height: 72,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#e8edf2",
    backgroundColor: "#fff",
    shadowColor: "#173b80",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: { minWidth: 50, alignItems: "center", gap: 2 },
  tabIcon: {
    width: 30,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#e4ebf3",
  },
  tabLabel: {
    width: 31,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#d2dce9",
  },
  qrTab: { marginTop: -21 },
  qrIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "#f3f7fd",
    backgroundColor: "#c5d8f5",
  },
  qrLabel: {
    width: 20,
    height: 7,
    marginTop: 1,
    borderRadius: 4,
    backgroundColor: "#d2dce9",
  },
});