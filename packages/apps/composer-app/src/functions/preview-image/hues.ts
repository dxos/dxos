//
// Copyright 2026 DXOS.org
//

import { type ChromaticPalette, type NeutralPalette } from '@dxos/ui-types';

export type Swatch = { tint: string; fill: string; ink: string };

const SWATCHES: Record<ChromaticPalette | NeutralPalette, Swatch> = {
  amber: { tint: '#fef3c7', fill: '#f59e0b', ink: '#b45309' },
  blue: { tint: '#dbeafe', fill: '#3b82f6', ink: '#1d4ed8' },
  cyan: { tint: '#cffafe', fill: '#06b6d4', ink: '#0e7490' },
  emerald: { tint: '#d1fae5', fill: '#10b981', ink: '#047857' },
  fuchsia: { tint: '#fae8ff', fill: '#d946ef', ink: '#a21caf' },
  green: { tint: '#dcfce7', fill: '#22c55e', ink: '#15803d' },
  indigo: { tint: '#e0e7ff', fill: '#6366f1', ink: '#4338ca' },
  lime: { tint: '#ecfccb', fill: '#84cc16', ink: '#4d7c0f' },
  neutral: { tint: '#f5f5f5', fill: '#a3a3a3', ink: '#404040' },
  orange: { tint: '#ffedd5', fill: '#f97316', ink: '#c2410c' },
  pink: { tint: '#fce7f3', fill: '#ec4899', ink: '#be185d' },
  purple: { tint: '#f3e8ff', fill: '#a855f7', ink: '#7e22ce' },
  red: { tint: '#fee2e2', fill: '#ef4444', ink: '#b91c1c' },
  rose: { tint: '#ffe4e6', fill: '#f43f5e', ink: '#be123c' },
  sky: { tint: '#e0f2fe', fill: '#0ea5e9', ink: '#0369a1' },
  teal: { tint: '#ccfbf1', fill: '#14b8a6', ink: '#0f766e' },
  violet: { tint: '#ede9fe', fill: '#8b5cf6', ink: '#6d28d9' },
  yellow: { tint: '#fef9c3', fill: '#eab308', ink: '#a16207' },
};

const ROTATION: ChromaticPalette[] = ['indigo', 'teal', 'amber', 'rose', 'sky', 'lime'];

const hasSwatch = (hue: string | undefined): hue is keyof typeof SWATCHES =>
  hue !== undefined && Object.hasOwn(SWATCHES, hue);

export const swatch = (hue: string | undefined, index?: number): Swatch =>
  hasSwatch(hue) ? SWATCHES[hue] : index === undefined ? SWATCHES.neutral : SWATCHES[ROTATION[index % ROTATION.length]];
