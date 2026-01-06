//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

// TODO(burdon): Adopt this pattern across packages.
export const styles = {
  cell: {
    root: [
      'outline-none border border-separator focus:border-accentSurface',
      'data-[mosaic-cell-state=target]:border-neutralFocusIndicator',
      'data-[mosaic-cell-state=preview]:bg-groupSurface',
      'data-[mosaic-cell-state=dragging]:opacity-20',
    ],
  },
  placeholder: {
    root: [
      'group is-full',
      'transition-all plb-1 opacity-0 delay-0 duration-0',
      'data-[mosaic-placeholder-state=active]:plb-2.5',
      'data-[mosaic-placeholder-state=active]:opacity-100',
      'data-[mosaic-placeholder-state=active]:delay-300',
    ],
    content: [
      'is-full',
      'transition-all bs-0 delay-0 duration-0',
      'group-data-[mosaic-placeholder-state=active]:bs-[var(--mosaic-placeholder-height)]',
      'group-data-[mosaic-placeholder-state=active]:delay-300',
      'group-data-[mosaic-placeholder-state=active]:duration-100',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
