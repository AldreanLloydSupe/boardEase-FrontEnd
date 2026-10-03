import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { notificationAllowed } from "./billing";
import { db } from "./firebase";

export async function createNotification(
  recipientId: string,
  data: { title: string; body: string; route?: string; type?: string },
) {
  if (!db || !recipientId)
    throw new Error("Firebase and a recipient are required.");
  const profile = await getDoc(doc(db, "users", recipientId));
  if (!notificationAllowed(profile.data() || {}, data.type || "")) return;
  await addDoc(collection(db, "notifications"), {
    recipientId,
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}
