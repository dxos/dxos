//
// Copyright 2024 DXOS.org
//

import type { HelicalArcValue, SemanticLayer } from '@ch-ui/tokens';

import { callsSememes } from './sememes-calls';
import { codeMirrorSememes } from './sememes-codemirror';
import { hueSememes } from './sememes-hue';
import { sheetSememes } from './sememes-sheet';
import { systemSememes } from './sememes-system';

export const semanticColors = {
  conditions: {
    light: [':root'],
    dark: [':root.dark, :root .dark'],
  },
  sememes: {
    // Please define each set of sememes in its own file.
    ...callsSememes,
    ...codeMirrorSememes,
    ...sheetSememes,
    ...hueSememes,
    ...systemSememes,
  },
  namespace: 'dx-',
} satisfies SemanticLayer<string, string, HelicalArcValue>;
