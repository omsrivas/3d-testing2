import {
  useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect,
} from "react";
import { generateLayout } from "@/lib/layoutEngine";
import type { LayoutInput, LayoutOutput } from "@/lib/layoutEngine";
import FloorPlanSVG, { floorName, BASE_SCALE } from "@/components/FloorPlanSVG";
import { exportSVG, exportPNG, exportPDF } from "@/lib/exportUtils";

import {
  Building2, RefreshCw, AlertTriangle,
  ZoomIn, ZoomOut, Maximize2, Download,
  BedDouble, Bath, Car, Compass, Layers3,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Minus, Plus, ChevronUp, ChevronDown,
  FileImage, FileCode, Printer, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const FT_TO_M = 0.3048;
const ftToM   = (ft: number) => ft * FT_TO_M;
const mToFt   = (m: number)  => Math.round(m / FT_TO_M);
const M2_SQFT = 10.7639;
const toSqft  = (m2: number) => Math.round(m2 * M2_SQFT).toLocaleString();

// ─── Theme tokens (sidebar) ───────────────────────────────────────────────────
const T = {
  bg:           "#0b1207",
  bgDeep:       "#070e04",
  glass:        "rgba(12,20,7,0.82)",
  border:       "rgba(78,118,46,0.18)",
  borderHover:  "rgba(100,148,60,0.32)",
  accent:       "#c87838",
  accentDim:    "rgba(200,120,56,0.14)",
  accentBorder: "rgba(200,120,56,0.32)",
  green:        "#80b850",
  greenDim:     "rgba(128,184,80,0.14)",
  textPri:      "#dcd8c2",
  textSec:      "#88966a",
  textMut:      "#50604a",
  textHead:     "#a0bc78",
  inputBg:      "rgba(6,12,4,0.70)",
  inputBorder:  "rgba(68,108,36,0.28)",
} as const;

const DEFAULT_INPUT: LayoutInput = {
  plotWidth: ftToM(30), plotDepth: ftToM(40),
  facingDirection: "N", floors: 2, bedrooms: 3, bathrooms: 3,
  hasBalcony: true, hasParking: true, hasStaircase: true, vastuCompliant: true,
};

// ─── UI primitives ─────────────────────────────────────────────────────────────

function SectionHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={11} style={{ color: T.textSec }} />
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: T.textHead,
      }}>{label}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.border, margin: "16px 0" }} />;
}

function DimInput({
  label, valueFt, minFt, maxFt, onChange,
}: { label: string; valueFt: number; minFt: number; maxFt: number; onChange: (ft: number) => void }) {
  const [raw, setRaw] = useState(String(valueFt));
  useEffect(() => setRaw(String(valueFt)), [valueFt]);
  return (
    <div>
      <label style={{
        fontSize: 9, fontWeight: 600, letterSpacing: "0.10em",
        textTransform: "uppercase", color: T.textSec, display: "block", marginBottom: 6,
      }}>{label}</label>
      <div className="flex items-center" style={{
        background: T.inputBg, border: `1px solid ${T.inputBorder}`,
        borderRadius: 8, overflow: "hidden",
      }}>
        <button onClick={() => onChange(Math.max(minFt, valueFt - 1))}
          className="flex items-center justify-center"
          style={{ width: 28, height: 34, color: T.textSec, flexShrink: 0 }}>
          <Minus size={11} />
        </button>
        <input
          type="number" min={minFt} max={maxFt} value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => {
            const ft = Math.round(Math.max(minFt, Math.min(maxFt, parseFloat(raw) || minFt)));
            setRaw(String(ft)); onChange(ft);
          }}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            textAlign: "center", fontSize: 13, fontWeight: 600,
            fontFamily: "ui-monospace, monospace", color: T.textPri,
            height: 34, minWidth: 0,
          }}
        />
        <button onClick={() => onChange(Math.min(maxFt, valueFt + 1))}
          className="flex items-center justify-center"
          style={{ width: 28, height: 34, color: T.textSec, flexShrink: 0 }}>
          <Plus size={11} />
        </button>
        <span style={{ fontSize: 10, color: T.textMut, paddingRight: 10, flexShrink: 0 }}>ft</span>
      </div>
    </div>
  );
}

