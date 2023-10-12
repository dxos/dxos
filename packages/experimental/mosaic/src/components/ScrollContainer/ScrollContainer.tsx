//
// Copyright 2023 DXOS.org
//

import * as ScrollArea from '@radix-ui/react-scroll-area';
import React, { type ReactNode } from 'react';

import { mx } from '@dxos/aurora-theme';

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
    className: 'bg-neutral-50 hover:bg-neutral-100',
  },
  thumb: {
    className: 'bg-neutral-400',
  },
};

export const defaultRoundedSlots: ScrollContainerSlots = {
  scrollbar: {
    className: 'w-3 p-[2px] bg-neutral-100 hover:bg-neutral-200',
  },
  thumb: {
    className:
      'rounded-[10px] bg-neutral-500 before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]',
  },
};

export type ScrollContainerProps = {
  slots?: ScrollContainerSlots;
  vertical?: boolean;
  horizontal?: boolean;
  children?: ReactNode;
};

// TODO(burdon): Cannot reverse list.
// TODO(burdon): Currently vertical only (NOTE: Require TW 3.2 for data-attribute variants per radix demo).

/**
 * https://www.radix-ui.com/docs/primitives/components/scroll-area
 */
export const ScrollContainer = ({
  slots = defaultSlots,
  vertical = false,
  horizontal = false,
  children,
}: ScrollContainerProps) => {
  // TODO(burdon): Outer div required since doesn't work if external div has flex-col.
  return (
    <div className='flex flex-1 overflow-hidden'>
      <ScrollArea.Root className={mx('flex flex-1 overflow-hidden', slots.root?.className)}>
        <ScrollArea.Viewport className={mx('w-full h-full', slots.viewport?.className)}>{children}</ScrollArea.Viewport>
        {vertical && (
          <ScrollArea.Scrollbar
            orientation='vertical'
            className={mx(
              'flex w-1 select-none touch-none transition-colors duration-[160ms] ease-out',
              slots.scrollbar?.className,
            )}
          >
            <ScrollArea.Thumb
              className={mx("flex-1 relative before:block before:content-['']", slots.thumb?.className)}
            />
          </ScrollArea.Scrollbar>
        )}

        {/* TODO(burdon): Incorrect range. */}
        {horizontal && (
          <ScrollArea.Scrollbar
            orientation='horizontal'
            className={mx(
              'flex h-1 select-none touch-none transition-colors duration-[160ms] ease-out',
              slots.scrollbar?.className,
            )}
          >
            <ScrollArea.Thumb
              className={mx("flex-1 relative before:block before:content-['']", slots.thumb?.className)}
            />
          </ScrollArea.Scrollbar>
        )}
      </ScrollArea.Root>
    </div>
  );
};
