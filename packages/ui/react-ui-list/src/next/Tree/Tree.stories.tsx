//
// Copyright 2026 DXOS.org
//

import './tree.css';
import '@dxos/react-ui/next/theme.css';

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '@dxos/react-ui/next/testing';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';

import { createStaticTreeModel } from '../../components/Tree/static-tree-model.ts';
import { type TestItem, createTree, updateState } from '../../components/Tree/testing.ts';
import { Tree, type TreeDropEvent, type TreeVirtualize } from './Tree.tsx';

random.seed(1234);

const ICONS = ['ph--folder--regular', 'ph--file--regular', 'ph--planet--regular', 'ph--gear--regular'];

/** `roots` branches of `leaves` leaves each: `roots * (leaves + 1)` rows once every branch is open. */
const createWideTree = (roots: number, leaves: number): TestItem => ({
  id: 'root',
  name: 'Root',
  items: Array.from({ length: roots }, (_, branch) => ({
    id: `b${branch}`,
    name: `Branch ${branch + 1}`,
    icon: 'ph--folder--regular',
    items: Array.from({ length: leaves }, (_, leaf) => ({
      id: `b${branch}-l${leaf}`,
      name: `Leaf ${branch + 1}.${leaf + 1}`,
      icon: ICONS[leaf % ICONS.length],
      items: [],
    })),
  })),
});

/** A fixed tree for the play test, so names are known. */
const createFixedTree = (): TestItem => ({
  id: 'root',
  name: 'Root',
  items: [
    {
      id: 'fruit',
      name: 'Fruit',
      icon: 'ph--folder--regular',
      items: [
        { id: 'apple', name: 'Apple', items: [] },
        { id: 'banana', name: 'Banana', items: [] },
      ],
    },
    {
      id: 'vegetables',
      name: 'Vegetables',
      icon: 'ph--folder--regular',
      items: [{ id: 'carrot', name: 'Carrot', items: [] }],
    },
    { id: 'grain', name: 'Grain', icon: 'ph--file--regular', items: [] },
  ],
});

type StoryArgs = SizeArgs & {
  tree: () => TestItem;
  open?: boolean;
  virtualize?: TreeVirtualize;
  draggable?: boolean;
  indentGuides?: boolean;
  height?: string;
  testId?: string;
};

/** A static model wired the way a consumer wires one: open/current state written back through the registry. */
const useStaticTree = (source: () => TestItem, open: boolean) => {
  const registry = useContext(RegistryContext);
  const root = useMemo(() => source(), [source]);
  const model = useMemo(
    () =>
      createStaticTreeModel<TestItem>(root, {
        getChildren: (item) => item.items,
        getProps: (item) => ({ label: item.name, icon: item.icon, testId: `row-${item.id}` }),
        isOpen: () => open,
      }),
    [root, open],
  );
  const currentRef = useRef<string[] | undefined>(undefined);

  const onOpenChange = useCallback(
    ({ path, open }: { path: string[]; open: boolean }) => {
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), open });
    },
    [model, registry],
  );

  const onSelect = useCallback(
    ({ path, current }: { path: string[]; current: boolean }) => {
      if (current && currentRef.current) {
        const previous = model.stateAtom(currentRef.current);
        registry.set(previous, { ...registry.get(previous), current: false });
      }
      const atom = model.stateAtom(path);
      registry.set(atom, { ...registry.get(atom), current });
      currentRef.current = current ? path : undefined;
    },
    [model, registry],
  );

  const onDrop = useCallback(
    ({ instruction, source, target }: TreeDropEvent<TestItem>) => {
      updateState({ state: root, instruction, source, target });
      model.refresh((atom, value) => registry.set(atom, value));
    },
    [root, model, registry],
  );

  return { model, onOpenChange, onSelect, onDrop };
};

