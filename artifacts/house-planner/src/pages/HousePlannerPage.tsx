import { useState, useCallback, useMemo, lazy, Suspense, useRef, useEffect } from "react";
import { generateLayout } from "@/lib/layoutEngine";
import type { LayoutInput, LayoutOutput } from "@/lib/layoutEngine";
import { build3dScene } from "@/lib/geometryEngine3d";
import FloorPlanCanvas from "@/components/FloorPlanCanvas";
import { StyleSelector } from "@/components/StyleSelector";
import { useStyleStore } from "@/store/styleStore";

// ─── Lucide icons (tree-shakeable) ───────────────────────────────────────────
import {
  Building2, RefreshCw, AlertTriangle,
  ChevronRight, Box, Grid3X3, PanelLeftClose, PanelLeftOpen,
  BedDouble, Bath, Car, Compass, LayoutDashboard, Layers3,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Minus, Plus, CheckCircle2, X,
} from "lucide-react";

// ─── Unit helpers ─────────────────────────────────────────────────────────────
const FT_TO_M   = 0.3048;
const M_TO_FT   = 3.28084;
const M2_TO_SQFT = 10.7639;
const ftToM  = (ft: number) => ft * FT_TO_M;
const mToFt  = (m: number)  => Math.round(m * M_TO_FT);
const toSqft = (m2: number) => Math.round(m2 * M2_TO_SQFT).toLocaleString();

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:           "#0b1207",
  bgDeep:       "#070e04",
  glass:        "rgba(12, 20, 7, 0.82)",
  glassBright:  "rgba(16, 26, 10, 0.90)",
  border:       "rgba(78, 118, 46, 0.18)",
  borderHover:  "rgba(100, 148, 60, 0.32)",
  accent:       "#c87838",
  accentDim:    "rgba(200, 120, 56, 0.14)",
  accentBorder: "rgba(200, 120, 56, 0.32)",
  green:        "#80b850",
  greenDim:     "rgba(128, 184, 80, 0.14)",
  textPri:      "#dcd8c2",
  textSec:      "#88966a",
  textMut:      "#50604a",
  textHead:     "#a0bc78",
  inputBg:      "rgba(6, 12, 4, 0.70)",
  inputBorder:  "rgba(68, 108, 36, 0.28)",
} as const;

// ─── Room palette ─────────────────────────────────────────────────────────────
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
  bathroom: "Bath", toilet: "WC", balcony: "Balcony",
  parking: "Parking", staircase: "Stairs", foyer: "Foyer",
  pooja: "Pooja", utility: "Utility", passage: "Passage", terrace: "Terrace",
};

const DEFAULT_INPUT: LayoutInput = {
  plotWidth: ftToM(30), plotDepth: ftToM(40),
  facingDirection: "N", floors: 2, bedrooms: 3, bathrooms: 3,
  hasBalcony: true, hasParking: true, hasStaircase: true, vastuCompliant: true,
};

type ViewMode = "2d" | "3d";

// ─── Primitive control components ─────────────────────────────────────────────

/** Section heading in the left panel */
function SectionHead({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={11} style={{ color: T.textSec }} />
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: T.textHead,
      }}>
        {label}
      </span>
    </div>
  );
}

/** Thin divider between sections */
function Divider() {
  return <div style={{ height: 1, background: T.border, margin: "18px 0" }} />;
}

