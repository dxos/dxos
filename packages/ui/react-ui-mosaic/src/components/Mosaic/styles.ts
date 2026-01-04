//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles: Record<string, Record<string, ClassNameValue>> = {
  container: {
    active: '[&:has(>_[data-mosaic-container-state=active])]:border-primary-500',
  },
  cell: {
    border:
      'outline-none border border-separator focus:border-accentSurface data-[mosaic-cell-state=target]:border-neutralFocusIndicator',
    dragging: 'data-[mosaic-cell-state=dragging]:opacity-20 data-[mosaic-cell-state=preview]:bg-groupSurface',
  },
  placeholder: {
    active: [
      'group transition-all opacity-0 plb-0.5 bs-2 duration-100 delay-0',
      'data-[mosaic-placeholder-state=active]:opacity-100',
      'data-[mosaic-placeholder-state=active]:plb-1',
      'data-[mosaic-placeholder-state=active]:bs-16',
      'data-[mosaic-placeholder-state=active]:duration-250',
      'data-[mosaic-placeholder-state=active]:delay-300',
    ],
  },
};
