//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { type Mock, expect, fn, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import { random } from '@dxos/random';
import { Button, Icon } from '@dxos/react-ui';
import { SIZE_ARG_TYPES, type SizeArgs, withLayout, withRegistry, withSizes, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import { createStaticTreeModel } from './static-tree-model.ts';
import { type TestItem, createTree, updateState } from './testing.ts';
import { type TreeNode } from './tree-collection.ts';
import { Tree, type TreeDropEvent, type TreeSelectEvent } from './Tree.tsx';
import { type TreeVirtual } from './TreeContext.ts';

random.seed(1234);

const ICONS = ['ph--folder--regular', 'ph--file--regular', 'ph--planet--regular', 'ph--gear--regular'];

/** `roots` branches of `leaves` leaves each: `roots * (leaves + 1)` rows once every branch is open. */
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

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

/** Two sections (`disposition: 'group'`), each a header row above its items. */
const createGroupedTree = (): TestItem => ({
  id: 'root',
  name: 'Root',
  items: [
    {
      id: 'favourites',
      name: 'Favourites',
      disposition: 'group',
      items: [
        {
          id: 'fruit',
          name: 'Fruit',
          icon: 'ph--folder--regular',
          items: [{ id: 'apple', name: 'Apple', items: [] }],
        },
        { id: 'grain', name: 'Grain', icon: 'ph--file--regular', items: [] },
      ],
    },
    {
      id: 'archive',
      name: 'Archive',
      disposition: 'group',
      items: [{ id: 'vegetables', name: 'Vegetables', icon: 'ph--folder--regular', items: [] }],
    },
    { id: 'empty', name: 'Empty section', disposition: 'group', items: [] },
  ],
});

type StoryArgs = SizeArgs & {
  tree: () => TestItem;
  open?: boolean;
  virtual?: TreeVirtual;
  draggable?: boolean;
  indentGuides?: boolean;
  animate?: boolean;
  /** Composes rows from parts instead of the default row. */
  composed?: boolean;
  /** Rows with a custom icon cell and two trailing columns (the current Tree's `renderIcon` and `renderColumns`). */
  columns?: boolean;
  /** Rows with a second line under the label (`Tree.Root` `multiline`). */
  multiline?: boolean;
  /** Ids of rows that cannot be selected; activating such a branch toggles it. */
  unselectable?: string[];
  selectionFollowsFocus?: boolean;
  dropAtEnd?: boolean;
  dropBelowExpanded?: boolean;
  onSelect?: Mock<(event: TreeSelectEvent<TestItem>) => void>;
  height?: string;
  testId?: string;
  /** Ancestors the rows' paths start from, ahead of the tree's id. */
  path?: string[];
};

/** A static model wired the way a consumer wires one: open/current state written back through the registry. */
const useStaticTree = (source: () => TestItem, open: boolean) => {
  const registry = useContext(RegistryContext);
  const root = useMemo(() => source(), [source]);
  const model = useMemo(
    () =>
      createStaticTreeModel<TestItem>(root, {
        getChildren: (item) => item.items,
        getProps: (item) => ({
          label: item.name,
          disposition: item.disposition,
          icon: item.icon,
          iconHue: item.items.length > 0 ? 'amber' : undefined,
          testId: `row-${item.id}`,
        }),
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
    ({ path, current }: TreeSelectEvent<TestItem>) => {
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

/** A row composed from parts: the default row with the icon hued by depth. */
const renderComposedRow = (node: TreeNode<TestItem>) => (
  <Tree.Item node={node}>
    <Tree.ItemIndicator />
    <Tree.ItemIcon hue={node.depth > 1 ? 'teal' : undefined} />
    <Tree.ItemText />
    <Tree.ItemCount />
  </Tree.Item>
);

/** Trailing columns on the Root's template: a custom icon cell, the label, then a figure and a control per row. */
const COLUMNS = 'var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) min-content min-content';

const renderColumnsRow = (node: TreeNode<TestItem>) => (
  <Tree.Item node={node}>
    <Tree.ItemIndicator />
    <Tree.ItemIcon>
      <Icon icon='ph--spinner-gap--regular' spin label='Running' />
    </Tree.ItemIcon>
    <Tree.ItemText />
    <span className='text-fg-muted tabular-nums' data-testid='tree-figure'>
      {node.depth}
    </span>
    <Tree.ItemActions>
      <Button icon='ph--x--regular' iconOnly label='Remove' variant='ghost' size='sm' />
    </Tree.ItemActions>
  </Tree.Item>
);

/** A second line under every leaf's label, spanning from the label's track to the row's end. */
const renderMultilineRow = (node: TreeNode<TestItem>) => (
  <Tree.Item node={node}>
    <Tree.ItemIndicator />
    <Tree.ItemIcon />
    <Tree.ItemText />
    <Tree.ItemCount />
    {!node.branch && (
      <p className='col-[3/-1] row-start-2 pb-1 text-sm text-fg-muted' data-testid='tree-description'>
        A second line, under the label and as tall as its text.
      </p>
    )}
  </Tree.Item>
);

const DefaultStory = ({
  size = 'md',
  tree,
  open = false,
  virtual,
  draggable = false,
  indentGuides = true,
  animate,
  composed,
  columns,
  multiline,
  unselectable,
  selectionFollowsFocus,
  dropAtEnd,
  dropBelowExpanded,
  onSelect: onSelectSpy,
  height = '24rem',
  testId,
  path,
}: StoryArgs) => {
  const { model, onOpenChange, onSelect, onDrop } = useStaticTree(tree, open);
  const canSelect = useCallback(({ item }: { item: TestItem }) => !unselectable?.includes(item.id), [unselectable]);
  const handleSelect = useCallback(
    (event: TreeSelectEvent<TestItem>) => {
      onSelectSpy?.(event);
      onSelect(event);
    },
    [onSelect, onSelectSpy],
  );
  return (
    <div data-place='full' style={{ height, display: 'flex', flexDirection: 'column' }} data-testid={testId}>
      <Tree.Root
        model={model}
        rootId={model.rootId}
        id={`tree-${size}`}
        path={path}
        size={size}
        virtual={virtual}
        draggable={draggable}
        indentGuides={indentGuides}
        animate={animate}
        selectionFollowsFocus={selectionFollowsFocus}
        dropAtEnd={dropAtEnd}
        dropBelowExpanded={dropBelowExpanded}
        columns={columns ? COLUMNS : undefined}
        multiline={multiline}
        canSelect={canSelect}
        onOpenChange={onOpenChange}
        onSelect={handleSelect}
        onDrop={onDrop}
      >
        <Tree.Label srOnly>Tree</Tree.Label>
        <Tree.Content>
          {columns ? renderColumnsRow : multiline ? renderMultilineRow : composed ? renderComposedRow : undefined}
        </Tree.Content>
        <Tree.Empty icon='ph--tree-structure--regular' />
      </Tree.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-list/Tree',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withRegistry, withTheme()],
  args: { size: 'md', tree: () => createTree(4, 3) },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A static model (4 × 4 × 4), closed. The caret toggles a branch; a click on the row selects it. */
export const Default: Story = {};

/** 5,000 rows with every branch open (50 branches of 99 leaves), windowed to the rows in view (`virtual='fixed'`). */
export const Large: Story = {
  args: {
    tree: () => createWideTree(50, 99),
    open: true,
    virtual: 'fixed',
    height: '32rem',
  },
};

/**
 * Drag rows to move them: before or after a row (a line at the landing level), or into a branch (a ring; holding opens
 * a closed branch). The preview is a chip with the row's icon and label. Rows are composed from parts.
 */
export const Draggable: Story = {
  args: { draggable: true, composed: true },
};

/** A custom icon cell and trailing columns on the Root's `columns`: every row's figure lines up in one track. */
export const Columns: Story = {
  args: { columns: true },
  play: async ({ canvasElement }) => {
    const figures = await within(canvasElement).findAllByTestId('tree-figure');
    const lefts = new Set(figures.map((figure) => Math.round(figure.getBoundingClientRect().left)));
    await expect(lefts.size).toBe(1);
    await expect(within(canvasElement).getAllByRole('img', { name: 'Running' }).length).toBe(figures.length);
    // `ItemActions` lays its controls into the row's own tracks.
    const remove = within(canvasElement).getAllByRole('button', { name: 'Remove' })[0];
    await expect(remove.parentElement?.getAttribute('data-part')).toBe('item-actions');
    await expect(getComputedStyle(remove.parentElement ?? remove).display).toBe('contents');
  },
};

/**
 * `multiline` rows: a leaf's second line grows the row to fit, while its caret, icon and label hold the first line at
 * one block; a branch without one stays one block tall.
 */
export const Multiline: Story = {
  args: { tree: createFixedTree, open: true, multiline: true, virtual: 'variable' },
  play: async ({ canvasElement }) => {
    const [description] = await within(canvasElement).findAllByTestId('tree-description');
    const row = description.closest<HTMLElement>('[data-tree-row]');
    const branch = within(canvasElement).getByTestId('row-fruit');
    const label = row?.querySelector<HTMLElement>('.dx-tree-item-text');
    if (!row || !label) {
      throw new Error('Multiline row not found.');
    }
    const block = branch.getBoundingClientRect().height;
    // A variable-height row reports its one-block intrinsic size until it has rendered, so wait for it to grow.
    await waitFor(() => expect(row.getBoundingClientRect().height).toBeGreaterThan(block));
    await expect(description.getBoundingClientRect().top).toBeGreaterThanOrEqual(label.getBoundingClientRect().bottom);
    await expect(Math.abs(description.getBoundingClientRect().left - label.getBoundingClientRect().left)).toBeLessThan(
      1,
    );
    // The label keeps the first line's block, centred as in a one-line row.
    const centre = (rect: DOMRect) => rect.top + rect.height / 2;
    await expect(
      Math.abs(centre(label.getBoundingClientRect()) - (row.getBoundingClientRect().top + block / 2)),
    ).toBeLessThan(1);
  },
};

/** `path` prefixes every row's path (and so its value) ahead of the tree's id. */
export const Prefixed: Story = {
  args: { tree: createFixedTree, path: ['workspace'] },
  play: async ({ canvasElement }) => {
    const [row] = await within(canvasElement).findAllByRole('treeitem');
    const value =
      row.closest('[data-value]')?.getAttribute('data-value') ??
      row.querySelector('[data-value]')?.getAttribute('data-value');
    await expect(value?.startsWith('workspace')).toBe(true);
  },
};

/** Section headers (`disposition: 'group'`) above their items; an empty section shows no header. */
export const Groups: Story = {
  args: { tree: createGroupedTree, draggable: true },
};

/** No rows: `Tree.Empty` shows its translated default in their place. */
export const Empty: Story = {
  args: { tree: () => ({ id: 'root', name: 'Root', items: [] }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryAllByRole('treeitem')).toHaveLength(0);
    await expect(within(canvasElement).getByRole('status')).toHaveTextContent('No items');
    // `Tree.Label srOnly` names the tree without taking space.
    await expect(within(canvasElement).getByRole('tree', { name: 'Tree' })).toBeInTheDocument();
    const label = canvasElement.querySelector('.dx-tree-label');
    await expect(label?.getBoundingClientRect().height).toBeLessThanOrEqual(1);
  },
};

const rows = (tree: HTMLElement) => within(tree).getAllByRole('treeitem');
/** Visible labels, rows and group headers in order (the count badge is not part of a row's name). */
const names = (tree: HTMLElement) =>
  [...tree.querySelectorAll('.dx-tree-item-text, .dx-tree-group-label')].map((element) => element.textContent);
const focusedName = () => document.activeElement?.textContent;

/**
 * Records, per row label, each disclosure phase (with the animation it resolves to) as the row is inserted or
 * re-attributed, and its removal: a MutationObserver sees a phase however short, where a poll could miss it.
 */
const recordDisclosure = (tree: HTMLElement) => {
  const events = new Map<string, string[]>();
  const push = (row: Element, event: string) => {
    const name = row.textContent ?? '';
    events.set(name, [...(events.get(name) ?? []), event]);
  };
  const rowsOf = (node: Node) =>
    node instanceof Element
      ? [...(node.matches('[data-tree-row]') ? [node] : node.querySelectorAll('[data-tree-row]'))]
      : [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        rowsOf(record.target).forEach((row) => {
          const phase = row.getAttribute('data-disclosure');
          phase && push(row, `${phase}:${getComputedStyle(row).animationName}`);
        });
        continue;
      }
      record.addedNodes.forEach((node) =>
        rowsOf(node).forEach((row) => {
          const phase = row.getAttribute('data-disclosure');
          push(row, phase ? `${phase}:${getComputedStyle(row).animationName}` : 'mounted');
        }),
      );
      record.removedNodes.forEach((node) => rowsOf(node).forEach((row) => push(row, 'removed')));
    }
  });
  observer.observe(tree, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-disclosure'] });
  return {
    events: (name: string) => events.get(name) ?? [],
    phases: () => [...events.values()].flat().filter((event) => event !== 'mounted' && event !== 'removed'),
    stop: () => observer.disconnect(),
  };
};

/**
 * Rows are one block tall at every size. The keyboard follows the APG tree pattern from zag: ArrowDown/Up move,
 * ArrowRight opens a branch then enters it, ArrowLeft returns to the parent then closes it, Home/End, typeahead, and
 * Enter selects; the model receives each change and feeds it back (`aria-expanded`, `aria-selected`). Only the caret
 * toggles a branch with the pointer; a click elsewhere on the row selects it.
 */
export const Test: Story = {
  args: { tree: createFixedTree, allSizes: true, draggable: true, testId: 'fixed' },
  play: async ({ canvasElement }) => {
    for (const row of canvasElement.querySelectorAll<HTMLElement>('[data-tree-row]')) {
      // The icon cell is one block square at the row's size; the disclosure cell is half as wide and as tall.
      const block = row.querySelector('.dx-tree-item-icon')?.getBoundingClientRect().width ?? 0;
      const caret = row.querySelector('.dx-tree-item-indicator')?.getBoundingClientRect();
      await expect(block, 'icon cell is sized').toBeGreaterThan(0);
      await expect(row.getBoundingClientRect().height, 'row is one block').toBeCloseTo(block, 0);
      await expect(caret?.width, 'caret cell is half a block wide').toBeCloseTo(block / 2, 0);
      await expect(caret?.height, 'caret cell is one block tall').toBeCloseTo(block, 0);
    }

    const tree = within(canvasElement).getAllByRole('tree')[2];
    const fruit = within(tree).getByRole('treeitem', { name: /Fruit/ });
    await expect(fruit).toHaveAttribute('aria-expanded', 'false');
    await expect(rows(tree)).toHaveLength(3);

    // A click on the label selects the branch without opening it.
    await userEvent.click(within(fruit).getByText('Fruit'));
    await waitFor(() => expect(fruit).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(focusedName()).toContain('Fruit'));
    await expect(fruit).toHaveAttribute('aria-expanded', 'false');

    // The caret opens it; the rows the open mounts enter animated.
    const opening = recordDisclosure(tree);
    const caret = fruit.querySelector<HTMLElement>('[data-part="branch-trigger"]');
    await expect(caret).not.toBeNull();
    caret && (await userEvent.click(caret));
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'true'),
    );
    await expect(rows(tree)).toHaveLength(5);
    await waitFor(() => expect(opening.events('Apple')).toEqual(['enter:dx-tree-row-enter']));
    await waitFor(() => expect(tree.querySelector('[data-disclosure]')).toBeNull());
    opening.stop();

    // A child's guide is centred on its parent's half-block caret cell.
    const apple = within(tree).getByRole('treeitem', { name: /Apple/ });
    const guide = apple.querySelector('.dx-tree-indent-guide')?.getBoundingClientRect();
    const parentCaret = within(tree)
      .getByRole('treeitem', { name: /Fruit/ })
      .querySelector('.dx-tree-item-indicator')
      ?.getBoundingClientRect();
    await expect(guide && parentCaret && guide.left - (parentCaret.left + parentCaret.width / 2)).toBeCloseTo(0, 0);
    within(tree).getByRole('treeitem', { name: /Fruit/ }).focus();

    // Branch disclosure from the keyboard, fed back through the model.
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'false'),
    );
    await expect(rows(tree)).toHaveLength(3);
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'true'),
    );
    await expect(rows(tree)).toHaveLength(5);
    await waitFor(() => expect(tree.querySelector('[data-disclosure]')).toBeNull());
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(focusedName()).toContain('Apple'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focusedName()).toContain('Banana'));
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Banana/ })).toHaveAttribute('aria-selected', 'true'),
    );
    await expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(focusedName()).toContain('Apple'));
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(focusedName()).toContain('Fruit'));
    // A close holds its rows mounted while they conceal, then commits and removes them.
    const closing = recordDisclosure(tree);
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'false'),
    );
    await expect(rows(tree)).toHaveLength(3);
    await expect(closing.events('Banana')).toEqual(['conceal:dx-tree-row-conceal', 'removed']);
    closing.stop();

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

