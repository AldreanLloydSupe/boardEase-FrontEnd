import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
export type RoomRequest = {
  roomId?: string;
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
  let roomId = room.roomId;
  if (!roomId) {
    const matchingRooms = await getDocs(
      query(
        collection(firestore, "roomListings"),
        where("number", "==", room.roomNumber),
      ),
    );
    if (matchingRooms.size !== 1)
      throw new Error("This room no longer exists. Refresh the room list.");
    roomId = matchingRooms.docs[0].id;
  }
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
  const ref = doc(firestore, kind, user.uid + "__" + roomId);
  const listingRef = doc(firestore, "roomListings", roomId);
  await runTransaction(firestore, async (tx) => {
    const previous = await tx.get(ref);
    const currentRoom = await tx.get(listingRef);
    const profile = await tx.get(doc(firestore, "users", user.uid));
    if (previous.exists() && active.includes(previous.data().status))
      throw new Error("This request has already been submitted.");
    if (profile.data()?.hasRoom)
      throw new Error("You already have an assigned room.");
    const data = currentRoom.data();
    if (
      !data ||
      Number(data.availableSpaces) <= 0
    )
      throw new Error("This room is no longer available.");
    tx.set(ref, {
      tenantId: user.uid,
      tenantName: profile.data()?.name || user.displayName || "Tenant",
      tenantEmail: user.email || "",
      roomId,
      roomNumber: String(data.number),
      roomType: data.type || "Room",
      price: String(data.rent ?? data.price ?? ""),
      image: data.image || "",
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
