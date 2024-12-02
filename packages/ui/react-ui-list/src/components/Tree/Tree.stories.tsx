//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractInstruction, type Instruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { create, type ReactiveObject } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { Path } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Tree } from './Tree';
import { type TreeData } from './TreeItem';
import { createTree, updateState, type TestItem } from './testing';

faker.seed(1234);

const tree = create<TestItem>(createTree());
const state = new Map<string, ReactiveObject<{ open: boolean; current: boolean }>>();

const meta: Meta<typeof Tree> = {
  title: 'ui/react-ui-list/Tree',
  component: Tree,
  decorators: [withTheme, withLayout({ tooltips: true })],
  render: (args) => {
    useEffect(() => {
      return monitorForElements({
        canMonitor: ({ source }) => typeof source.data.id === 'string' && Array.isArray(source.data.path),
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

    return <Tree {...args} />;
  },
  args: {
    id: tree.id,
    getItems: (testItem?: TestItem) => {
      return testItem?.items ?? tree.items;
    },
    getProps: (testItem: TestItem) => ({
      id: testItem.id,
      label: testItem.name,
      icon: testItem.icon,
      ...((testItem.items?.length ?? 0) > 0 && {
        parentOf: testItem.items!.map(({ id }) => id),
      }),
    }),
    isOpen: (_path: string[]) => {
      const path = Path.create(..._path);
      const object = state.get(path) ?? create({ open: false, current: false });
      if (!state.has(path)) {
        state.set(path, object);
      }

      return object.open;
    },
    isCurrent: (_path: string[]) => {
      const path = Path.create(..._path);
      const object = state.get(path) ?? create({ open: false, current: false });
      if (!state.has(path)) {
        state.set(path, object);
      }

      return object.current;
    },
    renderColumns: () => {
      return (
        <div className='flex items-center'>
          <Icon icon='ph--placeholder--regular' size={5} />
        </div>
      );
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

export const Draggable: StoryObj<typeof Tree> = {
  args: {
    draggable: true,
  },
};