/** Stepper: integer +/− */
function Stepper({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0" style={{
      background: T.inputBg, border: `1px solid ${T.inputBorder}`,
      borderRadius: 8, overflow: "hidden",
    }}>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex items-center justify-center transition-colors"
        style={{ width: 32, height: 32, color: T.textSec }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.glassBright; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Minus size={12} />
      </button>
      <span style={{
        flex: 1, textAlign: "center", fontSize: 14, fontWeight: 600,
        fontFamily: "ui-monospace, monospace", color: T.textPri, lineHeight: "32px",
      }}>
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex items-center justify-center transition-colors"
        style={{ width: 32, height: 32, color: T.textSec }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.glassBright; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

/** Dimension input: feet typed directly */
function DimInput({
  label, valueFt, minFt, maxFt, onChange,
}: { label: string; valueFt: number; minFt: number; maxFt: number; onChange: (ft: number) => void }) {
  const [raw, setRaw] = useState(String(valueFt));
  useEffect(() => setRaw(String(valueFt)), [valueFt]);

  return (
    <div>
      <label style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.10em",
        textTransform: "uppercase", color: T.textSec, display: "block", marginBottom: 6 }}>
        {label}
      </label>
      <div className="flex items-center gap-0" style={{
        background: T.inputBg, border: `1px solid ${T.inputBorder}`,
        borderRadius: 8, overflow: "hidden",
      }}>
        <button
          onClick={() => onChange(Math.max(minFt, valueFt - 1))}
          className="flex items-center justify-center"
          style={{ width: 28, height: 34, color: T.textSec, flexShrink: 0 }}
        ><Minus size={11} /></button>
        <input
          type="number" min={minFt} max={maxFt}
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={() => {
            const ft = Math.round(Math.max(minFt, Math.min(maxFt, parseFloat(raw) || minFt)));
            setRaw(String(ft));
            onChange(ft);
          }}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            textAlign: "center", fontSize: 13, fontWeight: 600,
            fontFamily: "ui-monospace, monospace", color: T.textPri,
            height: 34, minWidth: 0,
          }}
        />
        <span style={{ fontSize: 10, color: T.textMut, paddingRight: 10, flexShrink: 0 }}>ft</span>
      </div>
    </div>
  );
}