const DefaultStory = ({
  size = 'md',
  tree,
  open = false,
  virtualize = 'none',
  draggable = false,
  indentGuides = true,
  height = '24rem',
  testId,
}: StoryArgs) => {
  const { model, onOpenChange, onSelect, onDrop } = useStaticTree(tree, open);
  return (
    <div style={{ height, width: '20rem', display: 'flex', flexDirection: 'column' }} data-testid={testId}>
      <Tree.Root
        model={model}
        rootId={model.rootId}
        id={`tree-${size}`}
        size={size}
        virtualize={virtualize}
        draggable={draggable}
        indentGuides={indentGuides}
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        onDrop={onDrop}
      >
        <Tree.Label className='sr-only'>Tree</Tree.Label>
        <Tree.Content />
      </Tree.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-list/next/Tree',
  render: DefaultStory,
  decorators: [withSizes(), withRegistry, withTheme()],
  args: { size: 'md', tree: () => createTree(4, 3), draggable: true },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A static model (4 × 4 × 4), closed; drag rows to move them (before, after, or into a branch). */
export const Default: Story = {};

/** 5,000 rows with every branch open (50 branches of 99 leaves), windowed to the rows in view. */
export const Large: Story = {
  args: { tree: () => createWideTree(50, 99), open: true, virtualize: 'window', height: '32rem' },
};

const rows = (tree: HTMLElement) => within(tree).getAllByRole('treeitem');
const focusedName = () => (document.activeElement as HTMLElement | null)?.textContent;

/**
 * Rows are one block tall at every size. The keyboard follows the APG tree pattern from zag: ArrowDown/Up move,
 * ArrowRight opens a branch then enters it, ArrowLeft returns to the parent then closes it, Home/End, typeahead, and
 * Enter selects; the model receives each change and feeds it back (`aria-expanded`, `aria-selected`).
 */
export const Test: Story = {
  args: { tree: createFixedTree, allSizes: true, draggable: true, testId: 'fixed' },
  play: async ({ canvasElement }) => {
    for (const row of canvasElement.querySelectorAll<HTMLElement>('[data-tree-row]')) {
      // The disclosure cell is a Next.Block, one block square at the row's size.
      const block = row.querySelector('.nx-block')?.getBoundingClientRect().width ?? 0;
      await expect(row.getBoundingClientRect().height, 'row is one block').toBeCloseTo(block, 0);
    }

    const tree = within(canvasElement).getAllByRole('tree')[2];
    const fruit = within(tree).getByRole('treeitem', { name: /Fruit/ });
    await expect(fruit).toHaveAttribute('aria-expanded', 'false');
    await expect(rows(tree)).toHaveLength(3);

    await userEvent.click(within(fruit).getByText('Fruit'));
    await waitFor(() => expect(fruit).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(focusedName()).toContain('Fruit'));

    // Branch disclosure from the keyboard, fed back through the model.
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'true'));
    await expect(rows(tree)).toHaveLength(5);
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(focusedName()).toContain('Apple'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focusedName()).toContain('Banana'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Banana/ })).toHaveAttribute('aria-selected', 'true'),
    );
    await expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(focusedName()).toContain('Fruit'));
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'false'),
    );
    await expect(rows(tree)).toHaveLength(3);

    await userEvent.keyboard('{End}');
    await waitFor(() => expect(focusedName()).toContain('Grain'));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(focusedName()).toContain('Fruit'));
    await userEvent.keyboard('v');
    await waitFor(() => expect(focusedName()).toContain('Vegetables'));

    // Rows are drag sources (pragmatic-dnd) without leaving zag's roving tabstop.
    await expect(within(tree).getByRole('treeitem', { name: /Grain/ })).toHaveAttribute('draggable', 'true');
  },
};

//
// Benchmark
//

type Sample = { mode: TreeVirtualize; mount: number; scroll: { mean: number; p95: number; max: number }; key: number };

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/** Mounts the 5,000-row tree in one mode per run and records mount-to-paint time. */
const BenchmarkStory = () => {
  const [mode, setMode] = useState<TreeVirtualize | undefined>();
  const startRef = useRef(0);
  useLayoutEffect(() => {
    const bench = (window as any).__treeBench ?? ((window as any).__treeBench = {});
    bench.mount = (next: TreeVirtualize | undefined) => {
      startRef.current = performance.now();
      setMode(next);
    };
    bench.start = () => startRef.current;
  }, []);
  return mode ? (
    <DefaultStory key={mode} tree={LARGE} open virtualize={mode} height='32rem' indentGuides testId='bench' />
  ) : null;
};

const LARGE = () => createWideTree(50, 99);

/**
 * Not a test: mounts the Large tree in each virtualization mode and logs initial render (mount to next frame), scroll
 * frame times over 60 frames of 400px steps, and the mean ArrowDown latency, for SPIKE.md.
 */
export const Benchmark: StoryObj<typeof meta> = {
  tags: ['!test'],
  render: () => <BenchmarkStory />,
  play: async ({ canvasElement }) => {
    const bench = (window as any).__treeBench;
    const samples: Sample[] = [];
    for (const mode of ['window', 'css', 'none', 'window'] as TreeVirtualize[]) {
      bench.mount(undefined);
      await nextFrame();
      bench.mount(mode);
      await waitFor(() => expect(canvasElement.querySelector('[data-tree-row]')).not.toBeNull(), { timeout: 30_000 });
      const painted = await nextFrame();
      const mount = painted - bench.start();

      const viewport = canvasElement.querySelector<HTMLElement>('[data-part="tree"]')!;
      const frames: number[] = [];
      let last = await nextFrame();
      for (let frame = 0; frame < 60; frame++) {
        viewport.scrollTop += 400;
        const now = await nextFrame();
        frames.push(now - last);
        last = now;
      }
      frames.sort((a, b) => a - b);
      const scroll = {
        mean: frames.reduce((sum, value) => sum + value, 0) / frames.length,
        p95: frames[Math.floor(frames.length * 0.95)],
        max: frames[frames.length - 1],
      };

      viewport.scrollTop = 0;
      await nextFrame();
      const first = canvasElement.querySelector<HTMLElement>('[data-tree-row]')!;
      first.focus();
      const keyStart = performance.now();
      for (let press = 0; press < 20; press++) {
        await userEvent.keyboard('{ArrowDown}');
      }
      await nextFrame();
      const key = (performance.now() - keyStart) / 20;
      samples.push({ mode, mount, scroll, key });
      // eslint-disable-next-line no-console
      console.log(`[tree-bench] ${JSON.stringify({ mode, rows: 5000, mount, scroll, key })}`);
    }
    await expect(samples).toHaveLength(4);
  },
};
