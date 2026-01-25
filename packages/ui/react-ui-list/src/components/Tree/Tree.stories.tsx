//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type Instruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { Path } from '../../util';

import { type TestItem, createTree, updateState } from './testing';
import { Tree } from './Tree';
import { type TreeData } from './TreeItem';

faker.seed(1234);

const tree = createTree() as TestItem;

const DefaultStory = ({ draggable }: { draggable?: boolean }) => {
  const registry = useContext(RegistryContext);
  const stateAtomsRef = useRef(new Map<string, Atom.Writable<{ open: boolean; current: boolean }>>());

  const getOrCreateStateAtom = useCallback((path: string) => {
    let atom = stateAtomsRef.current.get(path);
    if (!atom) {
      atom = Atom.make({ open: false, current: false }).pipe(Atom.keepAlive);
      stateAtomsRef.current.set(path, atom);
    }
    return atom;
  }, []);

  const useItemState = useCallback(
    (_path: string[]) => {
      const path = useMemo(() => Path.create(..._path), [_path.join('~')]);
      const atom = getOrCreateStateAtom(path);
      return useAtomValue(atom);
    },
    [getOrCreateStateAtom],
  );

  const handleOpenChange = useCallback(
    ({ path: _path, open }: { path: string[]; open: boolean }) => {
      const path = Path.create(..._path);
      const atom = getOrCreateStateAtom(path);
      const prev = registry.get(atom);
      registry.set(atom, { ...prev, open });
    },
    [getOrCreateStateAtom, registry],
  );

  const handleSelect = useCallback(
    ({ path: _path, current }: { path: string[]; current: boolean }) => {
      const path = Path.create(..._path);
      const atom = getOrCreateStateAtom(path);
      const prev = registry.get(atom);
      registry.set(atom, { ...prev, current });
    },
    [getOrCreateStateAtom, registry],
  );

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => typeof source.data.id === 'string' && Array.isArray(source.data.path),
      onDrop: ({ location, source }) => {
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

  return (
    <Tree
      id={tree.id}
      draggable={draggable}
      useItems={(parent?: TestItem) => parent?.items ?? tree.items}
      getProps={(parent: TestItem) => ({
        id: parent.id,
        label: parent.name,
        icon: parent.icon,
        ...((parent.items?.length ?? 0) > 0 && {
          parentOf: parent.items!.map(({ id }) => id),
        }),
      })}
      useIsOpen={(_path: string[]) => useItemState(_path).open}
      useIsCurrent={(_path: string[]) => useItemState(_path).current}
      renderColumns={() => (
        <div className='flex items-center'>
          <Icon icon='ph--placeholder--regular' size={5} />
        </div>
      )}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
    />
  );
};

const meta = {
  title: 'ui/react-ui-list/Tree',

  decorators: [withTheme, withRegistry],
  component: Tree,
  render: DefaultStory,
} satisfies Meta<typeof Tree<TestItem>>;

export default meta;

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {};

export const Draggable: Story = {
  args: {
    draggable: true,
  },
};
