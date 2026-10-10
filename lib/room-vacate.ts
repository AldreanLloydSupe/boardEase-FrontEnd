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
      roommateName: "",
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
  const listingRef = doc(firestore, "roomListings", roomRef.id);
  await runTransaction(firestore, async (transaction) => {
    const user = await transaction.get(userRef);
    const room = await transaction.get(roomRef);
    const listing = await transaction.get(listingRef);
    const currentRoomData = room.data();
    const tenantIds: string[] = Array.isArray(currentRoomData?.tenantIds)
      ? currentRoomData.tenantIds.map(String)
      : currentRoomData?.tenantId
        ? [String(currentRoomData.tenantId)]
        : [];
    const remainingTenantIds = tenantIds.filter((id) => id !== tenantId);
    const capacity =
      Number.isInteger(Number(currentRoomData?.capacity)) &&
      Number(currentRoomData?.capacity) > 0
        ? Number(currentRoomData?.capacity)
        : 1;
    if (
      !user.exists() ||
      !room.exists() ||
      !tenantIds.includes(tenantId) ||
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
    const remainingTenantRefs = remainingTenantIds.map((id) =>
      doc(firestore, "users", id),
    );
    const remainingTenantProfiles = await Promise.all(
      remainingTenantRefs.map((ref) => transaction.get(ref)),
    );
    const remainingTenants = remainingTenantIds.map((id, index) => ({
      id,
      ref: remainingTenantRefs[index],
      name: String(remainingTenantProfiles[index].data()?.name || "Tenant"),
    }));
    const payload = buildRoomVacatePayload(number);
    transaction.update(userRef, payload.userUpdate);
    for (let index = 0; index < remainingTenants.length; index += 1) {
      if (!remainingTenantProfiles[index].exists()) continue;
      transaction.update(remainingTenants[index].ref, {
        roommateName: remainingTenants
          .filter((tenant) => tenant.id !== remainingTenants[index].id)
          .map((tenant) => tenant.name)
          .join(", "),
      });
    }
    transaction.update(roomRef, {
      status: remainingTenantIds.length >= capacity ? "occupied" : "available",
      tenantCount: remainingTenantIds.length,
      tenantIds: remainingTenantIds,
      tenantId: remainingTenantIds[0] || "",
      tenant: "",
      applicationId:
        remainingTenantIds.length && currentRoomData?.applicationId
          ? currentRoomData.applicationId
          : "",
      updatedAt: serverTimestamp(),
    });
    if (listing.exists())
      transaction.update(listingRef, {
        tenantCount: remainingTenantIds.length,
        availableSpaces: Math.max(0, capacity - remainingTenantIds.length),
        status: remainingTenantIds.length >= capacity ? "occupied" : "available",
        updatedAt: serverTimestamp(),
      });
    if (applicationRef && application?.exists())
      transaction.update(applicationRef, {
        status: "vacated",
        updatedAt: serverTimestamp(),
      });
  });
  return { updated: true, roomNumber: number };
}
