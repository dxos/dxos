//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties } from 'react';

import { DNDTypes } from './DragAndDropTypes';
import { DraggableContainer, DraggableContainerDef } from './DraggableContainer';

export type DraggableItemDef = {
  id: string
  title: string
}

interface DraggableItemProps {
  item: DraggableItemDef
  type: DNDTypes
  onDrop: (dropTargetId: string, item: DraggableContainerDef) => void
  moveItem?: (dragIndex: number, hoverIndex: number) => void
  containerId: string
  style?: CSSProperties
  index?: number
}

export const DraggableItem = ({
  item,
  type,
  onDrop,
  containerId,
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
      containerProps={{
        containerId
      }}
    >
      {item.title}
    </DraggableContainer>
  );
};
