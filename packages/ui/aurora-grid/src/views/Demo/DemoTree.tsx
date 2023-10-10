//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, HTMLAttributes, useCallback, useMemo, useState } from 'react';

import { GraphBuilder } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { arrayMove } from '@dxos/util';

import { TestComponentProps } from './test';
import { MosaicMoveEvent, Path } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';
import { Tree, TreeData } from '../Tree';

const fake = faker.helpers.fake;

export const DemoTree: FC<TestComponentProps<any> & HTMLAttributes<HTMLDivElement>> = ({
  id,
  types,
  debug,
  className,
}) => {
  const [items, setItems] = useState<TreeData[]>(() => {
    const generator = new TestObjectGenerator({ types });
    return Array.from({ length: 4 }).map(() => {
      const item = generator.createObject();
      return {
        // TODO(wittjosiah): Object id isn't included in spread data.
        id: item.id,
        ...item,
        label: item.title,
        children: Array.from({ length: 3 }).map(() => {
          const item = generator.createObject();
          return {
            id: item.id,
            ...item,
            label: item.title,
            children: [],
          };
        }),
      };
    });
  });

  const handleDrop = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      if (active.path === id && over.path === id) {
        setItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else if (active.path === id && over.path !== id) {
        setItems((items) => items.filter((item) => item.id !== active.item.id));
      } else if (active.path !== id && over.path === id) {
        setItems((items) => {
          items.splice(over.position!, 0, active.item as TreeData);
          return items;
        });
      } else {
        setItems((items) =>
          items.map((item) => {
            const children = [...item.children];
            if (Path.last(active.path) === item.id) {
              children.splice(active.position!, 1);
            }
            if (Path.last(over.path) === item.id) {
              children.splice(over.position!, 0, active.item as TreeData);
            }
            return { ...item, children };
          }),
        );
      }
    },
    [items],
  );

  return <Tree id={id} items={items} onDrop={handleDrop} className={className} debug={debug} />;
};

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

export const GraphTree = ({ id = 'tree', debug }: { id?: string; debug?: boolean }) => {
  const graph = useMemo(() => createGraph(), []);

  // TODO(wittjosiah): This graph does not handle order currently.
  const handleDrop = ({ active, over }: MosaicMoveEvent<number>) => {
    // Moving within the tree.
    if (Path.hasDescendent(id, active.path) && Path.hasDescendent(id, over.path)) {
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

  return <Tree id={id} items={graph.root.children as TreeData[]} onDrop={handleDrop} debug={debug} />;
};
