//
// Copyright 2022 DXOS.org
//

import React, { FC, ForwardedRef, forwardRef, ReactNode } from 'react';

import { mx } from '@dxos/react-components';

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
  style?: any;
  slots?: StackRowSlots;
};

export const StackRow = forwardRef(
  (
    { section, children, DragHandle, ContextMenu, dragging, style, slots = {} }: StackRowProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <section
        ref={ref}
        style={style}
        className={mx('group flex overflow-hidden mx-6 md:mx-0', slots?.root?.className, dragging && 'relative z-10')}
      >
        <div className={mx('md:flex invisible shrink-0 w-24 h-[32px] items-center')}>
          {!dragging && (
            // TODO(burdon): Don't hide menu when selected.
            // TODO(burdon): Menu popup triggers scrollbar.
            <div className={mx('flex group-hover:visible ml-6 -mt-0.5 text-gray-400')}>
              <div className='flex w-8'>{ContextMenu && <ContextMenu section={section} />}</div>
              <div className='flex w-8'>{DragHandle}</div>
            </div>
          )}
        </div>

        <div className='flex flex-col flex-1 overflow-hidden mr-2 md:mr-16'>{children}</div>
      </section>
    );
  }
);