function Stepper({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center" style={{
      background: T.inputBg, border: `1px solid ${T.inputBorder}`,
      borderRadius: 8, overflow: "hidden",
    }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        className="flex items-center justify-center"
        style={{ width: 32, height: 32, color: T.textSec }}>
        <Minus size={12} />
      </button>
      <span style={{
        flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600,
        fontFamily: "ui-monospace, monospace", color: T.textPri, lineHeight: "32px",
      }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))}
        className="flex items-center justify-center"
        style={{ width: 32, height: 32, color: T.textSec }}>
        <Plus size={12} />
      </button>
    </div>
  );
}

function CompassPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const DIRS = [
    { d: "N", icon: ArrowUp },
    { d: "E", icon: ArrowRight },
    { d: "S", icon: ArrowDown },
    { d: "W", icon: ArrowLeft },
  ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {DIRS.map(({ d, icon: Icon }) => {
        const active = value === d;
        return (
          <button key={d} onClick={() => onChange(d)}
            className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all"
            style={{
              background: active ? T.accentDim : T.inputBg,
              border: `1px solid ${active ? T.accentBorder : T.inputBorder}`,
              color: active ? T.accent : T.textSec,
            }}>
            <Icon size={12} />
            <span style={{ fontSize: 9, fontWeight: 700 }}>{d}</span>
          </button>
        );
      })}
    </div>
  );
}

function FloorPills({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map(n => {
        const active = value === n;
        return (
          <button key={n} onClick={() => onChange(n)}
            className="flex-1 py-1.5 rounded-md transition-all"
            style={{
              background: active ? T.accentDim : T.inputBg,
              border: `1px solid ${active ? T.accentBorder : T.inputBorder}`,
              color: active ? T.accent : T.textSec,
              fontSize: 11, fontWeight: 700,
            }}>
            G{n > 1 ? `+${n - 1}` : ""}
          </button>
        );
      })}
    </div>
  );
}

function FeatureRow({ icon: Icon, label, checked, onChange }: {
  icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer"
      style={{
        background: checked ? T.greenDim : "transparent",
        border: `1px solid ${checked ? "rgba(128,184,80,0.18)" : "transparent"}`,
      }}
      onClick={() => onChange(!checked)}>
      <div className="flex items-center gap-2.5">
        <Icon size={12} style={{ color: checked ? T.green : T.textMut }} />
        <span style={{ fontSize: 12, color: checked ? T.textPri : T.textSec }}>{label}</span>
      </div>
      <div className="relative" style={{
        width: 34, height: 18, borderRadius: 9,
        background: checked ? "rgba(128,184,80,0.50)" : T.inputBg,
        border: `1px solid ${checked ? "rgba(128,184,80,0.40)" : T.inputBorder}`,
      }}>
        <div className="absolute top-0.5 transition-all" style={{
          width: 14, height: 14, borderRadius: "50%",
          background: checked ? T.green : T.textMut,
          left: checked ? 17 : 2,
        }} />
      </div>
    </div>
  );
}

// ─── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col" style={{
      background: T.inputBg, border: `1px solid ${T.inputBorder}`,
      borderRadius: 8, padding: "8px 10px",
    }}>
      <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.10em",
        textTransform: "uppercase", color: T.textMut }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "ui-monospace, monospace",
        color: T.textPri, marginTop: 3 }}>{value}</span>
    </div>
  );
}

