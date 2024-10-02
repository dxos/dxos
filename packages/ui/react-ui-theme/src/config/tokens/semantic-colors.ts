//
// Copyright 2024 DXOS.org
//

import type { HelicalArcValue, SemanticLayer } from '@ch-ui/tokens';

import { codeMirrorSememes } from './sememes-codemirror';
import { peerSememes } from './sememes-peer';
import { sheetSememes } from './sememes-sheet';
import { systemSememes } from './sememes-system';

export const semanticColors = {
  conditions: {
    light: [':root'],
    dark: ['.dark'],
  },
  sememes: {
    // Please define each set of sememes in its own file.
    ...sheetSememes,
    ...codeMirrorSememes,
    ...peerSememes,
    ...systemSememes,
  },
  namespace: 'dx-',
} satisfies SemanticLayer<string, string, HelicalArcValue>;
