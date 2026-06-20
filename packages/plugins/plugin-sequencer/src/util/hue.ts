//
// Copyright 2026 DXOS.org
//

import { getHashHue, hues } from '@dxos/ui-theme';

// Tailwind v3 -500 shades for each ChromaticPalette value. The grid canvas
// renders via `ctx.fillStyle` and so needs a hex; the design-system class
// tokens (e.g. `bg-fuchsia-bg`) only work in CSS. -500 is the canonical
// mid-tone for each hue and matches the visual weight of the original
// hand-picked plugin palette.
const HUE_HEX: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
};

const FALLBACK_HEX = HUE_HEX.blue;

/**
 * Resolve a design-system hue (one of {@link hues}) to a concrete hex color
 * suitable for canvas painting. Unknown hues fall back to the blue -500.
 */
export const hueToHex = (hue: string | undefined): string => {
  if (!hue) {
    return FALLBACK_HEX;
  }
  return HUE_HEX[hue] ?? FALLBACK_HEX;
};

/**
 * Pick a hue from the design system palette by zero-based index (round-robin).
 * Useful when assigning a default color to a new track.
 */
export const hueAtIndex = (index: number): string => {
  return hues[((index % hues.length) + hues.length) % hues.length];
};

export const ALL_HUES = hues;

/**
 * Resolve the visible hue for a track: prefer the track's explicit
 * `hue`, falling back to a stable hash of its `id` so a track without
 * a configured color gets a deterministic random-looking color that
 * doesn't change across renders.
 */
export const hueFor = (track: { id?: string; hue?: string } | undefined): string => {
  if (track?.hue) {
    return track.hue;
  }
  const hashed = getHashHue(track?.id);
  // `getHashHue` can return 'neutral' when given an undefined id — that
  // isn't a ChromaticPalette value, so fall back to the first hue in
  // that edge case rather than rendering neutral grey.
  return hashed === 'neutral' ? hues[0] : hashed;
};
