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
import { Mosaic, Path } from '../../mosaic';
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
    const children =
      columnOrder.length > 0 ? columnOrder.map((id: string) => objects.find((object) => object.id === id)) : objects;
    return {
      id: value,
      title: value,
      children: children.filter((object: TypedObject) => object[property] === value),
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
        columns.find((column) => column.id === activeProperty)?.children.map((item) => item.id) ??
        [];
      activeOrder.length > 0 && activeOrder.splice(active.position, 1);
      kanban.columnOrder[activeProperty] = activeOrder;

      // Update over column order.
      const overOrder =
        kanban.columnOrder[overProperty] ??
        columns.find((column) => column.id === overProperty)?.children.map((item) => item.id) ??
        [];
      overOrder.length > 0 ? overOrder.splice(over.position, 0, active.item.id) : overOrder.push(active.item.id);
      kanban.columnOrder[overProperty] = overOrder;
    }
  };

  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <Kanban id={container} debug={debug} columns={columns} Component={SimpleCard} onDrop={handleDrop} />
    </Mosaic.Root>
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
