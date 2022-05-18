//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { DraggableContainer } from './DraggableContainer';
import { DroppableContainer } from './DroppableContainer';

const Card = ({
  card,
  index,
  selected,
  dragging
}: { card: Card, index: number, selected: boolean, dragging: boolean }) => {
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

const DEFAULT_LIST_WIDTH = 200;
const List = ({ list }: { list: KanbanList}) => {
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
          padding: 8
        }}
      >
        {list.children.map((card, i) => (
          <Card
            key={card.id}
            index={i}
            card={card}
            selected={false}
            dragging={false}
          />
        ))}
      </DroppableContainer>
    </div>
  );
};

interface Card {
  id: string
  title: string
}

export interface KanbanList {
  id: string
  title: string
  children: Card[]
  width?: number | string
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
      {lists.map(list => <List key={list.id} list={list} />)}
    </div>
  );
};
