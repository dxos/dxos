//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties } from 'react';

import { DNDTypes } from './DragAndDropTypes';
import { DraggableContainerDef } from './DraggableContainer';
import { DraggableItem, DraggableItemDef } from './DraggableItem';
import { DroppableContainer } from './DroppableContainer';

interface DroppableListProps {
  id: string
  title: string
  accept: DNDTypes
  items: DraggableItemDef[]
  onDrop: (dropTargetId: string, item: DraggableContainerDef) => void
  moveItem?: (dropTargetId: string, dragIndex: number, hoverIndex: number) => void
  style?: CSSProperties
}

export const DroppableList = ({
  id,
  accept,
  items,
  onDrop,
  moveItem,
  style = {}
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
        borderRadius: '5px',
        ...style
      }}
    >
      {items.map((item, i) => (
        <DraggableItem
          key={item.id}
          item={item}
          type={accept}
          onDrop={onDrop}
          index={i}
          moveItem={(dragIndex, hoverIndex) => moveItem?.(id, dragIndex, hoverIndex)}
          containerId={id}
        />
      ))}
    </DroppableContainer>
  );
};
