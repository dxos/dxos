//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import React, { FC, ForwardedRef, forwardRef, ReactNode, useState } from 'react';

import { getSize, mx } from '@dxos/react-components';

import { ContextMenu, ContextMenuItem, ContextMenuProps } from './ContextMenu';

export type StackRowProps = {
  style?: any;
  dragging?: boolean;
  dragAttributes?: any;
  children?: ReactNode;
  Handle?: JSX.Element;
  className?: string;
  showMenu?: boolean;
  items?: ContextMenuItem[];
} & Pick<ContextMenuProps, 'onInsert' | 'onDelete'>;

export const StackRow = forwardRef(
  (
    {
      children,
      Handle,
      dragging,
      style,
      dragAttributes,
      showMenu,
      className,
      items,
      onInsert,
      onDelete
    }: StackRowProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
      <div
        ref={ref}
        style={style}
        className={mx('group flex overflow-hidden mx-6 md:mx-0', dragging && 'relative z-10 bg-zinc-100', className)}
      >
        <div className='md:flex shink-0 w-24 text-gray-400'>
          {showMenu && items && items.length > 0 && (
            <>
              <div className={mx('flex invisible group-hover:visible ml-6 -mt-0.5', menuOpen && 'visible')}>
                <div className='w-8'>
                  {!dragging && (
                    <ContextMenu items={items} onOpenChange={setMenuOpen} onInsert={onInsert} onDelete={onDelete} />
                  )}
                </div>
                {Handle}
              </div>
            </>
          )}
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

  const Handle = (
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
      Handle={Handle}
      style={{ transform: CSS.Transform.toString(t), transition }}
      {...rest}
    />
  );
};