/** Rows rendered open from the start (persisted open state) do not animate; only user-driven disclosure does. */
export const OpenTest: Story = {
  args: { tree: createFixedTree, open: true },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    await expect(rows(tree)).toHaveLength(6);
    for (const row of tree.querySelectorAll<HTMLElement>('[data-tree-row]')) {
      await expect(row).not.toHaveAttribute('data-disclosure');
      await expect(getComputedStyle(row).animationName).toBe('none');
    }
  },
};

/** `animate={false}`: rows appear with the open and leave with the close, with no phase between. */
export const StaticTest: Story = {
  args: { tree: createFixedTree, animate: false },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    const recorder = recordDisclosure(tree);
    tree.querySelector<HTMLElement>('[data-tree-row]')?.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'true'),
    );
    await expect(rows(tree)).toHaveLength(5);
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Fruit/ })).toHaveAttribute('aria-expanded', 'false'),
    );
    await expect(rows(tree)).toHaveLength(3);
    await expect(recorder.events('Banana')).toEqual(['mounted', 'removed']);
    await expect(recorder.phases()).toEqual([]);
    recorder.stop();
  },
};

/**
 * Windowed keyboard: End and Home reach rows the window has not mounted (zag asks `scrollToIndexFn` first, then focuses
 * the row a frame later), and ArrowUp from the top of a scrolled window keeps focus on a mounted row.
 */
