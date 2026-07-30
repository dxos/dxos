//
// Copyright 2026 DXOS.org
//

import { type Breakpoint, useBreakpoints } from './useBreakpoints';

export type DeckPresentation = 'fullbleed' | 'tiling' | 'sliding';

// Plank-count boundaries between presentations (desktop only). Exported so the thresholds are easy
// to tune while we experiment with tiling.
export const TILING_MIN = 2;
export const TILING_MAX = 2;

/**
 * Presentation is derived, never stored: a singleton active deck renders fullbleed (solo look —
 * absolute inset, no resize handle, no horizontal scroll); exactly two planks render as a tiling deck
 * (both planks split the viewport width with no horizontal overflow); three or more render as a
 * resizable sliding deck that overflows and scrolls. Below the `md` breakpoint the deck is always
 * sliding (full-viewport-width planks with scroll-snap), regardless of plank count.
 */
export const getDeckPresentation = (activeCount: number, breakpoint: Breakpoint): DeckPresentation => {
  if (breakpoint === 'mobile') {
    return 'sliding';
  }

  if (activeCount === 1) {
    return 'fullbleed';
  }

  return activeCount >= TILING_MIN && activeCount <= TILING_MAX ? 'tiling' : 'sliding';
};

export const useDeckPresentation = (activeCount: number): DeckPresentation => {
  const breakpoint = useBreakpoints();
  return getDeckPresentation(activeCount, breakpoint);
};
