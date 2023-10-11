//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useCallback, useState } from 'react';

import { Graph, GraphBuilder } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { arrayMove } from '@dxos/util';

import { Tree, TreeData, TreeProps } from './Tree';
import { MosaicMoveEvent, Path } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';

const fake = faker.helpers.fake;

export type DemoTreeProps = TreeProps & {
  initialItems?: TreeData[];
  types?: string[];
  debug?: boolean;
};

export const DemoTree = ({ id = 'tree', initialItems, types, debug }: DemoTreeProps) => {
  const [items, setItems] = useState<TreeData[]>(
    initialItems ??
      (() => {
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
      }),
  );

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      if (active.path === Path.create(id, active.item.id)) {
        setItems((items) => {
          const activeIndex = items.findIndex((item) => item.id === active.item.id);
          const overIndex = items.findIndex((item) => item.id === over.item.id);
          return [...arrayMove(items, activeIndex, overIndex)];
        });
      } else {
        setItems((items) =>
          items.map((item) => {
            const children = [...item.children];
            if (Path.last(Path.parent(active.path)) === item.id) {
              children.splice(active.position!, 1);
            }
            if (Path.last(Path.parent(over.path)) === item.id) {
              children.splice(over.position!, 0, active.item as TreeData);
            }
            return { ...item, children };
          }),
        );
      }
    },
    [items],
  );

  const handleDroppable = useCallback(({ active, over }: MosaicMoveEvent<number>) => {
    return !(active.path === id && over.path !== id);
  }, []);

  return <Tree id={id} items={items} onDrop={handleDrop} isDroppable={handleDroppable} />;
};
export const createGraph = () => {
  const content = [...Array(2)].map(() => ({
    id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
    children: [...Array(2)].map(() => ({
      id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
      label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
      description: fake('{{commerce.productDescription}}'),
      children: [...Array(2)].map(() => ({
        id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
        label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
        description: fake('{{commerce.productDescription}}'),
      })),
    })),
  }));

  return buildGraph(new GraphBuilder().build(), 'tree', content);
};

export const GraphTree = ({ id, graph = createGraph(), debug }: { id: string; graph?: Graph; debug: boolean }) => {
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