export const WindowedTest: Story = {
  args: {
    tree: () => createWideTree(50, 99),
    open: true,
    virtual: 'fixed',
    height: '32rem',
  },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    await expect(rows(tree).length).toBeLessThan(100);
    tree.querySelector<HTMLElement>('[data-tree-row]')?.focus();
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(focusedName()).toContain('Leaf 50.99'));
    await expect(tree.scrollTop).toBeGreaterThan(0);
    // One key at a time: the window re-renders while it settles at the end, and a key sent mid-render is dropped.
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(focusedName()).toContain('Leaf 50.98'));
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(focusedName()).toContain('Leaf 50.97'));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(focusedName()).toContain('Branch 1'));
    await expect(tree.scrollTop).toBe(0);
    await expect(rows(tree).length).toBeLessThan(100);

    // Scrolled far away, the focused row stays mounted, so the tree keeps its tabstop and the arrows carry on from it.
    const branch = document.activeElement;
    tree.scrollTop = tree.scrollHeight / 2;
    await waitFor(() => expect(within(tree).queryByText('Branch 2')).toBeNull());
    await expect(branch?.isConnected).toBe(true);
    await expect(document.activeElement).toBe(branch);
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focusedName()).toContain('Leaf 1.1'));
    await expect(tree.scrollTop).toBeLessThan(100);

    // The host spans the pane's gutters, so the overlay thumb sits at the pane's right edge.
    const thumb = await waitFor(() => {
      const element = tree.closest('.dx-scroll-root')?.querySelector<HTMLElement>(':scope > .absolute');
      if (!element) {
        throw new Error('missing thumb');
      }
      return element;
    });
    const pane = within(canvasElement).getByTestId('size-md');
    await expect(thumb.getBoundingClientRect().right).toBeCloseTo(pane.getBoundingClientRect().right, 0);
  },
};

