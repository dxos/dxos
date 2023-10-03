//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, useState } from 'react';

import { arrayMove } from '@dxos/util';

import { Kanban, KanbanColumn } from './Kanban';
import { DefaultComponent, MosaicContextProvider, MosaicMoveEvent, MosaicTileComponent } from '../../dnd';
import { ComplexCard, createItem, FullscreenDecorator, SimpleCard, TestItem } from '../../testing';

faker.seed(3);

const KanbanStory: FC<{
  id?: string;
  Component: MosaicTileComponent<any>;
  types?: string[];
  count?: number;
  debug?: boolean;
}> = ({ id = 'kanban', Component = DefaultComponent, types = ['document'], count = 3, debug = false }) => {
  const [columns, setColumns] = useState<KanbanColumn<TestItem>[]>(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: `${id}/column/${i}`,
      title: `Column ${i}`,
      items: Array.from({ length: i === count - 1 ? 0 : 5 - i }).map(() => createItem(types)),
    }));
  });

  // const handleDelete = (id: string) => {
  //   setItems1((cards) => cards.filter((card) => card.id !== id));
  // };

  // TODO(burdon): Handle dragging off kanban and into empty column.
  // TODO(burdon): Buggy dragging empty column.

  const handleMoveColumn = ({ active, over }: MosaicMoveEvent<number>) => {
    setColumns((columns) => {
      const activeIndex = columns.findIndex((column) => column.id === active.item.id);
      const overIndex = columns.findIndex((column) => column.id === over.item.id);
      return [...arrayMove(columns, activeIndex, overIndex)];
    });
  };

  const handleMoveItem = ({ container, active, over }: MosaicMoveEvent<number>) => {
    setColumns((columns) =>
      columns.map((column) => {
        const items = [...column.items];
        if (active.container === column.id && column.id === container) {
          items.splice(active.position!, 1);
        }
        if (over.container === column.id && column.id === container) {
          items.splice(over.position!, 0, active.item as TestItem);
        }
        return { ...column, items };
      }),
    );
  };

  return (
    <MosaicContextProvider debug={debug}>
      <Kanban.Root id={id} columns={columns} Component={Component} onDrop={handleMoveColumn}>
        {columns.map((column, index) => (
          <Kanban.Column
            key={column.id}
            column={column}
            Component={Component}
            onDrop={handleMoveItem}
            index={index}
            debug={debug}
          />
        ))}
      </Kanban.Root>
    </MosaicContextProvider>
  );
};

export default {
  component: KanbanStory,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    Component: SimpleCard,
    count: 3,
    debug: true,
  },
};

export const Complex = {
  args: {
    Component: ComplexCard,
    types: ['document', 'image'],
    count: 4,
    debug: true,
  },
};
