//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { useCallback } from 'react';

import { GraphBuilder } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { getDebugName } from '@dxos/util';

import { Tree, TreeData } from './Tree';
import { MosaicMoveEvent, Path } from '../../dnd';
import { FullscreenDecorator, MosaicDecorator } from '../../testing';

faker.seed(3);
const fake = faker.helpers.fake;

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

const TreeStory = ({ id = 'tree', debug }: { id: string; debug: boolean }) => {
  // TODO(wittjosiah): This is buggy, partly because the graph is not intended to be used as a primary data source.
  const handleDrop = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      console.log({ active, over, a: getDebugName(active.item), o: getDebugName(over.item) });

      // TODO(wittjosiah): Bug where dropping at the top over sortable causes node to disappear.
      //   Seems like somehow the active and over item are the same item despite having different containers.
      //   Potentially this is from it being "over" it's own ghost?

      // Moving within the tree.
      if (Path.hasDescendent(id, active.container) && Path.hasDescendent(id, over.container)) {
        const activeNode = graph.findNode(active.item.id);
        const activeParent = activeNode?.parent;
        const overNode = graph.findNode(over.item.id);
        const overParent = overNode?.parent;

        if (activeNode && activeParent && overParent) {
          overParent.addNode('tree', { ...activeNode });
          activeParent.removeNode(active.item.id);
        }
      }
    },
    [graph],
  );

  return (
    <Tree.Root id={id} items={graph.root.children} onDrop={handleDrop} debug={debug}>
      {graph.root.children.map((item, index) => (
        <Tree.Tile key={item.id} item={item as TreeData} index={index} />
      ))}
    </Tree.Root>
  );
};

export default {
  title: 'Tree',
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Graph = {
  args: { debug: true },
  render: TreeStory,
  decorators: [MosaicDecorator],
};
