//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties } from 'react';

import { DNDTypes } from './DragAndDropTypes';
import { DraggableContainer } from './DraggableContainer';

export type DraggableItemDef = {
  id: string
  title: string
}

interface DraggableItemProps {
  item: DraggableItemDef
  type: DNDTypes
  onDrop: (dropTargetId: string, dragItemId: string, index?: number) => void
  style?: CSSProperties
  index?: number
  moveItem?: (dragIndex: number, hoverIndex: number) => void
}

export const DraggableItem = ({
  item,
  type,
  onDrop,
  style,
  index,
  moveItem
}: DraggableItemProps) => {

  return (
    <DraggableContainer
      id={item.id}
      type={type}
      style={{
        padding: 8,
        ...style
      }}
      onDrop={onDrop}
      index={index}
      moveItem={moveItem}
    >
      {item.title}
    </DraggableContainer>
  );
};
