---
name: Geometry engine plinth offset
description: PLINTH_H must be added to all Y base positions in every geometry builder.
---

The building sits on a 450mm raised plinth. All geometry builders compute `baseY = PLINTH_H + floor * FLOOR_TO_FLOOR`.

**Why:** Adding the plinth as a visual element requires raising the entire building. Forgetting PLINTH_H in any builder causes that element to float below the plinth or clip into the ground.

**How to apply:** Any new geometry builder that calculates `baseY` (floor base height) must import PLINTH_H from constants.ts and use `PLINTH_H + floor * FLOOR_TO_FLOOR`.

Files affected: wallBuilder3d.ts, columnBuilder3d.ts, openingBuilder3d.ts, stairBuilder3d.ts, slabBuilder3d.ts, parapetBuilder3d.ts, balconyBuilder3d.ts, lintelBuilder3d.ts, beamBuilder3d.ts.
