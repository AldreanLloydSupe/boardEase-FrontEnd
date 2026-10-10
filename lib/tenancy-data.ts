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
  if (id) {
    const ref = doc(db, "rooms", id);
    const snapshot = await getDoc(ref);
    if (snapshot.exists() && String(snapshot.data().number) === number)
      return ref;
    throw new Error("This room no longer exists. Refresh the room list.");
  }
  const matches = await getDocs(
    query(collection(db, "rooms"), where("number", "==", number)),
  );
  if (matches.size > 1)
    throw new Error(
      "Multiple rooms share this number. Ask management to reconcile them before assigning.",
    );
  if (matches.size === 1) return matches.docs[0].ref;
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
  const listingRef = doc(firestore, "roomListings", roomRef.id);
  await runTransaction(firestore, async (transaction) => {
    const application = await transaction.get(appRef);
    const room = await transaction.get(roomRef);
    const listing = await transaction.get(listingRef);
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
    const capacity =
      Number.isInteger(Number(roomData.capacity)) && Number(roomData.capacity) > 0
        ? Number(roomData.capacity)
        : 1;
    const tenantIds: string[] = Array.isArray(roomData.tenantIds)
      ? roomData.tenantIds.map(String)
      : roomData.tenantId
        ? [String(roomData.tenantId)]
        : [];
    if (tenantIds.length >= capacity)
      throw new Error("This room is no longer available.");
    const rent = roomData.rent ?? roomData.price;
    if (
      !rent ||
      !Number.isFinite(Number(String(rent).replace(/[^0-9.]/g, ""))) ||
      Number(String(rent).replace(/[^0-9.]/g, "")) <= 0
    )
      throw new Error("Set a valid room rent before approval.");
    const currentTenantRefs = tenantIds.map((id) => doc(firestore, "users", id));
    const currentTenantProfiles = await Promise.all(
      currentTenantRefs.map((ref) => transaction.get(ref)),
    );
    const newTenantName = String(
      tenant.data()?.name || data.tenantName || "Tenant",
    );
    const currentTenants = tenantIds.map((id, index) => ({
      id,
      ref: currentTenantRefs[index],
      name: String(currentTenantProfiles[index].data()?.name || "Tenant"),
    }));
    transaction.update(appRef, {
      status: "approved",
      roomId: roomRef.id,
      approvedAt: serverTimestamp(),
    });
    transaction.update(roomRef, {
      status: tenantIds.length + 1 >= capacity ? "occupied" : "available",
      tenantCount: tenantIds.length + 1,
      tenantIds: [...tenantIds, data.tenantId],
      tenantId: tenantIds[0] || data.tenantId,
      tenant:
        tenantIds.length === 0
          ? tenant.data()?.name || data.tenantName
          : "",
      applicationId,
      updatedAt: serverTimestamp(),
    });
    const publicListingUpdate = {
      number: String(roomData.number),
      type: String(roomData.type || "Room"),
      price: String(rent),
      rent: String(rent),
      image: String(roomData.image || ""),
      amenities: Array.isArray(roomData.amenities) ? roomData.amenities : [],
      guidelines: String(roomData.guidelines || ""),
      propertyName: String(roomData.propertyName || ""),
      location: String(roomData.location || ""),
      floor: roomData.floor || "",
      unit: roomData.unit || "",
      capacity,
      tenantCount: tenantIds.length + 1,
      availableSpaces: Math.max(0, capacity - tenantIds.length - 1),
      status: tenantIds.length + 1 >= capacity ? "occupied" : "available",
      updatedAt: serverTimestamp(),
    };
    if (listing.exists())
      transaction.update(listingRef, publicListingUpdate);
    else
      transaction.set(listingRef, {
        ...publicListingUpdate,
      });
    transaction.update(userRef, {
      noticeIssuedAt: null,
      noticeEndsAt: null,
      assignedSpace: "",
      roommateName: currentTenants.map((currentTenant) => currentTenant.name).join(", "),
      hasRoom: true,
      roomId: roomRef.id,
      roomNumber: String(roomData.number),
      roomType: roomData.type || "Room",
      roomRent: String(rent),
      applicationId,
      rentDueDay: Number(roomData.rentDueDay || 5),
      leaseStartedAt: serverTimestamp(),
    });
    for (let index = 0; index < currentTenants.length; index += 1) {
      const currentTenant = currentTenants[index];
      if (!currentTenantProfiles[index].exists()) continue;
      transaction.update(currentTenant.ref, {
        roommateName: [
          ...currentTenants
            .filter((otherTenant) => otherTenant.id !== currentTenant.id)
            .map((otherTenant) => otherTenant.name),
          newTenantName,
        ].join(", "),
      });
    }
  });
}
