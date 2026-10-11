import { managementUpdateNotice } from "./management-update";
import React from "react";
import { AppState } from "react-native";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
import {
  cycleDetails,
  notificationAllowed,
  peso,
  timestampMillis,
} from "./billing";

export type Notice = {
  id: string;
  title?: string;
  body?: string;
  route?: string;
  read?: boolean;
  type?: string;
  createdAt?: unknown;
  local?: boolean;
  postToBulletin?: boolean;
};
export function useNotifications() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [records, setRecords] = React.useState<Notice[]>([]);
  const [broadcasts, setBroadcasts] = React.useState<Notice[]>([]);
  const [profile, setProfile] = React.useState<Record<string, unknown>>({});
  const [payments, setPayments] = React.useState<Record<string, unknown>[]>([]);
  const [reads, setReads] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  React.useEffect(() => {
    setRecords([]);
    setBroadcasts([]);
    setReads(new Set());
    setProfile({});
    setPayments([]);
    setError("");
    setLoading(true);
    const firestore = db;
    if (!firestore || !uid) {
      setLoading(false);
      return;
    }
    const failed = () => {
      setError(
        "Notifications could not load. Check your connection and permissions.",
      );
      setLoading(false);
    };
    const stops = [
      onSnapshot(
        query(
          collection(firestore, "notifications"),
          where("recipientId", "==", uid),
        ),
        (s) => {
          setRecords(s.docs.map((d) => ({ ...d.data(), id: d.id })));
          setLoading(false);
        },
        failed,
      ),
      onSnapshot(
        doc(firestore, "users", uid),
        (s) => setProfile(s.data() || {}),
        failed,
      ),
      onSnapshot(
        query(collection(firestore, "payments"), where("tenantId", "==", uid)),
        (s) => setPayments(s.docs.map((d) => d.data())),
        failed,
      ),
      onSnapshot(
        collection(firestore, "users", uid, "notificationReads"),
        (s) => setReads(new Set(s.docs.map((d) => d.id))),
        failed,
      ),
      onSnapshot(
        query(
          collection(firestore, "messages"),
          where("recipientIds", "array-contains", uid),
        ),
        (s) =>
          setBroadcasts(
            s.docs.map((d) => managementUpdateNotice(d.id, d.data())),
          ),
        failed,
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [uid]);
  const cycle = cycleDetails(profile, payments, now);
  const timing = Number.parseInt(String(profile.reminderTiming || "3"), 10);
  const reminderDays = [1, 3, 7].includes(timing) ? timing : 3;
  const notices = [...records, ...broadcasts];
  if (
    profile.hasRoom &&
    cycle.balance > 0 &&
    cycle.daysUntilDue <= reminderDays &&
    (!profile.leaseStartedAt ||
      timestampMillis(profile.leaseStartedAt) <= cycle.due.getTime())
  ) {
    notices.push({
      id: "rent_" + cycle.period,
      title:
        cycle.daysUntilDue < 0
          ? "Rent payment overdue"
          : "Rent payment reminder",
      body:
        peso(cycle.balance) +
        " outstanding for " +
        cycle.period +
        ". Pending proof is not counted until approved.",
      route: "/tenant/payments",
      type: "rent_reminder",
      local: true,
      createdAt: cycle.due,
    });
  }
  const visible = notices
    .filter((n) => notificationAllowed(profile, n.type || ""))
    .map((n) => ({ ...n, read: n.local ? reads.has(n.id) : n.read }))
    .sort(
      (a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt),
    );
  const announcements = broadcasts
    .filter((n) => n.type === "announcement")
    .map((n) => ({ ...n, read: reads.has(n.id) }))
    .sort(
      (a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt),
    );
  async function markRead(notice: Notice) {
    if (!db || !uid || notice.read) return;
    try {
      if (notice.local)
        await setDoc(doc(db, "users", uid, "notificationReads", notice.id), {
          readAt: serverTimestamp(),
        });
      else await updateDoc(doc(db, "notifications", notice.id), { read: true });
    } catch {
      setError("Unable to mark this notification read. Please try again.");
    }
  }
  return {
    announcements,
    bulletinPosts: announcements.filter((notice) => notice.postToBulletin),
    notices: visible,
    unreadCount: visible.filter((n) => !n.read).length,
    error,
    loading,
    markRead,
  };
}