// ─── Config / Input panel ──────────────────────────────────────────────────────
function ConfigPanel({ input, setInput, onGenerate, isGenerating }: {
  input: LayoutInput;
  setInput: (fn: (prev: LayoutInput) => LayoutInput) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const wFt = mToFt(input.plotWidth);
  const dFt = mToFt(input.plotDepth);

  return (
    <div className="flex flex-col gap-0 flex-1 overflow-y-auto" style={{ padding: "20px 16px" }}>
      <SectionHead icon={Compass} label="Plot Dimensions" />
      <div className="grid grid-cols-2 gap-2 mb-4">
        <DimInput label="Width" valueFt={wFt} minFt={14} maxFt={200}
          onChange={ft => setInput(p => ({ ...p, plotWidth: ftToM(ft) }))} />
        <DimInput label="Depth" valueFt={dFt} minFt={20} maxFt={300}
          onChange={ft => setInput(p => ({ ...p, plotDepth: ftToM(ft) }))} />
      </div>

      <div className="mb-4">
        <label style={{
          fontSize: 9, fontWeight: 600, letterSpacing: "0.10em",
          textTransform: "uppercase", color: T.textSec, display: "block", marginBottom: 8,
        }}>Road Facing</label>
        <CompassPicker value={input.facingDirection}
          onChange={v => setInput(p => ({ ...p, facingDirection: v as any }))} />
      </div>

      <div className="mb-4">
        <label style={{
          fontSize: 9, fontWeight: 600, letterSpacing: "0.10em",
          textTransform: "uppercase", color: T.textSec, display: "block", marginBottom: 8,
        }}>Number of Floors</label>
        <FloorPills value={input.floors}
          onChange={v => setInput(p => ({ ...p, floors: v }))} />
      </div>

      <Divider />
      <SectionHead icon={BedDouble} label="Room Programme" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.10em",
            textTransform: "uppercase", color: T.textSec, display: "block", marginBottom: 6 }}>
            Bedrooms
          </label>
          <Stepper value={input.bedrooms} min={0} max={10}
            onChange={v => setInput(p => ({ ...p, bedrooms: v }))} />
        </div>
        <div>
          <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.10em",
            textTransform: "uppercase", color: T.textSec, display: "block", marginBottom: 6 }}>
            Bathrooms
          </label>
          <Stepper value={input.bathrooms} min={0} max={12}
            onChange={v => setInput(p => ({ ...p, bathrooms: v }))} />
        </div>
      </div>

      <Divider />
      <SectionHead icon={Layers3} label="Features" />

      <div className="flex flex-col gap-1 mb-4">
        <FeatureRow icon={Car} label="Covered Parking" checked={input.hasParking}
          onChange={v => setInput(p => ({ ...p, hasParking: v }))} />
        <FeatureRow icon={ArrowUp} label="Staircase" checked={input.hasStaircase}
          onChange={v => setInput(p => ({ ...p, hasStaircase: v }))} />
        <FeatureRow icon={Building2} label="Balcony" checked={input.hasBalcony}
          onChange={v => setInput(p => ({ ...p, hasBalcony: v }))} />
        <FeatureRow icon={Compass} label="Vastu Compliant" checked={input.vastuCompliant}
          onChange={v => setInput(p => ({ ...p, vastuCompliant: v }))} />
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 rounded-xl transition-all"
        style={{
          height: 44, marginTop: 4,
          background: `linear-gradient(135deg, #c87838 0%, #a05820 100%)`,
          border: "1px solid rgba(200,120,56,0.40)",
          color: "#fff", fontSize: 13, fontWeight: 700,
          letterSpacing: "0.06em",
          opacity: isGenerating ? 0.7 : 1,
        }}
      >
        {isGenerating ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <Building2 size={14} />
        )}
        {isGenerating ? "GENERATING…" : "GENERATE PLAN"}
      </button>
    </div>
  );
}

