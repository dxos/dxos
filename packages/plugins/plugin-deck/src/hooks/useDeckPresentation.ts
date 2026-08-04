//
// Copyright 2026 DXOS.org
//

import { type Breakpoint, useBreakpoints } from './useBreakpoints';

export type DeckPresentation = 'fullbleed' | 'sliding';

/**
 * Presentation is derived, never stored: a singleton deck renders fullbleed (solo look — absolute
 * inset, no resize handle, no horizontal scroll), and two or more planks render as a resizable
 * sliding deck that overflows and scrolls, each plank encapsulated in its own container. Below the
 * `md` breakpoint the deck is always sliding (full-viewport-width planks with scroll-snap).
 *
 * Counted in planks, not panes: the companion shares its plank's container rather than taking one of
 * its own, so opening it never changes the presentation — a lone plank and its companion still render
 * fullbleed, the pair filling the viewport across their seam.
 */
export const getDeckPresentation = (plankCount: number, breakpoint: Breakpoint): DeckPresentation =>
  breakpoint !== 'mobile' && plankCount === 1 ? 'fullbleed' : 'sliding';

export const useDeckPresentation = (plankCount: number): DeckPresentation => {
  const breakpoint = useBreakpoints();
  return getDeckPresentation(plankCount, breakpoint);
};
