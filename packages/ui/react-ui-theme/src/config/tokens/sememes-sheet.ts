//
// Copyright 2024 DXOS.org
//

import { surfaceCadence } from './sememes-system';
import type { ColorSememes } from './types';

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
  gridHeader: {
    light: ['neutral', 25],
    dark: ['neutral', 750],
  },
  gridLine: {
    light: ['neutral', surfaceCadence.light[4]],
    dark: ['neutral', surfaceCadence.dark[3]],
  },
  gridOverlay: {
    light: ['primary', '500/.5'],
    dark: ['primary', '500/.5'],
  },
  gridSelectionOverlay: {
    light: ['primary', '500/.2'],
    dark: ['primary', '500/.2'],
  },
  gridCommented: {
    light: ['emerald', '500/.12'],
    dark: ['emerald', '500/.12'],
  },
  gridCommentedActive: {
    light: ['emerald', '500/.24'],
    dark: ['emerald', '500/.24'],
  },
  gridHighlight: {
    light: ['amber', '200/.2'],
    dark: ['amber', '200/.2'],
  },
} satisfies ColorSememes;
