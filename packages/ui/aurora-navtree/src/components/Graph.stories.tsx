//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React from 'react';

import { type Graph as GraphType, GraphBuilder } from '@braneframe/plugin-graph';
import { buildGraph } from '@braneframe/plugin-graph/testing';
import { DensityProvider, Tooltip } from '@dxos/aurora';
import { type MosaicDropEvent, Path } from '@dxos/aurora-grid/next';
import { Mosaic } from '@dxos/aurora-grid/next';

import { NavTree } from './NavTree';
import { nextRearrangeIndex } from '../testing';
import type { TreeNode } from '../types';

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

const graphNodeCompare = (a: TreeNode, b: TreeNode) => {
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
        const nextIndex = nextRearrangeIndex(activeParent.children.sort(graphNodeCompare), activeNode.id, overNode.id);
        activeNode.properties.index = nextIndex ?? 'a0';
      } else if (activeNode && activeParent && overParent && operation === 'adopt') {
        activeParent.removeNode(active.item.id);
        overNode.addNode('tree', { ...activeNode });
      }
    }
  };

  return <NavTree node={graph.root} onDrop={handleDrop} compare={graphNodeCompare} />;
};

export default {
  title: 'Components/NavTree/Graph',
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

export const Graph = {
  render: ({ debug }: { debug?: boolean }) => (
    <Mosaic.Root debug={debug}>
      <StorybookNavTree />
      <Mosaic.DragOverlay />
    </Mosaic.Root>
  ),
};
