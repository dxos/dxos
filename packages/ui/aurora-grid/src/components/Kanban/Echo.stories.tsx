//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Expando, TypedObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { arrayMove } from '@dxos/util';

import { Kanban, KanbanColumn } from './Kanban';
import { MosaicContextProvider, Path } from '../../dnd';
import { FullscreenDecorator, Generator, SimpleCard, Status } from '../../testing';

export default {
  title: 'Kanban',
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

const Story = ({
  container = 'projects',
  debug,
  spaceKey,
}: {
  container?: string;
  debug?: boolean;
  spaceKey: PublicKey;
}) => {
  const space = useSpace(spaceKey);
  const [kanban] = useQuery(space, { type: 'kanban' });
  const objects = useQuery<TypedObject>(space, (object) => object.__schema === kanban.schema, {}, [kanban.schema]);

  const property = kanban.columnBy;
  const columns: KanbanColumn<TypedObject>[] = kanban.order.map((value: string) => {
    const columnOrder = kanban.columnOrder[value] ?? [];
    const items =
      columnOrder.length > 0 ? columnOrder.map((id: string) => objects.find((object) => object.id === id)) : objects;
    return {
      id: value,
      title: value,
      items: items.filter((object: TypedObject) => object[property] === value),
    };
  });

  const handleDrop = ({ active, over }: any) => {
    // Reorder columns.
    if (active.container === container) {
      const fromIndex = kanban.order.findIndex((value: string) => value === active.item.id);
      const toIndex = kanban.order.findIndex((value: string) => value === over.item.id);
      fromIndex !== -1 && toIndex !== -1 && arrayMove(kanban.order, fromIndex, toIndex);
      return;
    }

    const columnsPath = Path.create(container, 'column');
    if (Path.hasDescendent(columnsPath, active.container)) {
      const activeProperty = Path.last(active.container);
      const overProperty = Path.last(over.container);
      invariant(activeProperty);
      invariant(overProperty);

      // Update property.
      active.item[property] = overProperty;

      // Update active column order.
      const activeOrder =
        kanban.columnOrder[activeProperty] ??
        columns.find((column) => column.id === activeProperty)?.items.map((item) => item.id) ??
        [];
      activeOrder.length > 0 && activeOrder.splice(active.position, 1);
      kanban.columnOrder[activeProperty] = activeOrder;

      // Update over column order.
      const overOrder =
        kanban.columnOrder[overProperty] ??
        columns.find((column) => column.id === overProperty)?.items.map((item) => item.id) ??
        [];
      overOrder.length > 0 ? overOrder.splice(over.position, 0, active.item.id) : overOrder.push(active.item.id);
      kanban.columnOrder[overProperty] = overOrder;
    }
  };

  return (
    <MosaicContextProvider debug={debug}>
      <Kanban.Root id={container} debug={debug} columns={columns} Component={SimpleCard} onDrop={handleDrop}>
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

export const ECHO = {
  render: Story,
  decorators: [
    ClientSpaceDecorator({
      onCreateSpace: async (space) => {
        const generator = new Generator(space);
        await generator.initialize();
        const { project } = generator.createProjects();
        space.db.add(
          new Expando({
            type: 'kanban',
            title: 'Projects',
            schema: project,
            columnBy: 'status',
            order: Status,
            columnOrder: {},
          }),
        );
      },
    }),
  ],
};
