//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Card, DraggableCard } from './DraggableCard';
import { DroppableContainer } from './DroppableContainer';

const DEFAULT_LIST_WIDTH = 200;

export type List = {
  id: string
  title: string
  children: Card[]
  width?: number | string
}

interface DroppableListProps {
  list?: List
}

export const DroppableList = ({ list }: DroppableListProps) => {
  if (!list) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h5 style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{list.title}</h5>
      <DroppableContainer
        id={list.id}
        styles={{
          width: list.width ?? DEFAULT_LIST_WIDTH,
          border: '0.5px solid rgba(0,0,0,0.2)',
          padding: 8,
          maxHeight: 300,
          overflowY: 'scroll'
        }}
      >
        {list.children.map((card, i) => (
          <DraggableCard
            key={card.id}
            index={i}
            card={card}
          />
        ))}
      </DroppableContainer>
    </div>
  );
};
