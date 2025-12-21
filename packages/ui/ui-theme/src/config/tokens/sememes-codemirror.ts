//
// Copyright 2024 DXOS.org
//

import { type ColorSememes } from './types';

export const codemirrorSememes = {
  // NOTE: background styles for the main content area must have transparency otherwise they will mask the selection.
  cmCodeblock: {
    light: ['neutral', '500/.1'],
    dark: ['neutral', '500/.1'],
  },
  cmActiveLine: {
    light: ['neutral', '200/.5'],
    dark: ['neutral', '800/.5'],
  },
  cmSeparator: {
    light: ['primary', 500],
    dark: ['primary', 500],
  },
  cmCursor: {
    light: ['neutral', 900],
    dark: ['neutral', 100],
  },
  cmSelection: {
    light: ['primary', '400/.5'],
    dark: ['primary', '600/.5'],
  },
  cmFocusedSelection: {
    light: ['primary', 400],
    dark: ['primary', 600],
  },
  cmHighlight: {
    light: ['neutral', 950],
    dark: ['neutral', 50],
  },
  cmHighlightSurface: {
    light: ['sky', 200],
    dark: ['cyan', 600],
  },
  // TODO(burdon): Factor out defs in common with sheet.
  cmCommentText: {
    light: ['neutral', 50],
    dark: ['neutral', 950],
  },
  cmCommentSurface: {
    light: ['amber', 700],
    dark: ['amber', 200],
  },
} satisfies ColorSememes;
