//
// Copyright 2026 DXOS.org
//

import { type Breakpoint, useBreakpoints } from './useBreakpoints';

export type DeckPresentation = 'fullbleed' | 'sliding';

/**
 * Presentation is derived, never stored: a singleton active deck renders fullbleed (today's solo
 * look — absolute inset, no resize handle, no horizontal scroll); two or more planks render as a
 * resizable sliding deck. Below the `md` breakpoint the deck is always sliding (full-viewport-width
 * planks with scroll-snap), regardless of plank count, so there is no separate mobile mode to select.
 */
export const getDeckPresentation = (activeCount: number, breakpoint: Breakpoint): DeckPresentation => {
  if (breakpoint === 'mobile') {
    return 'sliding';
  }

  return activeCount === 1 ? 'fullbleed' : 'sliding';
};

export const useDeckPresentation = (activeCount: number): DeckPresentation => {
  const breakpoint = useBreakpoints();
  return getDeckPresentation(activeCount, breakpoint);
};
