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
      'data-[mosaic-placeholder-orientation=vertical]:snap-start', // TODO(burdon): Option.
      'data-[mosaic-placeholder-orientation=vertical]:py-1',
      'data-[mosaic-placeholder-orientation=vertical]:data-[mosaic-placeholder-state=active]:py-2.5',
      'data-[mosaic-placeholder-orientation=horizontal]:px-1',
      'data-[mosaic-placeholder-orientation=horizontal]:data-[mosaic-placeholder-state=active]:px-2.5',
    ],
    content: [
      'transition-all duration-0',
      // TODO(burdon): Don't animate open if placeholder is the source.
      // TODO(burdon): Flickers when start to drag since source is removed and then the placeholder shows up.
      //  - Use absolute positioning?
      // 'group-data-[mosaic-placeholder-state=active]:duration-200',
      'group-data-[mosaic-placeholder-orientation=vertical]:block-0',
      'group-data-[mosaic-placeholder-orientation=vertical]:group-data-[mosaic-placeholder-state=active]:block-[var(--mosaic-placeholder-height)]',
      'group-data-[mosaic-placeholder-orientation=horizontal]:inline-0',
      'group-data-[mosaic-placeholder-orientation=horizontal]:group-data-[mosaic-placeholder-state=active]:inline-[var(--mosaic-placeholder-width)]',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
