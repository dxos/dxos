//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { CSSProperties } from 'react';

import { ListItem, ListItemDef } from './ListItem';

export type DraggableListItemDef = ListItemDef

interface DraggableListItemProps {
  item: ListItemDef
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
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    cursor: 'pointer',
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <ListItem
        item={item}
        style={{
          opacity: isDragging ? 0.5 : 1,
          ...customStyles
        }}
      />
    </div>
  );
};
