//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { batch } from '@preact/signals-core';
import { type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { Graph, ROOT_ID, type NodeFilter } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals/react';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { isItem } from '@dxos/react-ui-list';
import { Path } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NavTree, type NavTreeProps } from '../components';
import { type NavTreeItem } from '../types';
import { getActions, getChildren, type NavTreeItemGraphNode, treeItemsFromRootNode } from '../util';

faker.seed(3);
registerSignalsRuntime();

const createGraph = () => {
  const graph = new Graph();

  batch(() => {
    (graph as any)._addNode({
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

type State = {
  flatTree: NavTreeItem[];
  open: string[];
  current: string[];
};

const graph = createGraph();
const itemCache = new Map<string, NavTreeItem>();
const state = create<State>({
  get flatTree() {
    return treeItemsFromRootNode(graph, graph.root, this.open, getItem);
  },
  open: [],
  current: [],
});

const getItem = (node: NavTreeItemGraphNode, parent: readonly string[], filter?: NodeFilter) => {
  invariant(graph);
  const path = [...parent, node.id];
  const { actions, groupedActions } = getActions(graph, node);
  const children = getChildren(graph, node, filter, path);
  const parentOf =
    children.length > 0 ? children.map(({ id }) => id) : node.properties.role === 'branch' ? [] : undefined;
  const item = {
    id: node.id,
    label: node.properties.label ?? node.id,
    icon: node.properties.icon,
    path,
    parentOf,
    node,
    actions,
    groupedActions,
  } satisfies NavTreeItem;

  const cachedItem = itemCache.get(node.id);
  // TODO(wittjosiah): This is not a good enough check.
  //   Consider better ways to doing reactive transformations which retain referential equality.
  if (cachedItem && JSON.stringify(item) === JSON.stringify(cachedItem)) {
    return cachedItem;
  } else {
    itemCache.set(node.id, item);
    return item;
  }
};

const Story = (args: Partial<NavTreeProps>) => {
  // NOTE: If passed directly to args, this won't be reactive.
  const items = state.flatTree;

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isItem(source.data),
      onDrop: ({ location, source }) => {
        // Didn't drop on anything.
        if (!location.current.dropTargets.length) {
          return;
        }

        const target = location.current.dropTargets[0];

        const instruction: Instruction | null = extractInstruction(target.data);
        if (instruction !== null) {
          // TODO(wittjosiah): Implement drop logic.
          console.log('update', instruction);
        }
      },
    });
  }, []);

  return <NavTree items={items} open={state.open} current={state.current} {...args} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-navtree/Graph',
  component: NavTree,
  render: Story,
  decorators: [withTheme, withLayout({ tooltips: true })],
  args: {
    onOpenChange: (item: NavTreeItem, open: boolean) => {
      const path = Path.create(...item.path);
      if (open) {
        state.open.push(path);
      } else {
        const index = state.open.indexOf(path);
        if (index > -1) {
          state.open.splice(index, 1);
        }
      }
    },
    onSelect: (item: NavTreeItem, current: boolean) => {
      if (current) {
        state.current.push(item.id);
      } else {
        const index = state.current.indexOf(item.id);
        if (index > -1) {
          state.current.splice(index, 1);
        }
      }
    },
  },
};

export default meta;
