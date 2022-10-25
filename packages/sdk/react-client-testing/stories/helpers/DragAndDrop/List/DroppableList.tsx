//
// Copyright 2022 DXOS.org
//

import {
  horizontalListSortingStrategy,
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import React, { CSSProperties } from 'react';

import { DraggableContainer } from '../DraggableContainer';
import { DroppableContainer } from '../DroppableContainer';
import { ListItem, ListItemDef } from './ListItem';

interface DroppableListProps {
  id: string;
  items: ListItemDef[];
  horizontal?: boolean;
  style?: CSSProperties;
  activeId?: string;
}

export const DroppableList = ({
  id,
  items,
  horizontal = false,
  style = {}
}: DroppableListProps) => {
  const itemIds = items.map((item) => item.id);

  return (
    <DroppableContainer
      id={id}
      style={{
        padding: 2,
        height: '100%',
        overflowY: 'scroll',
        border: '1px solid rgba(0,0,0,0.2)',
        borderRadius: '5px',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <SortableContext
        id={id}
        items={itemIds}
        strategy={
          horizontal
            ? horizontalListSortingStrategy
            : verticalListSortingStrategy
        }
      >
        {items.map((item) => (
          <DraggableContainer
            key={item.id}
            id={item.id}
            placeholderStyles={{ opacity: 0.5 }}
          >
            <ListItem item={item} style={{ padding: 8 }} />
          </DraggableContainer>
        ))}
      </SortableContext>
    </DroppableContainer>
  );
};
