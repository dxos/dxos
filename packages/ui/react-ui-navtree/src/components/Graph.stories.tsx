//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { type Graph as GraphType, GraphBuilder } from '@dxos/app-graph';
import { buildGraph } from '@dxos/app-graph/testing';
import { DensityProvider, Tooltip } from '@dxos/react-ui';
import { type MosaicDropEvent, Path } from '@dxos/react-ui-mosaic';
import { Mosaic } from '@dxos/react-ui-mosaic';

import { NavTree } from './NavTree';

faker.seed(3);
const fake = faker.helpers.fake;

const ROOT_ID = 'root';

const createGraph = () => {
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

const StorybookNavTree = ({ id = ROOT_ID, graph = createGraph() }: { id?: string; graph?: GraphType }) => {
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
        console.warn('[react-ui-navtree]', 'Graph', 'rearrange', 'needs implementation');
      } else if (activeNode && activeParent && overParent && operation === 'transfer') {
        activeParent.removeNode(active.item.id);
        overNode.addNode('tree', { ...activeNode });
      }
    }
  };

  return <NavTree node={graph.root} onDrop={handleDrop} />;
};

export default {
  title: 'react-ui-navtree/Graph',
  component: NavTree,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story: any) => (
      <Tooltip.Provider>
        <DensityProvider density='fine'>
          <div role='none' className='p-2'>
            <Story />
          </div>
        </DensityProvider>
      </Tooltip.Provider>
    ),
  ],
};

export const Default = {
  render: ({ debug }: { debug?: boolean }) => (
    <Mosaic.Root debug={debug}>
      <StorybookNavTree />
      <Mosaic.DragOverlay />
    </Mosaic.Root>
  ),
};
