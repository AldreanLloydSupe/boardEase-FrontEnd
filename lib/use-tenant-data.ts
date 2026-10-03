import React from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
export function useTenantData() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<Record<string, unknown>>({});
  const [payments, setPayments] = React.useState<
    (Record<string, unknown> & { id: string })[]
  >([]);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    setProfile({});
    setPayments([]);
    setError("");
    setLoading(true);
    if (!db || !user) {
      setLoading(false);
      return;
    }
    let profileReady = false,
      paymentsReady = false;
    const failed = () => {
      setError(
        "Unable to load account data. Check your connection and permissions.",
      );
      setLoading(false);
    };
    const stopProfile = onSnapshot(
      doc(db, "users", user.uid),
      (s) => {
        setProfile(s.data() || {});
        profileReady = true;
        setLoading(!(profileReady && paymentsReady));
      },
      failed,
    );
    const stopPayments = onSnapshot(
      query(collection(db, "payments"), where("tenantId", "==", user.uid)),
      (s) => {
        setPayments(s.docs.map((d) => ({ ...d.data(), id: d.id })));
        paymentsReady = true;
        setLoading(!(profileReady && paymentsReady));
      },
      failed,
    );
    return () => {
      stopProfile();
      stopPayments();
    };
  }, [user?.uid]);
  return { profile, payments, error, loading };
}
