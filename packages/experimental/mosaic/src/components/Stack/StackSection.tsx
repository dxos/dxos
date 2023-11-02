//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { getSize } from '@dxos/react-ui-theme';

import { StackRow, type StackRowProps } from './StackRow';

export const DraggableStackRow: FC<StackRowProps & { section: any }> = ({ section, ...rest }) => {
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
export const StackFooter: FC<StackRowProps & { id: string; ContextMenu?: FC<{ section?: any }> }> = ({
  id,
  ...rest
}) => {
  const { setNodeRef, transform, transition } = useSortable({ id, disabled: true });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  return (
    <StackRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(t), transition }}
      {...rest}
      showControls={true}
    >
      <div className='h-[50vh]' />
    </StackRow>
  );
};
