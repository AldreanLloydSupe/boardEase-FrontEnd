import React from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type FirestoreError,
} from "firebase/firestore";
import { useAuth } from "./auth-context";
import { db } from "./firebase";
import { timestampMillis } from "./billing";
export type RequestSummary = {
  id: string;
  source?: "maintenanceRequests" | "conversations";
  threadId?: string;
  tenantId?: string;
  title?: string;
  details?: string;
  photoUri?: string;
  createdAt?: unknown;
  tenantName?: string;
  roomNumber?: string;
  status?: string;
  unread: number;
  unreadAvailable: boolean;
  lastMessage?: string;
  lastMessageAt?: number;
};
type InboxValue = ReturnType<typeof useMaintenanceInboxState>;
const InboxContext = React.createContext<InboxValue | null>(null);

export function MaintenanceInboxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const inbox = useMaintenanceInboxState();
  return React.createElement(InboxContext.Provider, { value: inbox }, children);
}

export function useMaintenanceInbox() {
  const inbox = React.useContext(InboxContext);
  if (!inbox)
    throw new Error("Maintenance inbox requires its landlord provider.");
  return inbox;
}

export function useTenantInbox() {
  return useMaintenanceInboxState("tenant");
}

function useMaintenanceInboxState(
  audience: "landlord" | "tenant" = "landlord",
) {
  const { user, role } = useAuth();
  const uid = user?.uid;
  const [requests, setRequests] = React.useState<RequestSummary[]>([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [attempt, setAttempt] = React.useState(0);
  const [retrying, setRetrying] = React.useState(false);
  const refreshedFor = React.useRef<string | null>(null);
  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await user?.getIdToken(true);
      setAttempt((n) => n + 1);
    } catch {
      setError(
        "Unable to refresh your login. Check your connection or sign in again.",
      );
    } finally {
      setRetrying(false);
    }
  };
  React.useEffect(() => {
    // Subscription restarts must immediately clear the previous account's private inbox.
    /* eslint-disable react-hooks/set-state-in-effect */
    setRequests([]);
    setError("");
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const firestore = db;
    if (
      !firestore ||
      !uid ||
      role !== (audience === "landlord" ? "admin" : "user")
    )
      return;
    let active = true;
    const subscriptions = new Map<string, (() => void)[]>();
    const records = new Map<string, RequestSummary>();
    const unreadTimes = new Map<string, number[]>();
    const readTimes = new Map<string, number>();
    const previews = new Map<
      string,
      { lastMessage: string; lastMessageAt: number }
    >();
    const failures = new Map<string, string>();
    const ready = new Set<string>();
    const publish = () => {
      setError([...failures.values()].join("\n"));
      setRequests(
        [...records.values()].map((r) => {
          const available =
            ready.has(r.id + ":messages") &&
            ready.has(r.id + ":read") &&
            !failures.has(r.id + ":messages") &&
            !failures.has(r.id + ":read");
          return {
            ...r,
            ...previews.get(r.id),
            unreadAvailable: available,
            unread: available
              ? (unreadTimes.get(r.id) || []).filter(
                  (t) => t > (readTimes.get(r.id) || 0),
                ).length
              : 0,
          };
        }),
      );
    };
    const failed = (key: string, label: string) => (cause: FirestoreError) => {
      if (!active) return;
      if (cause.code === "permission-denied" && refreshedFor.current !== uid) {
        refreshedFor.current = uid;
        void user
          ?.getIdToken(true)
          .then(() => {
            if (active) setAttempt((n) => n + 1);
          })
          .catch(() => {});
      }
      const reason =
        cause.code === "permission-denied"
          ? "Access denied. Check deployed Firebase rules and your landlord login."
          : cause.code === "unavailable"
            ? "Connection unavailable. Please retry."
            : "Please retry or sign in again.";
      failures.set(key, label + ": " + reason + " (" + cause.code + ")");
      if (key === "maintenanceRequests" || key === "conversations") {
        loadedSources.add(key);
        setLoading(loadedSources.size < 2);
      }
      publish();
    };
    const loadedSources = new Set<string>();
    const subscribeSource = (source: "maintenanceRequests" | "conversations") =>
      onSnapshot(
        audience === "landlord"
          ? collection(firestore, source)
          : query(
              collection(firestore, source),
              where(
                source === "conversations" ? "__name__" : "tenantId",
                "==",
                uid,
              ),
            ),
        (snapshot) => {
          failures.delete(source);
          loadedSources.add(source);
          setLoading(loadedSources.size < 2);
          const ids = new Set(
            snapshot.docs.map((d) =>
              source === "conversations" ? "direct:" + d.id : d.id,
            ),
          );
          for (const [id, stops] of subscriptions)
            if (records.get(id)?.source === source && !ids.has(id)) {
              stops.forEach((s) => s());
              subscriptions.delete(id);
              records.delete(id);
              unreadTimes.delete(id);
              readTimes.delete(id);
              previews.delete(id);
              for (const suffix of ["read", "messages"]) {
                failures.delete(id + ":" + suffix);
                ready.delete(id + ":" + suffix);
              }
            }
          for (const item of snapshot.docs) {
            const id =
              source === "conversations" ? "direct:" + item.id : item.id;
            records.set(id, {
              ...item.data(),
              id,
              source,
              threadId: item.id,
              title:
                source === "conversations"
                  ? "Direct message"
                  : String(item.data().title || "Maintenance request"),
              unread: 0,
              unreadAvailable: false,
            });
            if (!subscriptions.has(id))
              subscriptions.set(id, [
                onSnapshot(
                  doc(firestore, source, item.id, "readReceipts", uid),
                  (r) => {
                    ready.add(id + ":read");
                    failures.delete(id + ":read");
                    readTimes.set(
                      id,
                      timestampMillis(
                        r.data({ serverTimestamps: "estimate" })?.readAt,
                      ),
                    );
                    publish();
                  },
                  failed(
                    id + ":read",
                    String(item.data().title || "Request") +
                      " (#" +
                      item.id.slice(-6) +
                      ") — read status",
                  ),
                ),
                onSnapshot(
                  collection(firestore, source, item.id, "messages"),
                  (messages) => {
                    const latest = messages.docs
                      .map((m) => m.data())
                      .sort(
                        (a, b) =>
                          timestampMillis(b.createdAt) -
                          timestampMillis(a.createdAt),
                      )[0];
                    previews.set(id, {
                      lastMessage: latest
                        ? String(latest.body || "")
                        : String(records.get(id)?.details || "No messages yet"),
                      lastMessageAt: timestampMillis(latest?.createdAt),
                    });
                    ready.add(id + ":messages");
                    failures.delete(id + ":messages");
                    unreadTimes.set(
                      id,
                      messages.docs
                        .filter((m) =>
                          audience === "landlord"
                            ? m.data().senderId === records.get(id)?.tenantId
                            : m.data().senderId !== uid,
                        )
                        .map((m) => timestampMillis(m.data().createdAt)),
                    );
                    publish();
                  },
                  failed(
                    id + ":messages",
                    String(item.data().title || "Request") +
                      " (#" +
                      item.id.slice(-6) +
                      ") — conversation",
                  ),
                ),
              ]);
          }
          publish();
        },
        failed(
          source,
          source === "conversations"
            ? "Direct message inbox"
            : "Maintenance request list",
        ),
      );
    const stops = [
      subscribeSource("maintenanceRequests"),
      subscribeSource("conversations"),
    ];
    return () => {
      active = false;
      stops.forEach((stop) => stop());
      subscriptions.forEach((stops) => stops.forEach((s) => s()));
    };
  }, [uid, user, role, attempt, audience]);
  return {
    requests,
    unreadCount: requests.reduce((n, r) => n + r.unread, 0),
    error,
    loading,
    retry,
    retrying,
  };
}
