//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Card, DraggableCard } from './DraggableCard';
import { DroppableContainer } from './DroppableContainer';

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
    <DroppableContainer
      id={list.id}
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
      {list.children.map((card, i) => (
        <DraggableCard
          key={card.id}
          index={i}
          card={card}
        />
      ))}
    </DroppableContainer>
  );
};
