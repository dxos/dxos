//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import React, { useEffect } from 'react';

import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Tree, type TreeProps } from './Tree';
import { createTree, flattenTree, type TestItem } from './testing';
import { isItem, type ItemType } from './types';

faker.seed(1234);

// Ensures that the same item is not created multiple times, causing the tree to be re-rendered.
const itemsCache: Record<string, ItemType> = {};
const getItem = (testItem: TestItem, parent?: string[]): ItemType => {
  const cachedItem = itemsCache[testItem.id];
  if (cachedItem) {
    return cachedItem;
  }

  const item = {
    id: testItem.id,
    name: testItem.name,
    icon: testItem.icon,
    path: parent ? [...parent, testItem.id] : [testItem.id],
    ...((testItem.items?.length ?? 0) > 0 && {
      parentOf: testItem.items!.map(({ id }) => id),
    }),
  };
  itemsCache[testItem.id] = item;
  return item;
};

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
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        if (!isItem(sourceData) || !isItem(targetData)) {
          return;
        }

        const sourceIdx = items.findIndex((item) => item.id === sourceData.id);
        const targetIdx = items.findIndex((item) => item.id === targetData.id);
        if (targetIdx < 0 || sourceIdx < 0) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);
        flushSync(() => {
          setItems(
            reorderWithEdge({
              list: items,
              startIndex: sourceIdx,
              indexOfTarget: targetIdx,
              axis: 'vertical',
              closestEdgeOfTarget,
            }),
          );
        });
      },
    });
  }, []);

  return <Tree items={items} open={state.open} current={state.current} {...args} />;
};

export default {
  title: 'react-ui-list-x/Tree',
  component: Tree,
  render: Story,
  decorators: [withTheme],
  args: {
    onOpenChange: (id: string, open: boolean) => {
      if (open) {
        state.open.push(id);
      } else {
        const index = state.open.indexOf(id);
        if (index > -1) {
          state.open.splice(index, 1);
        }
      }
    },
    onSelect: (id: string, current: boolean) => {
      if (current) {
        state.current.push(id);
      } else {
        const index = state.current.indexOf(id);
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
