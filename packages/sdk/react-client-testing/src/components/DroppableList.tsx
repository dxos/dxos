//
// Copyright 2022 DXOS.org
//

import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React from 'react';

import { DraggableListItem, DraggableListItemDef } from './DraggableListItem';
import { DroppableContainer } from './DroppableContainer';

interface DroppableListProps {
  id: string
  items: DraggableListItemDef[]
  horizontal?: boolean
}

export const DroppableList = ({
  id,
  items,
  horizontal = false
}: DroppableListProps) => {

  return (
    <DroppableContainer
      id={id}
      style={{
        padding: 2,
        height: '100%',
        overflowY: 'scroll',
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: '5px'
      }}
      draggingOverStyle={{
        border: '1px solid rgba(0, 0, 0, 0.7)'
      }}
    >
      <SortableContext
        id={id}
        items={items.map(item => item.id)}
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