/** Compass direction picker: N/E/S/W pill grid */
function CompassPicker({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const DIRS = [
    { d: "N", icon: ArrowUp,    label: "North" },
    { d: "E", icon: ArrowRight, label: "East"  },
    { d: "S", icon: ArrowDown,  label: "South" },
    { d: "W", icon: ArrowLeft,  label: "West"  },
  ];
  return (
    <div className="grid grid-cols-4 gap-1">
      {DIRS.map(({ d, icon: Icon, label }) => {
        const active = value === d;
        return (
          <button
            key={d}
            title={label}
            onClick={() => onChange(d)}
            className="flex flex-col items-center gap-1 py-2 rounded-lg transition-all"
            style={{
              background: active ? T.accentDim : T.inputBg,
              border: `1px solid ${active ? T.accentBorder : T.inputBorder}`,
              color: active ? T.accent : T.textSec,
            }}
          >
            <Icon size={12} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em" }}>{d}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Floor count pill row */
function FloorPills({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map(n => {
        const active = value === n;
        return (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
            style={{
              background: active ? T.accentDim : T.inputBg,
              border: `1px solid ${active ? T.accentBorder : T.inputBorder}`,
              color: active ? T.accent : T.textSec,
              fontSize: 11,
            }}
          >
            G{n > 1 ? `+${n-1}` : ""}
          </button>
        );
      })}
    </div>
  );
}

/** Feature toggle row */
function FeatureRow({
  icon: Icon, label, checked, onChange,
}: { icon: React.ElementType; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      className="flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition-all"
      style={{
        background: checked ? T.greenDim : "transparent",
        border: `1px solid ${checked ? "rgba(128,184,80,0.18)" : "transparent"}`,
      }}
      onClick={() => onChange(!checked)}
    >
      <div className="flex items-center gap-2.5">
        <Icon size={12} style={{ color: checked ? T.green : T.textMut }} />
        <span style={{ fontSize: 12, color: checked ? T.textPri : T.textSec }}>{label}</span>
      </div>
      {/* Custom toggle */}
      <div
        className="relative transition-all"
        style={{
          width: 34, height: 18, borderRadius: 9,
          background: checked ? "rgba(128,184,80,0.50)" : T.inputBg,
          border: `1px solid ${checked ? "rgba(128,184,80,0.40)" : T.inputBorder}`,
        }}
      >
        <div
          className="absolute top-0.5 transition-all"
          style={{
            width: 14, height: 14, borderRadius: "50%",
            background: checked ? T.green : T.textMut,
            left: checked ? 17 : 2,
          }}
        />
      </div>
    </div>
  );
}

// ─── Config panel content ─────────────────────────────────────────────────────
function ConfigPanel({
  input, setInput, onGenerate,
}: {
  input: LayoutInput;
  setInput: React.Dispatch<React.SetStateAction<LayoutInput>>;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Scrollable controls */}
      <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: "none" }}>

        {/* Plot */}
        <SectionHead icon={LayoutDashboard} label="Plot Size" />
        <div className="grid grid-cols-2 gap-2">
          <DimInput
            label="Width" valueFt={mToFt(input.plotWidth)} minFt={10} maxFt={200}
            onChange={ft => setInput(p => ({ ...p, plotWidth: ftToM(ft) }))}
          />
          <DimInput
            label="Depth" valueFt={mToFt(input.plotDepth)} minFt={15} maxFt={300}
            onChange={ft => setInput(p => ({ ...p, plotDepth: ftToM(ft) }))}
          />
        </div>

        <Divider />

        {/* Orientation */}
        <SectionHead icon={Compass} label="Facing Direction" />
        <CompassPicker
          value={input.facingDirection}
          onChange={v => setInput(p => ({ ...p, facingDirection: v as LayoutInput["facingDirection"] }))}
        />

        <Divider />

        {/* Floors */}
        <SectionHead icon={Layers3} label="Floors" />
        <FloorPills value={input.floors} onChange={v => setInput(p => ({ ...p, floors: v }))} />

        <Divider />

        {/* Rooms */}
        <SectionHead icon={BedDouble} label="Rooms" />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BedDouble size={12} style={{ color: T.textSec }} />
              <span style={{ fontSize: 12, color: T.textSec }}>Bedrooms</span>
            </div>
            <Stepper value={input.bedrooms} min={0} max={10}
              onChange={v => setInput(p => ({ ...p, bedrooms: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bath size={12} style={{ color: T.textSec }} />
              <span style={{ fontSize: 12, color: T.textSec }}>Bathrooms</span>
            </div>
            <Stepper value={input.bathrooms} min={0} max={12}
              onChange={v => setInput(p => ({ ...p, bathrooms: v }))} />
          </div>
        </div>

        <Divider />

        {/* Features */}
        <SectionHead icon={Grid3X3} label="Features" />
        <div className="space-y-1">
          <FeatureRow icon={LayoutDashboard} label="Balcony"        checked={input.hasBalcony}     onChange={v => setInput(p => ({ ...p, hasBalcony: v }))} />
          <FeatureRow icon={Car}             label="Covered Parking" checked={input.hasParking}     onChange={v => setInput(p => ({ ...p, hasParking: v }))} />
          <FeatureRow icon={Layers3}         label="Staircase"       checked={input.hasStaircase}   onChange={v => setInput(p => ({ ...p, hasStaircase: v }))} />
          <FeatureRow icon={Compass}         label="Vastu Compliant" checked={input.vastuCompliant} onChange={v => setInput(p => ({ ...p, vastuCompliant: v }))} />
        </div>
      </div>

      {/* ── House Style selector ── */}
      <Divider />
      <SectionHead icon={Building2} label="Architectural Style" />
      <StyleSelector />

      {/* Generate button */}
      <div className="p-4 shrink-0" style={{ borderTop: `1px solid ${T.border}` }}>
        <button
          onClick={onGenerate}
          className="w-full flex items-center justify-center gap-2.5 transition-all"
          style={{
            height: 42, borderRadius: 10, background: T.accent,
            color: "#fff8ee", fontWeight: 700, fontSize: 13,
            letterSpacing: "0.04em", border: "none",
            boxShadow: "0 2px 16px rgba(200,120,56,0.30)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "#d98840";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(200,120,56,0.45)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = T.accent;
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(200,120,56,0.30)";
          }}
        >
          <RefreshCw size={14} />
          Generate Layout
        </button>
      </div>
    </div>
  );
}

// ─── Lazy 3D viewer ───────────────────────────────────────────────────────────
const ThreeViewer = lazy(() => import("@/components/ThreeViewer"));

// ─── Stat row for summary panel ───────────────────────────────────────────────
function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span style={{ fontSize: 10, color: T.textMut, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 700,
        fontFamily: "ui-monospace, monospace",
        color: highlight ? T.green : T.textPri,
      }}>{value}</span>
    </div>
  );
}

// ─── Dot-grid background pattern ─────────────────────────────────────────────
const DOT_GRID = `radial-gradient(circle, rgba(78,118,46,0.18) 1px, transparent 1px)`;

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HousePlannerPage() {
  const [input, setInput]       = useState<LayoutInput>(DEFAULT_INPUT);
  const [result, setResult]     = useState<{ success: true; output: LayoutOutput } | null>(null);
  const [errors, setErrors]     = useState<Array<{ field: string; message: string }>>([]);
  const [activeFloor, setActiveFloor] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("2d");
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobilePanel, setMobilePanel] = useState(false);
  const { selectedStyle } = useStyleStore();

  const generate = useCallback(() => {
    const out = generateLayout(input);
    if (out.success) {
      setResult(out); setErrors([]);
      setActiveFloor(0); setSelectedRoomId(null);
    } else {
      setErrors(out.errors); setResult(null);
    }
    setHasGenerated(true);
    setMobilePanel(false);
  }, [input]);

  const scene3d = useMemo(() => {
    if (!result) return null;
    return build3dScene(result.output, input);
  }, [result, input]);

  const floorTabs = Array.from({ length: input.floors }, (_, i) => i);
  const floorLabel = (i: number) =>
    i === 0 ? "Ground" : i === 1 ? "First" : i === 2 ? "Second" : `F${i}`;

  // ── Glass panel style helper ────────────────────────────────────────────────
  const glassPanel = {
    background: T.glass,
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: `1px solid ${T.border}`,
    boxShadow: "0 8px 40px rgba(0,0,0,0.50), inset 0 1px 0 rgba(130,200,80,0.06)",
  } as React.CSSProperties;

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: T.bg, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <header
        className="shrink-0 flex items-center gap-3 px-4 py-0"
        style={{
          height: 48,
          background: T.glassBright,
          borderBottom: `1px solid ${T.border}`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Logo mark */}
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "rgba(200,120,56,0.16)",
            border: `1px solid rgba(200,120,56,0.28)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={14} style={{ color: T.accent }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.textPri, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
              AI House Planner
            </div>
            <div style={{ fontSize: 9, color: T.textMut, letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1 }}>
              Premium Floor Plan Engine
            </div>
          </div>
        </div>

        {/* Desktop panel toggle */}
        <button
          onClick={() => setPanelOpen(v => !v)}
          className="hidden md:flex items-center gap-1.5 transition-all ml-2"
          style={{
            height: 28, paddingInline: 10, borderRadius: 6,
            background: panelOpen ? T.accentDim : "transparent",
            border: `1px solid ${panelOpen ? T.accentBorder : T.border}`,
            color: panelOpen ? T.accent : T.textSec, fontSize: 11, fontWeight: 600,
          }}
          title="Toggle configuration panel"
        >
          {panelOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
          <span className="hidden lg:block">{panelOpen ? "Hide Panel" : "Configure"}</span>
        </button>

        {/* Caption */}
        <span className="ml-auto text-[10px] hidden lg:block" style={{ color: T.textMut, letterSpacing: "0.08em" }}>
          Vastu-aware · Deterministic · SVG/PNG export
        </span>

        {/* Mobile config button */}
        <button
          className="md:hidden ml-auto flex items-center gap-1.5"
          onClick={() => setMobilePanel(true)}
          style={{
            height: 30, paddingInline: 12, borderRadius: 8,
            background: T.accentDim, border: `1px solid ${T.accentBorder}`,
            color: T.accent, fontSize: 11, fontWeight: 600,
          }}
        >
          <LayoutDashboard size={13} /> Configure
        </button>
      </header>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">

        {/* ── Left configuration panel (desktop) ───────────────────────── */}
        <aside
          className="hidden md:flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            width: panelOpen ? 264 : 0,
            borderRight: panelOpen ? `1px solid ${T.border}` : "none",
            background: T.glassBright,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            overflow: "hidden",
          }}
        >
          <div style={{ width: 264, height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Panel header */}
            <div className="px-5 py-4 shrink-0 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.textSec }}>
                Configuration
              </span>
            </div>
            <ConfigPanel input={input} setInput={setInput} onGenerate={generate} />
          </div>
        </aside>

        {/* ── Canvas / main area ─────────────────────────────────────────── */}
        <main
          className="flex-1 flex flex-col overflow-hidden min-w-0 relative"
          style={{
            background: T.bg,
            backgroundImage: DOT_GRID,
            backgroundSize: "28px 28px",
          }}
        >
          {/* ── Floating top toolbar (appears after generate) ──────────── */}
          {hasGenerated && result && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-1.5 py-1.5"
              style={{ ...glassPanel, borderRadius: 14 }}
            >
              {/* 2D / 3D toggle */}
              {([
                { m: "2d" as ViewMode, icon: Grid3X3, label: "2D Plan" },
                { m: "3d" as ViewMode, icon: Box,      label: "3D View" },
              ]).map(({ m, icon: Icon, label }) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className="flex items-center gap-1.5 transition-all"
                  style={{
                    height: 30, paddingInline: 14, borderRadius: 10,
                    background: viewMode === m ? T.accentDim : "transparent",
                    border: `1px solid ${viewMode === m ? T.accentBorder : "transparent"}`,
                    color: viewMode === m ? T.accent : T.textSec,
                    fontSize: 11, fontWeight: 600,
                  }}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}

              {/* Floor tabs — 2D only */}
              {viewMode === "2d" && floorTabs.length > 1 && (
                <>
                  <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
                  {floorTabs.map(i => (
                    <button
                      key={i}
                      onClick={() => setActiveFloor(i)}
                      className="transition-all"
                      style={{
                        height: 30, paddingInline: 12, borderRadius: 10,
                        background: activeFloor === i ? "rgba(160,188,120,0.14)" : "transparent",
                        border: `1px solid ${activeFloor === i ? "rgba(160,188,120,0.30)" : "transparent"}`,
                        color: activeFloor === i ? T.textHead : T.textSec,
                        fontSize: 11, fontWeight: 600,
                      }}
                    >
                      {floorLabel(i)}
                    </button>
                  ))}
                </>
              )}

              {/* Separator + Reconfigure button */}
              <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
              <button
                onClick={() => { setHasGenerated(false); setResult(null); setErrors([]); }}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  height: 30, paddingInline: 12, borderRadius: 10,
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.textSec, fontSize: 11, fontWeight: 600,
                }}
              >
                <RefreshCw size={11} />
                Reconfigure
              </button>
            </div>
          )}

          {/* ── Canvas content ─────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center">

            {/* Pre-generate welcome */}
            {!hasGenerated && (
              <div className="flex flex-col items-center text-center px-8 max-w-sm w-full">
                <div style={{
                  width: 68, height: 68, borderRadius: 20,
                  background: "rgba(200,120,56,0.10)",
                  border: `1px solid rgba(200,120,56,0.22)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20,
                  boxShadow: "0 0 40px rgba(200,120,56,0.10)",
                }}>
                  <Building2 size={30} style={{ color: T.accent }} />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: T.textPri, letterSpacing: "-0.02em", marginBottom: 10 }}>
                  Ready to Plan
                </h2>
                <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.7, marginBottom: 28 }}>
                  Configure your plot parameters, then generate a complete architectural model with 2D floor plans and a photorealistic 3D view.
                </p>
                <button
                  onClick={generate}
                  className="flex items-center justify-center gap-2.5 transition-all"
                  style={{
                    width: "100%", maxWidth: 260, height: 44, borderRadius: 12,
                    background: T.accent, color: "#fff8ee",
                    fontWeight: 700, fontSize: 13, letterSpacing: "0.04em",
                    border: "none", boxShadow: "0 4px 24px rgba(200,120,56,0.35)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#d98840"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = T.accent; }}
                >
                  <RefreshCw size={15} /> Generate My Layout
                </button>
              </div>
            )}

            {/* Errors */}
            {hasGenerated && errors.length > 0 && (
              <div
                className="max-w-md w-full mx-4 p-5 rounded-2xl"
                style={{
                  background: "rgba(180,50,30,0.10)",
                  border: "1px solid rgba(180,50,30,0.28)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <AlertTriangle size={15} style={{ color: "#e05030" }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e05030" }}>Cannot Generate Layout</span>
                </div>
                <div className="space-y-2">
                  {errors.map((e, i) => (
                    <div key={i} className="flex gap-2 items-start" style={{ fontSize: 12, color: "#c08070" }}>
                      <ChevronRight size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                      {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2D Floor plan */}
            {result && viewMode === "2d" && (
              <div className="p-4 sm:p-6 w-full h-full flex items-start justify-center pt-16">
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
            )}

            {/* 3D View */}
            {result && viewMode === "3d" && scene3d && (
              <div className="w-full h-full" style={{ minHeight: 320 }}>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-full gap-3"
                    style={{ color: T.textSec, fontSize: 13 }}>
                    <RefreshCw size={14} className="animate-spin" />
                    Loading 3D engine…
                  </div>
                }>
                  <ThreeViewer scene={scene3d} styleName={selectedStyle} />
                </Suspense>
              </div>
            )}
          </div>
        </main>

        {/* ── Right summary panel (desktop, after generation) ──────────── */}
        {result && (
          <aside
            className="hidden lg:flex flex-col shrink-0 overflow-hidden"
            style={{
              width: 216,
              borderLeft: `1px solid ${T.border}`,
              background: T.glassBright,
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Panel header */}
            <div className="px-4 py-4 shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: T.textSec }}>
                Analysis
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "none" }}>

              {/* Metrics */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: T.textHead, marginBottom: 8 }}>
                  Metrics
                </div>
                <div style={{ borderTop: `1px solid ${T.border}` }}>
                  <StatRow label="Built-up Area" value={`${toSqft(result.output.metadata.totalBuiltUpArea)} sqft`} />
                  <StatRow label="Plot Coverage" value={`${(result.output.metadata.plotCoverageRatio * 100).toFixed(1)}%`} />
                  <StatRow label="Plot" value={`${mToFt(input.plotWidth)}′ × ${mToFt(input.plotDepth)}′`} />
                  <StatRow label="Total Rooms" value={`${result.output.rooms.length}`} />
                  <StatRow label="Openings" value={`${result.output.doors.length}D · ${result.output.windows.length}W`} />
                  {scene3d && <StatRow label="3D Meshes" value={`${scene3d.meshes.length}`} />}
                  {result.output.metadata.vastuScore >= 0 && (
                    <StatRow
                      label="Vastu Score"
                      value={`${result.output.metadata.vastuScore}/100`}
                      highlight={result.output.metadata.vastuScore >= 70}
                    />
                  )}
                </div>
              </div>

              {/* Vastu badge */}
              {result.output.metadata.vastuScore >= 70 && (
                <div
                  className="flex items-center gap-2 p-2.5 rounded-xl mb-4"
                  style={{ background: T.greenDim, border: `1px solid rgba(128,184,80,0.22)` }}
                >
                  <CheckCircle2 size={13} style={{ color: T.green, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: T.textHead, fontWeight: 600 }}>
                    Vastu Compliant
                  </span>
                </div>
              )}

              {/* Room list */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                  textTransform: "uppercase", color: T.textHead, marginBottom: 8 }}>
                  {viewMode === "3d" ? "All Rooms" : `${floorLabel(activeFloor)} Floor`}
                </div>
                <div className="space-y-0.5">
                  {result.output.rooms
                    .filter(r => viewMode === "3d" || r.floor === activeFloor)
                    .map(room => {
                      const active = selectedRoomId === room.id;
                      return (
                        <button
                          key={room.id}
                          onClick={() => setSelectedRoomId(active ? null : room.id)}
                          className="w-full text-left flex items-center gap-2 py-1.5 px-2.5 rounded-lg transition-all"
                          style={{
                            background: active ? T.accentDim : "transparent",
                            border: `1px solid ${active ? T.accentBorder : "transparent"}`,
                          }}
                        >
                          <div style={{
                            width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                            background: ROOM_COLORS[room.type] ?? "#f1f5f9",
                          }} />
                          <span style={{ fontSize: 11, color: active ? T.accent : T.textSec, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {ROOM_LABELS[room.type] ?? room.type}
                          </span>
                          <span style={{ fontSize: 10, color: T.textMut, fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>
                            {Math.round(room.area * 10.764)}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ══ MOBILE DRAWER ═══════════════════════════════════════════════════ */}
      {mobilePanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(4px)" }}
            onClick={() => setMobilePanel(false)}
          />
          {/* Drawer */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              ...glassPanel,
              borderRadius: "20px 20px 0 0",
              maxHeight: "88vh",
              border: `1px solid ${T.border}`,
              borderBottom: "none",
            }}
          >
            {/* Drawer handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
            </div>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: T.textPri, letterSpacing: "-0.01em" }}>
                Configure Layout
              </span>
              <button
                onClick={() => setMobilePanel(false)}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: T.glassBright, border: `1px solid ${T.border}`,
                  color: T.textSec, display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ConfigPanel input={input} setInput={setInput} onGenerate={generate} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
