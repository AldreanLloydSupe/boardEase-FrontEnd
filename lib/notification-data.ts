import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function createNotification(
  recipientId: string,
  data: { title: string; body: string; route?: string; type?: string },
) {
  if (!db || !recipientId) return;
  await addDoc(collection(db, "notifications"), {
    recipientId,
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}
