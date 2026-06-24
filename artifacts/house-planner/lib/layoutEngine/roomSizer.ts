import type { RoomSpec, RoomType, LayoutInput } from "./types";
import { getVastuZones } from "./vastu";

// ─── Minimum and ideal dimensions (metres) ────────────────────────────────────

interface DimRange {
  wMin: number;
  wIdeal: number;
  dMin: number;
  dIdeal: number;
}

const BASE_DIMS: Record<RoomType, DimRange> = {
  foyer: { wMin: 1.5, wIdeal: 2.0, dMin: 1.5, dIdeal: 2.0 },
  living: { wMin: 3.6, wIdeal: 5.0, dMin: 3.0, dIdeal: 4.2 },
  dining: { wMin: 2.7, wIdeal: 3.3, dMin: 2.4, dIdeal: 3.0 },
  kitchen: { wMin: 2.4, wIdeal: 3.0, dMin: 2.7, dIdeal: 3.6 },
  master_bedroom: { wMin: 3.6, wIdeal: 4.2, dMin: 3.6, dIdeal: 4.5 },
  bedroom: { wMin: 3.0, wIdeal: 3.6, dMin: 3.0, dIdeal: 3.9 },
  bathroom: { wMin: 1.5, wIdeal: 1.8, dMin: 2.1, dIdeal: 2.4 },
  toilet: { wMin: 1.2, wIdeal: 1.5, dMin: 1.8, dIdeal: 2.1 },
  balcony: { wMin: 1.2, wIdeal: 1.5, dMin: 2.4, dIdeal: 3.6 },
  parking: { wMin: 2.7, wIdeal: 3.0, dMin: 5.0, dIdeal: 5.5 },
  staircase: { wMin: 1.2, wIdeal: 1.5, dMin: 2.7, dIdeal: 3.3 },
  pooja: { wMin: 1.2, wIdeal: 1.5, dMin: 1.2, dIdeal: 1.5 },
  utility: { wMin: 1.5, wIdeal: 2.0, dMin: 1.5, dIdeal: 2.0 },
  passage: { wMin: 0.9, wIdeal: 1.2, dMin: 1.5, dIdeal: 2.4 },
  terrace: { wMin: 2.0, wIdeal: 3.0, dMin: 2.0, dIdeal: 3.0 },
};

// ─── Room name templates ──────────────────────────────────────────────────────

function roomName(type: RoomType, index: number): string {
  const names: Record<RoomType, string> = {
    foyer: "Foyer",
    living: "Living Room",
    dining: "Dining Room",
    kitchen: "Kitchen",
    master_bedroom: "Master Bedroom",
    bedroom: `Bedroom ${index}`,
    bathroom: index === 0 ? "Master Bathroom" : `Bathroom ${index}`,
    toilet: `WC ${index}`,
    balcony: `Balcony ${index}`,
    parking: "Covered Parking",
    staircase: "Staircase",
    pooja: "Pooja Room",
    utility: "Utility / Wash",
    passage: "Passage",
    terrace: "Terrace",
  };
  return names[type];
}

// ─── Scale dimensions to available plot ───────────────────────────────────────

function scaleDim(
  ideal: number,
  min: number,
  available: number,
  fraction: number
): number {
  const target = Math.min(ideal, available * fraction);
  return Math.max(min, parseFloat(target.toFixed(2)));
}

// ─── Build room spec list from inputs ────────────────────────────────────────

