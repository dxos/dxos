//
// Copyright 2022 DXOS.org
//

import React, { type FC, type ForwardedRef, forwardRef, type ReactNode } from 'react';

import { mx } from '@dxos/react-ui-theme';

export type StackRowSlots = {
  root?: {
    className?: string;
  };
};

export type StackRowProps = {
  section?: any; // TODO(burdon): Type.
  dragging?: boolean;
  children?: ReactNode;
  DragHandle?: ReactNode;
  ContextMenu?: FC<{ section?: any }>;
  ActionButton?: FC<{ section?: any }>;
  showControls?: boolean;
  style?: any;
  slots?: StackRowSlots;
};

// TODO(burdon): Hide context/drag menu if mobile.
export const StackRow = forwardRef(
  (
    {
      section,
      children,
      DragHandle,
      ContextMenu,
      ActionButton,
      dragging,
      showControls,
      style,
      slots = {},
    }: StackRowProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => {
    return (
      <section
        ref={ref}
        style={style}
        className={mx(
          'group flex overflow-hidden mx-6 md:mx-0',
          slots?.root?.className,
          dragging && 'border-t border-b relative z-10',
        )}
      >
        <div
          className={mx(
            'hidden md:flex shrink-0 w-24 h-[32px] items-center',
            !showControls && 'invisible group-hover:visible',
          )}
        >
          {!dragging && (
            // TODO(burdon): Don't hide menu when selected.
            // TODO(burdon): Menu popup triggers scrollbar.
            <div className={mx('flex ml-4 text-gray-400')}>
              <div className='flex justify-center w-8'>{ContextMenu && <ContextMenu section={section} />}</div>
              <div className='flex justify-center w-8'>{DragHandle}</div>
            </div>
          )}
        </div>

        <div className='flex flex-col grow overflow-hidden'>{children}</div>

        <div
          className={mx(
            'hidden md:flex shrink-0 group-hover:visible w-20 h-[32px] justify-end items-center',
            !showControls && 'invisible',
          )}
        >
          {ActionButton && (
            <div className='flex justify-center mr-2'>
              <ActionButton />
            </div>
          )}
        </div>
      </section>
    );
  },
);
