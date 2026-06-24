/**
 * layoutEngine.ts
 * ───────────────
 * Deterministic, Vastu-aware house layout generator.
 *
 * Input  : LayoutInput  (plot dimensions, program, preferences)
 * Output : LayoutOutput (rooms, walls, doors, windows, stairs, metadata)
 *
 * No meshes are generated here. All output is plain structured JSON.
 *
 * Pipeline:
 *   1. buildRoomSpecs     — translate user program into sized room requirements
 *   2. planAllFloors      — place rooms deterministically on each floor (no overlaps)
 *   3. generateWalls      — derive deduplicated wall segments from room perimeters
 *   4. generateOpenings   — place doors and windows on walls
 *   5. generateStairs     — create stair flights between floors
 *   6. validateLayout     — check overlaps, dimensions, circulation, bylaws
 *   7. assemble metadata  — area tallies, Vastu score, warnings
 */

import type { LayoutInput, LayoutOutput, Room } from "./types";
import { buildRoomSpecs } from "./roomSizer";
import { planAllFloors, resetCounter } from "./floorPlanner";
import { generateWalls, resetWallCounter } from "./wallGenerator";
import { generateOpenings } from "./openingGenerator";
import { generateStairs, resetStairCounter } from "./stairGenerator";
import { validateLayout, buildRoomSummary } from "./validation";
import { scoreVastu } from "./vastu";

// ─── Input validation ─────────────────────────────────────────────────────────

export interface LayoutError {
  field: string;
  message: string;
}

function validateInput(input: LayoutInput): LayoutError[] {
  const errors: LayoutError[] = [];

  if (!Number.isFinite(input.plotWidth) || input.plotWidth <= 0)
    errors.push({ field: "plotWidth", message: "Plot width must be a positive number (metres)." });
  if (!Number.isFinite(input.plotDepth) || input.plotDepth <= 0)
    errors.push({ field: "plotDepth", message: "Plot depth must be a positive number (metres)." });
  if (input.plotWidth < 4)
    errors.push({ field: "plotWidth", message: "Plot width must be at least 4 m." });
  if (input.plotDepth < 6)
    errors.push({ field: "plotDepth", message: "Plot depth must be at least 6 m." });

  if (!["N", "S", "E", "W"].includes(input.facingDirection))
    errors.push({ field: "facingDirection", message: "Facing direction must be N, S, E, or W." });

  if (!Number.isInteger(input.floors) || input.floors < 1 || input.floors > 5)
    errors.push({ field: "floors", message: "Floors must be an integer between 1 and 5." });

  if (!Number.isInteger(input.bedrooms) || input.bedrooms < 0 || input.bedrooms > 10)
    errors.push({ field: "bedrooms", message: "Bedrooms must be between 0 and 10." });

  if (!Number.isInteger(input.bathrooms) || input.bathrooms < 0 || input.bathrooms > 12)
    errors.push({ field: "bathrooms", message: "Bathrooms must be between 0 and 12." });

  // Feasibility check: rough area budget
  const plotArea = input.plotWidth * input.plotDepth;
  const estimatedArea =
    input.bedrooms * 12 +
    input.bathrooms * 4 +
    (input.hasParking ? 17 : 0) +
    30; // living/kitchen/dining/foyer

  if (estimatedArea > plotArea * input.floors * 0.85) {
    errors.push({
      field: "program",
      message: `Program (≈${estimatedArea.toFixed(0)} m²) may not fit in the available plot area (${(plotArea * input.floors).toFixed(0)} m² total). Consider a larger plot or fewer rooms.`,
    });
  }

  return errors;
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateLayout(input: LayoutInput): {
  success: true;
  output: LayoutOutput;
} | {
  success: false;
  errors: LayoutError[];
} {
  // 1. Validate input
  const inputErrors = validateInput(input);
  if (inputErrors.length > 0) {
    return { success: false, errors: inputErrors };
  }

  // 2. Reset deterministic counters (ensures same input → same IDs)
  resetCounter();
  resetWallCounter();
  resetStairCounter();

  // 3. Build room requirement specs
  const specs = buildRoomSpecs(input);

  // 4. Place rooms on each floor using strip+zone algorithm (guaranteed no overlap)
  const floorPlans = planAllFloors(specs, input);
  const rooms: Room[] = floorPlans.flatMap((fp) => fp.rooms);

  // 5. Generate deduplicated wall segments from room perimeters
  const walls = generateWalls(rooms, input.plotWidth, input.plotDepth);

  // 6. Place doors and windows
  const { doors, windows } = generateOpenings(rooms, walls, input);

  // 7. Generate stair flights
  const stairs = generateStairs(rooms, input);

  // 8. Assemble preliminary output for validation
  const output: LayoutOutput = {
    rooms,
    walls,
    doors,
    windows,
    stairs,
    metadata: {
      totalBuiltUpArea: 0,
      plotCoverageRatio: 0,
      vastuScore: 0,
      warnings: [],
      roomSummary: {} as Record<string, number>,
    },
  };

  // 9. Validate (collect warnings, not errors — engine proceeds regardless)
  const { warnings } = validateLayout(output, input);

  // 10. Compute metadata
  const totalBuiltUpArea = parseFloat(
    rooms.reduce((s, r) => s + r.area, 0).toFixed(2)
  );
  const plotArea = input.plotWidth * input.plotDepth;
  const groundFootprint = rooms
    .filter((r) => r.floor === 0)
    .reduce((s, r) => s + r.area, 0);

  const vastuScore = input.vastuCompliant
    ? scoreVastu(
        rooms.map((r) => ({ type: r.type, x: r.x, y: r.y })),
        input.plotWidth,
        input.plotDepth,
        input.facingDirection
      )
    : -1; // -1 = Vastu not requested

  output.metadata = {
    totalBuiltUpArea,
    plotCoverageRatio: parseFloat((groundFootprint / plotArea).toFixed(3)),
    vastuScore,
    warnings,
    roomSummary: buildRoomSummary(rooms),
  };

  return { success: true, output };
}
