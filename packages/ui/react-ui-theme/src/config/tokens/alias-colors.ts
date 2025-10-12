//
// Copyright 2025 DXOS.org
//

import { type AliasLayer } from '@ch-ui/tokens';

import { valenceAliases } from './sememes-hue';
import { sheetAliases } from './sememes-sheet';
import { systemAliases } from './sememes-system';

const groupAliases = ['groupSurface', ...(systemAliases.groupSurface?.root ?? [])];
const modalAliases = ['modalSurface', ...(systemAliases.modalSurface?.root ?? [])];

export const aliasColors = {
  conditions: {
    root: [':root, .dark'],
    group: [
      [
        '.sidebar-surface, .dark .sidebar-surface',
        ...groupAliases.map((alias) => `.bg-${alias}, .dark .bg-${alias}`),
      ].join(', '),
    ],
    modal: [
      [
        '.modal-surface, .dark .modal-surface',
        ...modalAliases.map((alias) => `.bg-${alias}, .dark .bg-${alias}`),
        //
      ].join(', '),
    ],
    gridFocusStack: ['[data-grid-focus-indicator-variant="stack"]'],
  },
  aliases: {
    // TODO(thure): Aliases should be merged more elegantly, this causes overwrites.
    ...sheetAliases,
    ...systemAliases,
    ...valenceAliases,
  },
  namespace: 'dx-',
} satisfies AliasLayer<string>;
