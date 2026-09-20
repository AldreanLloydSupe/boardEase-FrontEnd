export type TenantRoom = {
  id: string;
  number: string;
  type: string;
  price: string;
  image: string;
  amenities: string[];
  status?: string;
  floor?: string;
};

export const defaultRoomImage =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=900";

export function roomFromFirestore(
  id: string,
  data: Record<string, unknown>,
): TenantRoom {
  return {
    id,
    number: String(data.number ?? ""),
    type: String(data.type ?? "Room"),
    price: String(data.price ?? data.rent ?? "0"),
    image: String(data.image ?? defaultRoomImage),
    amenities: Array.isArray(data.amenities)
      ? data.amenities.map(String)
      : ["WiFi"],
    status: String(data.status ?? "available").toLowerCase(),
    floor: data.floor ? String(data.floor) : undefined,
  };
}

export const roomKey = (room: TenantRoom) => room.id || room.number;
