//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { FC, useRef } from 'react';

import { Button, Select, Toolbar } from '@dxos/aurora';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { Expando, Schema, TypedObject, useQuery, useSpace } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { arrayMove } from '@dxos/util';

import { Kanban, KanbanColumn } from './Kanban';
import { Mosaic, MosaicMoveEvent, Path } from '../../mosaic';
import { FullscreenDecorator, TestObjectGenerator, Priority, range, SimpleCard, Status } from '../../testing';

const generator = new TestObjectGenerator();

// TODO(burdon): Compute this?
const columnValues: { [property: string]: any[] } = {
  status: ['unknown', ...Status],
  priority: ['unknown', ...Priority],
};

// TODO(wittjosiah): Can't use id because of ClientSpaceDecorator.
const EchoStory = ({
  basePath = 'projects',
  debug,
  spaceKey,
  generator: objectGenerator = generator,
}: {
  basePath?: string;
  debug?: boolean;
  spaceKey: PublicKey;
  generator: TestObjectGenerator;
}) => {
  const space = useSpace(spaceKey);
  // TODO(burdon): Decorator is not re-run schema is empty when returning to story after first run. Different kanban id.
  const [kanban] = useQuery(space, { type: 'kanban' });

  const getProperty = (property: string) => {
    const schemaProperty = kanban.schema.props.find((prop: any) => prop.id === kanban.columnProp);
    if (schemaProperty.type === Schema.PropType.NUMBER) {
      return parseInt(property);
    } else {
      return property;
    }
  };

  const objects = useQuery<TypedObject>(space, (object) => object.__schema === kanban.schema, {}, [kanban.schema]);
  const columnsRef = useRef<KanbanColumn<TypedObject>[]>([]);
  const columns: KanbanColumn<TypedObject>[] = kanban.columnValues.map((value: string) => {
    const objectPosition = kanban.objectPosition[value] ?? [];
    const children =
      objectPosition.length > 0
        ? objectPosition.map((id: string) => objects.find((object) => object.id === id))
        : objects;

    // TODO(burdon): Special case for 'unknown' values?
    return {
      id: getProperty(value),
      title: value,
      children: children.filter((object: TypedObject) => object[kanban.columnProp] === value),
    };
  });
  columnsRef.current = columns;

  // TODO(burdon): Called for each object generated (should batch?)
  // console.log(JSON.stringify(objects[0]));

  // TODO(burdon): Should views maintain an positional index map per property (to enable switching?)
  // TODO(burdon): Is the current index map making use of ECHO object CRDT? Need multi-peer test in this suite.
  const handleSetProperty = (property: string) => {
    kanban.columnProp = property;
    kanban.columnValues = columnValues[kanban.columnProp];
  };

  // TODO(burdon): Factor out util.
  const getOrder = (kanban: TypedObject, property: string) => {
    // TODO(wittjosiah): Columns is stale here.
    return (
      kanban.objectPosition[property] ??
      columnsRef.current.find((column) => column.id === getProperty(property))?.children.map((item) => item.id) ??
      []
    );
  };

  // TODO(burdon): Currently broken: factor out with demo story.
  const handleDrop = ({ active, over }: MosaicMoveEvent) => {
    // Reorder columns.
    // TODO(burdon): Factor out util.
    if (active.path === Path.create(basePath, active.item.id)) {
      // Reorder columns.
      const fromIndex = kanban.columnValues.findIndex((value: string) => value === active.item.id);
      const toIndex = kanban.columnValues.findIndex((value: string) => value === over.item.id);
      fromIndex !== -1 && toIndex !== -1 && arrayMove(kanban.columnValues, fromIndex, toIndex);
      return;
    }

    if (Path.hasDescendent(basePath, active.path)) {
      const activeProperty = Path.last(Path.parent(active.path));
      const overProperty = Path.length(over.path) > 2 ? Path.last(Path.parent(over.path)) : Path.last(over.path);
      invariant(activeProperty);
      invariant(overProperty);

      // Update property.
      (active.item as TypedObject)[kanban.columnProp] = getProperty(overProperty);

      // Update active column order.
      const activeOrder = getOrder(kanban, activeProperty);
      activeOrder.length > 0 && activeOrder.splice(active.position, 1);
      kanban.objectPosition[activeProperty] = activeOrder;

      // Update over column order.
      const overOrder = getOrder(kanban, overProperty);
      overOrder.length > 0 && Path.length(over.path) === Path.length(active.path)
        ? overOrder.splice(over.position, 0, active.item.id)
        : overOrder.push(active.item.id);
      kanban.objectPosition[overProperty] = overOrder;
    }
  };

  const handleAddData = () => {
    const object = objectGenerator.createObject({ types: ['project'] });
    space?.db.add(object);
  };

  return (
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <div className='flex flex-col grow'>
        <Toolbar.Root classNames='p-2'>
          <PropertySelector
            property={kanban.columnProp}
            properties={Object.keys(columnValues)}
            onSetProperty={handleSetProperty}
          />
          <Button title='Add Data' onClick={handleAddData}>
            <Plus />
          </Button>
        </Toolbar.Root>
        <Kanban id={basePath} debug={debug} columns={columns} Component={SimpleCard} onDrop={handleDrop} />
      </div>
    </Mosaic.Root>
  );
};

export default {
  title: 'Kanban',
  render: EchoStory,
  decorators: [
    FullscreenDecorator(),
    ClientSpaceDecorator({
      onCreateSpace: async (space) => {
        const factory = generator.factories.project;
        const objects = [
          factory.schema,
          ...range(factory.createObject, 10),
          new Expando({
            type: 'kanban',
            title: 'Projects',
            schema: factory.schema,
            // TODO(burdon): Standardize with other story.
            columnProp: 'status',
            columnValues: columnValues.status,
            objectPosition: {}, // TODO(burdon): Make this a CRDT.
          }),
        ];

        // TODO(burdon): Batch API.
        objects.forEach((object) => space.db.add(object));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const ECHO = {};

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
