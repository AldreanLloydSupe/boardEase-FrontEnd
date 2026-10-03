import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { resolveRoom } from "./tenancy-data";

export function buildRoomVacatePayload(roomNumber: string) {
  return {
    roomNumber,
    userUpdate: {
      hasRoom: false,
      roomId: "",
      roomNumber: "",
      roomType: "",
      roomRent: "",
      applicationId: "",
    },
    roomUpdate: {
      status: "available",
      tenant: "",
      tenantId: "",
      applicationId: "",
      updatedAt: serverTimestamp(),
    },
  };
}

export async function vacateTenantRoom(
  tenantId: string,
  providedRoomNumber?: string,
) {
  const firestore = db;
  if (!firestore || !tenantId) throw new Error("Tenant details are required.");
  const userRef = doc(firestore, "users", tenantId);
  const initial = (await getDoc(userRef)).data();
  if (!initial?.hasRoom) return { updated: false, roomNumber: "" };
  const number = String(initial.roomNumber || providedRoomNumber || "");
  const roomRef = await resolveRoom(number, initial.roomId);
  await runTransaction(firestore, async (transaction) => {
    const user = await transaction.get(userRef);
    const room = await transaction.get(roomRef);
    if (
      !user.exists() ||
      !room.exists() ||
      room.data()?.tenantId !== tenantId ||
      user.data()?.roomId !== initial.roomId
    )
      throw new Error(
        "Assignment changed or room ownership does not match. Refresh before retrying.",
      );
    const applicationId = user.data()?.applicationId;
    const applicationRef = applicationId
      ? doc(firestore, "applications", applicationId)
      : null;
    const application = applicationRef
      ? await transaction.get(applicationRef)
      : null;
    const payload = buildRoomVacatePayload(number);
    transaction.update(userRef, payload.userUpdate);
    transaction.update(roomRef, payload.roomUpdate);
    if (applicationRef && application?.exists())
      transaction.update(applicationRef, {
        status: "vacated",
        updatedAt: serverTimestamp(),
      });
  });
  return { updated: true, roomNumber: number };
}
