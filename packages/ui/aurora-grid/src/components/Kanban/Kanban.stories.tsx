//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { Kanban, KanbanColumn } from './Kanban';
import {
  DefaultComponent,
  MosaicContextProvider,
  MosaicMoveEvent,
  MosaicTileComponent,
  Path,
  swapItems,
} from '../../dnd';
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
      id: `column-${i}`,
      title: `Column ${i}`,
      items: Array.from({ length: i === count - 1 ? 0 : 5 - i }).map(() => createItem(types)),
    }));
  });

  // const handleDelete = (id: string) => {
  //   setItems1((cards) => cards.filter((card) => card.id !== id));
  // };

  const handleDrop = ({ active, over }: MosaicMoveEvent<number>) => {
    // Reorder columns.
    // TODO(burdon): Buggy dragging empty column.
    if (active.container === id) {
      return setColumns((columns) => [...swapItems(columns, active.item, over.item)]);
    }

    // TODO(burdon): Handle dragging from other components.
    const columnsPath = Path.create(id, 'column');
    if (Path.hasDescendent(columnsPath, active.container)) {
      return setColumns((columns) =>
        columns.map((column) => {
          const items = [...column.items];
          if (Path.last(active.container) === column.id) {
            invariant(active.position !== undefined);
            items.splice(active.position, 1);
          }

          if (over.container === id && over.item.id === column.id) {
            // Move card into empty column.
            items.push(active.item as TestItem);
          } else if (Path.hasDescendent(columnsPath, over.container) && Path.last(over.container) === column.id) {
            // Move card within or between columns.
            invariant(over.position !== undefined);
            items.splice(over.position, 0, active.item as TestItem);
          }

          return { ...column, items };
        }),
      );
    }
  };

  return (
    <MosaicContextProvider debug={debug}>
      <Kanban.Root id={id} debug={debug} columns={columns} Component={Component} onDrop={handleDrop}>
        <div className='flex grow overflow-y-hidden overflow-x-auto'>
          <div className='flex gap-4'>
            {columns.map((column, index) => (
              <Kanban.Column key={column.id} column={column} index={index} />
            ))}
          </div>
        </div>
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
