/**
 * houseStyle.ts
 * ─────────────
 * Architectural style definitions for the House Style System.
 *
 * Each style provides:
 *  - Per-role material overrides (merged on top of ThreeViewer defaults)
 *  - Landscape colour hints (boundary wall, gate, ground)
 *  - Sky / environment settings
 *  - Roof type flag (flat | sloped)
 *
 * The layout engine is never touched — only the 3D appearance changes.
 */

import type { MeshRole } from "@/lib/geometryEngine3d";

export type ArchStyle = "modern-minimal" | "luxury-villa" | "traditional-indian";

export interface StyleMatOverride {
  color?: string;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  opacity?: number;
  textureKey?: "concrete" | "concreteDark" | "wood" | "metal" | "glass" | "pavers" | "grass" | "stucco" | "tileSlab";
  normalKey?: "concreteNorm" | "woodNorm" | "noiseNorm";
  roughKey?: "concreteRough" | "metalRough";
}

export interface LandscapeStyle {
  /** Plaster / paint colour for the boundary wall */
  wallColor: string;
  /** Coping strip colour */
  wallCopingColor: string;
  /** Gate iron / steel colour */
  gateColor: string;
  /** Gate metalness (0–1) */
  gateMetal: number;
  /** Driveway / plot floor surface colour */
  groundColor: string;
  /** Vegetation density multiplier (0.0 – 1.5) */
  vegDensity: number;
  /** Show lamp posts */
  showLamps: boolean;
  /** Show flower beds */
  showFlowers: boolean;
  /** Show planter boxes near entrance */
  showPlanters: boolean;
  /** Gate pillar colour */
  pillarColor: string;
  /** Gate pillar cap colour */
  pillarCapColor: string;
}

export interface StyleDef {
  /** Display name */
  name: string;
  /** Short tagline shown in the selector */
  tagline: string;
  /** Per-role material overrides – merged over the viewer's defaults */
  matOverrides: Partial<Record<MeshRole, StyleMatOverride>>;
  /** Landscape appearance hints */
  landscape: LandscapeStyle;
  /** CSS colour for the Three.js canvas background */
  skyColor: string;
  /** CSS colour for scene fog */
  fogColor: string;
  /** Roof geometry type */
  roofType: "flat" | "sloped";
  /** Terracotta / roof tile colour (used when roofType === "sloped") */
  roofTileColor: string;
}

// ─── Style 1 — Modern Minimal ─────────────────────────────────────────────────
const modernMinimal: StyleDef = {
  name: "Modern Minimal",
  tagline: "Flat roof · Clean lines · White & grey exterior",
  matOverrides: {
    "exterior-wall":   { color: "#F2F0EC", roughness: 0.84, metalness: 0, textureKey: "stucco", normalKey: "concreteNorm", envMapIntensity: 0.10 },
    "interior-wall":   { color: "#F8F6F2", roughness: 0.82, metalness: 0, textureKey: "concrete" },
    "floor-slab":      { color: "#DEDAD4", roughness: 0.76, metalness: 0, textureKey: "tileSlab", envMapIntensity: 0.15 },
    "roof-slab":       { color: "#C0BDB8", roughness: 0.90, metalness: 0, textureKey: "concreteDark" },
    "column":          { color: "#EFEDE8", roughness: 0.86, metalness: 0, textureKey: "stucco" },
    "parapet":         { color: "#E8E5E0", roughness: 0.85, metalness: 0, textureKey: "stucco" },
    "balcony-slab":    { color: "#C8C5BE", roughness: 0.84, metalness: 0, textureKey: "concreteDark" },
    "balcony-railing": { color: "#9EA2A6", roughness: 0.12, metalness: 0.90, textureKey: "metal", envMapIntensity: 1.60 },
    "stair-tread":     { color: "#D4D0C8", roughness: 0.80, metalness: 0, textureKey: "tileSlab" },
    "door-frame":      { color: "#888888", roughness: 0.55, metalness: 0.15, textureKey: "metal" },
    "door-panel":      { color: "#D0CCCA", roughness: 0.42, metalness: 0.08, envMapIntensity: 0.30 },
    "door-handle":     { color: "#C8C8C8", roughness: 0.10, metalness: 0.95, textureKey: "metal", envMapIntensity: 2.0 },
    "window-frame":    { color: "#6E7072", roughness: 0.14, metalness: 0.80, textureKey: "metal", envMapIntensity: 1.40 },
    "window-glass":    { color: "#B0D0E0", roughness: 0.02, metalness: 0.12, opacity: 0.15, envMapIntensity: 2.2 },
    "window-sill":     { color: "#E0DDD8", roughness: 0.28, metalness: 0.06, envMapIntensity: 0.20 },
  },
  landscape: {
    wallColor:      "#E8E4DE",
    wallCopingColor:"#D8D4CE",
    gateColor:      "#2A2A2E",
    gateMetal:      0.88,
    groundColor:    "#D4D0CA",
    vegDensity:     0.60,
    showLamps:      true,
    showFlowers:    false,
    showPlanters:   true,
    pillarColor:    "#D8D4CE",
    pillarCapColor: "#ECEAE6",
  },
  skyColor:      "#C4D8EE",
  fogColor:      "#CCE0F4",
  roofType:      "flat",
  roofTileColor: "",
};

