import React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./auth-context";
export function usePropertySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = React.useState<Record<string, unknown>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    setSettings({});
    setError("");
    if (!db || !user) return;
    return onSnapshot(
      doc(db, "propertySettings", "main"),
      (snapshot) => {
        setSettings(snapshot.data() || {});
        setLoading(false);
      },
      () => {
        setError("Unable to load management contact details.");
        setLoading(false);
      },
    );
  }, [user?.uid]);
  return { settings, error, loading };
}
