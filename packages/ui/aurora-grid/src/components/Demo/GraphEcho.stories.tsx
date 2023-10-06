//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React from 'react';

import { GraphBuilder } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/react-client';
import { Expando, TypedObject, useQuery, useSpace } from '@dxos/react-client/echo';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { arrayMove } from '@dxos/util';

import { MosaicContextProvider, MosaicMoveEvent, Path } from '../../dnd';
import { FullscreenDecorator, Generator, SimpleCard, Status } from '../../testing';
import { Kanban, KanbanColumn } from '../Kanban';
import { Tree, TreeData } from '../Tree';

faker.seed(3);
const fake = faker.helpers.fake;

const debug = true;
const createGraph = () => {
  const content = [...Array(3)].map(() => ({
    id: faker.string.uuid(),
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
    children: [...Array(2)].map(() => ({
      id: faker.string.uuid(),
      label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
      description: fake('{{commerce.productDescription}}'),
      children: [...Array(1)].map(() => ({
        id: faker.string.uuid(),
        label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
        description: fake('{{commerce.productDescription}}'),
      })),
    })),
  }));

  return buildGraph(new GraphBuilder().build(), 'tree', content);
};

const graph = createGraph();

const GraphTree = ({ id = 'tree' }: { id?: string }) => {
  // TODO(wittjosiah): This graph does not handle order currently.
  const handleDrop = ({ active, over }: MosaicMoveEvent<number>) => {
    // Moving within the tree.
    if (Path.hasDescendent(id, active.container) && Path.hasDescendent(id, over.container)) {
      const activeNode = graph.findNode(active.item.id);
      const activeParent = activeNode?.parent;
      const overNode = graph.findNode(over.item.id);
      const overParent = overNode?.parent;

      if (activeNode && activeParent && overParent) {
        activeParent.removeNode(active.item.id);
        overParent.addNode('tree', { ...activeNode });
      }
    }
  };

  return (
    <Tree.Root id={id} items={graph.root.children} onDrop={handleDrop} debug={debug}>
      {graph.root.children.map((item, index) => (
        <Tree.Tile key={item.id} item={item as TreeData} index={index} />
      ))}
    </Tree.Root>
  );
};

const EchoKanban = ({ container = 'projects', spaceKey }: { container?: string; spaceKey: PublicKey }) => {
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
    } else {
      const overProperty = Path.last(over.container);
      invariant(overProperty);

      const obj = new Expando(
        {
          title: active.item.label,
          status: overProperty,
        },
        { schema: kanban.schema },
      );
      space?.db.add(obj);

      const overOrder =
        kanban.columnOrder[overProperty] ??
        columns.find((column) => column.id === overProperty)?.items.map((item) => item.id) ??
        [];
      overOrder.length > 0 ? overOrder.splice(over.position, 0, obj.id) : overOrder.push(obj.id);
      kanban.columnOrder[overProperty] = overOrder;
    }
  };

  return (
    <Kanban.Root id={container} debug={debug} columns={columns} Component={SimpleCard} onDrop={handleDrop}>
      <div className='flex grow overflow-y-hidden overflow-x-auto'>
        <div className='flex gap-4'>
          {columns.map((column, index) => (
            <Kanban.Column key={column.id} column={column} index={index} />
          ))}
        </div>
      </div>
    </Kanban.Root>
  );
};

export default {
  title: 'Demo',
};

export const GraphEcho = {
  render: ({ spaceKey }: { spaceKey: PublicKey }) => (
    <MosaicContextProvider debug={debug}>
      <div className='flex grow overflow-hidden'>
        <div className='flex shrink-0 w-[280px] overflow-hidden'>
          <GraphTree />
        </div>
        <div className='flex grow overflow-hidden'>
          <EchoKanban spaceKey={spaceKey} />
        </div>
      </div>
    </MosaicContextProvider>
  ),
  decorators: [
    FullscreenDecorator(),
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
