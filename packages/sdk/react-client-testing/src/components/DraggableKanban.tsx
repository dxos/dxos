//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { DroppableList, List } from './DroppableList';

interface DraggableKanbanProps {
  lists: List[]
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
          list={list}
        />
      ))}
    </div>
  );
};
