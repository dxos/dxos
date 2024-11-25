//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { batch } from '@preact/signals-core';
import { type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { Graph, ROOT_ID, type Node } from '@dxos/app-graph';
import { create, type ReactiveObject } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals/react';
import { faker } from '@dxos/random';
import { isTreeData, type PropsFromTreeItem } from '@dxos/react-ui-list';
import { Path } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NavTree } from '../components';
import { getActions, getChildren } from '../util';

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

const graph = createGraph();
const state = new Map<string, ReactiveObject<{ open: boolean; current: boolean }>>();

export const Default = {};

const meta: Meta<typeof NavTree> = {
  title: 'plugins/plugin-navtree/Graph',
  component: NavTree,
  decorators: [withTheme, withLayout({ tooltips: true })],
  render: (args) => {
    useEffect(() => {
      return monitorForElements({
        canMonitor: ({ source }) => isTreeData(source.data),
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

    return <NavTree {...args} />;
  },
  args: {
    id: graph.root.id,
    getActions: (node: Node) => getActions(graph, node),
    getItems: (node?: Node) => graph.nodes(node ?? graph.root),
    getProps: (node: Node, path: string[]) => {
      const children = getChildren(graph, node, undefined, path);
      const parentOf =
        children.length > 0 ? children.map(({ id }) => id) : node.properties.role === 'branch' ? [] : undefined;
      return {
        id: node.id,
        label: node.properties.label ?? node.id,
        icon: node.properties.icon,
        parentOf,
      } satisfies PropsFromTreeItem;
    },
    isOpen: (_path: string[]) => {
      const path = Path.create(..._path);
      const value = state.get(path) ?? create({ open: false, current: false });
      if (!state.has(path)) {
        state.set(path, value);
      }

      return value.open;
    },
    isCurrent: (_path: string[]) => {
      const path = Path.create(..._path);
      const value = state.get(path) ?? create({ open: false, current: false });
      if (!state.has(path)) {
        state.set(path, value);
      }

      return value.current;
    },
    onOpenChange: ({ path: _path, open }) => {
      const path = Path.create(..._path);
      const object = state.get(path);
      object!.open = open;
    },
    onSelect: ({ path: _path, current }) => {
      const path = Path.create(..._path);
      const object = state.get(path);
      object!.current = current;
    },
  },
};

export default meta;
