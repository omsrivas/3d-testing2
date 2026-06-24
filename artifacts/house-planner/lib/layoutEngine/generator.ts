import type { LayoutConstraints, LayoutGenerationResponse } from "@/types/ai";
import type { HouseProject, Room, Wall, Floor } from "@/types/house";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

const ROOM_SIZES: Record<string, { w: number; h: number }> = {
  living_room: { w: 5, h: 4 },
  kitchen: { w: 3.5, h: 3 },
  bedroom: { w: 3.5, h: 3.5 },
  bathroom: { w: 2, h: 2 },
  dining_room: { w: 3, h: 3 },
  hallway: { w: 1.5, h: 4 },
};

export async function generateLayout(
  constraints: LayoutConstraints,
  _prompt?: string
): Promise<LayoutGenerationResponse> {
  try {
    const now = new Date().toISOString();
    const floorId = uid();
    const rooms: Record<string, Room> = {};
    const walls: Record<string, Wall> = {};
    const floor: Floor = {
      id: floorId,
      level: 0,
      name: "Ground Floor",
      roomIds: [],
      wallIds: [],
      ceilingHeight: 2.7,
    };

    let cursor = { x: 0, y: 0 };

    const addRoom = (
      type: Room["type"],
      name: string,
      overrideSize?: { w: number; h: number }
    ) => {
      const size = overrideSize ?? ROOM_SIZES[type] ?? { w: 3, h: 3 };
      const roomId = uid();
      const room: Room = {
        id: roomId,
        name,
        type,
        position: { x: cursor.x, y: cursor.y },
        dimensions: { width: size.w, height: size.h },
        wallIds: [],
        furnitureIds: [],
        metadata: {},
      };

      const wallIds = generateWallsForRoom(room, walls);
      room.wallIds = wallIds;
      floor.wallIds.push(...wallIds);

      rooms[roomId] = room;
      floor.roomIds.push(roomId);

      cursor.x += size.w + 0.2;
      if (cursor.x > 20) {
        cursor.x = 0;
        cursor.y += size.h + 0.2;
      }
    };

    addRoom("living_room", "Living Room");
    addRoom("kitchen", "Kitchen");
    addRoom("dining_room", "Dining Room");

    for (let i = 0; i < constraints.bedrooms; i++) {
      addRoom("bedroom", i === 0 ? "Master Bedroom" : `Bedroom ${i + 1}`);
    }

    for (let i = 0; i < constraints.bathrooms; i++) {
      addRoom("bathroom", i === 0 ? "Main Bathroom" : `Bathroom ${i + 1}`);
    }

    const project: HouseProject = {
      id: uid(),
      name: "Generated Floor Plan",
      floors: [floor],
      rooms,
      walls,
      openings: {},
      totalArea: Object.values(rooms).reduce(
        (s, r) => s + r.dimensions.width * r.dimensions.height,
        0
      ),
      createdAt: now,
      updatedAt: now,
      metadata: {
        bedrooms: constraints.bedrooms,
        bathrooms: constraints.bathrooms,
        style: constraints.style,
        budget: constraints.budget,
      },
    };

    return { success: true, project };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Layout generation failed",
    };
  }
}

function generateWallsForRoom(
  room: Room,
  walls: Record<string, Wall>
): string[] {
  const { x, y } = room.position;
  const { width, height } = room.dimensions;
  const thickness = 0.15;

  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  const wallIds: string[] = [];

  for (let i = 0; i < corners.length; i++) {
    const start = corners[i];
    const end = corners[(i + 1) % corners.length];
    const id = `wall-${room.id}-${i}`;
    walls[id] = {
      id,
      start,
      end,
      thickness,
      height: 2.7,
      openingIds: [],
    };
    wallIds.push(id);
  }

  return wallIds;
}
