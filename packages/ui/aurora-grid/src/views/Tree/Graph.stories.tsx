//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { GraphBuilder } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';

import { Tree, TreeData } from './Tree';
import { Mosaic, MosaicMoveEvent, Path } from '../../mosaic';
import { FullscreenDecorator } from '../../testing';

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
    <Mosaic.Root debug={debug}>
      <Mosaic.DragOverlay />
      <Tree id={id} items={graph.root.children as TreeData[]} onDrop={handleDrop} debug={debug} />
    </Mosaic.Root>
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
};
