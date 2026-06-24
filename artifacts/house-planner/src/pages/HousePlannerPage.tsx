import { useState, useCallback } from "react";
import { generateLayout } from "@/lib/layoutEngine";
import type { LayoutInput, LayoutOutput, Room, Wall } from "@/lib/layoutEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Home,
  Ruler,
  Grid3X3,
  RefreshCw,
  ChevronRight,
  Building2,
  DoorOpen,
  BedDouble,
  Bath,
  Car,
  Layers,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";

const ROOM_COLORS: Record<string, string> = {
  living: "#dbeafe",
  dining: "#dcfce7",
  kitchen: "#fef9c3",
  master_bedroom: "#ede9fe",
  bedroom: "#e0e7ff",
  bathroom: "#cffafe",
  toilet: "#f0fdfa",
  balcony: "#d1fae5",
  parking: "#f1f5f9",
  staircase: "#fce7f3",
  foyer: "#fff7ed",
  pooja: "#fdf4ff",
  utility: "#f8fafc",
  passage: "#f1f5f9",
  terrace: "#ecfdf5",
};

const ROOM_LABELS: Record<string, string> = {
  living: "Living",
  dining: "Dining",
  kitchen: "Kitchen",
  master_bedroom: "Master Bed",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  toilet: "WC",
  balcony: "Balcony",
  parking: "Parking",
  staircase: "Stairs",
  foyer: "Foyer",
  pooja: "Pooja",
  utility: "Utility",
  passage: "Passage",
  terrace: "Terrace",
};

const DEFAULT_INPUT: LayoutInput = {
  plotWidth: 12,
  plotDepth: 18,
  facingDirection: "N",
  floors: 2,
  bedrooms: 3,
  bathrooms: 3,
  hasBalcony: true,
  hasParking: true,
  hasStaircase: true,
  vastuCompliant: true,
};

const SCALE = 28;

interface FloorPlanViewProps {
  rooms: Room[];
  walls: Wall[];
  floor: number;
  plotWidth: number;
  plotDepth: number;
  selectedRoom: string | null;
  onSelectRoom: (id: string | null) => void;
}

