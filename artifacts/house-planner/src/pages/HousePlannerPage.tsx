import { useState, useCallback, useMemo, lazy, Suspense } from "react";
import { generateLayout } from "@/lib/layoutEngine";
import type { LayoutInput, LayoutOutput } from "@/lib/layoutEngine";
import { build3dScene } from "@/lib/geometryEngine3d";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Ruler, Grid3X3, RefreshCw, ChevronRight, Building2,
  BedDouble, Bath, Car, Layers, Compass, AlertTriangle,
  CheckCircle2, Info, Home, Box,
} from "lucide-react";
import FloorPlanCanvas from "@/components/FloorPlanCanvas";

const ThreeViewer = lazy(() => import("@/components/ThreeViewer"));

const ROOM_COLORS: Record<string, string> = {
  living: "#dbeafe", dining: "#dcfce7", kitchen: "#fef9c3",
  master_bedroom: "#ede9fe", bedroom: "#e0e7ff",
  bathroom: "#cffafe", toilet: "#f0fdfa", balcony: "#d1fae5",
  parking: "#f1f5f9", staircase: "#fce7f3", foyer: "#fff7ed",
  pooja: "#fdf4ff", utility: "#f8fafc", passage: "#f1f5f9", terrace: "#ecfdf5",
};

const ROOM_LABELS: Record<string, string> = {
  living: "Living", dining: "Dining", kitchen: "Kitchen",
  master_bedroom: "Master Bed", bedroom: "Bedroom",
  bathroom: "Bathroom", toilet: "WC", balcony: "Balcony",
  parking: "Parking", staircase: "Stairs", foyer: "Foyer",
  pooja: "Pooja", utility: "Utility", passage: "Passage", terrace: "Terrace",
};

const DEFAULT_INPUT: LayoutInput = {
  plotWidth: 12, plotDepth: 18, facingDirection: "N",
  floors: 2, bedrooms: 3, bathrooms: 3,
  hasBalcony: true, hasParking: true, hasStaircase: true, vastuCompliant: true,
};

type ViewMode = "2d" | "3d";