export function buildRoomSpecs(input: LayoutInput): RoomSpec[] {
  const specs: RoomSpec[] = [];
  const { plotWidth, plotDepth, facing: _facing } = {
    plotWidth: input.plotWidth,
    plotDepth: input.plotDepth,
    facing: input.facingDirection,
  };

  const totalFloorArea = plotWidth * plotDepth;

  function spec(
    type: RoomType,
    index = 0,
    targetFloor = -1,
    priority = 50
  ): RoomSpec {
    const d = BASE_DIMS[type];
    const wAvail = plotWidth;
    const dAvail = plotDepth;

    // Scale up slightly for larger plots
    const scaleFactor = Math.min(1.3, Math.sqrt(totalFloorArea / 80));

    return {
      type,
      name: roomName(type, index),
      widthRange: [
        d.wMin,
        scaleDim(d.wIdeal * scaleFactor, d.wMin, wAvail, 0.4),
      ],
      depthRange: [
        d.dMin,
        scaleDim(d.dIdeal * scaleFactor, d.dMin, dAvail, 0.4),
      ],
      preferredZones: getVastuZones(type, input.facingDirection),
      targetFloor,
      priority,
    };
  }

  // ── Ground floor ────────────────────────────────────────────────────────────
  // Foyer is always on ground floor, front side
  specs.push(spec("foyer", 0, 0, 100));

  // Parking on ground floor if requested
  if (input.hasParking) {
    specs.push(spec("parking", 0, 0, 95));
  }

  // Living on ground floor
  specs.push(spec("living", 0, 0, 90));

  // Dining on ground floor
  specs.push(spec("dining", 0, 0, 85));

  // Kitchen on ground floor
  specs.push(spec("kitchen", 0, 0, 80));

  // Utility on ground floor
  specs.push(spec("utility", 0, 0, 30));

  // Staircase on ground floor if multi-floor
  if (input.floors > 1 || input.hasStaircase) {
    specs.push(spec("staircase", 0, 0, 70));
  }

  // ── Bedroom/bathroom distribution ───────────────────────────────────────────
  const bedsOnGround = input.floors === 1 ? input.bedrooms : Math.min(1, input.bedrooms);
  const bedsOnUpper = input.bedrooms - bedsOnGround;

  // Ground floor bedroom(s)
  for (let i = 0; i < bedsOnGround; i++) {
    const type: RoomType = i === 0 && input.bedrooms === 1 ? "master_bedroom" : "bedroom";
    specs.push(spec(type, i + 1, 0, 60));
  }

  // Upper floor rooms
  for (let floor = 1; floor < input.floors; floor++) {
    const bedsThisFloor = Math.ceil(bedsOnUpper / (input.floors - 1));

    // Master bedroom on first upper floor
    if (floor === 1) {
      specs.push(spec("master_bedroom", 0, 1, 90));
      const remaining = Math.max(0, bedsThisFloor - 1);
      for (let i = 0; i < remaining; i++) {
        specs.push(spec("bedroom", i + 2, 1, 75));
      }
    } else {
      for (let i = 0; i < bedsThisFloor; i++) {
        specs.push(spec("bedroom", i + 1, floor, 75));
      }
    }

    // Staircase landing on each upper floor
    if (input.floors > 1 || input.hasStaircase) {
      specs.push(spec("staircase", floor, floor, 70));
    }
  }

  // ── Bathroom distribution ────────────────────────────────────────────────────
  const bathsOnGround = input.floors === 1 ? input.bathrooms : Math.min(1, input.bathrooms);
  const bathsOnUpper = input.bathrooms - bathsOnGround;

  for (let i = 0; i < bathsOnGround; i++) {
    specs.push(spec("bathroom", i, 0, 65));
  }

  for (let i = 0; i < bathsOnUpper; i++) {
    const targetFloor = input.floors > 1 ? 1 + Math.floor(i / 2) : 1;
    specs.push(spec("bathroom", bathsOnGround + i, targetFloor, 65));
  }

  // ── Balcony ─────────────────────────────────────────────────────────────────
  if (input.hasBalcony) {
    const balconyFloor = input.floors > 1 ? 1 : 0;
    specs.push(spec("balcony", 0, balconyFloor, 40));
    if (input.floors > 1) {
      specs.push(spec("balcony", 1, 1, 35));
    }
  }

  // Sort by priority descending so high-priority rooms are placed first
  return specs.sort((a, b) => b.priority - a.priority);
}