/** Dispatches a native drag event at a fraction of the element's height, as the browser would mid-drag. */
const dispatchDrag = (element: HTMLElement, type: string, dataTransfer: DataTransfer, fraction = 0.5) => {
  const { x, y, width, height } = element.getBoundingClientRect();
  element.dispatchEvent(
    new DragEvent(type, {
      bubbles: true,
      cancelable: true,
      dataTransfer,
      clientX: x + width / 2,
      clientY: y + height * fraction,
    }),
  );
};

/**
 * Drop targets: over a row's top edge `data-drop-target='top'` draws a line, over a closed branch's centre `inside`
 * rings it, and the drop moves the row into the branch through the model.
 */
export const DropTest: Story = {
  args: { tree: createFixedTree, draggable: true, animate: false },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    // A branch's `treeitem` is a `display: contents` wrapper; the row (the drag source and target) is its control.
    const row = (name: RegExp) => {
      const item = within(tree).getByRole('treeitem', { name });
      const control = item.matches('[data-tree-row]') ? item : item.querySelector<HTMLElement>('[data-tree-row]');
      if (!control) {
        throw new Error(`missing row ${name}`);
      }
      return control;
    };
    const grain = row(/Grain/);
    const vegetables = row(/Vegetables/);
    const fruit = row(/Fruit/);
    await expect(grain).toHaveAttribute('draggable', 'true');

    const dataTransfer = new DataTransfer();
    dispatchDrag(grain, 'dragstart', dataTransfer);
    let dropped = false;
    try {
      // pragmatic-dnd starts the drag a frame after `dragstart`, once the native preview has been taken.
      await nextFrame();
      await waitFor(() => expect(grain).toHaveAttribute('data-dragging'));
      dispatchDrag(vegetables, 'dragenter', dataTransfer, 0.1);
      dispatchDrag(vegetables, 'dragover', dataTransfer, 0.1);
      await waitFor(() => expect(vegetables).toHaveAttribute('data-drop-target', 'top'));
      // The shared row line (row.css) is the target row's own `::after`.
      await expect(getComputedStyle(vegetables, '::after').height).toBe('2px');

      dispatchDrag(fruit, 'dragenter', dataTransfer);
      dispatchDrag(fruit, 'dragover', dataTransfer);
      await waitFor(() => expect(fruit).toHaveAttribute('data-drop-target', 'inside'));
      await waitFor(() => expect(vegetables).not.toHaveAttribute('data-drop-target'));

      dispatchDrag(fruit, 'drop', dataTransfer);
      dropped = true;
    } finally {
      dropped || dispatchDrag(grain, 'dragend', dataTransfer);
    }

    // Grain is now Fruit's last child; the top level keeps Fruit and Vegetables.
    await waitFor(() => expect(names(tree)).toEqual(['Fruit', 'Vegetables']));
    await waitFor(() => expect(row(/Fruit/)).not.toHaveAttribute('data-drop-target'));
    row(/Fruit/).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(names(tree)).toEqual(['Fruit', 'Apple', 'Banana', 'Grain', 'Vegetables']));
  },
};

