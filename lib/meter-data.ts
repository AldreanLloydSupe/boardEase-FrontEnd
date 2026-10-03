import React from "react";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { validateMeterDraft, type MeterDraft } from "./meter-validation";
export type MeterReading = ReturnType<typeof validateMeterDraft> & {
  id: string;
  revisionNumber: number;
  revisionId: string;
  createdAt?: unknown;
  createdBy?: string;
  updatedAt?: unknown;
  updatedBy?: string;
};
export function useRoomReadings(roomId: string) {
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<{
    roomId: string;
    records: MeterReading[];
    loading: boolean;
    error: string;
  }>({ roomId: "", records: [], loading: true, error: "" });
  React.useEffect(() => {
    if (!db || !roomId) return;
    return onSnapshot(
      collection(db, "rooms", roomId, "meterReadings"),
      (snapshot) => {
        const records = snapshot.docs
          .map(
            (record) => ({ ...record.data(), id: record.id }) as MeterReading,
          )
          .sort((a, b) => b.period.localeCompare(a.period));
        setState({ roomId, records, loading: false, error: "" });
      },
      (cause) =>
        setState({
          roomId,
          records: [],
          loading: false,
          error: `Unable to load meter readings (${cause.code}). Check deployed Firebase rules and your connection.`,
        }),
    );
  }, [roomId, attempt]);
  const current =
    state.roomId === roomId
      ? state
      : {
          roomId,
          records: [],
          loading: Boolean(db && roomId),
          error: !db ? "Firebase is unavailable." : "",
        };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}
export async function saveMeterReading(
  roomId: string,
  uid: string,
  draft: MeterDraft,
  editing?: MeterReading,
) {
  const firestore = db;
  if (!firestore || !roomId || !uid)
    throw new Error("A valid assigned room and landlord login are required.");
  const validated = validateMeterDraft(draft);
  const ref = doc(
    firestore,
    "rooms",
    roomId,
    "meterReadings",
    validated.period,
  );
  const revision = doc(collection(ref, "revisions"));
  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(ref);
    if (
      editing &&
      (!existing.exists() ||
        existing.data()?.revisionNumber !== editing.revisionNumber)
    )
      throw new Error(
        "This record changed. Close the form and reopen it before editing.",
      );
    if (!editing && existing.exists())
      throw new Error(
        "A reading already exists for this month. Use Edit Reading instead.",
      );
    if (editing && validated.period !== editing.period)
      throw new Error("The billing month cannot be changed when editing.");
    const data = {
      ...validated,
      createdAt: existing.data()?.createdAt || serverTimestamp(),
      createdBy: existing.data()?.createdBy || uid,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
      revisionNumber: (existing.data()?.revisionNumber || 0) + 1,
      revisionId: revision.id,
    };
    transaction.set(ref, data);
    transaction.set(revision, data);
  });
}
