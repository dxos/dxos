//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { Path } from '@dxos/react-ui-mosaic';
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

const meta: Meta<typeof Tree> = {
  title: 'ui/react-ui-list/Tree',
  component: Tree,
  render: Story,
  decorators: [withTheme, withLayout({ tooltips: true })],
  args: {
    renderColumns: () => {
      return (
        <div className='flex items-center'>
          <Icon icon='ph--placeholder--regular' size={5} />
        </div>
      );
    },
    onOpenChange: (item: ItemType, open: boolean) => {
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
  },
};

export default meta;

export const Default = {};

export const Draggable: StoryObj<typeof Tree> = {
  args: {
    draggable: true,
  },
};
