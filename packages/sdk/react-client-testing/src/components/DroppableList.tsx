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
  );
};
