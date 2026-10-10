export type TenantRoom = {
  id: string;
  number: string;
  type: string;
  price: string;
  image: string;
  amenities: string[];
  status?: string;
  capacity: number;
  tenantCount?: number;
  availableSpaces?: number;
  tenantId?: string;
  floor?: string;
};

export function roomFromFirestore(
  id: string,
  data: Record<string, unknown>,
): TenantRoom {
  return {
    id,
    number: String(data.number ?? ""),
    type: String(data.type ?? "Room"),
    price: String(data.price ?? data.rent ?? "0"),
    image: String(data.image ?? ""),
    amenities: Array.isArray(data.amenities)
      ? data.amenities.map(String)
      : ["WiFi"],
    status: String(data.status ?? "available").toLowerCase(),
    capacity:
      Number.isInteger(Number(data.capacity)) && Number(data.capacity) > 0
        ? Number(data.capacity)
        : 1,
    tenantCount: Number.isInteger(Number(data.tenantCount))
      ? Number(data.tenantCount)
      : 0,
    availableSpaces:
      Number.isInteger(Number(data.availableSpaces))
        ? Math.max(0, Number(data.availableSpaces))
        : undefined,
    tenantId: data.tenantId ? String(data.tenantId) : undefined,
    floor: data.floor ? String(data.floor) : undefined,
  };
}

export const roomKey = (room: TenantRoom) => room.id || room.number;

export function normalizeRoomStatus(status?: string): "available" | "occupied" {
  const value = String(status ?? "available").trim().toLowerCase();
  return value === "occupied" ? "occupied" : "available";
}

export function roomStatusLabel(status?: string): "Available" | "Occupied" {
  return normalizeRoomStatus(status) === "occupied" ? "Occupied" : "Available";
}

export function isRoomBrowserVisible(status?: string): boolean {
  return ["available", "occupied"].includes(normalizeRoomStatus(status));
}
