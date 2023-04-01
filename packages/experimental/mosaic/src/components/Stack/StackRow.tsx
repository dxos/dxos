//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import React, { FC, ForwardedRef, forwardRef, ReactNode } from 'react';

import { getSize, mx } from '@dxos/react-components';

export type StackRowSlots = {
  root?: {
    className?: string;
  };
};

export type StackRowProps = {
  dragging?: boolean;
  children?: ReactNode;
  DragHandle?: ReactNode;
  ContextMenu?: ReactNode;
  style?: any;
  slots?: StackRowSlots;
};

// TODO(burdon): Rename StackSection.
export const StackRow = forwardRef(
  (
    { children, DragHandle, ContextMenu, dragging, style, slots = {} }: StackRowProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={mx('group flex overflow-hidden mx-6 md:mx-0', slots?.root?.className, dragging && 'relative z-10')}
      >
        <div className={mx('md:flex invisible shrink-0 w-24 text-gray-400')}>
          <div className={mx('flex group-hover:visible ml-6 -mt-0.5')}>
            <div className='w-8'>{!dragging && ContextMenu}</div>
            {DragHandle}
          </div>
        </div>

        <div className='flex flex-col flex-1 overflow-hidden mr-2 md:mr-16'>{children}</div>
      </div>
    );
  }
);

export const SortableStackRow: FC<StackRowProps & { id: string }> = ({ id, ...rest }) => {
  // https://docs.dndkit.com/presets/sortable/usesortable
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  const DragHandle = (
    <div className='p-1 cursor-pointer'>
      <button {...attributes} {...listeners}>
        <DotsSixVertical className={getSize(6)} />
      </button>
    </div>
  );

  return (
    <StackRow
      ref={setNodeRef}
      dragging={isDragging}
      style={{ transform: CSS.Transform.toString(t), transition }}
      DragHandle={DragHandle}
      {...rest}
    />
  );
};
