import type { LayoutInput, LayoutOutput } from "@/lib/layoutEngine";
import type { SceneData, BoxSpec } from "./types";
import { buildSlabs } from "./slabBuilder3d";
import { buildWalls } from "./wallBuilder3d";
import { buildColumns } from "./columnBuilder3d";
import { buildStairs3d } from "./stairBuilder3d";
import { buildDoorFrames, buildWindowFrames } from "./openingBuilder3d";
import { buildParapets } from "./parapetBuilder3d";
import { buildBalconies } from "./balconyBuilder3d";
import { FLOOR_TO_FLOOR, SLAB_T, PARAPET_H } from "./constants";

export type { BoxSpec, SceneData, MeshRole } from "./types";

// ─── Main scene builder ───────────────────────────────────────────────────────
// Returns a flat array of BoxSpec (no Three.js dependency – pure data).
// The viewer component constructs actual Three.js geometry from these specs.

export function build3dScene(
  output: LayoutOutput,
  input: LayoutInput,
): SceneData {
  // Filter parapet-type walls from the layout – we synthesise them ourselves
  const structuralWalls = output.walls.filter(w => w.type !== "parapet");

  const meshes: BoxSpec[] = [
    // 1. Structural slabs (floor, intermediate ceilings, roof)
    ...buildSlabs(input.floors, input.plotWidth, input.plotDepth),

    // 2. Exterior + interior wall segments (with door/window cutouts)
    ...buildWalls(structuralWalls, output.doors, output.windows),

    // 3. Columns at wall corners / T-junctions
    ...buildColumns(structuralWalls, input.floors),

    // 4. Stair treads
    ...buildStairs3d(output.stairs),

    // 5. Door frames
    ...buildDoorFrames(output.doors, structuralWalls),

    // 6. Window frames + glass panes
    ...buildWindowFrames(output.windows, structuralWalls),

    // 7. Roof parapet walls
    ...buildParapets(input.floors, input.plotWidth, input.plotDepth),

    // 8. Balcony / terrace slabs + railings
    ...buildBalconies(output.rooms, structuralWalls, input.floors),
  ];

  // ── Scene bounds ────────────────────────────────────────────────────────────
  const totalH = input.floors * FLOOR_TO_FLOOR + PARAPET_H;
  const cx     = input.plotWidth / 2;
  const cz     = input.plotDepth / 2;
  const diag   = Math.sqrt(
    input.plotWidth ** 2 + totalH ** 2 + input.plotDepth ** 2,
  );

  return {
    meshes,
    floors:     input.floors,
    plotWidth:  input.plotWidth,
    plotDepth:  input.plotDepth,
    center:     [cx, totalH / 2, cz],
    diagonal:   diag,
  };
}
