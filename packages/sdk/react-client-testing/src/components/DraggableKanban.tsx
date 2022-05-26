//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Card } from './DraggableCard';
import { DroppableList } from './DroppableList';

export interface KanbanList {
  id: string
  items: Card[]
}

interface DraggableKanbanProps {
  lists: KanbanList[]
}

export const DraggableKanban = ({
  lists
}: DraggableKanbanProps) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-around'
    }}>
      {lists.map(list => (
        <DroppableList
          key={list.id}
          id={list.id}
          items={list.items}
        />
      ))}
    </div>
  );
};
