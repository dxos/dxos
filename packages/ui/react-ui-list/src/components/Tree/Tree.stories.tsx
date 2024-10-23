//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import React, { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Tree, type TreeProps } from './Tree';
import { createTree, flattenTree, getItem, updateState, type TestItem } from './testing';
import { isItem, type ItemType } from './types';

faker.seed(1234);

type State = {
  tree: TestItem;
  open: string[];
  current: string[];
  flatTree: ItemType[];
};

const state = create<State>({
  tree: createTree(),
  open: [],
  current: [],
  get flatTree() {
    return flattenTree(this.tree, this.open, getItem);
  },
});

const Story = (args: Partial<TreeProps>) => {
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
            source: source.data as ItemType,
            target: target.data as ItemType,
          });
        }
      },
    });
  }, []);

  return <Tree items={items} open={state.open} current={state.current} {...args} />;
};

export default {
  title: 'react-ui-list/Tree',
  component: Tree,
  render: Story,
  decorators: [withTheme, withLayout({ tooltips: true })],
  args: {
    renderColumns: () => {
      return <Icon icon='ph--placeholder--regular' size={5} />;
    },
    onOpenChange: (item: ItemType, open: boolean) => {
      if (open) {
        state.open.push(item.id);
      } else {
        const index = state.open.indexOf(item.id);
        if (index > -1) {
          state.open.splice(index, 1);
        }
      }
    },
    onSelect: (item: ItemType, current: boolean) => {
      if (current) {
        state.current.push(item.id);
      } else {
        const index = state.current.indexOf(item.id);
        if (index > -1) {
          state.current.splice(index, 1);
        }
      }
    },
  } satisfies Partial<TreeProps>,
};

export const Default = {};

export const Draggable = {
  args: {
    draggable: true,
  } satisfies Partial<TreeProps>,
};
