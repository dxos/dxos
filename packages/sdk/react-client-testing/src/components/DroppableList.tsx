//
// Copyright 2022 DXOS.org
//

import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { CSSProperties } from 'react';

import { DraggableListItem, DraggableListItemDef } from './DraggableListItem';
import { DroppableContainer } from './DroppableContainer';

interface DroppableListProps {
  id: string
  items: DraggableListItemDef[]
  horizontal?: boolean
  style?: CSSProperties
}

export const DroppableList = ({
  id,
  items,
  horizontal = false,
  style = {}
}: DroppableListProps) => {
  const itemIds = items.map(item => item.id);

  return (
    <DroppableContainer
      id={id}
      style={{
        padding: 2,
        height: '100%',
        overflowY: 'scroll',
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: '5px',
        ...style
      }}
      draggingOverStyle={{
        border: '1px solid rgba(0, 0, 0, 0.7)'
      }}
    >
      <SortableContext
        id={id}
        items={itemIds}
        strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
        {items.map(item => (
          <DraggableListItem
            key={item.id}
            item={item}
          />
        ))}
      </SortableContext>
    </DroppableContainer>
  );
};
