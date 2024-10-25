//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { type NodeArg } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { isItem } from '@dxos/react-ui-list';
import { Path } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { NavTree, type NavTreeProps } from './NavTree';
import { createTree, flattenTree, updateState } from '../testing';
import { type NavTreeItem } from '../types';

faker.seed(1234);

type State = {
  tree: NodeArg<any>;
  flatTree: NavTreeItem[];
  open: string[];
  current: string[];
};

const state = create<State>({
  tree: createTree(),
  get flatTree() {
    return flattenTree(this.tree, this.open);
  },
  open: [],
  current: [],
});

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
          updateState({
            state: state.tree,
            instruction,
            source: source.data as NavTreeItem,
            target: target.data as NavTreeItem,
          });
        }
      },
    });
  }, []);

  return <NavTree items={items} open={state.open} current={state.current} {...args} />;
};

const meta: Meta<typeof NavTree> = {
  title: 'plugins/plugin-navtree/NavTree',
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

export const Default = {};
