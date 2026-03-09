//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type Instruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { faker } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { Path } from '../../util';

import { type TestItem, createTree, updateState } from './testing';
import { Tree } from './Tree';
import { type TreeModel } from './TreeContext';
import { type TreeData } from './TreeItem';

faker.seed(1234);

const tree = createTree() as TestItem;

const DefaultStory = ({ draggable }: { draggable?: boolean }) => {
  const registry = useContext(RegistryContext);
  const stateAtomsRef = useRef(new Map<string, Atom.Writable<{ open: boolean; current: boolean }>>());

  const getOrCreateStateAtom = useCallback((pathKey: string) => {
    let atom = stateAtomsRef.current.get(pathKey);
    if (!atom) {
      atom = Atom.make({ open: false, current: false }).pipe(Atom.keepAlive);
      stateAtomsRef.current.set(pathKey, atom);
    }
    return atom;
  }, []);

  // Build a lookup map of all items by ID.
  const itemMap = useMemo(() => {
    const map = new Map<string, TestItem>();
    const walk = (item: TestItem) => {
      map.set(item.id, item);
      item.items?.forEach(walk);
    };
    walk(tree);
    return map;
  }, []);

  // Build a child IDs map keyed by parent ID.
  const childIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const walk = (item: TestItem) => {
      if (item.items) {
        map.set(
          item.id,
          item.items.map((child) => child.id),
        );
        item.items.forEach(walk);
      }
    };
    // Root children.
    map.set(
      tree.id,
      (tree.items ?? []).map((child) => child.id),
    );
    walk(tree);
    return map;
  }, []);

  const childIdsFamily = useMemo(
    () => Atom.family((id: string) => Atom.make(() => childIdsMap.get(id) ?? []).pipe(Atom.keepAlive)),
    [childIdsMap],
  );

  const itemFamily = useMemo(
    () => Atom.family((id: string) => Atom.make(() => itemMap.get(id)).pipe(Atom.keepAlive)),
    [itemMap],
  );

  const itemPropsFamily = useMemo(
    () =>
      Atom.family((pathKey: string) => {
        const id = pathKey.split('~').pop()!;
        return Atom.make(() => {
          const parent = itemMap.get(id);
          if (!parent) {
            return { id, label: id };
          }
          return {
            id: parent.id,
            label: parent.name,
            icon: parent.icon,
            ...((parent.items?.length ?? 0) > 0 && {
              parentOf: parent.items!.map(({ id }) => id),
            }),
          };
        }).pipe(Atom.keepAlive);
      }),
    [itemMap],
  );

  const itemOpenFamily = useMemo(
    () =>
      Atom.family((pathKey: string) => {
        const stateAtom = getOrCreateStateAtom(pathKey);
        return Atom.make((get) => get(stateAtom).open).pipe(Atom.keepAlive);
      }),
    [getOrCreateStateAtom],
  );

  const itemCurrentFamily = useMemo(
    () =>
      Atom.family((pathKey: string) => {
        const stateAtom = getOrCreateStateAtom(pathKey);
        return Atom.make((get) => get(stateAtom).current).pipe(Atom.keepAlive);
      }),
    [getOrCreateStateAtom],
  );

  const model: TreeModel<TestItem> = useMemo(
    () => ({
      childIds: (parentId?: string) => childIdsFamily(parentId ?? tree.id),
      item: (id: string) => itemFamily(id),
      itemProps: (path: string[]) => itemPropsFamily(path.join('~')),
      itemOpen: (path: string[]) => itemOpenFamily(Path.create(...path)),
      itemCurrent: (path: string[]) => itemCurrentFamily(Path.create(...path)),
    }),
    [childIdsFamily, itemFamily, itemPropsFamily, itemOpenFamily, itemCurrentFamily],
  );

  const handleOpenChange = useCallback(
    ({ path: pathProp, open }: { path: string[]; open: boolean }) => {
      const path = Path.create(...pathProp);
      const atom = getOrCreateStateAtom(path);
      const prev = registry.get(atom);
      registry.set(atom, { ...prev, open });
    },
    [getOrCreateStateAtom, registry],
  );

  const handleSelect = useCallback(
    ({ path: pathProp, current }: { path: string[]; current: boolean }) => {
      const path = Path.create(...pathProp);
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
      model={model}
      id={tree.id}
      rootId={tree.id}
      draggable={draggable}
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

  decorators: [withTheme(), withRegistry],
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
