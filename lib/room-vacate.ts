import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "./firebase";

export type RoomVacatePayload = {
  roomNumber: string;
  userUpdate: {
    hasRoom: boolean;
    roomId: string;
    roomNumber: string;
    roomType: string;
    roomRent: string;
  };
  roomUpdate: {
    status: string;
    tenant: string;
    tenantId: string;
    updatedAt: ReturnType<typeof serverTimestamp>;
  };
};

export function buildRoomVacatePayload(
  roomNumber: string,
  roomType = "",
): RoomVacatePayload {
  const normalizedRoom = roomNumber?.trim() || "";

  return {
    roomNumber: normalizedRoom,
    userUpdate: {
      hasRoom: false,
      roomId: "",
      roomNumber: "",
      roomType: "",
      roomRent: "",
    },
    roomUpdate: {
      status: "Available",
      tenant: "",
      tenantId: "",
      updatedAt: serverTimestamp(),
    },
  };
}

export async function vacateTenantRoom(
  tenantId: string,
  providedRoomNumber?: string,
) {
  if (!db || !tenantId) {
    throw new Error("Tenant details are required to vacate the room.");
  }

  const userDoc = doc(db, "users", tenantId);
  const userSnapshot = await getDoc(userDoc);
  const currentRoomNumber =
    String(userSnapshot.data()?.roomNumber || userSnapshot.data()?.roomId || "")
      .trim();
  const finalRoomNumber = (providedRoomNumber || currentRoomNumber).trim();

  if (!finalRoomNumber) {
    return { updated: false, roomNumber: "" };
  }

  const payload = buildRoomVacatePayload(finalRoomNumber);

  await setDoc(userDoc, payload.userUpdate, { merge: true });
  await setDoc(doc(db, "rooms", finalRoomNumber), payload.roomUpdate, {
    merge: true,
  });

  return { updated: true, roomNumber: finalRoomNumber };
}
