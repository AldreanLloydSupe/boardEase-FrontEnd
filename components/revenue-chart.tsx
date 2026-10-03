import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  revenueBuckets,
  type ChartView,
  type FinancePayment,
} from "@/lib/finance-chart";

function money(amount: number, compact = false) {
  return amount.toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    ...(compact
      ? { notation: "compact" as const, maximumFractionDigits: 1 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  });
}
export function RevenueChart({
  payments,
  anchor,
  loading,
  error,
}: {
  payments: FinancePayment[];
  anchor: Date;
  loading: boolean;
  error: boolean;
}) {
  const [view, setView] = React.useState<ChartView>("daily");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [width, setWidth] = React.useState(0);
  const buckets = React.useMemo(
    () => revenueBuckets(payments, view, anchor),
    [payments, view, anchor],
  );
  const selected = buckets.find((bucket) => bucket.id === selectedId);
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const count = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const range =
    view === "yearly"
      ? `${anchor.getFullYear() - 4}–${anchor.getFullYear()}`
      : view === "monthly"
        ? String(anchor.getFullYear())
        : anchor.toLocaleDateString("en-PH", {
            month: "long",
            year: "numeric",
          });
  const max = Math.max(1, ...buckets.map((bucket) => bucket.amount));
  const scale =
    total > 0
      ? Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) *
        Math.pow(10, Math.floor(Math.log10(max)))
      : 100;
  const chartWidth = Math.max(width, buckets.length * 48);
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Revenue Trend</Text>
          <Text style={styles.muted}>{range}</Text>
        </View>
        <Text style={styles.total}>
          {loading || error ? "—" : money(total)}
        </Text>
      </View>
      <View style={styles.tabs}>
        {(["daily", "weekly", "monthly", "yearly"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: view === value }}
            style={[styles.tab, view === value && styles.activeTab]}
            onPress={() => {
              setView(value);
              setSelectedId(null);
            }}
          >
            <Text
              style={[styles.tabText, view === value && styles.activeTabText]}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.muted}>
        Approved payments only, grouped by submission date. Weekly groups start
        Monday and are clipped to the selected month.
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          Revenue chart unavailable. Check your connection and permissions.
        </Text>
      ) : loading ? (
        <ActivityIndicator style={{ padding: 30 }} color="#2864e8" />
      ) : (
        <>
          <View style={styles.plot}>
            <View style={styles.axis}>
              {ticks.map((tick) => (
                <Text key={tick} style={styles.tick}>
                  {money(scale * tick, true)}
                </Text>
              ))}
            </View>
            <View
              style={styles.viewport}
              onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={{ width: chartWidth }}
                style={{ height: 232 }}
              >
                <View style={{ width: chartWidth, height: 232 }}>
                  <View pointerEvents="none" style={styles.grid}>
                    {ticks.map((tick) => (
                      <View key={tick} style={styles.gridLine} />
                    ))}
                  </View>
                  <View style={styles.columns}>
                    {buckets.map((bucket) => (
                      <Pressable
                        key={bucket.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${bucket.description}: ${money(bucket.amount)}, ${bucket.count} approved payments`}
                        onPress={() => setSelectedId(bucket.id)}
                        style={styles.column}
                      >
                        <View style={styles.barSpace}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height:
                                  bucket.amount > 0
                                    ? Math.max(2, (bucket.amount / scale) * 192)
                                    : 0,
                              },
                              selectedId === bucket.id && styles.selectedBar,
                            ]}
                          />
                          {bucket.amount === 0 && <View style={styles.zero} />}
                        </View>
                        <Text
                          style={[
                            styles.xLabel,
                            selectedId === bucket.id && {
                              color: "#2864e8",
                              fontWeight: "700",
                            },
                          ]}
                        >
                          {bucket.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
          {!count && (
            <Text style={styles.muted}>
              No approved payments in this period.
            </Text>
          )}
          <View style={styles.details}>
            <Text style={styles.detailTitle}>
              {selected ? selected.description : "Tap a bar to view the amount"}
            </Text>
            <Text style={styles.muted}>
              {selected
                ? `${money(selected.amount)} · ${selected.count} approved payment${selected.count === 1 ? "" : "s"}`
                : `${count} approved payment${count === 1 ? "" : "s"} in this range. Swipe the chart horizontally to see more.`}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dce6fa",
    padding: 16,
    gap: 14,
    marginBottom: 18,
  },
  heading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#253149" },
  muted: { fontSize: 12, lineHeight: 19, color: "#637794" },
  total: { fontSize: 22, fontWeight: "700", color: "#2458c7" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 9,
    justifyContent: "center",
    backgroundColor: "#f2f5fc",
  },
  activeTab: { backgroundColor: "#2864e8" },
  tabText: { fontSize: 14, color: "#536783", fontWeight: "600" },
  activeTabText: { color: "#fff" },
  plot: { flexDirection: "row", gap: 6 },
  axis: { width: 62, height: 204, justifyContent: "space-between" },
  tick: { fontSize: 10, color: "#637794" },
  viewport: { flex: 1, minWidth: 0 },
  grid: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    height: 192,
    justifyContent: "space-between",
  },
  gridLine: { height: 1, backgroundColor: "#e8eef7" },
  columns: { flexDirection: "row", height: 232 },
  column: { flex: 1, minWidth: 48, alignItems: "center" },
  barSpace: {
    height: 198,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: {
    width: "65%",
    maxWidth: 64,
    backgroundColor: "#2864e8",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  selectedBar: { backgroundColor: "#173d9f" },
  zero: { height: 2, width: 14, backgroundColor: "#a7b8d2" },
  xLabel: { fontSize: 11, color: "#637794", marginTop: 10 },
  details: {
    backgroundColor: "#f3f7ff",
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  detailTitle: { fontSize: 14, fontWeight: "600", color: "#253149" },
  error: { color: "#b42318", paddingVertical: 20 },
});
