//
// Copyright 2024 DXOS.org
//

import type { HelicalArcValue, SemanticLayer } from '@ch-ui/tokens';

import { callsSememes } from './sememes-calls';
import { codemirrorSememes } from './sememes-codemirror';
import { hueSememes } from './sememes-hue';
import { sheetSememes } from './sememes-sheet';
import { systemSememes } from './sememes-system';

export const semanticColors = {
  conditions: {
    light: [':root'],
    dark: ['.dark'],
  },
  sememes: {
    // Define each set of sememes in its own file.
    ...callsSememes,
    ...codemirrorSememes,
    ...hueSememes,
    ...sheetSememes,
    ...systemSememes,
  },
  namespace: 'dx-',
} satisfies SemanticLayer<string, string, HelicalArcValue>;
