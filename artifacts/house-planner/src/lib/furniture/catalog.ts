import type { FurnitureDefinition } from "@/types/furniture";
import type { FurnitureCatalogEntry, CatalogFilter } from "./types";

const CATALOG: FurnitureCatalogEntry[] = [
  {
    id: "sofa-3seat",
    name: "3-Seat Sofa",
    category: "seating",
    origin: "catalog",
    dimensions2D: { width: 2.2, height: 0.9 },
    footprint: [
      { x: 0, y: 0 },
      { x: 2.2, y: 0 },
      { x: 2.2, y: 0.9 },
      { x: 0, y: 0.9 },
    ],
    tags: ["living room", "seating", "upholstered"],
    popularity: 95,
    roomCompatibility: ["living_room"],
  },
  {
    id: "coffee-table-rect",
    name: "Rectangular Coffee Table",
    category: "tables",
    origin: "catalog",
    dimensions2D: { width: 1.2, height: 0.6 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.2, y: 0 },
      { x: 1.2, y: 0.6 },
      { x: 0, y: 0.6 },
    ],
    tags: ["living room", "table"],
    popularity: 90,
    roomCompatibility: ["living_room"],
  },
  {
    id: "bed-double",
    name: "Double Bed",
    category: "beds",
    origin: "catalog",
    dimensions2D: { width: 1.4, height: 2.0 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.4, y: 0 },
      { x: 1.4, y: 2.0 },
      { x: 0, y: 2.0 },
    ],
    tags: ["bedroom", "bed", "sleep"],
    popularity: 88,
    roomCompatibility: ["bedroom"],
  },
  {
    id: "bed-king",
    name: "King Bed",
    category: "beds",
    origin: "catalog",
    dimensions2D: { width: 1.8, height: 2.1 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.8, y: 0 },
      { x: 1.8, y: 2.1 },
      { x: 0, y: 2.1 },
    ],
    tags: ["bedroom", "bed", "king", "sleep"],
    popularity: 82,
    roomCompatibility: ["bedroom"],
  },
  {
    id: "dining-table-4",
    name: "Dining Table (4 seats)",
    category: "tables",
    origin: "catalog",
    dimensions2D: { width: 1.4, height: 0.8 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.4, y: 0 },
      { x: 1.4, y: 0.8 },
      { x: 0, y: 0.8 },
    ],
    tags: ["dining room", "table", "eat"],
    popularity: 87,
    roomCompatibility: ["dining_room", "kitchen"],
  },
  {
    id: "bathtub-standard",
    name: "Standard Bathtub",
    category: "fixtures",
    origin: "catalog",
    dimensions2D: { width: 1.7, height: 0.8 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.7, y: 0 },
      { x: 1.7, y: 0.8 },
      { x: 0, y: 0.8 },
    ],
    tags: ["bathroom", "bathtub", "fixture"],
    popularity: 76,
    roomCompatibility: ["bathroom"],
  },
  {
    id: "toilet-standard",
    name: "Toilet",
    category: "fixtures",
    origin: "catalog",
    dimensions2D: { width: 0.5, height: 0.75 },
    footprint: [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.75 },
      { x: 0, y: 0.75 },
    ],
    tags: ["bathroom", "toilet", "fixture"],
    popularity: 99,
    roomCompatibility: ["bathroom"],
  },
  {
    id: "desk-standard",
    name: "Work Desk",
    category: "tables",
    origin: "catalog",
    dimensions2D: { width: 1.4, height: 0.7 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.4, y: 0 },
      { x: 1.4, y: 0.7 },
      { x: 0, y: 0.7 },
    ],
    tags: ["office", "desk", "work"],
    popularity: 80,
    roomCompatibility: ["office", "bedroom"],
  },
  {
    id: "wardrobe-double",
    name: "Double Wardrobe",
    category: "storage",
    origin: "catalog",
    dimensions2D: { width: 1.6, height: 0.6 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.6, y: 0 },
      { x: 1.6, y: 0.6 },
      { x: 0, y: 0.6 },
    ],
    tags: ["bedroom", "storage", "wardrobe"],
    popularity: 85,
    roomCompatibility: ["bedroom"],
  },
  {
    id: "kitchen-island",
    name: "Kitchen Island",
    category: "tables",
    origin: "catalog",
    dimensions2D: { width: 1.8, height: 0.9 },
    footprint: [
      { x: 0, y: 0 },
      { x: 1.8, y: 0 },
      { x: 1.8, y: 0.9 },
      { x: 0, y: 0.9 },
    ],
    tags: ["kitchen", "island", "counter"],
    popularity: 78,
    roomCompatibility: ["kitchen"],
  },
];

export function getAllFurniture(): FurnitureCatalogEntry[] {
  return CATALOG;
}

export function getFurnitureById(id: string): FurnitureDefinition | undefined {
  return CATALOG.find((f) => f.id === id);
}

export function filterFurniture(filter: CatalogFilter): FurnitureCatalogEntry[] {
  return CATALOG.filter((f) => {
    if (filter.category && f.category !== filter.category) return false;
    if (filter.tags?.length) {
      const hasTag = filter.tags.some((t) =>
        f.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase())
      );
      if (!hasTag) return false;
    }
    if (filter.maxWidth && f.dimensions2D.width > filter.maxWidth) return false;
    if (filter.maxHeight && f.dimensions2D.height > filter.maxHeight) return false;
    return true;
  });
}

export function getFurnitureForRoom(roomType: string): FurnitureCatalogEntry[] {
  return CATALOG.filter((f) =>
    f.roomCompatibility.includes(roomType)
  ).sort((a, b) => b.popularity - a.popularity);
}
