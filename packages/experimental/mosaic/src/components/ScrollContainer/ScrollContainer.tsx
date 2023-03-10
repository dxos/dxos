//
// Copyright 2023 DXOS.org
//

import * as ScrollArea from '@radix-ui/react-scroll-area';
import React, { ReactNode } from 'react';

import { mx } from '@dxos/react-components';

export type ScrollContainerSlots = {
  root?: {
    className?: string;
  };
  scrollbar?: {
    className?: string;
  };
  thumb?: {
    className?: string;
  };
};

// TODO(burdon): Is this right? Merge?
const defaultSlots: ScrollContainerSlots = {
  root: {
    className: 'bg-white shadow shadow-[0_2px_10px] shadow-gray-200'
  },
  scrollbar: {
    className: 'bg-neutral-100 hover:bg-neutral-200'
  },
  thumb: {
    className: 'bg-neutral-500'
  }
};

export type ScrollContainerProps = {
  slots?: ScrollContainerSlots;
  children?: ReactNode;
};

export const ScrollContainer = ({ slots = defaultSlots, children }: ScrollContainerProps) => {
  return (
    <ScrollArea.Root className={mx('flex w-[200px] h-[300px] rounded overflow-hidden', slots.root?.className)}>
      <ScrollArea.Viewport className={mx('w-full h-full rounded')}>{children}</ScrollArea.Viewport>
      {/* TODO(burdon): Handle horizontal scrolling. */}
      <ScrollArea.Scrollbar
        className={mx(
          'flex select-none touch-none p-0.5',
          slots.scrollbar?.className,
          'transition-colors duration-[160ms] ease-out',
          'w-2.5' // TODO(burdon): Upgrade to 3.2 for data-attribute variants.
        )}
      >
        <ScrollArea.Thumb
          className={mx(
            "flex-1 rounded-[10px] relative before:block before:content-[''] before:absolute before:top-1/2 before:left-1/2" +
              'before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]',
            slots.thumb?.className
          )}
        />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
