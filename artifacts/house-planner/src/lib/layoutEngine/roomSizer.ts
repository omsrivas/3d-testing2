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
  entrance_gate:  { wMin: 3.0, wIdeal: 6.0, dMin: 0.4, dIdeal: 0.6 },
  front_garden:   { wMin: 2.0, wIdeal: 4.0, dMin: 1.2, dIdeal: 2.0 },
  foyer:          { wMin: 1.5, wIdeal: 2.0, dMin: 1.5, dIdeal: 2.4 },
  living:         { wMin: 3.6, wIdeal: 5.0, dMin: 3.0, dIdeal: 4.2 },
  family_lounge:  { wMin: 2.7, wIdeal: 3.6, dMin: 2.4, dIdeal: 3.6 },
  dining:         { wMin: 2.7, wIdeal: 3.6, dMin: 2.4, dIdeal: 3.0 },
  kitchen:        { wMin: 2.4, wIdeal: 3.3, dMin: 2.1, dIdeal: 3.0 },
  master_bedroom: { wMin: 3.6, wIdeal: 4.5, dMin: 3.6, dIdeal: 4.5 },
  bedroom:        { wMin: 3.0, wIdeal: 3.6, dMin: 3.0, dIdeal: 3.9 },
  bathroom:       { wMin: 1.5, wIdeal: 1.8, dMin: 2.0, dIdeal: 2.4 },
  toilet:         { wMin: 1.2, wIdeal: 1.5, dMin: 1.5, dIdeal: 1.8 },
  balcony:        { wMin: 1.2, wIdeal: 1.5, dMin: 2.4, dIdeal: 3.6 },
  parking:        { wMin: 2.7, wIdeal: 3.3, dMin: 4.5, dIdeal: 5.5 },
  staircase:      { wMin: 1.5, wIdeal: 1.8, dMin: 3.6, dIdeal: 5.4 },
  pooja:          { wMin: 1.2, wIdeal: 1.5, dMin: 1.2, dIdeal: 1.8 },
  utility:        { wMin: 1.5, wIdeal: 2.4, dMin: 1.8, dIdeal: 2.4 },
  passage:        { wMin: 0.9, wIdeal: 1.2, dMin: 1.5, dIdeal: 2.4 },
  terrace:        { wMin: 2.0, wIdeal: 3.0, dMin: 2.0, dIdeal: 3.0 },
};

// ─── Room name templates ──────────────────────────────────────────────────────

function roomName(type: RoomType, index: number): string {
  const names: Record<RoomType, string> = {
    entrance_gate:  "Entrance Gate",
    front_garden:   "Front Garden",
    foyer:          "Foyer",
    living:         "Living Room",
    family_lounge:  "Family Lounge",
    dining:         "Dining Room",
    kitchen:        "Kitchen",
    master_bedroom: "Master Bedroom",
    bedroom:        `Bedroom ${index}`,
    bathroom:       index === 0 ? "Master Bathroom" : `Bathroom ${index}`,
    toilet:         "Common W.C.",
    balcony:        `Balcony`,
    parking:        "Car Porch",
    staircase:      "Staircase",
    pooja:          "Pooja Room",
    utility:        "Utility / Wash",
    passage:        "Passage",
    terrace:        "Terrace",
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
  const { plotWidth, plotDepth } = input;
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

  // Ground floor rooms
  specs.push(spec("entrance_gate", 0, 0, 100));
  specs.push(spec("front_garden",  0, 0, 95));
  if (input.hasParking) specs.push(spec("parking", 0, 0, 92));
  specs.push(spec("foyer",   0, 0, 90));
  specs.push(spec("living",  0, 0, 88));
  specs.push(spec("family_lounge", 0, 0, 70));
  specs.push(spec("dining",  0, 0, 82));
  specs.push(spec("kitchen", 0, 0, 80));
  specs.push(spec("utility", 0, 0, 40));
  specs.push(spec("pooja",   0, 0, 60));

  if (input.floors > 1 || input.hasStaircase) {
    specs.push(spec("staircase", 0, 0, 75));
  }

  const bedsOnGround = input.floors === 1 ? input.bedrooms : Math.min(1, input.bedrooms);
  const bedsOnUpper  = input.bedrooms - bedsOnGround;

  for (let i = 0; i < bedsOnGround; i++) {
    const type: RoomType = i === 0 && input.bedrooms === 1 ? "master_bedroom" : "bedroom";
    specs.push(spec(type, i + 1, 0, 65));
  }

  const upperFloorCount = Math.max(1, input.floors - 1);
  let bedsAssigned = 0;

  for (let floor = 1; floor < input.floors; floor++) {
    const floorsLeft = input.floors - floor;
    const bedsLeft   = bedsOnUpper - bedsAssigned;
    const quota      = bedsLeft > 0 ? Math.ceil(bedsLeft / floorsLeft) : 0;

    if (floor === 1 && bedsLeft > 0) {
      specs.push(spec("master_bedroom", 0, 1, 90));
      bedsAssigned++;
      const extra = Math.min(Math.max(0, quota - 1), bedsLeft - 1);
      for (let i = 0; i < extra; i++) {
        specs.push(spec("bedroom", i + 2, 1, 75));
        bedsAssigned++;
      }
    } else if (bedsLeft > 0) {
      const count = Math.min(quota, bedsLeft);
      for (let i = 0; i < count; i++) {
        specs.push(spec("bedroom", i + 1, floor, 75));
        bedsAssigned++;
      }
    }

    specs.push(spec("passage",   floor, floor, 50));
    if (input.floors > 1 || input.hasStaircase) {
      specs.push(spec("staircase", floor, floor, 70));
    }
  }

  const bathsOnGround = input.floors === 1 ? input.bathrooms : Math.min(1, input.bathrooms);
  const bathsOnUpper  = input.bathrooms - bathsOnGround;

  for (let i = 0; i < bathsOnGround; i++) {
    specs.push(spec("bathroom", i, 0, 65));
  }

  for (let i = 0; i < bathsOnUpper; i++) {
    const targetFloor = 1 + (i % upperFloorCount);
    specs.push(spec("bathroom", bathsOnGround + i, targetFloor, 65));
  }

  if (input.hasBalcony) {
    const balconyFloor = input.floors > 1 ? 1 : 0;
    specs.push(spec("balcony", 0, balconyFloor, 45));
    if (input.floors > 2) {
      specs.push(spec("balcony", 1, 2, 40));
    }
  }

  return specs.sort((a, b) => b.priority - a.priority);
}
