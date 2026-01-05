//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

// TODO(burdon): Adopt this pattern across packages.
export const styles: Record<string, Record<string, ClassNameValue>> = {
  container: {
    border: [
      'outline-none border border-separator rounded-sm focus:border-accentSurface',
      'data-[mosaic-container-state=active]:border-neutralFocusIndicator',
    ],
  },
  cell: {
    border: [
      'outline-none border border-separator focus:border-accentSurface',
      'data-[mosaic-cell-state=target]:border-neutralFocusIndicator',
      'data-[mosaic-cell-state=preview]:bg-groupSurface',
      'data-[mosaic-cell-state=dragging]:opacity-20',
    ],
  },
  placeholder: {
    outer: [
      'group is-full',
      'transition-all plb-1 opacity-0 delay-0 duration-0',
      'data-[mosaic-placeholder-state=active]:plb-2.5',
      'data-[mosaic-placeholder-state=active]:opacity-100',
      'data-[mosaic-placeholder-state=active]:delay-300',
    ],
    inner: [
      'is-full',
      'transition-all bs-0 delay-0 duration-0',
      'group-data-[mosaic-placeholder-state=active]:bs-[var(--mosaic-placeholder-height)]',
      'group-data-[mosaic-placeholder-state=active]:delay-300',
      'group-data-[mosaic-placeholder-state=active]:duration-100',
    ],
  },
};
