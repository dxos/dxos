//
// Copyright 2024 DXOS.org
//

import type { ColorAliases, ColorSememes } from './types';

export const sheetSememes = {
  // NOTE: background styles for the main content area must have transparency otherwise they will mask the selection.
  axisSurface: {
    light: ['neutral', 50],
    dark: ['neutral', 800],
  },
  axisText: {
    light: ['neutral', 800],
    dark: ['neutral', 200],
  },
  axisSelectedSurface: {
    light: ['neutral', 100],
    dark: ['neutral', 900],
  },
  axisSelectedText: {
    light: ['neutral', 100],
    dark: ['neutral', 900],
  },
  gridCell: {
    // TODO(thure): Why override only dark?
    light: ['neutral', '50/0'],
    dark: ['neutral', 850],
  },
  gridCellSelected: {
    // TODO(thure): Can this not just use `attention`?
    light: ['neutral', 50],
    dark: ['neutral', 800],
  },
  gridOverlay: {
    light: ['primary', '500/.5'],
    dark: ['primary', '500/.5'],
  },
  gridSelectionOverlay: {
    light: ['primary', '500/.2'],
    dark: ['primary', '500/.2'],
  },
  gridHighlight: {
    light: ['emerald', '500/.5'],
    dark: ['emerald', '500/.5'],
  },
  // TODO(burdon): Factor out def (in common with editor).
  gridCommented: {
    light: ['green', 200],
    dark: ['green', 600],
  },
  gridCommentedActive: {
    light: ['green', '200/.5'],
    dark: ['green', '600/.5'],
  },
} satisfies ColorSememes;

export const sheetAliases = {
  activeSurface: { root: ['gridLine'] },
  accentFocusIndicator: { root: ['gridFocusIndicatorColor'] },
  neutralFocusIndicator: { gridFocusStack: ['gridFocusIndicatorColor'] },
} satisfies ColorAliases;
