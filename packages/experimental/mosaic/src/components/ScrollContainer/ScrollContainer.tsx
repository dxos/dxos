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
  viewport?: {
    className?: string;
  };
  scrollbar?: {
    className?: string;
  };
  thumb?: {
    className?: string;
  };
};

// TODO(burdon): System colors.
// TODO(burdon): Is this right? Merge?
export const defaultSlots: ScrollContainerSlots = {
  scrollbar: {
    className: 'bg-neutral-100 hover:bg-neutral-200'
  },
  thumb: {
    className: 'bg-neutral-500'
  }
};

export const defaultRoundedSlots: ScrollContainerSlots = {
  scrollbar: {
    className: 'w-3 p-[2px] bg-neutral-100 hover:bg-neutral-200'
  },
  thumb: {
    className:
      'rounded-[10px] bg-neutral-500 before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]'
  }
};

export type ScrollContainerProps = {
  slots?: ScrollContainerSlots;
  children?: ReactNode;
};

// TODO(burdon): Currently vertical only (NOTE: Require TW 3.2 for data-attribute variants per radix demo).
export const ScrollContainer = ({ slots = defaultSlots, children }: ScrollContainerProps) => {
  return (
    <ScrollArea.Root className={mx('flex w-full overflow-hidden', slots.root?.className)}>
      <ScrollArea.Viewport className={mx('w-full h-full', slots.viewport?.className)}>{children}</ScrollArea.Viewport>
      {/* TODO(burdon): Handle horizontal scrolling. */}
      <ScrollArea.Scrollbar
        className={mx(
          'flex w-1 select-none touch-none transition-colors duration-[160ms] ease-out',
          slots.scrollbar?.className
        )}
      >
        <ScrollArea.Thumb className={mx("flex-1 relative before:block before:content-['']", slots.thumb?.className)} />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
};
