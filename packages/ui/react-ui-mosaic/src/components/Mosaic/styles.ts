//
// Copyright 2026 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui';

export const styles = {
  placeholder: {
    root: [
      'group opacity-0',
      'group-data-[mosaic-debug="true"]:opacity-100',
      'group-data-[mosaic-debug="true"]:bg-orange-500',
      'data-[mosaic-placeholder-state=active]:opacity-100',
      'data-[mosaic-placeholder-axis=vertical]:plb-1',
      'data-[mosaic-placeholder-axis=vertical]:data-[mosaic-placeholder-state=active]:plb-2.5',
      'data-[mosaic-placeholder-axis=horizontal]:pli-1',
      'data-[mosaic-placeholder-axis=horizontal]:data-[mosaic-placeholder-state=active]:pli-2.5',
    ],
    content: [
      'transition-all duration-0',
      // TODO(burdon): Don't animate open if placeholder is the source.
      // TODO(burdon): Flickers when start to drag since source is removed and then the placeholder shows up.
      //  - Use absolute positioning?
      // 'group-data-[mosaic-placeholder-state=active]:duration-200',
      'group-data-[mosaic-placeholder-axis=vertical]:bs-0',
      'group-data-[mosaic-placeholder-axis=horizontal]:is-0',
      'group-data-[mosaic-placeholder-axis=vertical]:group-data-[mosaic-placeholder-state=active]:bs-[var(--mosaic-placeholder-height)]',
      'group-data-[mosaic-placeholder-axis=horizontal]:group-data-[mosaic-placeholder-state=active]:is-[var(--mosaic-placeholder-width)]',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
