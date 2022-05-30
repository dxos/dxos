//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { DNDTypes } from './DragAndDropTypes';
import { DraggableItem, DraggableItemDef } from './DraggableItem';
import { DroppableContainer } from './DroppableContainer';

interface DroppableListProps {
  id: string
  title: string
  accept: DNDTypes
  items: DraggableItemDef[]
  onDrop: (dropTargetId: string, dragItemId: string, index?: number) => void
  moveItem?: (dragIndex: number, hoverIndex: number) => void
}

export const DroppableList = ({
  id,
  accept,
  items,
  onDrop,
  moveItem
}: DroppableListProps) => {

  return (
    <DroppableContainer
      id={id}
      accept={accept}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: 2,
        overflowY: 'scroll',
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: '5px'
      }}
    >
      {items.map((item, i) => (
        <DraggableItem
          key={item.id}
          item={item}
          type={accept}
          onDrop={onDrop}
          index={i}
          moveItem={moveItem}
        />
      ))}
    </DroppableContainer>
  );
};
