//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { isActionLike, type NodeArg } from '@dxos/app-graph';
import { create, type ReactiveObject } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { isTreeData, type TreeData } from '@dxos/react-ui-list';
import { Path } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NavTree } from './NavTree';
import { createTree, updateState } from '../testing';

faker.seed(1234);

const tree = create<NodeArg<any>>(createTree());
const state = new Map<string, ReactiveObject<{ open: boolean; current: boolean }>>();

const meta: Meta<typeof NavTree> = {
  title: 'plugins/plugin-navtree/NavTree',
  component: NavTree,
  decorators: [withTheme, withLayout({ tooltips: true })],
  render: (args) => {
    useEffect(() => {
      return monitorForElements({
        canMonitor: ({ source }) => isTreeData(source),
        onDrop: ({ location, source }) => {
          // Didn't drop on anything.
          if (!location.current.dropTargets.length) {
            return;
          }

          const target = location.current.dropTargets[0];
          const instruction: Instruction | null = extractInstruction(target.data);
          if (instruction !== null) {
            updateState({
              state: tree,
              instruction,
              source: source.data as TreeData,
              target: target.data as TreeData,
            });
          }
        },
      });
    }, []);

    return <NavTree {...args} />;
  },
  args: {
    id: tree.id,
    getActions: (arg: NodeArg<any>) => ({
      actions: arg.nodes?.filter((node) => isActionLike(node)) ?? [],
      groupedActions: {},
    }),
    getItems: (testItem?: NodeArg<any>) => {
      return testItem?.nodes ?? tree.nodes ?? [];
    },
    getProps: (testItem: NodeArg<any>) => ({
      id: testItem.id,
      label: testItem.properties?.label ?? testItem.id,
      icon: testItem.properties?.icon,
      ...((testItem.nodes?.length ?? 0) > 0 && {
        parentOf: testItem.nodes!.map(({ id }) => id),
      }),
    }),
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

export const Default = {};
