//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { CSSProperties } from 'react';

export type DraggableListItemDef = {
  id: string
  title: string
}

interface DraggableListItemProps {
  item: DraggableListItemDef
  style?: CSSProperties
}

export const DraggableListItem = ({
  item,
  style: customStyles = {}
}: DraggableListItemProps) => {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: item.id });

  const style = {
    ...customStyles,
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        cursor: 'pointer',
        padding: 8,
        ...style
      }}
      {...attributes}
      {...listeners}
    >
      {item.title}
    </div>
  );
};
