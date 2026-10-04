import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { resolveRoom } from "./tenancy-data";
export type RoomRequest = {
  roomNumber: string;
  roomType: string;
  price: string;
  image?: string;
};
async function createRequest(
  kind: "applications" | "tourRequests",
  user: User,
  room: RoomRequest,
  extras: Record<string, string> = {},
) {
  const firestore = db;
  if (!firestore) throw new Error("Firebase is not configured.");
  const roomRef = await resolveRoom(room.roomNumber);
  const existing = await getDocs(
    query(
      collection(firestore, kind),
      where("tenantId", "==", user.uid),
      where("roomNumber", "==", room.roomNumber),
    ),
  );
  const active =
    kind === "applications" ? ["pending", "approved"] : ["pending", "accepted"];
  if (
    existing.docs.some((item) =>
      active.includes(item.data().status || "pending"),
    )
  )
    throw new Error("You already have an active request for this room.");
  const ref = doc(firestore, kind, user.uid + "__" + roomRef.id);
  await runTransaction(firestore, async (tx) => {
    const previous = await tx.get(ref);
    const currentRoom = await tx.get(roomRef);
    const profile = await tx.get(doc(firestore, "users", user.uid));
    if (previous.exists() && active.includes(previous.data().status))
      throw new Error("This request has already been submitted.");
    if (profile.data()?.hasRoom)
      throw new Error("You already have an assigned room.");
    const data = currentRoom.data();
    if (
      !data ||
      String(data.status).toLowerCase() !== "available" ||
      data.tenantId
    )
      throw new Error("This room is no longer available.");
    tx.set(ref, {
      tenantId: user.uid,
      tenantName: profile.data()?.name || user.displayName || "Tenant",
      tenantEmail: user.email || "",
      roomId: roomRef.id,
      roomNumber: String(data.number),
      roomType: data.type || "Room",
      price: String(data.rent ?? data.price ?? ""),
      image: data.image || "",
      propertyName: String(data.propertyName ?? data.property ?? ""),
      location: String(data.location ?? data.address ?? ""),
      floor: String(data.floor ?? ""),
      unit: String(data.unit ?? data.unitNumber ?? data.number ?? ""),
      ...extras,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  });
  return ref;
}
export function createApplication(user: User, room: RoomRequest) {
  return createRequest("applications", user, room);
}
export function createTourRequest(
  user: User,
  room: RoomRequest,
  date: string,
  note: string,
) {
  if (!date.trim()) throw new Error("Choose a tour date.");
  return createRequest("tourRequests", user, room, {
    requestedDate: date,
    note: note.trim(),
  });
}