/**
 * The activation policy of the current Tree: a click selects and does not toggle; a branch that cannot be selected
 * toggles instead, as does an option-click; a click or Enter on the current row reports it again (the machine emits
 * nothing), Enter with `keyboard`; Space toggles a branch.
 */
export const ActivationTest: Story = {
  args: { tree: createFixedTree, animate: false, unselectable: ['vegetables'], onSelect: fn() },
  play: async ({ args, canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    const item = (name: RegExp) => within(tree).getByRole('treeitem', { name });
    const onSelect = args.onSelect;
    if (!onSelect) {
      throw new Error('missing spy');
    }

    // Selectable branch: a click selects it, closed.
    await userEvent.click(within(item(/Fruit/)).getByText('Fruit'));
    await waitFor(() => expect(item(/Fruit/)).toHaveAttribute('aria-selected', 'true'));
    await expect(item(/Fruit/)).toHaveAttribute('aria-expanded', 'false');
    await expect(onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: ['tree-md', 'fruit'], current: true, option: false }),
    );

    // A click on the current row reports it again.
    const calls = onSelect.mock.calls.length;
    await userEvent.click(within(item(/Fruit/)).getByText('Fruit'));
    await waitFor(() => expect(onSelect.mock.calls.length).toBe(calls + 1));

    // Option-click toggles the branch instead of selecting it.
    // One session, so the held key reaches the click.
    const user = userEvent.setup();
    await user.keyboard('{Alt>}');
    await user.click(within(item(/Fruit/)).getByText('Fruit'));
    await user.keyboard('{/Alt}');
    await waitFor(() => expect(item(/Fruit/)).toHaveAttribute('aria-expanded', 'true'));
    await expect(onSelect.mock.calls.length).toBe(calls + 1);

    // A branch that cannot be selected toggles on click.
    await userEvent.click(within(item(/Vegetables/)).getByText('Vegetables'));
    await waitFor(() => expect(item(/Vegetables/)).toHaveAttribute('aria-expanded', 'true'));
    await expect(item(/Vegetables/)).toHaveAttribute('aria-selected', 'false');
    await expect(onSelect.mock.calls.length).toBe(calls + 1);

    // Enter on the current row reports it, from the keyboard; Space toggles the branch.
    item(/Fruit/).querySelector<HTMLElement>('[data-tree-row]')?.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(onSelect).toHaveBeenLastCalledWith(
        expect.objectContaining({ path: ['tree-md', 'fruit'], keyboard: true }),
      ),
    );
    await userEvent.keyboard(' ');
    await waitFor(() => expect(item(/Fruit/)).toHaveAttribute('aria-expanded', 'false'));
  },
};

