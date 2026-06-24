"use client";

import { useCallback } from "react";
import { generateLayout } from "@/lib/layoutEngine";
import type { LayoutInput, LayoutOutput } from "@/lib/layoutEngine";

export type { LayoutInput, LayoutOutput };

export function useLayoutEngine() {
  const generate = useCallback(
    (input: LayoutInput): ReturnType<typeof generateLayout> => {
      return generateLayout(input);
    },
    []
  );

  return { generate };
}
