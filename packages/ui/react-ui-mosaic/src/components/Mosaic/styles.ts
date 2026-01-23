//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  tile: {
    root: [
      'border border-separator',
      'data-[mosaic-tile-state=target]:border-neutralFocusIndicator',
      'data-[mosaic-tile-state=preview]:bg-groupSurface',
      'data-[mosaic-tile-state=dragging]:opacity-20',
    ],
  },
  placeholder: {
    root: [
      'group',
      'transition-all opacity-0 delay-0 duration-0',
      'group-data-[mosaic-debug="true"]:bg-orange-500',
      'group-data-[mosaic-debug="true"]:opacity-100',
      'data-[mosaic-placeholder-state=active]:opacity-100',
      'data-[mosaic-placeholder-axis=vertical]:plb-1',
      'data-[mosaic-placeholder-axis=vertical]:data-[mosaic-placeholder-state=active]:plb-2.5',
      'data-[mosaic-placeholder-axis=horizontal]:pli-1',
      'data-[mosaic-placeholder-axis=horizontal]:data-[mosaic-placeholder-state=active]:pli-2.5',
    ],
    content: [
      'transition-all delay-0 duration-0',
      'group-data-[mosaic-placeholder-state=active]:duration-200',
      'group-data-[mosaic-placeholder-axis=vertical]:group-data-[mosaic-placeholder-state=active]:bs-[var(--mosaic-placeholder-height)]',
      'group-data-[mosaic-placeholder-axis=horizontal]:group-data-[mosaic-placeholder-state=active]:is-[var(--mosaic-placeholder-width)]',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
