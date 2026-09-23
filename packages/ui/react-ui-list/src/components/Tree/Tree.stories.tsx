//
// Copyright 2024 DXOS.org
//

import { type Instruction, extractInstruction } from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';
import { Icon } from '@dxos/react-ui';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';

import { Path } from '../../util/index.ts';
import { type TestItem, createTree, updateState } from './testing.ts';
import { type TreeData } from './tree-data.ts';
import { Tree } from './Tree.tsx';
import { type TreeModel } from './TreeContext.ts';

random.seed(1234);

const tree = createTree();
const groupsTree = createTree(4, 4, { groups: true });
// Three childless nodes the story still presents as branches (a folder with nothing in it).
const emptyTree = createTree(3, 1);
// Flat and long, which is the shape `virtualize` is for.
const longTree = createTree(120, 1);
// Long and one level deep, so windowing has branches to flatten.
const branchTree = createTree(30, 2);

const DefaultStory = ({
  draggable,
  groups,
  emptyBranches,
  unselectableBranches,
  disabledRows,
  selectionMode = 'single',
  virtualize,
  branches,
}: {
  draggable?: boolean;
  groups?: boolean;
  /** Present childless nodes as branches, as a model does for an empty folder. */
  emptyBranches?: boolean;
  unselectableBranches?: boolean;
  /** Disable the first row, as a model does for one nothing can be done with yet. */
  disabledRows?: boolean;
  selectionMode?: 'single' | 'multiple';
  /** Render a long list in a short scroller, windowed to what is in view. */
  virtualize?: boolean;
  /** With `virtualize`, a list of branches rather than of leaves. */
  branches?: boolean;
}) => {
  const rootTree = virtualize
    ? branches
      ? branchTree
      : longTree
    : emptyBranches
      ? emptyTree
      : groups
        ? groupsTree
        : tree;
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
    walk(rootTree);
    return map;
  }, [rootTree]);

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
      rootTree.id,
      (rootTree.items ?? []).map((child) => child.id),
    );
    walk(rootTree);
    return map;
  }, [rootTree]);

  // Writable so drops can push new child orderings (a derived `Atom.make(() => …)` would snapshot
  // the initial map and never reflect the reorder).
  const childIdsFamily = useMemo(
    () => Atom.family((id: string) => Atom.make<string[]>(childIdsMap.get(id) ?? []).pipe(Atom.keepAlive)),
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
            disposition: parent.disposition,
            disabled: disabledRows && id === rootTree.items?.[0]?.id,
            ...(((parent.items?.length ?? 0) > 0 || emptyBranches) && {
              parentOf: parent.items!.map(({ id }) => id),
              count: parent.items!.length,
              // Demonstrate the rose "new/modified" badge on a subset of branches (replaces the neutral count).
              ...(parent.name.length % 3 === 0 && { modifiedCount: (parent.name.length % 5) + 1 }),
            }),
          };
        }).pipe(Atom.keepAlive);
      }),
    [itemMap, emptyBranches, disabledRows, rootTree],
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
      childIds: (parentId?: string) => childIdsFamily(parentId ?? rootTree.id),
      item: (id: string) => itemFamily(id),
      itemProps: (path: string[]) => itemPropsFamily(path.join('~')),
      itemOpen: (path: string[]) => itemOpenFamily(Path.create(...path)),
      itemCurrent: (path: string[]) => itemCurrentFamily(Path.create(...path)),
    }),
    [childIdsFamily, itemFamily, itemPropsFamily, itemOpenFamily, itemCurrentFamily, rootTree.id],
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

  const setCurrent = useCallback(
    (pathKey: string, current: boolean) => {
      const atom = getOrCreateStateAtom(pathKey);
      registry.set(atom, { ...registry.get(atom), current });
    },
    [getOrCreateStateAtom, registry],
  );

  const currentPathsRef = useRef(new Set<string>());
  const handleSelect = useCallback(
    ({ path: pathProp, current, meta }: { path: string[]; current: boolean; meta: boolean }) => {
      const path = Path.create(...pathProp);
      if (current && (selectionMode === 'single' || !meta)) {
        currentPathsRef.current.forEach((previous) => previous !== path && setCurrent(previous, false));
        currentPathsRef.current = new Set([path]);
      } else if (current) {
        currentPathsRef.current.add(path);
      } else {
        currentPathsRef.current.delete(path);
      }
      setCurrent(path, current);
    },
    [selectionMode, setCurrent],
  );

  const handleCanSelect = useCallback(
    ({ item }: { item: TestItem }) => !unselectableBranches || (item.items?.length ?? 0) === 0,
    [unselectableBranches],
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
            state: rootTree,
            instruction,
            source: source.data as TreeData,
            target: target.data as TreeData,
          });

          // `updateState` mutates the tree in place; push the new child orderings into the
          // (writable) childIds atoms so the affected branches re-render.
          const refresh = (item: TestItem) => {
            registry.set(
              childIdsFamily(item.id),
              (item.items ?? []).map((child) => child.id),
            );
            item.items?.forEach(refresh);
          };
          registry.set(
            childIdsFamily(rootTree.id),
            (rootTree.items ?? []).map((child) => child.id),
          );
          rootTree.items?.forEach(refresh);
        }
      },
    });
  }, [rootTree, childIdsFamily, registry]);

  const subject = (
    <Tree
      model={model}
      id={rootTree.id}
      rootId={rootTree.id}
      draggable={draggable}
      selectionMode={selectionMode}
      canSelect={handleCanSelect}
      virtualize={virtualize}
      renderColumns={() => (
        <div className='flex items-center'>
          <Icon icon='ph--circle-dashed--regular' />
        </div>
      )}
      onOpenChange={handleOpenChange}
      onSelect={handleSelect}
    />
  );

  // A scroller short enough that most of the list is off screen, which is what the observer reads.
  return virtualize ? (
    <div data-testid='tree.scroller' className='h-[240px] overflow-y-auto'>
      {subject}
    </div>
  ) : (
    subject
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

export const WithGroups: Story = {
  args: { groups: true },
};

/**
 * A childless branch has nothing to disclose: its chevron is disabled, and a click neither opens it
 * nor changes the tree's height (its content, were it shown, used to draw the tree's row gap around
 * a zero-height row).
 */
export const EmptyBranch: Story = {
  args: { emptyBranches: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tree = await canvas.findByRole('tree');
    const toggle = (await canvas.findAllByTestId('treeItem.toggle'))[0];
    const branch = toggle.closest('[data-part="branch"]');
    if (!branch) {
      throw new Error('Expected toggle to have a "branch" ancestor.');
    }
    const height = tree.getBoundingClientRect().height;

    await expect(toggle).toBeDisabled();
    await userEvent.click(toggle);
    // Past the disclose animation, which interpolates the content's block size.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(branch).toHaveAttribute('data-state', 'closed');
    await expect(tree.getBoundingClientRect().height).toBe(height);
  },
};

export const UnselectableBranches: Story = {
  args: { draggable: true, unselectableBranches: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [branch] = await canvas.findAllByRole('button', { expanded: false });

    await userEvent.click(branch);
    await expect(branch.closest('[data-part="branch"]')).toHaveAttribute('data-state', 'open');
    await expect(branch).not.toHaveAttribute('data-selected');

    await userEvent.click(branch);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(branch.closest('[data-part="branch"]')).toHaveAttribute('data-state', 'closed');
  },
};

export const Collapse: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('tree');
    const [toggle] = await canvas.findAllByTestId('treeItem.toggle');
    const branch = toggle.closest('[data-part="branch"]')!;
    const height = () => branch.querySelector('[data-part="branch-content"]')?.getBoundingClientRect().height ?? 0;

    const chevron = () => getComputedStyle(toggle.querySelector('svg')!);
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(height()).toBeGreaterThan(0));
    await waitFor(() => expect(chevron().rotate).toBe('90deg'));
    await expect(chevron().transitionDelay).toBe('0s');

    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(height()).toBeGreaterThan(0);
    await expect(chevron().transitionDelay).toBe('0.2s');
    await waitFor(() => expect(height()).toBe(0));
    await waitFor(() => expect(chevron().rotate).not.toBe('90deg'));

    await userEvent.click(toggle);
    await waitFor(() => expect(height()).toBeGreaterThan(0));
    toggle.click();
    toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(height()).toBeGreaterThan(0));
  },
};