/** `selectionFollowsFocus`: the arrows select the row they land on. */
export const FollowFocusTest: Story = {
  args: { tree: createFixedTree, selectionFollowsFocus: true },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    tree.querySelector<HTMLElement>('[data-tree-row]')?.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Vegetables/ })).toHaveAttribute('aria-selected', 'true'),
    );
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(within(tree).getByRole('treeitem', { name: /Grain/ })).toHaveAttribute('aria-selected', 'true'),
    );
    await expect(within(tree).getByRole('treeitem', { name: /Vegetables/ })).toHaveAttribute('aria-selected', 'false');
  },
};

/**
 * Groups: headers are rows of the list but not of the collection, so the keyboard and typeahead pass over them, the
 * items under a header keep its level, and an empty section renders no header.
 */
export const GroupsTest: Story = {
  args: { tree: createGroupedTree, animate: false },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    await expect(names(tree)).toEqual(['Favourites', 'Fruit', 'Grain', 'Archive', 'Vegetables']);
    await expect(rows(tree)).toHaveLength(3);
    await expect(within(tree).getByRole('treeitem', { name: /Vegetables/ })).toHaveAttribute('aria-level', '1');
    for (const header of tree.querySelectorAll<HTMLElement>('[data-tree-group]')) {
      const row = tree.querySelector<HTMLElement>('[data-tree-row]');
      await expect(header.getBoundingClientRect().height).toBeCloseTo(row?.getBoundingClientRect().height ?? 0, 0);
    }

    tree.querySelector<HTMLElement>('[data-tree-row]')?.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focusedName()).toContain('Grain'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(focusedName()).toContain('Vegetables'));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(focusedName()).toContain('Fruit'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(names(tree)).toEqual(['Favourites', 'Fruit', 'Apple', 'Grain', 'Archive', 'Vegetables']),
    );
    await userEvent.keyboard('g');
    await waitFor(() => expect(focusedName()).toContain('Grain'));
  },
};