function FloorPlanView({
  rooms,
  walls,
  floor,
  plotWidth,
  plotDepth,
  selectedRoom,
  onSelectRoom,
}: FloorPlanViewProps) {
  const floorRooms = rooms.filter((r) => r.floor === floor);
  const floorWalls = walls.filter((w) => w.floor === floor);

  const svgW = plotWidth * SCALE + 40;
  const svgH = plotDepth * SCALE + 40;

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: "block", maxWidth: "100%" }}
      viewBox={`0 0 ${svgW} ${svgH}`}
    >
      {/* Background / plot outline */}
      <rect
        x={20}
        y={20}
        width={plotWidth * SCALE}
        height={plotDepth * SCALE}
        fill="#f8fafc"
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />

      {/* Grid lines */}
      {Array.from({ length: Math.ceil(plotWidth) + 1 }, (_, i) => (
        <line
          key={`vg-${i}`}
          x1={20 + i * SCALE}
          y1={20}
          x2={20 + i * SCALE}
          y2={20 + plotDepth * SCALE}
          stroke="#e2e8f0"
          strokeWidth={0.5}
        />
      ))}
      {Array.from({ length: Math.ceil(plotDepth) + 1 }, (_, i) => (
        <line
          key={`hg-${i}`}
          x1={20}
          y1={20 + i * SCALE}
          x2={20 + plotWidth * SCALE}
          y2={20 + i * SCALE}
          stroke="#e2e8f0"
          strokeWidth={0.5}
        />
      ))}

      {/* Rooms */}
      {floorRooms.map((room) => {
        const rx = 20 + room.x * SCALE;
        const ry = 20 + room.y * SCALE;
        const rw = room.width * SCALE;
        const rh = room.depth * SCALE;
        const color = ROOM_COLORS[room.type] ?? "#f1f5f9";
        const isSelected = selectedRoom === room.id;

        return (
          <g key={room.id} onClick={() => onSelectRoom(isSelected ? null : room.id)} style={{ cursor: "pointer" }}>
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={color}
              stroke={isSelected ? "#2563eb" : "#94a3b8"}
              strokeWidth={isSelected ? 2 : 1}
              rx={1}
            />
            {rw > 30 && rh > 20 && (
              <>
                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 - 5}
                  textAnchor="middle"
                  fontSize={Math.min(10, rw / 6, rh / 3)}
                  fill="#374151"
                  fontWeight="500"
                >
                  {ROOM_LABELS[room.type] ?? room.type}
                </text>
                <text
                  x={rx + rw / 2}
                  y={ry + rh / 2 + 9}
                  textAnchor="middle"
                  fontSize={Math.min(8, rw / 7, rh / 4)}
                  fill="#6b7280"
                >
                  {room.area.toFixed(1)}m²
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Walls */}
      {floorWalls.map((wall) => (
        <line
          key={wall.id}
          x1={20 + wall.x1 * SCALE}
          y1={20 + wall.y1 * SCALE}
          x2={20 + wall.x2 * SCALE}
          y2={20 + wall.y2 * SCALE}
          stroke={wall.type === "external" ? "#1e293b" : "#64748b"}
          strokeWidth={wall.type === "external" ? 3 : 1.5}
        />
      ))}

      {/* Compass indicator */}
      <text x={svgW - 25} y={32} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight="600">N</text>
      <line x1={svgW - 25} y1={34} x2={svgW - 25} y2={44} stroke="#6b7280" strokeWidth={1.5} />
      <polygon points={`${svgW - 25},34 ${svgW - 28},42 ${svgW - 25},40 ${svgW - 22},42`} fill="#6b7280" />

      {/* Dimension labels */}
      <text x={20 + (plotWidth * SCALE) / 2} y={15} textAnchor="middle" fontSize={9} fill="#94a3b8">
        {plotWidth}m
      </text>
      <text
        x={12}
        y={20 + (plotDepth * SCALE) / 2}
        textAnchor="middle"
        fontSize={9}
        fill="#94a3b8"
        transform={`rotate(-90, 12, ${20 + (plotDepth * SCALE) / 2})`}
      >
        {plotDepth}m
      </text>
    </svg>
  );
}

export default function HousePlannerPage() {
  const [input, setInput] = useState<LayoutInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<{ success: true; output: LayoutOutput } | null>(null);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);
  const [activeFloor, setActiveFloor] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

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

  const selectedRoom = result?.output.rooms.find((r) => r.id === selectedRoomId) ?? null;

  const floorCount = input.floors;
  const floorTabs = Array.from({ length: floorCount }, (_, i) => i);

  const floorLabel = (i: number) =>
    i === 0 ? "Ground Floor" : i === 1 ? "First Floor" : i === 2 ? "Second Floor" : `Floor ${i}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h1 className="font-semibold text-lg">AI House Planner</h1>
        </div>
        <Badge variant="secondary" className="text-xs">Vastu-Aware Layout Engine</Badge>
        <div className="ml-auto text-xs text-muted-foreground">
          Design your dream home with intelligent floor planning
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar – inputs */}
        <aside className="w-72 border-r bg-card flex flex-col overflow-hidden shrink-0">
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" /> Plot Dimensions
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Width (m)</Label>
                    <Input
                      type="number"
                      min={4}
                      max={50}
                      value={input.plotWidth}
                      onChange={(e) => setInput((p) => ({ ...p, plotWidth: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Depth (m)</Label>
                    <Input
                      type="number"
                      min={6}
                      max={80}
                      value={input.plotDepth}
                      onChange={(e) => setInput((p) => ({ ...p, plotDepth: parseFloat(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-primary" /> Orientation
                </h2>
                <Select
                  value={input.facingDirection}
                  onValueChange={(v) =>
                    setInput((p) => ({ ...p, facingDirection: v as LayoutInput["facingDirection"] }))
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="N">North Facing</SelectItem>
                    <SelectItem value="S">South Facing</SelectItem>
                    <SelectItem value="E">East Facing</SelectItem>
                    <SelectItem value="W">West Facing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Structure
                </h2>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Number of Floors</Label>
                    <Select
                      value={String(input.floors)}
                      onValueChange={(v) => setInput((p) => ({ ...p, floors: parseInt(v) }))}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n === 1 ? "Single Storey (G)" : `${n} Floors (G+${n - 1})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                      <BedDouble className="w-3 h-3" /> Bedrooms
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={input.bedrooms}
                      onChange={(e) => setInput((p) => ({ ...p, bedrooms: parseInt(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                      <Bath className="w-3 h-3" /> Bathrooms
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={12}
                      value={input.bathrooms}
                      onChange={(e) => setInput((p) => ({ ...p, bathrooms: parseInt(e.target.value) || 0 }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-primary" /> Features
                </h2>
                <div className="space-y-3">
                  {[
                    { key: "hasBalcony", label: "Balcony", icon: Home },
                    { key: "hasParking", label: "Covered Parking", icon: Car },
                    { key: "hasStaircase", label: "Staircase", icon: Layers },
                    { key: "vastuCompliant", label: "Vastu Compliant", icon: Compass },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-2 cursor-pointer">
                        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        {label}
                      </Label>
                      <Switch
                        checked={input[key as keyof LayoutInput] as boolean}
                        onCheckedChange={(v) => setInput((p) => ({ ...p, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Generate button */}
          <div className="p-4 border-t">
            <Button className="w-full gap-2" onClick={generate}>
              <RefreshCw className="w-4 h-4" />
              Generate Layout
            </Button>
          </div>
        </aside>

        {/* Main canvas */}
        <main className="flex-1 flex flex-col overflow-hidden bg-muted/30">
          {/* Floor tabs */}
          {result && (
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b bg-card">
              {floorTabs.map((i) => (
                <button
                  key={i}
                  onClick={() => setActiveFloor(i)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${
                    activeFloor === i
                      ? "border-primary text-primary bg-muted/50"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {floorLabel(i)}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto p-6 flex items-start justify-center">
            {!hasGenerated ? (
              <div className="flex flex-col items-center justify-center text-center mt-20 max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Ready to Plan</h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Configure your plot dimensions and requirements on the left, then click
                  &quot;Generate Layout&quot; to create an AI-powered floor plan.
                </p>
                <Button onClick={generate} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Generate My Layout
                </Button>
              </div>
            ) : errors.length > 0 ? (
              <div className="mt-10 bg-destructive/10 border border-destructive/30 rounded-lg p-5 max-w-md w-full">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="font-medium text-sm text-destructive">Cannot Generate Layout</span>
                </div>
                <ul className="space-y-2">
                  {errors.map((e, i) => (
                    <li key={i} className="text-sm text-destructive/80 flex gap-2">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                      {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : result ? (
              <div className="bg-white rounded-xl shadow-sm border p-4 inline-block">
                <FloorPlanView
                  rooms={result.output.rooms}
                  walls={result.output.walls}
                  floor={activeFloor}
                  plotWidth={input.plotWidth}
                  plotDepth={input.plotDepth}
                  selectedRoom={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                />
              </div>
            ) : null}
          </div>
        </main>

        {/* Right panel – stats + room details */}
        {result && (
          <aside className="w-64 border-l bg-card flex flex-col overflow-hidden shrink-0">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Metadata */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Summary
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Built-up Area</span>
                      <span className="font-medium">{result.output.metadata.totalBuiltUpArea} m²</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Plot Coverage</span>
                      <span className="font-medium">
                        {(result.output.metadata.plotCoverageRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Rooms</span>
                      <span className="font-medium">{result.output.rooms.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Doors</span>
                      <span className="font-medium">{result.output.doors.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Windows</span>
                      <span className="font-medium">{result.output.windows.length}</span>
                    </div>
                    {input.vastuCompliant && result.output.metadata.vastuScore >= 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vastu Score</span>
                        <span className={`font-medium ${result.output.metadata.vastuScore >= 70 ? "text-green-600" : "text-amber-600"}`}>
                          {result.output.metadata.vastuScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Room list */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Floor {activeFloor} Rooms
                  </h3>
                  <div className="space-y-1">
                    {result.output.rooms
                      .filter((r) => r.floor === activeFloor)
                      .map((room) => (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition-colors ${
                            selectedRoomId === room.id
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ background: ROOM_COLORS[room.type] ?? "#f1f5f9", border: "1px solid #94a3b8" }}
                          />
                          <span className="flex-1 font-medium">{room.name}</span>
                          <span className="text-muted-foreground">{room.area.toFixed(1)}m²</span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Selected room details */}
                {selectedRoom && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Room Details
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="font-medium text-sm">{selectedRoom.name}</div>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <div className="text-muted-foreground">Width</div>
                          <div>{selectedRoom.width.toFixed(2)} m</div>
                          <div className="text-muted-foreground">Depth</div>
                          <div>{selectedRoom.depth.toFixed(2)} m</div>
                          <div className="text-muted-foreground">Area</div>
                          <div>{selectedRoom.area.toFixed(2)} m²</div>
                          <div className="text-muted-foreground">Vastu Zone</div>
                          <div>{selectedRoom.vastuZone}</div>
                          <div className="text-muted-foreground">Position</div>
                          <div>({selectedRoom.x.toFixed(1)}, {selectedRoom.y.toFixed(1)})</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Warnings */}
                {result.output.metadata.warnings.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Warnings
                      </h3>
                      <div className="space-y-1.5">
                        {result.output.metadata.warnings.slice(0, 5).map((w, i) => (
                          <div key={i} className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 leading-relaxed">
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {result.output.metadata.warnings.length === 0 && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    No planning warnings
                  </div>
                )}

                {/* Rooms legend */}
                <Separator />
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Legend
                  </h3>
                  <div className="space-y-1">
                    {Object.entries(ROOM_LABELS)
                      .filter(([k]) => result.output.rooms.some((r) => r.type === k))
                      .map(([k, label]) => (
                        <div key={k} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ background: ROOM_COLORS[k] ?? "#f1f5f9", border: "1px solid #94a3b8" }}
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
    </div>
  );
}
