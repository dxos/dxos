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

export const StackSectionContainer: FC<StackRowProps & { section: any }> = ({ section, ...rest }) => {
  // https://docs.dndkit.com/presets/sortable/usesortable
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({ id: section.id });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  const DragHandle = (
    <button {...attributes} {...listeners}>
      <DotsSixVertical className={getSize(6)} />
    </button>
  );

  return (
    <StackRow
      ref={setNodeRef}
      section={section}
      dragging={isDragging}
      style={{ transform: CSS.Transform.toString(t), transition }}
      DragHandle={DragHandle}
      {...rest}
    />
  );
};

// TODO(burdon): Option to show menu.
// TODO(burdon): Hack to provide fake drop target to prevent flickering bug when dragging to the bottom of the list.
export const StackFooter: FC<{ id: string; ContextMenu?: FC<{ section?: any }> }> = ({ id, ContextMenu }) => {
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  return (
    <StackRow ref={setNodeRef} style={{ transform: CSS.Transform.toString(t), transition }} ContextMenu={ContextMenu}>
      <div className='h-[50vh]' />
    </StackRow>
  );
};
