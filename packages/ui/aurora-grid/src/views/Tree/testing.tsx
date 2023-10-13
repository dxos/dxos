//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useCallback, useState } from 'react';

import { type Graph, GraphBuilder, type Node } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { arrayMove } from '@dxos/util';

import { Tree, TreeData, TreeProps } from './Tree';
import { MosaicDropEvent, MosaicMoveEvent, Path } from '../../mosaic';
import { TestObjectGenerator, nextRearrangeIndex } from '../../testing';

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

  const handleOver = useCallback(({ active, over }: MosaicMoveEvent<number>) => {
    return !(active.path === id && over.path !== id) ? 'adopt' : 'reject';
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

  return <Tree id={id} items={items} onOver={handleOver} onDrop={handleDrop} />;
};

export const createGraph = () => {
  const content = [...Array(2)].map((_, i) => ({
    id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
    label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
    description: fake('{{commerce.productDescription}}'),
    properties: { index: `a${i}` },
    children: [...Array(2)].map((_, j) => ({
      id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
      label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
      description: fake('{{commerce.productDescription}}'),
      properties: { index: `a${j}` },
      children: [...Array(2)].map((_, k) => ({
        id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
        label: fake('{{commerce.productMaterial}} {{animal.cat}}'),
        description: fake('{{commerce.productDescription}}'),
        properties: { index: `a${k}` },
      })),
    })),
  }));

  return buildGraph(new GraphBuilder().build(), 'tree', content);
};

const graphNodeCompare = (a: Node, b: Node) => {
  if (a.properties.index && b.properties.index) {
    if (a.properties.index < b.properties.index) {
      return -1;
    } else if (a.properties.index > b.properties.index) {
      return 1;
    }
    return 0;
  }
  return 0;
};

export const GraphTree = ({ id, graph = createGraph(), debug }: { id: string; graph?: Graph; debug: boolean }) => {
  // TODO(wittjosiah): This graph does not handle order currently.
  const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
    // Moving within the tree.
    if (Path.hasDescendent(id, active.path) && Path.hasDescendent(id, over.path)) {
      const activeNode = graph.findNode(active.item.id);
      const overNode = graph.findNode(over.item.id);
      const activeParent = activeNode?.parent;
      const overParent = overNode?.parent;
      if (
        activeNode &&
        overNode &&
        activeParent &&
        overParent &&
        activeParent.id === overParent.id &&
        activeNode.id !== overNode.id &&
        operation === 'rearrange'
      ) {
        // This is a rearrange operation
        const nextIndex = nextRearrangeIndex(activeParent.children.sort(graphNodeCompare), activeNode.id, overNode.id);
        activeNode.properties.index = nextIndex ?? 'a0';
      } else if (activeNode && activeParent && overParent && operation === 'adopt') {
        activeParent.removeNode(active.item.id);
        overNode.addNode('tree', { ...activeNode });
      }
    }
  };

  return (
    <Tree
      id={id}
      items={graph.root.children as TreeData[]}
      onDrop={handleDrop}
      debug={debug}
      compare={graphNodeCompare}
    />
  );
};