export const Selection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('tree');
    const rows = canvasElement.querySelectorAll<HTMLElement>('[data-object-id]');
    const [first, second] = [rows[0], rows[1]];
    const label = (row: HTMLElement) => row.querySelector<HTMLElement>('span[data-tooltip]')!;

    await userEvent.click(label(first));
    await expect(first).toHaveAttribute('data-selected');
    await expect(first.closest('[data-part="branch"]')).toHaveAttribute('data-state', 'closed');

    await userEvent.click(label(first));
    await expect(first).toHaveAttribute('data-selected');
    await expect(first.closest('[data-part="branch"]')).toHaveAttribute('data-state', 'closed');

    await userEvent.click(label(second));
    await expect(second).toHaveAttribute('data-selected');
    await expect(first).not.toHaveAttribute('data-selected');

    await userEvent.keyboard(' ');
    await expect(second.closest('[data-part="branch"]')).toHaveAttribute('data-state', 'open');
    await userEvent.keyboard('{Enter}');
    await expect(second).toHaveAttribute('data-selected');
    await expect(second.closest('[data-part="branch"]')).toHaveAttribute('data-state', 'open');

    await userEvent.click(label(first));
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');
    await expect(second).toHaveAttribute('data-selected');
    await expect(first).not.toHaveAttribute('data-selected');
  },
};

