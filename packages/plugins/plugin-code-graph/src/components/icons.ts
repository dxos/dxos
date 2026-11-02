//
// Copyright 2026 DXOS.org
//

import { type CodeGraph } from '#types';

/** The icon for each kind of box. */
export const KIND_ICONS: Record<CodeGraph.NodeKind, string> = {
  package: 'ph--package--regular',
  file: 'ph--file-ts--regular',
  symbol: 'ph--brackets-curly--regular',
  module: 'ph--cube--regular',
  spec: 'ph--file-text--regular',
  other: 'ph--circle--regular',
};
