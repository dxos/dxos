//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Graph } from '@dxos/app-graph';
import { faker } from '@dxos/random';
import { arrayMove } from '@dxos/util';

import { Tree, type TreeData, type TreeProps } from './Tree';
import { type MosaicDropEvent, type MosaicMoveEvent, Path } from '../../mosaic';
import { TestObjectGenerator } from '../../testing';

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

  const handleOver = useCallback(({ over }: MosaicMoveEvent<number>) => {
    return over && Path.hasChild(id, over.path) ? 'transfer' : 'reject';
  }, []);

  // NOTE: Does not handle deep operations.
  const handleDrop = useCallback(
    ({ active, over }: MosaicDropEvent<number>) => {
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
            if (Path.last(over.path) === item.id) {
              children.push(active.item as TreeData);
            }
            return { ...item, children };
          }),
        );
      }
    },
    [items],
  );

  return <Tree id={id} items={items} onOver={handleOver} onDrop={handleDrop} />;
};

export const createGraph = () => {
  const graph = new Graph();
  graph.addNodes({
    id: 'root',
    nodes: [Array(2)].map((_, i) => ({
      id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
      label: faker.lorem.words(2),
      description: faker.lorem.sentence(),
      properties: { index: `a${i}` },
      children: [...Array(2)].map((_, j) => ({
        id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
        label: faker.lorem.words(2),
        description: faker.lorem.sentence(),
        properties: { index: `a${j}` },
        children: [...Array(2)].map((_, k) => ({
          id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
          label: faker.lorem.words(2),
          description: faker.lorem.sentence(),
          properties: { index: `a${k}` },
        })),
      })),
    })),
  });

  return graph;
};

// TODO(wittjosiah): This needs to be updated for the new graph api.
//   Left it for now because the tree needs to be re-implemented flat.

// export const GraphTree = ({ id, graph = createGraph(), debug }: { id: string; graph?: Graph; debug: boolean }) => {
//   const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
//     // Moving within the tree.
//     if (Path.hasDescendent(id, active.path) && Path.hasDescendent(id, over.path)) {
//       const activeNode = graph.findNode(active.item.id);
//       const overNode = graph.findNode(over.item.id);
//       const activeParent = activeNode?.parent;
//       const overParent = overNode?.parent;
//       if (
//         activeNode &&
//         overNode &&
//         activeParent &&
//         overParent &&
//         activeParent.id === overParent.id &&
//         activeNode.id !== overNode.id &&
//         operation === 'rearrange'
//       ) {
//         // This is a rearrange operation
//         console.warn('[react-ui-mosaic]', 'Tree', 'rearrange', 'needs implementation');
//       } else if (activeNode && activeParent && overParent && operation === 'transfer') {
//         activeParent.removeNode(active.item.id);
//         overNode.addNode('tree', { ...activeNode });
//       }
//     }
//   };

//   const handleOver = (): MosaicOperation => 'transfer';

//   return (
//     <Tree id={id} items={graph.root.children as TreeData[]} onDrop={handleDrop} onOver={handleOver} debug={debug} />
//   );
// };
