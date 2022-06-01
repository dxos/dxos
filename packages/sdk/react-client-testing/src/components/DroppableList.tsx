//
// Copyright 2022 DXOS.org
//

import { DragOverlay } from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { DraggableListItem, DraggableListItemDef } from './DraggableListItem';
import { DroppableContainer } from './DroppableContainer';

interface DroppableListProps {
  id: string
  items: DraggableListItemDef[]
  horizontal?: boolean
  style?: CSSProperties
  activeId?: string
}

export const DroppableList = ({
  id,
  items,
  horizontal = false,
  style = {},
  activeId
}: DroppableListProps) => {
  const itemIds = items.map(item => item.id);

  const renderDragOverlay = (id: string) => {
    const item = items.find(item => item.id === id);
    if (!item) {
      return null;
    }
    return (
      <DraggableListItem
        item={item}
        style={{
          backgroundColor: 'white',
          border: '1px solid #ccc'
        }}
      />
    );
  };

  return (
    <>
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
      {createPortal(
        <DragOverlay>
          {activeId && renderDragOverlay(activeId)}
        </DragOverlay>,
        document.body
      )}
    </>
  );
};
