import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";

export type RoomRequest = {
  roomNumber: string;
  roomType: string;
  price: string;
  image?: string;
};

export async function createApplication(user: User, room: RoomRequest) {
  if (!db) throw new Error("Firebase is not configured.");
  const existing = await getDocs(
    query(
      collection(db, "applications"),
      where("tenantId", "==", user.uid),
      where("roomNumber", "==", room.roomNumber),
    ),
  );
  const duplicate = existing.docs.some((item) => {
    const status = item.data().status;
    return !status || status === "pending" || status === "approved";
  });
  if (duplicate) {
    throw new Error("You already applied for this room.");
  }
  return addDoc(collection(db, "applications"), {
    tenantId: user.uid,
    tenantName: user.displayName || "Tenant",
    tenantEmail: user.email || "",
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    price: room.price,
    image: room.image || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function createTourRequest(
  user: User,
  room: RoomRequest,
  date: string,
  note: string,
) {
  if (!db) throw new Error("Firebase is not configured.");
  const existing = await getDocs(
    query(
      collection(db, "tourRequests"),
      where("tenantId", "==", user.uid),
      where("roomNumber", "==", room.roomNumber),
    ),
  );
  const duplicate = existing.docs.some((item) => {
    const status = item.data().status;
    return !status || status === "pending" || status === "accepted";
  });
  if (duplicate) {
    throw new Error("You already requested a tour for this room.");
  }
  return addDoc(collection(db, "tourRequests"), {
    tenantId: user.uid,
    tenantName: user.displayName || "Tenant",
    tenantEmail: user.email || "",
    roomNumber: room.roomNumber,
    roomType: room.roomType,
    price: room.price,
    image: room.image || "",
    requestedDate: date,
    note,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}
