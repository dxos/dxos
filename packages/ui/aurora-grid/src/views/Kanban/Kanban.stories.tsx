//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, useState } from 'react';

import { invariant } from '@dxos/invariant';

import { Kanban, KanbanColumn, KanbanProps } from './Kanban';
import { Mosaic, MosaicMoveEvent, Path, swapItems } from '../../mosaic';
import { ComplexCard, FullscreenDecorator, SimpleCard, TestItem, TestObjectGenerator } from '../../testing';

faker.seed(3);

const createKanban = ({ types, columns = 3 }: { types?: string[]; columns?: number }) => {
  const generator = new TestObjectGenerator({ types });
  return Array.from({ length: columns }).map((_, i) => ({
    id: `column-${i}`,
    title: `Column ${i}`,
    children: generator.createObjects({ length: columns - 1 }),
  }));
};

const KanbanStory: FC<
  KanbanProps & {
    types?: string[];
    count?: number;
    debug?: boolean;
  }
> = ({ id = 'kanban', Component = Mosaic.DefaultComponent, types = ['document'], count = 3, debug = false }) => {
  const [columns, setColumns] = useState<KanbanColumn<TestItem>[]>(() => createKanban({ types, columns: count }));

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
          const children = [...column.children];
          if (Path.last(active.container) === column.id) {
            // Remove card from current postion.
            invariant(active.position !== undefined);
            children.splice(active.position, 1);
          }

          if (over.container === id && over.item.id === column.id) {
            // Move card into empty column.
            children.push(active.item as TestItem);
          } else if (Path.hasDescendent(columnsPath, over.container) && Path.last(over.container) === column.id) {
            // Move card within or between columns.
            children.splice(over.position ?? 0, 0, active.item as TestItem);
          }

          return { ...column, children };
        }),
      );
    }
  };

  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <Kanban id={id} debug={debug} columns={columns} Component={Component} onDrop={handleDrop} />
    </Mosaic.Root>
  );
};

export default {
  title: 'Kanban',
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
