//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { batch } from '@preact/signals-core';
import React from 'react';

import { Graph } from '@dxos/app-graph';
import { registerSignalRuntime } from '@dxos/echo-signals/react';
import { faker } from '@dxos/random';
import { DensityProvider, Tooltip } from '@dxos/react-ui';
import { Mosaic, Path, type MosaicDropEvent, type MosaicMoveEvent, type MosaicOperation } from '@dxos/react-ui-mosaic';
import { arrayMove } from '@dxos/util';

import { NavTree } from './NavTree';
import { treeNodeFromGraphNode } from '../helpers';

faker.seed(3);
registerSignalRuntime();

const createGraph = () => {
  const graph = new Graph();

  batch(() => {
    graph.addNodes({
      id: ROOT_ID,
      nodes: [...Array(2)].map((_, i) => ({
        id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
        properties: { index: `a${i}`, label: faker.lorem.words(2), description: faker.lorem.sentence() },
        nodes: [...Array(2)].map((_, j) => ({
          id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
          properties: { index: `a${j}`, label: faker.lorem.words(2), description: faker.lorem.sentence() },
          nodes: [...Array(2)].map((_, k) => ({
            id: faker.string.hexadecimal({ length: 4 }).slice(2).toUpperCase(),
            properties: { index: `a${k}`, label: faker.lorem.words(2), description: faker.lorem.sentence() },
          })),
        })),
      })),
    });
  });

  return graph;
};

const ROOT_ID = 'root';
const graph = createGraph();
const tree = treeNodeFromGraphNode(graph.root);

const StorybookNavTree = ({ id = ROOT_ID }: { id?: string }) => {
  const handleOver = ({ active, over }: MosaicMoveEvent<number>): MosaicOperation => {
    // Reject all operations that don’t match the graph’s root id
    if (Path.first(active.path) !== id || Path.first(over.path) !== Path.first(active.path)) {
      return 'reject';
    }
    // Rearrange if rearrange is supported and active and over are siblings
    else if (Path.siblings(over.path, active.path)) {
      return graph.findNode(Path.last(Path.parent(over.path)))?.properties.onRearrangeChildren ? 'rearrange' : 'reject';
    }
    // Rearrange if rearrange is supported and active is or would be a child of over
    else if (Path.hasChild(over.path, active.path)) {
      return graph.findNode(Path.last(over.path))?.properties.onRearrangeChildren ? 'rearrange' : 'reject';
    }
    // Check if transfer is supported
    else {
      const overNode = graph.findNode(Path.last(over.path));
      const activeNode = graph.findNode(Path.last(active.path));
      if (overNode && activeNode) {
        return 'transfer';
      } else {
        return 'reject';
      }
    }
  };

  const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
    batch(() => {
      const activeNode = graph.findNode(active.item.id);
      const overNode = graph.findNode(over.item.id);
      const activeParent = activeNode?.nodes({ direction: 'inbound' })[0];
      const overParent = overNode?.nodes({ direction: 'inbound' })[0];
      if (
        activeNode &&
        overNode &&
        activeParent &&
        overParent &&
        activeParent.id === overParent.id &&
        activeNode.id !== overNode.id &&
        operation === 'rearrange'
      ) {
        const ids = activeParent.nodes().map((node) => node.id);
        const activeIndex = ids.indexOf(activeNode.id);
        const overIndex = ids.indexOf(overNode.id);
        graph.sortEdges(
          activeParent.id,
          'outbound',
          arrayMove(ids, activeIndex, overIndex > -1 ? overIndex : ids.length - 1),
        );
      } else if (activeNode && activeParent && overParent && operation === 'transfer') {
        graph.removeEdge({ source: activeParent.id, target: activeNode.id });
        graph.addEdge({ source: overNode.id, target: activeNode.id });
      }
    });
  };

  return <NavTree node={tree} onDrop={handleDrop} onOver={handleOver} />;
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