// ─── Toolbar button ────────────────────────────────────────────────────────────
function ToolBtn({
  icon: Icon, label, onClick, active, danger,
}: {
  icon: React.ElementType; label: string; onClick: () => void;
  active?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex flex-col items-center gap-0.5 rounded-lg transition-all"
      style={{
        padding: "6px 10px", minWidth: 52,
        background: active ? "rgba(200,120,56,0.14)" : "transparent",
        border: `1px solid ${active ? "rgba(200,120,56,0.35)" : "transparent"}`,
        color: danger ? "#d04040" : active ? "#c87838" : "#4A3A28",
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(100,80,50,0.08)";
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <Icon size={15} />
      <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.05em",
        textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

// ─── Floor tab ────────────────────────────────────────────────────────────────
function FloorTab({ floor, active, label, onClick }: {
  floor: number; active: boolean; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 rounded-md transition-all text-sm font-semibold"
      style={{
        background: active ? "#2C2218" : "transparent",
        border: `1px solid ${active ? "rgba(200,120,56,0.40)" : "rgba(100,80,50,0.15)"}`,
        color: active ? "#c87838" : "#7A6A58",
        fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
        fontFamily: "'Courier New', monospace",
      }}
    >
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HousePlannerPage() {
  const [input, setInput]         = useState<LayoutInput>(DEFAULT_INPUT);
  const [layout, setLayout]       = useState<LayoutOutput | null>(null);
  const [errors, setErrors]       = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [sidebarOpen, setSidebarOpen]   = useState(true);

  // Zoom & pan state
  const [zoom, setZoom]   = useState(1);
  const [pan,  setPan]    = useState({ x: 0, y: 0 });
  const isPanning         = useRef(false);
  const lastMouse         = useRef({ x: 0, y: 0 });
  const viewerRef         = useRef<HTMLDivElement>(null);
  const svgRef            = useRef<SVGSVGElement>(null);
  const [exporting, setExporting] = useState(false);

  const numFloors = useMemo(() => {
    if (!layout) return input.floors;
    return Math.max(...layout.rooms.map(r => r.floor)) + 1;
  }, [layout, input.floors]);

  const floorList = useMemo(
    () => Array.from({ length: numFloors }, (_, i) => i),
    [numFloors],
  );

  // Auto-fit on new layout or sidebar toggle
  const fitToScreen = useCallback(() => {
    const viewer = viewerRef.current;
    const svg    = svgRef.current;
    if (!viewer || !svg) return;
    const vw = viewer.clientWidth;
    const vh = viewer.clientHeight;
    const sw = svg.width.baseVal.value;
    const sh = svg.height.baseVal.value;
    const newZoom = Math.min((vw - 32) / sw, (vh - 32) / sh, 1.5);
    setZoom(newZoom);
    setPan({ x: (vw - sw * newZoom) / 2, y: (vh - sh * newZoom) / 2 });
  }, []);

  useLayoutEffect(() => {
    if (layout) {
      const t = setTimeout(fitToScreen, 80);
      return () => clearTimeout(t);
    }
  }, [layout, fitToScreen]);

  useEffect(() => {
    if (layout) {
      const t = setTimeout(fitToScreen, 80);
      return () => clearTimeout(t);
    }
  }, [sidebarOpen, fitToScreen, layout]);

  const generate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      const result = generateLayout(input);
      if (result.success) {
        setLayout(result.output);
        setErrors([]);
        setCurrentFloor(0);
      } else {
        setErrors(result.errors.map(e => e.message));
        setLayout(null);
      }
      setGenerating(false);
    }, 30);
  }, [input]);

  // Auto-generate on first load
  useEffect(() => { generate(); }, []);

  // Zoom wheel handler (zoom toward cursor)
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const viewer = viewerRef.current!;
    const rect   = viewer.getBoundingClientRect();
    const mx     = e.clientX - rect.left;
    const my     = e.clientY - rect.top;
    setZoom(z => {
      const nz = Math.max(0.2, Math.min(8, z * factor));
      setPan(p => ({
        x: mx - (mx - p.x) * (nz / z),
        y: my - (my - p.y) * (nz / z),
      }));
      return nz;
    });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const handleExport = useCallback(async (type: "png" | "svg" | "pdf") => {
    if (!svgRef.current || exporting) return;
    const name = `floor-plan-${floorName(currentFloor).toLowerCase().replace(/ /g, "-")}`;
    setExporting(true);
    try {
      if (type === "svg")  exportSVG(svgRef.current, `${name}.svg`);
      if (type === "pdf")  exportPDF(svgRef.current, floorName(currentFloor));
      if (type === "png")  await exportPNG(svgRef.current, `${name}.png`, 2);
    } finally {
      setExporting(false);
    }
  }, [currentFloor, exporting]);

  // Summary stats
  const stats = useMemo(() => {
    if (!layout) return null;
    const floorRooms = layout.rooms.filter(r => r.floor === currentFloor);
    const builtUp = floorRooms.reduce((s, r) => s + r.area, 0);
    return {
      rooms:   floorRooms.length,
      builtUp: `${toSqft(builtUp)} sq ft`,
      vastu:   `${layout.metadata.vastuScore}%`,
    };
  }, [layout, currentFloor]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#1A1410", fontFamily: "'Courier New', monospace" }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: sidebarOpen ? 260 : 0,
        flexShrink: 0,
        transition: "width 0.25s ease",
        overflow: "hidden",
        background: T.bg,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <div className="flex items-center gap-2">
            <Building2 size={16} style={{ color: T.accent }} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.10em",
              color: T.textPri }}>FLOOR PLAN</span>
            <span style={{ fontSize: 9, color: T.textMut, marginLeft: 2 }}>GEN</span>
          </div>
          <p style={{ fontSize: 9, color: T.textMut, marginTop: 4, letterSpacing: "0.06em" }}>
            2D ARCHITECTURAL PLAN
          </p>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-3 gap-1.5" style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}>
            <StatChip label="Rooms" value={String(stats.rooms)} />
            <StatChip label="Built-up" value={stats.builtUp} />
            <StatChip label="Vastu" value={stats.vastu} />
          </div>
        )}

        {/* Config */}
        <ConfigPanel
          input={input} setInput={setInput}
          onGenerate={generate} isGenerating={generating}
        />
      </div>

      {/* ── Main canvas area ──────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Toolbar */}
        <div style={{
          height: 52, flexShrink: 0,
          background: "#F2EDE4",
          borderBottom: "1px solid #C4B090",
          display: "flex", alignItems: "center",
          padding: "0 12px", gap: 4,
        }}>
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(s => !s)}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="flex items-center justify-center rounded-lg mr-2 transition-all"
            style={{
              width: 32, height: 32, flexShrink: 0,
              background: "transparent",
              border: "1px solid transparent",
              color: "#6A5A48",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(100,80,50,0.10)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: "#C4B090", marginRight: 4 }} />

          {/* Floor tabs */}
          {layout && (
            <div className="flex items-center gap-1 mr-4">
              <span style={{ fontSize: 9, fontWeight: 600, color: "#9A8A78",
                letterSpacing: "0.10em", textTransform: "uppercase", marginRight: 4 }}>Floor</span>
              {floorList.map(f => (
                <FloorTab
                  key={f} floor={f} active={currentFloor === f}
                  label={f === 0 ? "GF" : `F${f}`}
                  onClick={() => {
                    setCurrentFloor(f);
                    setTimeout(fitToScreen, 80);
                  }}
                />
              ))}
            </div>
          )}

          {/* Divider */}
          {layout && <div style={{ width: 1, height: 28, background: "#C4B090", marginRight: 4 }} />}

          {/* Zoom controls */}
          <ToolBtn icon={ZoomOut} label="Zoom Out" onClick={() => setZoom(z => Math.max(0.2, z / 1.2))} />
          <div style={{
            fontSize: 11, fontWeight: 700, color: "#4A3A28",
            fontFamily: "ui-monospace, monospace", width: 44, textAlign: "center",
          }}>
            {Math.round(zoom * 100)}%
          </div>
          <ToolBtn icon={ZoomIn} label="Zoom In" onClick={() => setZoom(z => Math.min(8, z * 1.2))} />
          <ToolBtn icon={Maximize2} label="Fit" onClick={fitToScreen} />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: "#C4B090", marginRight: 4 }} />

          {/* Export */}
          {layout && (
            <>
              <ToolBtn icon={FileImage} label="PNG"
                onClick={() => handleExport("png")} />
              <ToolBtn icon={FileCode} label="SVG"
                onClick={() => handleExport("svg")} />
              <ToolBtn icon={Printer} label="PDF / Print"
                onClick={() => handleExport("pdf")} />
            </>
          )}
        </div>

        {/* Canvas viewer */}
        <div
          ref={viewerRef}
          className="flex-1 overflow-hidden relative"
          style={{
            background: "#2A2218",
            backgroundImage: "radial-gradient(circle, rgba(80,60,40,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            cursor: isPanning.current ? "grabbing" : "grab",
          }}
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* Empty state */}
          {!layout && !generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Building2 size={48} style={{ color: "rgba(200,150,80,0.30)" }} />
              <p style={{ color: "rgba(200,180,140,0.50)", fontSize: 13,
                fontFamily: "ui-monospace, monospace", letterSpacing: "0.10em" }}>
                {errors.length > 0 ? "ERRORS — SEE SIDEBAR" : "CONFIGURE & GENERATE"}
              </p>
            </div>
          )}

          {/* Generating spinner */}
          {generating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw size={32} className="animate-spin" style={{ color: "rgba(200,150,80,0.50)" }} />
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && !generating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
              <AlertTriangle size={32} style={{ color: "#c06030" }} />
              <div className="flex flex-col gap-2">
                {errors.map((err, i) => (
                  <div key={i} style={{
                    background: "rgba(60,20,10,0.90)",
                    border: "1px solid rgba(180,80,40,0.40)",
                    color: "#d09070", fontSize: 11.5, borderRadius: 8,
                    padding: "8px 14px", maxWidth: 480,
                    fontFamily: "ui-monospace, monospace",
                  }}>
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SVG floor plan */}
          {layout && !generating && (
            <div style={{
              position: "absolute",
              transformOrigin: "0 0",
              transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
              transition: isPanning.current ? "none" : undefined,
              filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.50))",
            }}>
              <FloorPlanSVG
                ref={svgRef}
                layout={layout}
                floor={currentFloor}
                plotWidth={input.plotWidth}
                plotDepth={input.plotDepth}
                facing={input.facingDirection}
                title={`${mToFt(input.plotWidth)}′ × ${mToFt(input.plotDepth)}′ PLOT — ${input.bedrooms}BR/${input.bathrooms}BA`}
              />
            </div>
          )}

          {/* Status bar (bottom) */}
          {layout && (
            <div style={{
              position: "absolute", bottom: 12, left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(20,14,8,0.80)",
              border: "1px solid rgba(100,80,50,0.40)",
              borderRadius: 20, padding: "4px 14px",
              display: "flex", alignItems: "center", gap: 12,
              backdropFilter: "blur(6px)",
            }}>
              <span style={{ fontSize: 10, color: "rgba(200,180,140,0.70)",
                fontFamily: "ui-monospace, monospace", letterSpacing: "0.08em" }}>
                {floorName(currentFloor)}
              </span>
              <span style={{ width: 1, height: 10, background: "rgba(100,80,50,0.40)" }} />
              <span style={{ fontSize: 10, color: "rgba(200,180,140,0.50)",
                fontFamily: "ui-monospace, monospace" }}>
                Scroll to zoom · Drag to pan
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
