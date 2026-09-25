//
// Copyright 2026 DXOS.org
//

import { type ChromaticPalette } from '@dxos/ui-types';

/**
 * Literal colours for the device, which renders our SVG outside the app and so cannot resolve the
 * theme's CSS custom properties. Values track the 400 step of each ramp — the tone the icons use
 * on a dark surface.
 */
const HUE_COLORS: Record<ChromaticPalette, string> = {
  red: '#f87171',
  orange: '#fb923c',
  amber: '#fbbf24',
  yellow: '#facc15',
  lime: '#a3e635',
  green: '#4ade80',
  emerald: '#34d399',
  teal: '#2dd4bf',
  cyan: '#22d3ee',
  sky: '#38bdf8',
  blue: '#60a5fa',
  indigo: '#818cf8',
  violet: '#a78bfa',
  purple: '#c084fc',
  fuchsia: '#e879f9',
  pink: '#f472b6',
  rose: '#fb7185',
};

/** Device-side surface and text tones, matching the dark theme the hardware always displays. */
export const deviceColors = {
  keyBackground: '#16181c',
  keyBorder: '#26292f',
  label: '#e7e9ee',
  muted: '#8b919d',
  accent: '#9aa2b1',
  barTrack: '#2c3038',
} as const;

/** Resolves a chromatic palette name to a literal colour, falling back to the neutral accent. */
export const hueColor = (hue?: string): string => (hue && HUE_COLORS[hue as ChromaticPalette]) || deviceColors.accent;
