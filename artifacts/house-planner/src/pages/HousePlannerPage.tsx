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
  CheckCircle2, Info, Home, Box, Menu, X,
} from "lucide-react";
import FloorPlanCanvas from "@/components/FloorPlanCanvas";

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const M_TO_FT   = 3.28084;
const FT_TO_M   = 0.3048;
const M2_TO_SQFT = 10.7639;
const ftToM   = (ft: number)  => ft * FT_TO_M;
const mToFt   = (m: number)   => Math.round(m * M_TO_FT);
const toSqft  = (m2: number)  => Math.round(m2 * M2_TO_SQFT);
const sqftStr = (m2: number)  => `${toSqft(m2).toLocaleString()} sq ft`;

// ─── Room colour legend ───────────────────────────────────────────────────────
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

// ─── Default: 30 ft × 40 ft — standard Indian residential plot ────────────────
const DEFAULT_INPUT: LayoutInput = {
  plotWidth: ftToM(30),   // 9.144 m
  plotDepth: ftToM(40),   // 12.192 m
  facingDirection: "N",
  floors: 2, bedrooms: 3, bathrooms: 3,
  hasBalcony: true, hasParking: true, hasStaircase: true, vastuCompliant: true,
};

// ─── Shared sidebar panel styles ──────────────────────────────────────────────
const SB_BG     = "#131d0b";
const SB_BORDER = "#2a3820";
const SB_TEXT   = "#e8dfc0";
const SB_MUTED  = "#7a8a60";
const SB_INPUT  = { background: "#1a2610", borderColor: "#304020", color: SB_TEXT } as const;
const SB_HEAD   = { color: "#90b060" } as const;

type ViewMode = "2d" | "3d";

