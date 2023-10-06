//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { Select, Toolbar } from '@dxos/aurora';
import { Expando, TypedObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { useQuery, useSpace } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { arrayMove } from '@dxos/util';

import { Kanban, KanbanColumn } from './Kanban';
import { MosaicContextProvider, Path } from '../../dnd';
import { FullscreenDecorator, Generator, Priority, SimpleCard, Status } from '../../testing';

export default {
  title: 'Kanban',
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

// TODO(burdon): Compute this?
const columnValues: { [property: string]: any[] } = {
  status: ['unknown', ...Status],
  priority: ['unknown', ...Priority],
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
  const columns: KanbanColumn<TypedObject>[] = kanban.columnValues.map((value: string) => {
    const objectPosition = kanban.objectPosition[value] ?? [];
    const items =
      objectPosition.length > 0
        ? objectPosition.map((id: string) => objects.find((object) => object.id === id))
        : objects;

    // TODO(burdon): Special case for 'unknown' values?
    return {
      id: value,
      title: value,
      items: items.filter((object: TypedObject) => object[kanban.columnProp] === value),
    };
  });

  // TODO(burdon): Called 21 times on startup;
  // console.log(JSON.stringify(objects[0]));

  // TODO(burdon): Should views maintain an positional index map per property (to enable switching?)
  // TODO(burdon): Is the current index map making use of ECHO object CRDT? Need multi-peer test in this suite.
  const handleSetProperty = (property: string) => {
    kanban.columnProp = property;
    kanban.columnValues = columnValues[kanban.columnProp];
  };

  const handleDrop = ({ active, over }: any) => {
    // Reorder columns.
    // TODO(burdon): Factor out util.
    if (active.container === container) {
      const fromIndex = kanban.columnValues.findIndex((value: string) => value === active.item.id);
      const toIndex = kanban.columnValues.findIndex((value: string) => value === over.item.id);
      fromIndex !== -1 && toIndex !== -1 && arrayMove(kanban.columnValues, fromIndex, toIndex);
      return;
    }

    const columnsPath = Path.create(container, 'column'); // TODO(burdon): Export string/function from layout.
    if (Path.hasDescendent(columnsPath, active.container)) {
      const activeProperty = Path.last(active.container);
      const overProperty = Path.last(over.container);
      invariant(activeProperty);
      invariant(overProperty);

      // TODO(burdon): Factor out util.
      const getOrder = (kanban: TypedObject, property: string) => {
        return (
          kanban.objectPosition[property] ??
          columns.find((column) => column.id === property)?.items.map((item) => item.id) ??
          []
        );
      };

      // Update property.
      active.item[kanban.columnProp] = overProperty;

      // Update active column order.
      const activeOrder = getOrder(kanban, activeProperty);
      activeOrder.length > 0 && activeOrder.splice(active.position, 1);
      kanban.objectPosition[activeProperty] = activeOrder;

      // Update over column order.
      const overOrder = getOrder(kanban, overProperty);
      overOrder.length > 0 ? overOrder.splice(over.position, 0, active.item.id) : overOrder.push(active.item.id);
      kanban.objectPosition[overProperty] = overOrder;
    }
  };

  return (
    <MosaicContextProvider debug={debug}>
      <div className='flex flex-col grow'>
        <Toolbar.Root classNames='p-2'>
          <PropertySelector
            property={kanban.columnProp}
            properties={Object.keys(columnValues)}
            onSetProperty={handleSetProperty}
          />
        </Toolbar.Root>
        <Kanban.Root id={container} debug={debug} columns={columns} Component={SimpleCard} onDrop={handleDrop}>
          <div className='flex grow overflow-y-hidden overflow-x-auto'>
            <div className='flex gap-4'>
              {columns.map((column, index) => (
                <Kanban.Column key={column.id} column={column} index={index} />
              ))}
            </div>
          </div>
        </Kanban.Root>
      </div>
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
            columnProp: 'status',
            columnValues: columnValues.status,
            objectPosition: {},
          }),
        );
      },
    }),
  ],
};

const PropertySelector: FC<{ property: string; properties: string[]; onSetProperty: (property: string) => void }> = ({
  property,
  properties,
  onSetProperty,
}) => {
  return (
    <Select.Root value={property} onValueChange={onSetProperty}>
      <Select.TriggerButton placeholder='Select value' />
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            {properties.map((property) => (
              <Select.Option key={property} value={property}>
                {property}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
