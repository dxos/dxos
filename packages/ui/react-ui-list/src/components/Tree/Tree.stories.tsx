//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type Instruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useSyncExternalStore } from 'react';

import { type Live, live } from '@dxos/live-object';
import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Path } from '../../util';

import { type TestItem, createTree, updateState } from './testing';
import { Tree, type TreeProps } from './Tree';
import { type TreeData } from './TreeItem';

faker.seed(1234);

const DefaultStory = (props: TreeProps) => {
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

  return <Tree {...props} />;
};

const tree = live<TestItem>(createTree());
const state = new Map<string, Live<{ open: boolean; current: boolean }>>();
const listeners = new Set<() => void>();

const getOrCreateState = (path: string) => {
  let object = state.get(path);
  if (!object) {
    object = live({ open: false, current: false });
    state.set(path, object);
  }
  return object;
};

const notifyListeners = () => listeners.forEach((l) => l());

/** Hook to subscribe to item state reactively. */
const useItemState = (_path: string[]) => {
  const path = useMemo(() => Path.create(..._path), [_path.join('~')]);
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => getOrCreateState(path),
  );
};

const meta = {
  title: 'ui/react-ui-list/Tree',

  decorators: [withTheme],
  component: Tree,
  render: DefaultStory,
  args: {
    id: tree.id,
    useItems: (parent?: TestItem) => {
      return parent?.items ?? tree.items;
    },
    getProps: (parent: TestItem) => ({
      id: parent.id,
      label: parent.name,
      icon: parent.icon,
      ...((parent.items?.length ?? 0) > 0 && {
        parentOf: parent.items!.map(({ id }) => id),
      }),
    }),
    useIsOpen: (_path: string[]) => {
      return useItemState(_path).open;
    },
    useIsCurrent: (_path: string[]) => {
      return useItemState(_path).current;
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
      const object = getOrCreateState(path);
      object.open = open;
      notifyListeners();
    },
    onSelect: ({ path: _path, current }) => {
      const path = Path.create(..._path);
      const object = getOrCreateState(path);
      object.current = current;
      notifyListeners();
    },
  },
} satisfies Meta<typeof Tree<TestItem>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Draggable: Story = {
  args: {
    draggable: true,
  },
};
