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
      // Placeholders open instantly (`duration-0`). The source slot is reserved on drag start by
      // activating its placeholder (see Stack.tsx), so the stack no longer collapses/flickers when the
      // dragged item is removed. NOTE: if the open animation below is ever enabled, exempt the source
      // placeholder — animating its reserved gap from 0 would reintroduce the start-of-drag flicker.
      // 'group-data-[mosaic-placeholder-state=active]:duration-200',
      'group-data-[mosaic-placeholder-orientation=vertical]:h-0',
      'group-data-[mosaic-placeholder-orientation=vertical]:group-data-[mosaic-placeholder-state=active]:h-[var(--mosaic-placeholder-height)]',
      'group-data-[mosaic-placeholder-orientation=horizontal]:w-0',
      'group-data-[mosaic-placeholder-orientation=horizontal]:group-data-[mosaic-placeholder-state=active]:w-[var(--mosaic-placeholder-width)]',
    ],
  },
} satisfies Record<string, Record<string, ClassNameValue>>;
