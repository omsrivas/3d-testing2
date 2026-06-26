import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ArchStyle } from "@/lib/houseStyle";
import { DEFAULT_STYLE } from "@/lib/houseStyle";

interface StyleState {
  selectedStyle: ArchStyle;
  setStyle: (style: ArchStyle) => void;
}

export const useStyleStore = create<StyleState>()(
  persist(
    (set) => ({
      selectedStyle: DEFAULT_STYLE,
      setStyle: (style) => set({ selectedStyle: style }),
    }),
    { name: "house-style-preference" }
  )
);