/**
 * `dropAtEnd`: a strip after the last row takes "append at the end", reported as `reorder-below` the last top-level
 * row with `atEnd`; focus returns to the row that moved.
 */
export const EndDropTest: Story = {
  args: { tree: createFixedTree, draggable: true, dropAtEnd: true, animate: false },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    const fruit = within(tree).getByRole('treeitem', { name: /Fruit/ }).querySelector<HTMLElement>('[data-tree-row]');
    const end = tree.querySelector<HTMLElement>('[data-tree-end]');
    if (!fruit || !end) {
      throw new Error('missing row or end strip');
    }
    const dataTransfer = new DataTransfer();
    dispatchDrag(fruit, 'dragstart', dataTransfer);
    await nextFrame();
    dispatchDrag(end, 'dragenter', dataTransfer);
    dispatchDrag(end, 'dragover', dataTransfer);
    await waitFor(() => expect(end).toHaveAttribute('data-drop-target', 'top'));
    dispatchDrag(end, 'drop', dataTransfer);

    await waitFor(() => expect(names(tree)).toEqual(['Vegetables', 'Grain', 'Fruit']));
    await waitFor(() => expect(focusedName()).toContain('Fruit'));
  },
};

/**
 * `dropBelowExpanded`: an open branch's lower edge offers "after this branch and its subtree" (a `bottom` target),
 * where without it the same pixels mean "its first child".
 */
export const DropBelowExpandedTest: Story = {
  args: { tree: createFixedTree, draggable: true, open: true, dropBelowExpanded: true, animate: false },
  play: async ({ canvasElement }) => {
    const tree = within(canvasElement).getByRole('tree');
    const control = (name: RegExp) => {
      const element = within(tree).getByRole('treeitem', { name });
      return element.matches('[data-tree-row]') ? element : element.querySelector<HTMLElement>('[data-tree-row]');
    };
    const grain = control(/Grain/);
    const fruit = control(/Fruit/);
    if (!grain || !fruit) {
      throw new Error('missing rows');
    }
    const dataTransfer = new DataTransfer();
    dispatchDrag(grain, 'dragstart', dataTransfer);
    try {
      await nextFrame();
      dispatchDrag(fruit, 'dragenter', dataTransfer, 0.9);
      dispatchDrag(fruit, 'dragover', dataTransfer, 0.9);
      await waitFor(() => expect(fruit).toHaveAttribute('data-drop-target', 'bottom'));
    } finally {
      dispatchDrag(grain, 'dragend', dataTransfer);
    }
  },
};
