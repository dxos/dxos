//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Card, DraggableCard } from './DraggableCard';
import { DroppableContainer } from './DroppableContainer';

interface DroppableListProps {
  id: string
  items: Card[]
}

export const DroppableList = ({
  id,
  items
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
      {items.map((card, i) => (
        <DraggableCard
          key={card.id}
          index={i}
          card={card}
        />
      ))}
    </DroppableContainer>
  );
};