// ─── Extracted config panel (shared between desktop sidebar & mobile drawer) ──
function ConfigPanel({
  input,
  setInput,
}: {
  input: LayoutInput;
  setInput: React.Dispatch<React.SetStateAction<LayoutInput>>;
}) {
  return (
    <div className="p-4 space-y-5">

      {/* Plot dimensions — displayed in feet */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
          style={SB_HEAD}>
          <Ruler className="w-3.5 h-3.5" /> Plot Dimensions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Width (ft)", key: "plotWidth", min: 10, max: 200 },
            { label: "Depth (ft)", key: "plotDepth", min: 15, max: 300 },
          ].map(({ label, key, min, max }) => (
            <div key={key}>
              <Label className="text-xs mb-1 block" style={{ color: SB_MUTED }}>{label}</Label>
              <Input
                type="number"
                min={min}
                max={max}
                value={mToFt(input[key as keyof LayoutInput] as number)}
                onChange={e => {
                  const ft = parseFloat(e.target.value) || 0;
                  setInput(p => ({ ...p, [key]: ftToM(ft) }));
                }}
                className="h-8 text-sm"
                style={SB_INPUT}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator style={{ background: SB_BORDER }} />

      {/* Orientation */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
          style={SB_HEAD}>
          <Compass className="w-3.5 h-3.5" /> Orientation
        </h2>
        <Select
          value={input.facingDirection}
          onValueChange={v => setInput(p => ({ ...p, facingDirection: v as LayoutInput["facingDirection"] }))}
        >
          <SelectTrigger className="h-8 text-sm" style={SB_INPUT}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: "#1a2610", borderColor: "#304020" }}>
            {["N","S","E","W"].map(d => (
              <SelectItem key={d} value={d} style={{ color: SB_TEXT }}>
                {d === "N" ? "North" : d === "S" ? "South" : d === "E" ? "East" : "West"} Facing
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator style={{ background: SB_BORDER }} />

      {/* Structure */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
          style={SB_HEAD}>
          <Layers className="w-3.5 h-3.5" /> Structure
        </h2>
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1 block" style={{ color: SB_MUTED }}>Number of Floors</Label>
            <Select
              value={String(input.floors)}
              onValueChange={v => setInput(p => ({ ...p, floors: parseInt(v) }))}
            >
              <SelectTrigger className="h-8 text-sm" style={SB_INPUT}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ background: "#1a2610", borderColor: "#304020" }}>
                {[1,2,3,4,5].map(n => (
                  <SelectItem key={n} value={String(n)} style={{ color: SB_TEXT }}>
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
              <Label className="text-xs mb-1 flex items-center gap-1.5" style={{ color: SB_MUTED }}>
                <Icon className="w-3 h-3" /> {label}
              </Label>
              <Input
                type="number" min={min} max={max}
                value={input[key as keyof LayoutInput] as number}
                onChange={e => setInput(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                className="h-8 text-sm"
                style={SB_INPUT}
              />
            </div>
          ))}
        </div>
      </div>

      <Separator style={{ background: SB_BORDER }} />

      {/* Features */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
          style={SB_HEAD}>
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
                <Icon className="w-3.5 h-3.5" style={{ color: SB_MUTED }} />
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
  );
}

// ─── Lazy-loaded 3D viewer ────────────────────────────────────────────────────
const ThreeViewer = lazy(() => import("@/components/ThreeViewer"));

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HousePlannerPage() {
  const [input, setInput]               = useState<LayoutInput>(DEFAULT_INPUT);
  const [result, setResult]             = useState<{ success: true; output: LayoutOutput } | null>(null);
  const [errors, setErrors]             = useState<Array<{ field: string; message: string }>>([]);
  const [activeFloor, setActiveFloor]   = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [viewMode, setViewMode]         = useState<ViewMode>("2d");
  const [sidebarOpen, setSidebarOpen]   = useState(false);

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
    setSidebarOpen(false);
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
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#0f1a08", color: SB_TEXT }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="border-b px-4 py-2.5 flex items-center gap-3 shrink-0"
        style={{ borderColor: SB_BORDER, background: SB_BG }}
      >
        <Building2 className="w-5 h-5 shrink-0" style={{ color: "#c1672a" }} />
        <h1 className="font-semibold text-base sm:text-lg" style={{ color: SB_TEXT }}>
          AI House Planner
        </h1>
        <Badge
          className="text-xs ml-0.5 hidden sm:flex"
          style={{ background: "#1e2e10", color: "#90b060", border: "1px solid #3a5228" }}
        >
          Premium Floor Plan Engine
        </Badge>

        <span className="ml-auto text-xs hidden lg:block" style={{ color: "#6a7850" }}>
          Vastu-aware · Deterministic · SVG/PNG export
        </span>

        {/* Mobile menu button */}
        <button
          className="md:hidden ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
          style={{ background: "rgba(193,103,42,0.18)", color: "#c1672a", border: "1px solid rgba(193,103,42,0.35)" }}
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-4 h-4" /> Configure
        </button>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Desktop left sidebar ─────────────────────────────────────────── */}
        <aside
          className="hidden md:flex flex-col overflow-hidden shrink-0"
          style={{ width: 268, borderRight: `1px solid ${SB_BORDER}`, background: SB_BG }}
        >
          <ScrollArea className="flex-1">
            <ConfigPanel input={input} setInput={setInput} />
          </ScrollArea>
          <div className="p-4 shrink-0" style={{ borderTop: `1px solid ${SB_BORDER}` }}>
            <Button
              className="w-full gap-2 font-semibold"
              onClick={generate}
              style={{ background: "#c1672a", color: "#fff0e0", border: "none" }}
            >
              <RefreshCw className="w-4 h-4" /> Generate Layout
            </Button>
          </div>
        </aside>

        {/* ── Main canvas area ─────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* View tabs + floor selector */}
          {result && (
            <div
              className="shrink-0 flex items-center gap-0 px-3 overflow-x-auto"
              style={{ borderBottom: `1px solid ${SB_BORDER}`, background: SB_BG }}
            >
              {/* Mobile configure inline button */}
              <button
                className="md:hidden flex items-center gap-1 mr-3 py-2 text-xs"
                style={{ color: "#6a7850" }}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-3.5 h-3.5" />
              </button>

              {/* 2D / 3D toggle */}
              <div className="flex items-center pt-2 pb-1 gap-1 mr-3">
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
                    {mode === "2d" ? <><Grid3X3 className="w-3 h-3" /> 2D Plan</>
                                  : <><Box className="w-3 h-3" /> 3D View</>}
                  </button>
                ))}
              </div>

              {/* Floor tabs — 2D only */}
              {viewMode === "2d" && (
                <div className="flex items-center gap-1 pt-0.5">
                  <div className="w-px h-5 mx-1" style={{ background: SB_BORDER }} />
                  {floorTabs.map(i => (
                    <button
                      key={i}
                      onClick={() => setActiveFloor(i)}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors whitespace-nowrap"
                      style={{
                        borderBottomColor: activeFloor === i ? "#c1672a" : "transparent",
                        color:   activeFloor === i ? "#c1672a" : "#7a8a60",
                        background: activeFloor === i ? "rgba(193,103,42,0.08)" : "transparent",
                      }}
                    >
                      {floorLabel(i)}
                    </button>
                  ))}
                </div>
              )}

              {/* Mesh count — 3D only, desktop */}
              {viewMode === "3d" && scene3d && (
                <div className="ml-auto pr-2 text-xs hidden sm:block" style={{ color: "#6a7850" }}>
                  {scene3d.meshes.length} geometry meshes
                </div>
              )}
            </div>
          )}

          {/* Canvas / viewer */}
          <div
            className="flex-1 min-h-0 overflow-auto flex items-start justify-center"
            style={{ background: "#0f1a08" }}
          >
            {!hasGenerated ? (
              <div className="flex flex-col items-center justify-center text-center mt-12 px-6 max-w-sm w-full">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(193,103,42,0.15)" }}
                >
                  <Building2 className="w-7 h-7" style={{ color: "#c1672a" }} />
                </div>
                <h2 className="text-lg font-semibold mb-2" style={{ color: SB_TEXT }}>Ready to Plan</h2>
                <p className="text-sm mb-6" style={{ color: "#6a7850" }}>
                  Configure your plot, then generate a full architectural model — 2D floor plans
                  with furniture and a complete 3D geometry.
                </p>
                <Button
                  onClick={generate}
                  className="gap-2 w-full max-w-xs"
                  style={{ background: "#c1672a", color: "#fff0e0", border: "none" }}
                >
                  <RefreshCw className="w-4 h-4" /> Generate My Layout
                </Button>
              </div>

            ) : errors.length > 0 ? (
              <div
                className="mt-10 rounded-lg p-5 max-w-md w-full mx-4"
                style={{ background: "rgba(193,60,30,0.12)", border: "1px solid rgba(193,60,30,0.35)" }}
              >
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
              <div className="p-3 sm:p-5 w-full h-full flex items-start justify-center">
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
              <div className="w-full h-full" style={{ minHeight: 320 }}>
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

        {/* ── Desktop right summary panel ─────────────────────────────────── */}
        {result && (
          <aside
            className="hidden lg:flex flex-col overflow-hidden shrink-0"
            style={{ width: 220, borderLeft: `1px solid ${SB_BORDER}`, background: SB_BG }}
          >
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">

                {/* Summary */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={SB_HEAD}>Summary</h3>
                  <div className="space-y-2">
                    {[
                      ["Built-up Area",  sqftStr(result.output.metadata.totalBuiltUpArea)],
                      ["Plot Coverage",  `${(result.output.metadata.plotCoverageRatio * 100).toFixed(1)}%`],
                      ["Plot Size",      `${mToFt(input.plotWidth)}′ × ${mToFt(input.plotDepth)}′`],
                      ["Total Rooms",    `${result.output.rooms.length}`],
                      ["Doors",          `${result.output.doors.length}`],
                      ["Windows",        `${result.output.windows.length}`],
                      ...(scene3d ? [["3D Meshes", `${scene3d.meshes.length}`]] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span style={{ color: SB_MUTED }}>{k}</span>
                        <span className="font-medium text-right ml-2" style={{ color: "#c8d0a8" }}>{v}</span>
                      </div>
                    ))}
                    {result.output.metadata.vastuScore >= 0 && (
                      <div className="flex justify-between text-sm">
                        <span style={{ color: SB_MUTED }}>Vastu Score</span>
                        <span
                          className="font-medium"
                          style={{ color: result.output.metadata.vastuScore >= 70 ? "#78b858" : "#c89040" }}
                        >
                          {result.output.metadata.vastuScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator style={{ background: SB_BORDER }} />

                {/* Room list */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={SB_HEAD}>
                    {viewMode === "3d" ? "All Rooms" : `${floorLabel(activeFloor)} Rooms`}
                  </h3>
                  <div className="space-y-0.5">
                    {result.output.rooms
                      .filter(r => viewMode === "3d" || r.floor === activeFloor)
                      .map(room => (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
                          className="w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors"
                          style={{
                            background: selectedRoomId === room.id ? "rgba(193,103,42,0.20)" : "transparent",
                            color:      selectedRoomId === room.id ? "#e8a060" : "#c8d0a8",
                          }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: ROOM_COLORS[room.type] ?? "#f1f5f9", border: "1px solid #60704a" }}
                          />
                          <span className="flex-1 font-medium truncate">{room.name}</span>
                          {viewMode === "3d" && (
                            <span className="text-[9px]" style={{ color: "#506038" }}>F{room.floor}</span>
                          )}
                          <span style={{ color: "#6a7850" }}>{toSqft(room.area)}</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Selected room detail */}
                {selectedRoom && (
                  <>
                    <Separator style={{ background: SB_BORDER }} />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={SB_HEAD}>
                        Room Details
                      </h3>
                      <div
                        className="rounded-lg p-3 space-y-2"
                        style={{ background: "#1a2610", border: `1px solid ${SB_BORDER}` }}
                      >
                        <div className="font-medium text-sm" style={{ color: SB_TEXT }}>
                          {selectedRoom.name}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {[
                            ["Width",  `${(selectedRoom.width  * M_TO_FT).toFixed(1)} ft`],
                            ["Depth",  `${(selectedRoom.depth  * M_TO_FT).toFixed(1)} ft`],
                            ["Area",   sqftStr(selectedRoom.area)],
                            ["Vastu",  selectedRoom.vastuZone],
                          ].map(([k, v]) => (
                            <>
                              <div key={`k${k}`} style={{ color: SB_MUTED }}>{k}</div>
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
                    <Separator style={{ background: SB_BORDER }} />
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1"
                        style={SB_HEAD}>
                        <AlertTriangle className="w-3 h-3" style={{ color: "#c89040" }} /> Warnings
                      </h3>
                      <div className="space-y-1.5">
                        {result.output.metadata.warnings.slice(0, 5).map((w, i) => (
                          <div
                            key={i}
                            className="text-xs leading-relaxed rounded px-2 py-1.5"
                            style={{ color: "#c8a060", background: "rgba(200,144,64,0.10)", border: "1px solid rgba(200,144,64,0.20)" }}
                          >
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                    style={{ color: "#78b858", background: "rgba(120,184,88,0.10)", border: "1px solid rgba(120,184,88,0.20)" }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> No planning warnings
                  </div>
                )}

                {/* Legend */}
                <Separator style={{ background: SB_BORDER }} />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1"
                    style={SB_HEAD}>
                    <Info className="w-3 h-3" /> Legend
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(ROOM_LABELS)
                      .filter(([k]) => result.output.rooms.some(r => r.type === k))
                      .map(([k, label]) => (
                        <div key={k} className="flex items-center gap-2 text-xs" style={{ color: SB_MUTED }}>
                          <div
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ background: ROOM_COLORS[k] ?? "#f1f5f9", border: "1px solid #60704a" }}
                          />
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

      {/* ── Mobile / tablet bottom summary bar (hidden lg+) ────────────────── */}
      {result && (
        <div
          className="lg:hidden shrink-0 px-4 py-2 flex items-center gap-4 overflow-x-auto"
          style={{ borderTop: `1px solid ${SB_BORDER}`, background: SB_BG }}
        >
          <div className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: "#c8d0a8" }}>
            <Building2 className="w-3 h-3 shrink-0" style={{ color: "#78b858" }} />
            {sqftStr(result.output.metadata.totalBuiltUpArea)}
          </div>
          <div className="text-xs whitespace-nowrap" style={{ color: SB_MUTED }}>
            {mToFt(input.plotWidth)}′ × {mToFt(input.plotDepth)}′
          </div>
          <div className="text-xs whitespace-nowrap" style={{ color: SB_MUTED }}>
            {result.output.rooms.length} rooms
          </div>
          {result.output.metadata.vastuScore >= 0 && (
            <div
              className="text-xs whitespace-nowrap"
              style={{ color: result.output.metadata.vastuScore >= 70 ? "#78b858" : "#c89040" }}
            >
              Vastu {result.output.metadata.vastuScore}/100
            </div>
          )}
          {result.output.metadata.warnings.length > 0 && (
            <div className="flex items-center gap-1 text-xs whitespace-nowrap" style={{ color: "#c8a060" }}>
              <AlertTriangle className="w-3 h-3" />
              {result.output.metadata.warnings.length} warning{result.output.metadata.warnings.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* ── Mobile sidebar drawer ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Dimmed backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.65)" }}
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer panel */}
          <div
            className="absolute left-0 top-0 bottom-0 flex flex-col overflow-hidden"
            style={{
              width: "min(88vw, 320px)",
              background: SB_BG,
              borderRight: `1px solid ${SB_BORDER}`,
            }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: `1px solid ${SB_BORDER}` }}
            >
              <span className="font-semibold text-sm" style={{ color: SB_TEXT }}>Configure Plot</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded"
                style={{ color: SB_MUTED }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form */}
            <ScrollArea className="flex-1">
              <ConfigPanel input={input} setInput={setInput} />
            </ScrollArea>

            {/* Generate button */}
            <div className="p-4 shrink-0" style={{ borderTop: `1px solid ${SB_BORDER}` }}>
              <Button
                className="w-full gap-2 font-semibold"
                onClick={generate}
                style={{ background: "#c1672a", color: "#fff0e0", border: "none" }}
              >
                <RefreshCw className="w-4 h-4" /> Generate Layout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