// ─── Style 2 — Luxury Villa ───────────────────────────────────────────────────
const luxuryVilla: StyleDef = {
  name: "Luxury Villa",
  tagline: "Stone cladding · Glass railings · Premium entrance",
  matOverrides: {
    "exterior-wall":   { color: "#D8CEB8", roughness: 0.80, metalness: 0, textureKey: "stucco", normalKey: "concreteNorm", envMapIntensity: 0.14 },
    "interior-wall":   { color: "#F4F0E8", roughness: 0.82, metalness: 0, textureKey: "concrete" },
    "floor-slab":      { color: "#C4BAA8", roughness: 0.72, metalness: 0, textureKey: "tileSlab", envMapIntensity: 0.18 },
    "roof-slab":       { color: "#A8A298", roughness: 0.88, metalness: 0, textureKey: "concreteDark" },
    "column":          { color: "#D0C8B0", roughness: 0.78, metalness: 0, textureKey: "stucco", envMapIntensity: 0.10 },
    "parapet":         { color: "#C8C0A8", roughness: 0.76, metalness: 0, textureKey: "stucco" },
    "balcony-slab":    { color: "#B8B0A0", roughness: 0.80, metalness: 0, textureKey: "concreteDark" },
    "balcony-railing": { color: "#D8DCE0", roughness: 0.06, metalness: 0.92, textureKey: "metal", envMapIntensity: 1.80 },
    "stair-tread":     { color: "#BCBAB0", roughness: 0.70, metalness: 0, textureKey: "tileSlab", envMapIntensity: 0.14 },
    "door-frame":      { color: "#3A1A08", roughness: 0.62, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.18 },
    "door-panel":      { color: "#522810", roughness: 0.50, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.24 },
    "door-handle":     { color: "#C8A030", roughness: 0.10, metalness: 0.96, textureKey: "metal", envMapIntensity: 2.2 },
    "window-frame":    { color: "#B89848", roughness: 0.18, metalness: 0.74, textureKey: "metal", envMapIntensity: 1.60 },
    "window-glass":    { color: "#8ECCD8", roughness: 0.02, metalness: 0.10, opacity: 0.16, envMapIntensity: 2.4 },
    "window-sill":     { color: "#D0C4A8", roughness: 0.28, metalness: 0.06, textureKey: "stucco", envMapIntensity: 0.22 },
  },
  landscape: {
    wallColor:      "#D0C8B2",
    wallCopingColor:"#E0D8C0",
    gateColor:      "#18181E",
    gateMetal:      0.92,
    groundColor:    "#C8C0A8",
    vegDensity:     1.30,
    showLamps:      true,
    showFlowers:    true,
    showPlanters:   true,
    pillarColor:    "#C8C0A8",
    pillarCapColor: "#DDD8C4",
  },
  skyColor:      "#B8CCDE",
  fogColor:      "#C4D8EC",
  roofType:      "flat",
  roofTileColor: "",
};

// ─── Style 3 — Traditional Indian ────────────────────────────────────────────
const traditionalIndian: StyleDef = {
  name: "Traditional Indian",
  tagline: "Sloped roof · Warm colours · Chajjas & decorative details",
  matOverrides: {
    "exterior-wall":   { color: "#C89858", roughness: 0.92, metalness: 0, textureKey: "stucco", normalKey: "concreteNorm", envMapIntensity: 0.06 },
    "interior-wall":   { color: "#F0E8D8", roughness: 0.88, metalness: 0, textureKey: "concrete" },
    "floor-slab":      { color: "#C0A870", roughness: 0.84, metalness: 0, textureKey: "tileSlab", envMapIntensity: 0.10 },
    "roof-slab":       { color: "#A89870", roughness: 0.94, metalness: 0, textureKey: "concreteDark" },
    "column":          { color: "#C09050", roughness: 0.90, metalness: 0, textureKey: "stucco", envMapIntensity: 0.05 },
    "parapet":         { color: "#D0A060", roughness: 0.92, metalness: 0, textureKey: "stucco" },
    "balcony-slab":    { color: "#B09060", roughness: 0.88, metalness: 0, textureKey: "concreteDark" },
    "balcony-railing": { color: "#784820", roughness: 0.70, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.14 },
    "stair-tread":     { color: "#B8985E", roughness: 0.86, metalness: 0, textureKey: "tileSlab", envMapIntensity: 0.08 },
    "door-frame":      { color: "#4A2408", roughness: 0.68, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.16 },
    "door-panel":      { color: "#6A3C18", roughness: 0.58, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.18 },
    "door-handle":     { color: "#C89828", roughness: 0.20, metalness: 0.88, textureKey: "metal", envMapIntensity: 1.60 },
    "window-frame":    { color: "#5C3010", roughness: 0.68, metalness: 0, textureKey: "wood", normalKey: "woodNorm", envMapIntensity: 0.14 },
    "window-glass":    { color: "#A8C8D0", roughness: 0.04, metalness: 0.08, opacity: 0.20, envMapIntensity: 1.80 },
    "window-sill":     { color: "#D4A860", roughness: 0.38, metalness: 0.02, textureKey: "stucco", envMapIntensity: 0.16 },
  },
  landscape: {
    wallColor:      "#C89050",
    wallCopingColor:"#DDA860",
    gateColor:      "#3C2810",
    gateMetal:      0.40,
    groundColor:    "#C4A870",
    vegDensity:     1.10,
    showLamps:      false,
    showFlowers:    true,
    showPlanters:   false,
    pillarColor:    "#C09050",
    pillarCapColor: "#D4A860",
  },
  skyColor:      "#C8C0A8",
  fogColor:      "#D4C8B0",
  roofType:      "sloped",
  roofTileColor: "#963420",
};

// ─── Registry ─────────────────────────────────────────────────────────────────
export const ARCH_STYLES: Record<ArchStyle, StyleDef> = {
  "modern-minimal":    modernMinimal,
  "luxury-villa":      luxuryVilla,
  "traditional-indian": traditionalIndian,
};

export const DEFAULT_STYLE: ArchStyle = "modern-minimal";
