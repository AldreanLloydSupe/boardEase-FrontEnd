import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

export async function resolveRoom(number: string, id?: string) {
  if (!db) throw new Error("Firebase is unavailable.");
  const matches = await getDocs(
    query(collection(db, "rooms"), where("number", "==", number)),
  );
  if (matches.size > 1)
    throw new Error(
      "Multiple rooms share this number. Ask management to reconcile them before assigning.",
    );
  if (matches.size === 1) return matches.docs[0].ref;
  if (id) {
    const ref = doc(db, "rooms", id);
    const snapshot = await getDoc(ref);
    if (snapshot.exists() && String(snapshot.data().number) === number)
      return ref;
  }
  throw new Error("This room no longer exists. Refresh the room list.");
}

export async function approveTenancy(applicationId: string) {
  const firestore = db;
  if (!firestore) throw new Error("Firebase is unavailable.");
  const appRef = doc(firestore, "applications", applicationId);
  const initial = await getDoc(appRef);
  if (!initial.exists()) throw new Error("Application not found.");
  const initialData = initial.data();
  const roomRef = await resolveRoom(
    String(initialData.roomNumber),
    initialData.roomId,
  );
  await runTransaction(firestore, async (transaction) => {
    const application = await transaction.get(appRef);
    const room = await transaction.get(roomRef);
    const data = application.data();
    if (!data || data.status !== "pending")
      throw new Error("This application has already been reviewed.");
    if (
      data.roomNumber !== initialData.roomNumber ||
      data.tenantId !== initialData.tenantId
    )
      throw new Error("Application changed. Refresh and try again.");
    const userRef = doc(firestore, "users", data.tenantId);
    const tenant = await transaction.get(userRef);
    if (!tenant.exists() || !room.exists())
      throw new Error("Tenant or room no longer exists.");
    if (tenant.data()?.hasRoom || tenant.data()?.roomId)
      throw new Error("This tenant already has a room.");
    const roomData = room.data()!;
    if (String(roomData.number) !== String(data.roomNumber))
      throw new Error("Room details changed. Refresh before assigning.");
    if (
      roomData.tenantId ||
      String(roomData.status).toLowerCase() !== "available"
    )
      throw new Error("This room is no longer available.");
    const rent = roomData.rent ?? roomData.price;
    if (
      !rent ||
      !Number.isFinite(Number(String(rent).replace(/[^0-9.]/g, ""))) ||
      Number(String(rent).replace(/[^0-9.]/g, "")) <= 0
    )
      throw new Error("Set a valid room rent before approval.");
    transaction.update(appRef, {
      status: "approved",
      roomId: roomRef.id,
      approvedAt: serverTimestamp(),
    });
    transaction.update(roomRef, {
      status: "occupied",
      tenantId: data.tenantId,
      tenant: tenant.data()?.name || data.tenantName,
      applicationId,
      updatedAt: serverTimestamp(),
    });
    transaction.update(userRef, {
      noticeIssuedAt: null,
      noticeEndsAt: null,
      assignedSpace: "",
      roommateName: "",
      hasRoom: true,
      roomId: roomRef.id,
      roomNumber: String(roomData.number),
      roomType: roomData.type || "Room",
      roomRent: String(rent),
      applicationId,
      rentDueDay: Number(roomData.rentDueDay || 5),
      leaseStartedAt: serverTimestamp(),
    });
  });
}
