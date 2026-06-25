// ─── Room furniture placer ─────────────────────────────────────────────────
// Reads each room's type, position and dimensions, then places appropriate
// furniture in world-space coordinates. Furniture moves with its floor group
// so it animates correctly in exploded view.

import type { ReactElement } from "react";
import type { Room } from "@/lib/layoutEngine";
import { FLOOR_TO_FLOOR } from "@/lib/geometryEngine3d/constants";

import { Sofa, TVUnit, CenterTable } from "./livingRoom";
import { Bed, Wardrobe, SideTable } from "./bedroom";
import { CounterRun, Sink, Stove } from "./kitchen";
import { DiningTable, DiningChair } from "./dining";
import { WC, WashBasin, Shower } from "./bathroom";
import { Car } from "./parking";
import { Tree, SmallTree, Plant, LargePlant, PlotLandscape } from "./landscape";

// ─── Per-room furniture ────────────────────────────────────────────────────────
function RoomFurniture({ room }: { room: Room }) {
  // In 3D: room NW corner → (room.x, 0, room.y)
  // Furniture sits on floorY = 0 (offsets already baked into group Y in FloorGroups)
  const rx = room.x;
  const rz = room.y;
  const W  = room.width;
  const D  = room.depth;
  const cx = rx + W / 2;
  const cz = rz + D / 2;

  switch (room.type) {

    // ── Living room ──────────────────────────────────────────────────────────
    case "living": {
      const sofaZ  = rz + D - 0.62;          // near south wall, facing north
      const tvZ    = rz + 0.22;              // near north wall
      return (
        <>
          <Sofa        position={[cx, 0, sofaZ]} rotation={Math.PI} />
          <TVUnit      position={[cx, 0, tvZ]}   rotation={0} />
          <CenterTable position={[cx, 0, cz - 0.10]} />
        </>
      );
    }

    // ── Dining room ──────────────────────────────────────────────────────────
    case "dining": {
      const tableLen = Math.min(1.55, W - 0.60);
      const numChairs = tableLen > 1.2 ? 2 : 1; // chairs per long side
      const chairSpacing = tableLen / (numChairs + 1);
      const chairs: ReactElement[] = [];
      for (let i = 0; i < numChairs; i++) {
        const cx2 = cx - tableLen / 2 + chairSpacing * (i + 1);
        chairs.push(
          <DiningChair key={`cs${i}`} position={[cx2, 0, cz + 0.62]} rotation={Math.PI} />,
          <DiningChair key={`cn${i}`} position={[cx2, 0, cz - 0.62]} rotation={0} />,
        );
      }
      // End chairs
      chairs.push(
        <DiningChair key="cw" position={[cx - tableLen / 2 - 0.38, 0, cz]} rotation={Math.PI / 2} />,
        <DiningChair key="ce" position={[cx + tableLen / 2 + 0.38, 0, cz]} rotation={-Math.PI / 2} />,
      );
      return (
        <>
          <DiningTable position={[cx, 0, cz]} />
          {chairs}
        </>
      );
    }

    // ── Master bedroom ───────────────────────────────────────────────────────
    case "master_bedroom": {
      const bedZ = rz + 1.12;
      const wardX = rx + W - 0.35;
      return (
        <>
          <Bed      position={[cx, 0, bedZ]}          rotation={0} isMaster />
          <Wardrobe position={[wardX, 0, rz + D / 2]} rotation={-Math.PI / 2} />
          <SideTable position={[cx - 1.00, 0, bedZ - 0.45]} />
          <SideTable position={[cx + 1.00, 0, bedZ - 0.45]} />
        </>
      );
    }

    // ── Bedroom ──────────────────────────────────────────────────────────────
    case "bedroom": {
      const bedZ = rz + 1.05;
      const wardX = rx + W - 0.35;
      return (
        <>
          <Bed      position={[cx, 0, bedZ]}              rotation={0} />
          <Wardrobe position={[wardX, 0, rz + D / 2]}     rotation={-Math.PI / 2} />
          <SideTable position={[cx - 0.90, 0, bedZ - 0.40]} />
          <SideTable position={[cx + 0.90, 0, bedZ - 0.40]} />
        </>
      );
    }

    // ── Kitchen ──────────────────────────────────────────────────────────────
    case "kitchen": {
      const counterD = 0.35;  // half-depth of counter (0.62/2 = 0.31)
      // Main counter along north wall
      const mainLen = Math.max(0.6, W - 0.4);
      const mainZ   = rz + counterD;

      // Side counter along east wall (only if depth > 2.0)
      const sideLen = D > 2.0 ? Math.max(0.6, D - 1.0) : 0;
      const sideX   = rx + W - counterD;
      const sideZ   = rz + D / 2;

      return (
        <>
          {/* Main counter, sink, stove */}
          <CounterRun
            position={[cx, 0, mainZ]}
            rotation={0}
            length={mainLen}
          />
          <Sink
            position={[cx - mainLen / 2 + 0.35, 0, mainZ]}
          />
          <Stove
            position={[cx, 0, mainZ]}
          />
          {/* Side counter (L-wing) */}
          {sideLen > 0 && (
            <CounterRun
              position={[sideX, 0, sideZ]}
              rotation={-Math.PI / 2}
              length={sideLen}
              hasUpperCabinets={false}
            />
          )}
        </>
      );
    }

    // ── Bathroom ─────────────────────────────────────────────────────────────
    case "bathroom": {
      // WC — far corner (high Z, high X)
      const wcX    = rx + W - 0.26;
      const wcZ    = rz + D - 0.42;
      // Basin — on north wall
      const basX   = rx + W / 2;
      const basZ   = rz + 0.28;
      // Shower — near SW corner
      const shwX   = rx + 0.50;
      const shwZ   = rz + 0.50;
      const shwSz  = Math.min(0.90, W * 0.42, D * 0.42);
      return (
        <>
          <WC         position={[wcX, 0, wcZ]}   rotation={Math.PI} />
          <WashBasin  position={[basX, 0, basZ]}  rotation={0} />
          <Shower     position={[shwX, 0, shwZ]}  rotation={0} size={shwSz} />
        </>
      );
    }

    // ── Toilet (compact) ─────────────────────────────────────────────────────
    case "toilet": {
      const wcX = rx + W / 2;
      const wcZ = rz + D - 0.42;
      const basZ = rz + 0.28;
      return (
        <>
          <WC        position={[wcX, 0, wcZ]}  rotation={Math.PI} />
          <WashBasin position={[rx + 0.32, 0, basZ]} rotation={Math.PI / 2} />
        </>
      );
    }

    // ── Parking ──────────────────────────────────────────────────────────────
    case "parking": {
      // Car oriented along the longer axis
      const ry = W > D ? 0 : Math.PI / 2;
      return <Car position={[cx, 0, cz]} rotation={ry} />;
    }

    // ── Balcony / Terrace — potted plants in corners ─────────────────────────
    case "balcony":
    case "terrace": {
      return (
        <>
          <Plant position={[rx + 0.25, 0, rz + 0.25]} />
          <Plant position={[rx + W - 0.25, 0, rz + 0.25]} />
          {D > 1.5 && <LargePlant position={[cx, 0, cz]} />}
        </>
      );
    }

    // ── Foyer ────────────────────────────────────────────────────────────────
    case "foyer": {
      return <LargePlant position={[cx, 0, rz + D * 0.7]} />;
    }

    // ── Pooja room ───────────────────────────────────────────────────────────
    case "pooja":
    case "staircase":
    case "passage":
    case "utility":
    default:
      return null;
  }
}

// PlotLandscape is imported from ./landscape (premium full-plot composition)
export { PlotLandscape };

// ─── Floor furniture (placed inside each floor's Group for explode support) ───
export function FloorFurniture({
  floor,
  rooms,
}: {
  floor: number;
  rooms: Room[];
}) {
  const floorRooms = rooms.filter(r => r.floor === floor);
  return (
    <>
      {floorRooms.map(room => (
        <RoomFurniture key={room.id} room={room} />
      ))}
    </>
  );
}