export default function HousePlannerPage() {
  const [input, setInput]               = useState<LayoutInput>(DEFAULT_INPUT);
  const [result, setResult]             = useState<{ success: true; output: LayoutOutput } | null>(null);
  const [errors, setErrors]             = useState<Array<{ field: string; message: string }>>([]);
  const [activeFloor, setActiveFloor]   = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [viewMode, setViewMode]         = useState<ViewMode>("2d");

  const generate = useCallback(() => {
    const out = generateLayout(input);
    if (out.success) {
      setResult(out);
      setErrors([]);
      setActiveFloor(0);
      setSelectedRoomId(null);
    } else {
      setErrors(out.errors);
      setResult(null);
    }
    setHasGenerated(true);
  }, [input]);

  const scene3d = useMemo(() => {
    if (!result) return null;
    return build3dScene(result.output, input);
  }, [result, input]);

  const selectedRoom = result?.output.rooms.find(r => r.id === selectedRoomId) ?? null;
  const floorTabs    = Array.from({ length: input.floors }, (_, i) => i);
  const floorLabel   = (i: number) =>
    i === 0 ? "Ground Floor" : i === 1 ? "First Floor" : i === 2 ? "Second Floor" : `Floor ${i}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0f1a08", color: "#e8dfc0" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b px-6 py-3 flex items-center gap-3 shrink-0"
        style={{ borderColor: "#2a3820", background: "#131d0b" }}>
        <Building2 className="w-5 h-5" style={{ color: "#c1672a" }} />
        <h1 className="font-semibold text-lg" style={{ color: "#e8dfc0" }}>AI House Planner</h1>
        <Badge className="text-xs ml-1"
          style={{ background: "#1e2e10", color: "#90b060", border: "1px solid #3a5228" }}>
          Premium Floor Plan Engine
        </Badge>
        <span className="ml-auto text-xs" style={{ color: "#6a7850" }}>
          Vastu-aware · Deterministic · SVG/PNG export
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ────────────────────────────────────────────────── */}
        <aside className="w-72 flex flex-col overflow-hidden shrink-0"
          style={{ borderRight: "1px solid #2a3820", background: "#131d0b" }}>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">

              {/* Plot dimensions */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
                  style={{ color: "#90b060" }}>
                  <Ruler className="w-3.5 h-3.5" /> Plot Dimensions
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Width (m)", key: "plotWidth", min: 4, max: 50 },
                    { label: "Depth (m)", key: "plotDepth", min: 6, max: 80 },
                  ].map(({ label, key, min, max }) => (
                    <div key={key}>
                      <Label className="text-xs mb-1 block" style={{ color: "#7a8a60" }}>{label}</Label>
                      <Input
                        type="number" min={min} max={max}
                        value={input[key as keyof LayoutInput] as number}
                        onChange={e => setInput(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                        style={{ background: "#1a2610", borderColor: "#304020", color: "#e8dfc0" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator style={{ background: "#2a3820" }} />

              {/* Orientation */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
                  style={{ color: "#90b060" }}>
                  <Compass className="w-3.5 h-3.5" /> Orientation
                </h2>
                <Select
                  value={input.facingDirection}
                  onValueChange={v => setInput(p => ({ ...p, facingDirection: v as LayoutInput["facingDirection"] }))}
                >
                  <SelectTrigger className="h-8 text-sm"
                    style={{ background: "#1a2610", borderColor: "#304020", color: "#e8dfc0" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#1a2610", borderColor: "#304020" }}>
                    {["N","S","E","W"].map(d => (
                      <SelectItem key={d} value={d} style={{ color: "#e8dfc0" }}>
                        {d === "N" ? "North" : d === "S" ? "South" : d === "E" ? "East" : "West"} Facing
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator style={{ background: "#2a3820" }} />

              {/* Structure */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
                  style={{ color: "#90b060" }}>
                  <Layers className="w-3.5 h-3.5" /> Structure
                </h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block" style={{ color: "#7a8a60" }}>Number of Floors</Label>
                    <Select
                      value={String(input.floors)}
                      onValueChange={v => setInput(p => ({ ...p, floors: parseInt(v) }))}
                    >
                      <SelectTrigger className="h-8 text-sm"
                        style={{ background: "#1a2610", borderColor: "#304020", color: "#e8dfc0" }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent style={{ background: "#1a2610", borderColor: "#304020" }}>
                        {[1,2,3,4,5].map(n => (
                          <SelectItem key={n} value={String(n)} style={{ color: "#e8dfc0" }}>
                            {n === 1 ? "Single (G)" : `${n} Floors (G+${n-1})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {[
                    { key: "bedrooms",  label: "Bedrooms",  icon: BedDouble, min: 0, max: 10 },
                    { key: "bathrooms", label: "Bathrooms", icon: Bath,       min: 0, max: 12 },
                  ].map(({ key, label, icon: Icon, min, max }) => (
                    <div key={key}>
                      <Label className="text-xs mb-1 flex items-center gap-1.5" style={{ color: "#7a8a60" }}>
                        <Icon className="w-3 h-3" /> {label}
                      </Label>
                      <Input
                        type="number" min={min} max={max}
                        value={input[key as keyof LayoutInput] as number}
                        onChange={e => setInput(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                        className="h-8 text-sm"
                        style={{ background: "#1a2610", borderColor: "#304020", color: "#e8dfc0" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator style={{ background: "#2a3820" }} />

              {/* Features */}
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
                  style={{ color: "#90b060" }}>
                  <Grid3X3 className="w-3.5 h-3.5" /> Features
                </h2>
                <div className="space-y-3">
                  {[
                    { key: "hasBalcony",     label: "Balcony",         icon: Home },
                    { key: "hasParking",     label: "Covered Parking", icon: Car },
                    { key: "hasStaircase",   label: "Staircase",       icon: Layers },
                    { key: "vastuCompliant", label: "Vastu Compliant", icon: Compass },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-2 cursor-pointer" style={{ color: "#c8d0a8" }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: "#7a8a60" }} />
                        {label}
                      </Label>
                      <Switch
                        checked={input[key as keyof LayoutInput] as boolean}
                        onCheckedChange={v => setInput(p => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Generate button */}
          <div className="p-4" style={{ borderTop: "1px solid #2a3820" }}>
            <Button
              className="w-full gap-2 font-semibold"
              onClick={generate}
              style={{ background: "#c1672a", color: "#fff0e0", border: "none" }}
            >
              <RefreshCw className="w-4 h-4" /> Generate Layout
            </Button>
          </div>
        </aside>

        {/* ── Main canvas ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Toolbar bar: 2D/3D toggle + floor tabs */}
          {result && (
            <div className="flex items-center gap-0 px-4 shrink-0"
              style={{ borderBottom: "1px solid #2a3820", background: "#131d0b" }}>

              {/* 2D / 3D toggle */}
              <div className="flex items-center mr-3 pt-2 pb-1 gap-1">
                {(["2d", "3d"] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all"
                    style={{
                      background: viewMode === mode ? "rgba(193,103,42,0.18)" : "transparent",
                      color: viewMode === mode ? "#c1672a" : "#6a7850",
                      border: viewMode === mode ? "1px solid rgba(193,103,42,0.35)" : "1px solid transparent",
                    }}
                  >
                    {mode === "2d"
                      ? <><Grid3X3 className="w-3 h-3" /> 2D Plan</>
                      : <><Box className="w-3 h-3" /> 3D View</>}
                  </button>
                ))}
              </div>

              {/* Floor tabs – only shown in 2D mode */}
              {viewMode === "2d" && (
                <div className="flex items-center gap-1 pt-0.5">
                  <div className="w-px h-5 mx-2" style={{ background: "#2a3820" }} />
                  {floorTabs.map(i => (
                    <button key={i} onClick={() => setActiveFloor(i)}
                      className="px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors"
                      style={{
                        borderBottomColor: activeFloor === i ? "#c1672a" : "transparent",
                        color: activeFloor === i ? "#c1672a" : "#7a8a60",
                        background: activeFloor === i ? "rgba(193,103,42,0.08)" : "transparent",
                      }}>
                      {floorLabel(i)}
                    </button>
                  ))}
                </div>
              )}

              {/* Mesh count pill – only in 3D mode */}
              {viewMode === "3d" && scene3d && (
                <div className="ml-auto pr-2 text-xs" style={{ color: "#6a7850" }}>
                  {scene3d.meshes.length} geometry meshes
                </div>
              )}
            </div>
          )}

          {/* Canvas area */}
          <div
            className="flex-1 overflow-auto flex items-start justify-center"
            style={{ background: "#0f1a08" }}
          >
            {!hasGenerated ? (
              <div className="flex flex-col items-center justify-center text-center mt-20 max-w-sm">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(193,103,42,0.15)" }}>
                  <Building2 className="w-8 h-8" style={{ color: "#c1672a" }} />
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: "#e8dfc0" }}>Ready to Plan</h2>
                <p className="text-sm mb-6" style={{ color: "#6a7850" }}>
                  Configure your plot on the left, then generate a full architectural model —
                  2D floor plans with furniture, and a complete 3D geometry with walls,
                  slabs, columns, stairs, and openings.
                </p>
                <Button onClick={generate} className="gap-2"
                  style={{ background: "#c1672a", color: "#fff0e0", border: "none" }}>
                  <RefreshCw className="w-4 h-4" /> Generate My Layout
                </Button>
              </div>
            ) : errors.length > 0 ? (
              <div className="mt-10 rounded-lg p-5 max-w-md w-full"
                style={{ background: "rgba(193,60,30,0.12)", border: "1px solid rgba(193,60,30,0.35)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" style={{ color: "#e05030" }} />
                  <span className="font-medium text-sm" style={{ color: "#e05030" }}>Cannot Generate Layout</span>
                </div>
                <ul className="space-y-2">
                  {errors.map((e, i) => (
                    <li key={i} className="text-sm flex gap-2" style={{ color: "#c08070" }}>
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /> {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : result && viewMode === "2d" ? (
              <div className="p-6 w-full h-full flex items-start justify-center">
                <FloorPlanCanvas
                  output={result.output}
                  floor={activeFloor}
                  plotWidth={input.plotWidth}
                  plotDepth={input.plotDepth}
                  facing={input.facingDirection}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                />
              </div>
            ) : result && viewMode === "3d" && scene3d ? (
              <div className="w-full h-full" style={{ minHeight: "500px" }}>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full text-sm" style={{ color: "#6a7850" }}>
                    Loading 3D engine…
                  </div>
                }>
                  <ThreeViewer scene={scene3d} />
                </Suspense>
              </div>
            ) : null}
          </div>
        </main>

        {/* ── Right panel ─────────────────────────────────────────────────── */}
        {result && (
          <aside className="w-60 flex flex-col overflow-hidden shrink-0"
            style={{ borderLeft: "1px solid #2a3820", background: "#131d0b" }}>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">

                {/* Summary */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-3"
                    style={{ color: "#90b060" }}>Summary</h3>
                  <div className="space-y-2">
                    {[
                      ["Built-up Area", `${result.output.metadata.totalBuiltUpArea} m²`],
                      ["Plot Coverage", `${(result.output.metadata.plotCoverageRatio * 100).toFixed(1)}%`],
                      ["Total Rooms",   `${result.output.rooms.length}`],
                      ["Doors",         `${result.output.doors.length}`],
                      ["Windows",       `${result.output.windows.length}`],
                      ...(scene3d ? [["3D Meshes", `${scene3d.meshes.length}`]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span style={{ color: "#7a8a60" }}>{k}</span>
                        <span className="font-medium" style={{ color: "#c8d0a8" }}>{v}</span>
                      </div>
                    ))}
                    {result.output.metadata.vastuScore >= 0 && (
                      <div className="flex justify-between text-sm">
                        <span style={{ color: "#7a8a60" }}>Vastu Score</span>
                        <span className="font-medium"
                          style={{ color: result.output.metadata.vastuScore >= 70 ? "#78b858" : "#c89040" }}>
                          {result.output.metadata.vastuScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator style={{ background: "#2a3820" }} />

                {/* Room list */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2"
                    style={{ color: "#90b060" }}>
                    {viewMode === "3d" ? "All Rooms" : `${floorLabel(activeFloor)} Rooms`}
                  </h3>
                  <div className="space-y-0.5">
                    {result.output.rooms
                      .filter(r => viewMode === "3d" || r.floor === activeFloor)
                      .map(room => (
                        <button key={room.id}
                          onClick={() => { setSelectedRoomId(selectedRoomId === room.id ? null : room.id); }}
                          className="w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors"
                          style={{
                            background: selectedRoomId === room.id ? "rgba(193,103,42,0.20)" : "transparent",
                            color: selectedRoomId === room.id ? "#e8a060" : "#c8d0a8",
                          }}>
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: ROOM_COLORS[room.type] ?? "#f1f5f9", border: "1px solid #60704a" }} />
                          <span className="flex-1 font-medium">{room.name}</span>
                          {viewMode === "3d" && (
                            <span className="text-[9px]" style={{ color: "#506038" }}>F{room.floor}</span>
                          )}
                          <span style={{ color: "#6a7850" }}>{room.area.toFixed(1)}m²</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Selected room detail */}
                {selectedRoom && (
                  <>
                    <Separator style={{ background: "#2a3820" }} />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2"
                        style={{ color: "#90b060" }}>Room Details</h3>
                      <div className="rounded-lg p-3 space-y-2"
                        style={{ background: "#1a2610", border: "1px solid #2a3820" }}>
                        <div className="font-medium text-sm" style={{ color: "#e8dfc0" }}>
                          {selectedRoom.name}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {[
                            ["Width", `${selectedRoom.width.toFixed(2)} m`],
                            ["Depth", `${selectedRoom.depth.toFixed(2)} m`],
                            ["Area",  `${selectedRoom.area.toFixed(2)} m²`],
                            ["Vastu", selectedRoom.vastuZone],
                          ].map(([k, v]) => (
                            <>
                              <div key={`k${k}`} style={{ color: "#7a8a60" }}>{k}</div>
                              <div key={`v${k}`} style={{ color: "#c8d0a8" }}>{v}</div>
                            </>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Warnings */}
                {result.output.metadata.warnings.length > 0 ? (
                  <>
                    <Separator style={{ background: "#2a3820" }} />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1"
                        style={{ color: "#90b060" }}>
                        <AlertTriangle className="w-3 h-3" style={{ color: "#c89040" }} /> Warnings
                      </h3>
                      <div className="space-y-1.5">
                        {result.output.metadata.warnings.slice(0, 5).map((w, i) => (
                          <div key={i} className="text-xs leading-relaxed rounded px-2 py-1.5"
                            style={{ color: "#c8a060", background: "rgba(200,144,64,0.10)", border: "1px solid rgba(200,144,64,0.20)" }}>
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                    style={{ color: "#78b858", background: "rgba(120,184,88,0.10)", border: "1px solid rgba(120,184,88,0.20)" }}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> No planning warnings
                  </div>
                )}

                {/* Legend */}
                <Separator style={{ background: "#2a3820" }} />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1"
                    style={{ color: "#90b060" }}>
                    <Info className="w-3 h-3" /> Legend
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(ROOM_LABELS)
                      .filter(([k]) => result.output.rooms.some(r => r.type === k))
                      .map(([k, label]) => (
                        <div key={k} className="flex items-center gap-2 text-xs" style={{ color: "#7a8a60" }}>
                          <div className="w-3 h-3 rounded-sm shrink-0"
                            style={{ background: ROOM_COLORS[k] ?? "#f1f5f9", border: "1px solid #60704a" }} />
                          {label}
                        </div>
                      ))}
                  </div>
                </div>

              </div>
            </ScrollArea>
          </aside>
        )}
      </div>
    </div>
  );
}
