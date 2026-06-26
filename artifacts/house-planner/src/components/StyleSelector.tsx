import { memo } from "react";
import type { ArchStyle } from "@/lib/houseStyle";
import { ARCH_STYLES } from "@/lib/houseStyle";
import { useStyleStore } from "@/store/styleStore";

const T = {
  bg:           "#0b1207",
  glass:        "rgba(12, 20, 7, 0.82)",
  glassBright:  "rgba(16, 26, 10, 0.90)",
  border:       "rgba(78, 118, 46, 0.18)",
  accent:       "#c87838",
  accentDim:    "rgba(200, 120, 56, 0.14)",
  accentBorder: "rgba(200, 120, 56, 0.32)",
  green:        "#80b850",
  greenDim:     "rgba(128, 184, 80, 0.14)",
  greenBorder:  "rgba(128, 184, 80, 0.28)",
  textPri:      "#dcd8c2",
  textSec:      "#88966a",
  textMut:      "#50604a",
  textHead:     "#a0bc78",
  inputBg:      "rgba(6, 12, 4, 0.70)",
  inputBorder:  "rgba(68, 108, 36, 0.28)",
} as const;

const STYLE_ICONS: Record<ArchStyle, React.ReactNode> = {
  "modern-minimal": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="10" width="20" height="11" rx="1"/>
      <path d="M2 10h20"/>
      <line x1="7" y1="10" x2="7" y2="21"/>
      <line x1="14" y1="10" x2="14" y2="21"/>
      <rect x="9" y="14" width="6" height="7"/>
    </svg>
  ),
  "luxury-villa": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21V10l9-7 9 7v11H3z"/>
      <line x1="9" y1="21" x2="9" y2="14"/>
      <line x1="15" y1="21" x2="15" y2="14"/>
      <rect x="9" y="14" width="6" height="7"/>
      <line x1="3" y1="14" x2="21" y2="14"/>
    </svg>
  ),
  "traditional-indian": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 14l10-8 10 8"/>
      <path d="M4 14v7h16v-7"/>
      <path d="M9 21v-7h6v7"/>
      <line x1="2" y1="14" x2="22" y2="14"/>
    </svg>
  ),
};

const STYLES: ArchStyle[] = ["modern-minimal", "luxury-villa", "traditional-indian"];

export const StyleSelector = memo(function StyleSelector() {
  const { selectedStyle: value, setStyle: onChange } = useStyleStore();
  return (
    <div className="flex flex-col gap-1.5">
      {STYLES.map((key) => {
        const def = ARCH_STYLES[key];
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{
              background: active ? T.accentDim : T.inputBg,
              border: `1px solid ${active ? T.accentBorder : T.inputBorder}`,
              color: active ? T.accent : T.textSec,
            }}
            onMouseEnter={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = T.glassBright;
                (e.currentTarget as HTMLElement).style.borderColor = T.border;
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = T.inputBg;
                (e.currentTarget as HTMLElement).style.borderColor = T.inputBorder;
              }
            }}
          >
            <div
              className="shrink-0 mt-0.5 flex items-center justify-center rounded-lg"
              style={{
                width: 30, height: 30,
                background: active ? "rgba(200,120,56,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? T.accentBorder : T.border}`,
                color: active ? T.accent : T.textMut,
              }}
            >
              {STYLE_ICONS[key]}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{
                fontSize: 12, fontWeight: 700,
                color: active ? T.accent : T.textPri,
                marginBottom: 2,
              }}>
                {def.name}
              </div>
              <div style={{
                fontSize: 9, color: active ? "rgba(200,120,56,0.75)" : T.textMut,
                lineHeight: 1.4,
              }}>
                {def.tagline}
              </div>
            </div>
            {active && (
              <div
                className="shrink-0 mt-1 rounded-full"
                style={{
                  width: 6, height: 6,
                  background: T.accent,
                  boxShadow: "0 0 6px rgba(200,120,56,0.70)",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});