export const MultipleSelection: Story = {
  args: { selectionMode: 'multiple' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('tree');
    const rows = canvasElement.querySelectorAll<HTMLElement>('[data-object-id]');
    const selected = () =>
      [...rows]
        .slice(0, 4)
        .map((row) => (row.hasAttribute('data-selected') ? 1 : 0))
        .join('');
    // One session, so the held modifier survives from the keyboard call into the click: the
    // top-level `userEvent` helpers each start their own and would drop it.
    const user = userEvent.setup();
    const metaClick = async (row: HTMLElement) => {
      await user.keyboard('{Meta>}');
      await user.click(row.querySelector<HTMLElement>('span[data-tooltip]')!);
      await user.keyboard('{/Meta}');
    };

    await userEvent.click(rows[0].querySelector<HTMLElement>('span[data-tooltip]')!);
    await expect(selected()).toBe('1000');

    await metaClick(rows[1]);
    await expect(selected()).toBe('1100');

    await metaClick(rows[1]);
    await expect(selected()).toBe('1000');

    await userEvent.click(rows[2].querySelector<HTMLElement>('span[data-tooltip]')!);
    await expect(selected()).toBe('0010');
  },
};

/** A disabled row answers nothing: it neither selects nor discloses, by pointer or by key. */
export const DisabledRows: Story = {
  args: { disabledRows: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('tree');
    const [row] = canvasElement.querySelectorAll<HTMLElement>('[data-object-id]');
    const branch = row.closest('[data-part="branch"]')!;

    await userEvent.click(row.querySelector<HTMLElement>('span[data-tooltip]')!);
    await expect(row).not.toHaveAttribute('data-selected');
    await expect(branch).toHaveAttribute('data-state', 'closed');

    row.focus();
    await userEvent.keyboard(' ');
    await expect(branch).toHaveAttribute('data-state', 'closed');

    await userEvent.keyboard('{Enter}');
    await expect(row).not.toHaveAttribute('data-selected');
  },
};

/**
 * A long list mounts only the rows in view, and the mounted range travels with the scroll.
 *
 * The scrollbar is the whole list's — the sizer carries the extent of the rows that are not
 * mounted — so what this asserts is that the two stay consistent: a slice in the DOM, the full
 * height under the thumb, and the slice moving rather than growing as the reader scrolls.
 */
export const TestWindowMountsAVisibleSlice: Story = {
  args: { virtualize: true },
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="tree.scroller"]')!;
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[role="treeitem"]'));
    const indices = () => rows().map((row) => Number(row.dataset.index));

    // Only the rows in view exist: the rest are extent in the sizer, not elements.
    await waitFor(async () => expect(rows().length).toBeGreaterThan(0), { timeout: 5_000 });
    await waitFor(async () => expect(rows().length).toBeLessThan(120), { timeout: 5_000 });

    // The scrollbar is scaled to the whole list, not to what is mounted.
    await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight * 4);

    const before = indices();
    await expect(before[0]).toEqual(0);

    // Scrolling moves the mounted range rather than adding to it.
    scroller.scrollTo({ top: scroller.scrollHeight });
    await waitFor(async () => expect(indices()[0]).toBeGreaterThan(before[0]), { timeout: 5_000 });
    await expect(rows().length).toBeLessThan(120);
    await expect(indices()[indices().length - 1]).toEqual(119);

    scroller.scrollTo({ top: 0 });
    await waitFor(async () => expect(indices()[0]).toEqual(0), { timeout: 5_000 });
  },
};

/**
 * A windowed tree flattens an open branch's children into rows of the window after their parent,
 * so a hierarchical list is windowed rather than rendered whole.
 */
export const TestWindowFlattensOpenBranches: Story = {
  args: { virtualize: true, branches: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="tree.scroller"]')!;
    const rows = () => Array.from(canvasElement.querySelectorAll<HTMLElement>('[role="treeitem"]'));
    const indices = () => rows().map((row) => Number(row.dataset.index));

    // Thirty closed branches, windowed: every mounted row, branch or not, is one the window measures.
    await waitFor(async () => expect(rows().length).toBeGreaterThan(0), { timeout: 5_000 });
    await waitFor(async () => expect(rows().length).toBeLessThan(30), { timeout: 5_000 });
    await expect(indices().every((index) => Number.isInteger(index))).toBe(true);

    // Opening the first branch mounts its children directly after it, one level down.
    const [toggle] = await canvas.findAllByTestId('treeItem.toggle');
    await userEvent.click(toggle);
    await waitFor(async () => expect(rows()[1]?.getAttribute('aria-level')).toEqual('2'), { timeout: 5_000 });
    await expect(rows()[1].dataset.index).toEqual('1');

    // The scrollbar spans the children too: the last unit is the thirtieth branch, after 30 children.
    scroller.scrollTo({ top: scroller.scrollHeight });
    await waitFor(async () => expect(indices()[indices().length - 1]).toEqual(59), { timeout: 5_000 });
  },
};
