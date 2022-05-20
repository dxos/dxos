//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { DraggableContainer } from './DraggableContainer';

export type Card = {
  id: string
  title: string
}

interface DraggableCardProps {
  card: Card
  index: number
  selected?: boolean
}

export const DraggableCard = ({
  card,
  index,
  selected
}: DraggableCardProps) => {
  return (
    <DraggableContainer
      id={'kanban-' + card.id}
      index={index}
    >
      <div style={{
        padding: 8,
        backgroundColor: selected ? 'lightgray' : undefined
      }}>
        {card.title}
      </div>
    </DraggableContainer>
  );
};
