import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { collection, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { timestampMillis } from "@/lib/billing";
import {
  saveMeterReading,
  useRoomReadings,
  type MeterReading,
} from "@/lib/meter-data";
import {
  localDateString,
  meterUsage,
  type MeterDraft,
} from "@/lib/meter-validation";

function ReadingSummary({ record }: { record: MeterReading }) {
  return (
    <View style={styles.record}>
      <Text style={styles.heading}>
        {record.period} · Read on {record.readingDate}
      </Text>
      <Text style={styles.value}>
        Electricity:{" "}
        {meterUsage(record.electricityPrevious, record.electricityCurrent)} kWh
        used
      </Text>
      <Text style={styles.muted}>
        Previous {record.electricityPrevious} → Current{" "}
        {record.electricityCurrent} kWh
      </Text>
      <Text style={styles.value}>
        Water: {meterUsage(record.waterPrevious, record.waterCurrent)} m³ used
      </Text>
      <Text style={styles.muted}>
        Previous {record.waterPrevious} → Current {record.waterCurrent} m³
      </Text>
      {!!record.notes && <Text style={styles.muted}>{record.notes}</Text>}
      <Text style={styles.muted}>
        Revision {record.revisionNumber}
        {timestampMillis(record.updatedAt)
          ? ` · Updated ${new Date(timestampMillis(record.updatedAt)).toLocaleString("en-PH")}`
          : ""}
      </Text>
    </View>
  );
}
function RevisionHistory({
  roomId,
  record,
}: {
  roomId: string;
  record: MeterReading;
}) {
  const [revisions, setRevisions] = React.useState<MeterReading[]>([]);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    if (!db) return;
    return onSnapshot(
      collection(db, "rooms", roomId, "meterReadings", record.id, "revisions"),
      (snapshot) => {
        setRevisions(
          snapshot.docs
            .map((item) => ({ ...item.data(), id: item.id }) as MeterReading)
            .sort((a, b) => b.revisionNumber - a.revisionNumber),
        );
        setError("");
      },
      () => setError("Unable to load edit history."),
    );
  }, [roomId, record.id]);
  return (
    <View>
      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {revisions.map((revision) => (
        <ReadingSummary key={revision.id} record={revision} />
      ))}
    </View>
  );
}
export function MeterReadings({
  roomId,
  roomNumber,
  editable = false,
}: {
  roomId: string;
  roomNumber?: string;
  editable?: boolean;
}) {
  const { user } = useAuth();
  const readings = useRoomReadings(roomId);
  const [history, setHistory] = React.useState(false);
  const [form, setForm] = React.useState<{
    draft: MeterDraft;
    editing?: MeterReading;
  } | null>(null);
  const [audit, setAudit] = React.useState<MeterReading | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const latest = readings.records[0];
  function openForm(editing?: MeterReading) {
    const today = localDateString();
    setError("");
    setForm({
      editing,
      draft: editing
        ? {
            period: editing.period,
            readingDate: editing.readingDate,
            electricityPrevious: String(editing.electricityPrevious),
            electricityCurrent: String(editing.electricityCurrent),
            waterPrevious: String(editing.waterPrevious),
            waterCurrent: String(editing.waterCurrent),
            notes: editing.notes,
          }
        : {
            period: today.slice(0, 7),
            readingDate: today,
            electricityPrevious: latest
              ? String(latest.electricityCurrent)
              : "",
            electricityCurrent: "",
            waterPrevious: latest ? String(latest.waterCurrent) : "",
            waterCurrent: "",
            notes: "",
          },
    });
  }
  async function save() {
    if (!form || !user || saving) return;
    setSaving(true);
    setError("");
    try {
      await saveMeterReading(roomId, user.uid, form.draft, form.editing);
      setForm(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save readings.",
      );
    } finally {
      setSaving(false);
    }
  }
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled && { opacity: 0.5 }]}
    >
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
  const closeForm = () => {
    if (!saving) setForm(null);
  };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {editable ? "Utilities & Meter Readings" : "Submeter Readings"}
      </Text>
      <Text style={styles.muted}>
        Room {roomNumber || "not assigned"} · Shared room meter readings, not
        individual utility charges.
      </Text>
      {!roomId ? (
        <Text style={styles.muted}>
          Assign a room before recording readings.
        </Text>
      ) : readings.error ? (
        <View>
          <Text accessibilityRole="alert" style={styles.error}>
            {readings.error}
          </Text>
          {button("Retry", readings.retry)}
        </View>
      ) : readings.loading ? (
        <Text style={styles.muted}>Loading readings...</Text>
      ) : latest ? (
        <ReadingSummary record={latest} />
      ) : (
        <Text style={styles.muted}>
          Water and electricity readings have not been recorded yet.
        </Text>
      )}
      <View style={styles.actions}>
        {editable &&
          button(
            "Record Reading",
            () => openForm(),
            !roomId || readings.loading || !!readings.error,
          )}
        {editable && latest && button("Edit Reading", () => openForm(latest))}
        {latest && button("View History", () => setHistory(true))}
      </View>
      <Modal
        visible={!!form}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.title}>
                {form?.editing ? "Edit Reading" : "Record Reading"}
              </Text>
              <Text style={styles.muted}>
                Use cumulative meter values. Usage is current minus previous. No
                utility charges are added to rent.
              </Text>
              {(
                [
                  "period",
                  "readingDate",
                  "electricityPrevious",
                  "electricityCurrent",
                  "waterPrevious",
                  "waterCurrent",
                  "notes",
                ] as const
              ).map((key) => {
                const labels = {
                  period: "Billing month (YYYY-MM)",
                  readingDate: "Reading date (YYYY-MM-DD)",
                  electricityPrevious: "Previous electricity (kWh)",
                  electricityCurrent: "Current electricity (kWh)",
                  waterPrevious: "Previous water (m³)",
                  waterCurrent: "Current water (m³)",
                  notes: "Notes / reason for correction (optional)",
                };
                return (
                  <View key={key}>
                    <Text style={styles.label}>{labels[key]}</Text>
                    <TextInput
                      accessibilityLabel={labels[key]}
                      value={form?.draft[key] || ""}
                      onChangeText={(value) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                draft: { ...current.draft, [key]: value },
                              }
                            : null,
                        )
                      }
                      editable={
                        !saving && !(key === "period" && !!form?.editing)
                      }
                      keyboardType={
                        key.includes("Previous") || key.includes("Current")
                          ? "decimal-pad"
                          : "default"
                      }
                      multiline={key === "notes"}
                      maxLength={
                        key === "notes"
                          ? 500
                          : key === "period"
                            ? 7
                            : key === "readingDate"
                              ? 10
                              : 18
                      }
                      style={styles.input}
                    />
                  </View>
                );
              })}
              <Text style={styles.muted}>
                Previous values are suggested from the latest saved month. Check
                them, especially when entering older months or correcting
                records.
              </Text>
              {!!error && (
                <Text accessibilityRole="alert" style={styles.error}>
                  {error}
                </Text>
              )}
              <View style={styles.actions}>
                {button("Cancel", closeForm, saving)}
                {button(
                  saving ? "Saving..." : "Save Reading",
                  () => void save(),
                  saving,
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={history}
        transparent
        animationType="fade"
        onRequestClose={() => setHistory(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <ScrollView>
              <Text style={styles.title}>
                Reading History · Room {roomNumber}
              </Text>
              {button("Close", () => setHistory(false))}
              {readings.records.map((record) => (
                <View key={record.id}>
                  <ReadingSummary record={record} />
                  {editable && (
                    <View style={styles.actions}>
                      {button("Edit this month", () => {
                        setHistory(false);
                        openForm(record);
                      })}
                      {button("View edit history", () => setAudit(record))}
                    </View>
                  )}
                </View>
              ))}
              {audit && editable && (
                <View>
                  <Text style={styles.title}>
                    Edit history · {audit.period}
                  </Text>
                  <RevisionHistory
                    key={audit.id}
                    roomId={roomId}
                    record={audit}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dce6fa",
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#253149", marginBottom: 8 },
  heading: { fontSize: 14, fontWeight: "600", color: "#253149" },
  muted: { fontSize: 13, lineHeight: 21, color: "#637794" },
  value: { fontSize: 15, fontWeight: "600", color: "#253149" },
  record: {
    backgroundColor: "#f6f9ff",
    padding: 14,
    borderRadius: 10,
    gap: 8,
    marginVertical: 10,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginVertical: 12,
  },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#d5e0f4",
    padding: 12,
    borderRadius: 9,
    justifyContent: "center",
  },
  link: { fontSize: 14, fontWeight: "600", color: "#2864e8" },
  label: {
    fontSize: 13,
    color: "#536783",
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    color: "#253149",
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#d5e0f4",
    borderRadius: 8,
    padding: 12,
  },
  error: { color: "#b42318", lineHeight: 21, marginVertical: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: "#0006",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
  },
});
