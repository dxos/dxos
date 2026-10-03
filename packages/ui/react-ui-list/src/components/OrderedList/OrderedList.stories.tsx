//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import { Checkbox, SystemButton, Typography } from '@dxos/react-ui';
import { SIZE_ARG_TYPES, type SizeArgs, withLayout, withSizes, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';
import { arrayMove } from '@dxos/util';

import { useStableIds } from '../../hooks/index.ts';
import { OrderedList } from './OrderedList.tsx';

type Item = { id: string; label: string };

const ITEMS: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
  { id: 'd', label: 'Delta' },
  { id: 'e', label: 'Echo' },
];

const LONG: Item[] = Array.from({ length: 40 }, (_, index) => ({ id: `item-${index}`, label: `Item ${index + 1}` }));

const MANY: Item[] = Array.from({ length: 1_000 }, (_, index) => ({ id: `row-${index}`, label: `Row ${index + 1}` }));

const getLabel = (item: { label: string }) => item.label;

const useItems = <T,>(initial: T[]) => {
  const [items, setItems] = useState(initial);
  const move = useCallback(
    (from: number, to: number) =>
      setItems((items) => {
        const next = [...items];
        arrayMove(next, from, to);
        return next;
      }),
    [],
  );
  return [items, setItems, move] as const;
};

/** Collapsible rows: handle, text, a trailing Remove and the caret; single-expand through controlled `open`. */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [items, setItems, move] = useItems(ITEMS);
  const [expandedId, setExpandedId] = useState<string>();
  return (
    <>
      <OrderedList.Root items={items} getLabel={getLabel} onMove={move}>
        {({ items }) => (
          <>
            <OrderedList.Label>Letters</OrderedList.Label>
            <OrderedList.Content>
              {items.map((item) => (
                <OrderedList.Item
                  key={item.id}
                  id={item.id}
                  open={expandedId === item.id}
                  onOpenChange={(open) => setExpandedId(open ? item.id : undefined)}
                  data-testid={`row-${item.id}-${size}`}
                >
                  <OrderedList.DragHandle />
                  <OrderedList.ItemText />
                  <SystemButton.Remove
                    onClick={() => setItems((items) => items.filter((entry) => entry.id !== item.id))}
                  />
                  <OrderedList.Detail>
                    <Typography data-testid={`panel-${item.id}-${size}`}>Details for {item.label}</Typography>
                  </OrderedList.Detail>
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          </>
        )}
      </OrderedList.Root>
      <Typography data-testid={`order-${size}`}>{items.map((item) => item.id).join(' ')}</Typography>
    </>
  );
};

/** Text-only rows: no drag, no disclosure. */
const SimpleStory = () => (
  <OrderedList.Root items={ITEMS} getLabel={getLabel}>
    {({ items }) => (
      <OrderedList.Content aria-label='Simple'>
        {items.map((item) => (
          <OrderedList.Item key={item.id} id={item.id}>
            <OrderedList.ItemText />
          </OrderedList.Item>
        ))}
      </OrderedList.Content>
    )}
  </OrderedList.Root>
);

/** The row's whole preview is the drag source (`DragHandle asChild`), as in a stack of thumbnails. */
const PreviewHandleStory = () => {
  const [items, , move] = useItems(ITEMS);
  return (
    <OrderedList.Root items={items} getLabel={getLabel} onMove={move} dragPreview='clone'>
      {({ items }) => (
        <OrderedList.Content aria-label='Previews'>
          {items.map((item) => (
            <OrderedList.Item key={item.id} id={item.id}>
              <OrderedList.DragHandle asChild>
                <div className='p-2 rounded-sm bg-input-surface' data-testid={`preview-${item.id}`}>
                  {item.label}
                </div>
              </OrderedList.DragHandle>
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

/** `value`/`onValueChange` make the list single-selection: a click or Enter on the highlighted row selects it. */
const SelectableStory = () => {
  const [items, , move] = useItems(ITEMS);
  const [selected, setSelected] = useState<string>();
  return (
    <OrderedList.Root items={items} getLabel={getLabel} onMove={move} value={selected} onValueChange={setSelected}>
      {({ items }) => (
        <OrderedList.Content aria-label='Selectable'>
          {items.map((item) => (
            <OrderedList.Item key={item.id} id={item.id}>
              <OrderedList.DragHandle />
              <OrderedList.ItemText />
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

/** A long draggable list in a fixed-height host; the Content scrolls and auto-scrolls under a drag. */
const ScrollableStory = () => {
  const [items, , move] = useItems(LONG);
  return (
    <div data-place='full' className='h-64 flex flex-col'>
      <OrderedList.Root items={items} getLabel={getLabel} onMove={move}>
        {({ items }) => (
          <OrderedList.Content aria-label='Scrollable'>
            {items.map((item) => (
              <OrderedList.Item key={item.id} id={item.id}>
                <OrderedList.DragHandle />
                <OrderedList.ItemText />
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
    </div>
  );
};

/** 1,000 rows windowed by `virtual='fixed'`. */
const VirtualStory = () => {
  const [items, , move] = useItems(MANY);
  return (
    <>
      <div data-place='full' className='h-64 flex flex-col'>
        <OrderedList.Root items={items} getLabel={getLabel} onMove={move} virtual='fixed'>
          {({ items }) => (
            <OrderedList.Content aria-label='Many'>
              {items.map((item) => (
                <OrderedList.Item key={item.id} id={item.id}>
                  <OrderedList.DragHandle />
                  <OrderedList.ItemText />
                </OrderedList.Item>
              ))}
            </OrderedList.Content>
          )}
        </OrderedList.Root>
      </div>
      <Typography data-testid='many-first'>{items[0].label}</Typography>
    </>
  );
};

type Todo = Item & { done: boolean };

/** Checkbox, text and Remove; the order is intrinsic, so no handle. An empty list shows its Empty part. */
const CheckboxWithRemoveStory = () => {
  const [items, setItems] = useState<Todo[]>(ITEMS.slice(0, 2).map((item) => ({ ...item, done: false })));
  return (
    <OrderedList.Root items={items} getLabel={getLabel}>
      {({ items }) => (
        <>
          <OrderedList.Content aria-label='Todos'>
            {items.map((item) => (
              <OrderedList.Item key={item.id} id={item.id}>
                <Checkbox
                  aria-label={`Done ${item.label}`}
                  checked={item.done}
                  onCheckedChange={({ checked }) =>
                    setItems((items) =>
                      items.map((todo) => (todo.id === item.id ? { ...todo, done: checked === true } : todo)),
                    )
                  }
                />
                <OrderedList.ItemText tone={item.done ? 'description' : undefined} />
                <SystemButton.Remove onClick={() => setItems((items) => items.filter((todo) => todo.id !== item.id))} />
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
          <OrderedList.Empty icon='ph--check-circle--regular'>Nothing to do</OrderedList.Empty>
        </>
      )}
    </OrderedList.Root>
  );
};

/** Plain strings with no ids: `useStableIds` keeps an id beside each, so a moved row keeps its state (its detail). */
const StableIdsStory = () => {
  const [values, setValues] = useState(['North', 'East', 'South', 'West']);
  const { items, getId, move } = useStableIds(values);
  return (
    <>
      <OrderedList.Root
        items={items}
        getId={getId}
        getLabel={({ value }) => value}
        onMove={(from, to) => setValues(move(from, to))}
      >
        {({ items }) => (
          <OrderedList.Content aria-label='Directions'>
            {items.map(({ id, value }) => (
              <OrderedList.Item key={id} id={id} collapsible>
                <OrderedList.DragHandle />
                <OrderedList.ItemText />
                <OrderedList.Detail>
                  <Typography>Heading {value}</Typography>
                </OrderedList.Detail>
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
      <Typography data-testid='directions'>{values.join(' ')}</Typography>
    </>
  );
};

/** Rows sharing the Root's `columns`: every row's cells start at the same x. */
const ColumnsStory = () => (
  <OrderedList.Root items={ITEMS} getLabel={getLabel} columns='var(--dx-block-size) minmax(0, 1fr) 6rem'>
    {({ items }) => (
      <OrderedList.Content aria-label='Columns'>
        {items.map((item) => (
          <OrderedList.Item key={item.id} id={item.id} data-testid={`column-row-${item.id}`}>
            <OrderedList.DragHandle />
            <OrderedList.ItemText />
            <Typography tone='description' data-testid={`column-${item.id}`}>
              {item.label.length} letters
            </Typography>
          </OrderedList.Item>
        ))}
      </OrderedList.Content>
    )}
  </OrderedList.Root>
);

type Group = Item & { children: Item[] };

const GROUPS: Group[] = [
  { id: 'vowels', label: 'Vowels', children: ['A', 'E', 'I'].map((label) => ({ id: `v-${label}`, label })) },
  { id: 'numbers', label: 'Numbers', children: ['One', 'Two', 'Three'].map((label) => ({ id: `n-${label}`, label })) },
];

/** A collapsible row whose detail is another OrderedList; each list only accepts its own rows. */
const NestedStory = () => {
  const [groups, setGroups, move] = useItems(GROUPS);
  const moveChild = (groupId: string) => (from: number, to: number) =>
    setGroups((groups) =>
      groups.map((group) => {
        if (group.id !== groupId) {
          return group;
        }
        const children = [...group.children];
        arrayMove(children, from, to);
        return { ...group, children };
      }),
    );
  return (
    <OrderedList.Root items={groups} getLabel={getLabel} onMove={move}>
      {({ items }) => (
        <OrderedList.Content aria-label='Groups'>
          {items.map((group) => (
            <OrderedList.Item key={group.id} id={group.id} collapsible>
              <OrderedList.DragHandle />
              <OrderedList.ItemText />
              <OrderedList.Detail>
                <OrderedList.Root items={group.children} getLabel={getLabel} onMove={moveChild(group.id)}>
                  {({ items }) => (
                    <OrderedList.Content aria-label={group.label} scroll={false}>
                      {items.map((item) => (
                        <OrderedList.Item key={item.id} id={item.id}>
                          <OrderedList.DragHandle />
                          <OrderedList.ItemText />
                        </OrderedList.Item>
                      ))}
                    </OrderedList.Content>
                  )}
                </OrderedList.Root>
              </OrderedList.Detail>
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/OrderedList',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Simple: Story = { render: () => <SimpleStory /> };

export const Scrollable: Story = { render: () => <ScrollableStory /> };

export const CheckboxWithRemove: Story = { render: () => <CheckboxWithRemoveStory /> };

export const Nested: Story = { render: () => <NestedStory /> };

export const Selectable: Story = {
  render: () => <SelectableStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [first, second] = canvas.getAllByRole('option');
    await userEvent.click(first);
    await waitFor(() => expect(first).toHaveAttribute('aria-selected', 'true'));
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(second).toHaveAttribute('aria-selected', 'true'));
    await expect(first).toHaveAttribute('aria-selected', 'false');
  },
};

/** The child of `DragHandle asChild` is the row's drag source. */
export const PreviewHandle: Story = {
  render: () => <PreviewHandleStory />,
  play: async ({ canvasElement }) => {
    const preview = await within(canvasElement).findByTestId(`preview-${ITEMS[0].id}`);
    await waitFor(() => expect(preview.closest('[draggable="true"]')).not.toBeNull());
  },
};

/**
 * 1. Rows are `option`s of a `listbox` named by its Label, each the pointer drag source (`draggable`) through its handle.
 * 2. The grid keyboard: row controls are out of the tab order; ArrowRight enters the highlighted row at its handle,
 *    whose Alt+ArrowDown moves the row (focus stays on the handle); Space grabs, arrows move, Escape drops; Escape again
 *    returns to the list.
 * 3. The caret is a square trigger in the trailing column named by the row's text; opening one row closes the other.
 * 4. Remove is named from the row's text.
 * 5. A row marked `data-drop-target` draws the indicator line on that edge.
 * 6. The default drag preview is a chip labelled by `getLabel`; dragging over a row's upper half marks its top edge
 *    (`useReorder` sets `data-drop-target`), cleared when the drag ends.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('listbox', { name: 'Letters' });
    const order = canvas.getByTestId('order-md');
    await expect(within(list).getAllByRole('option')).toHaveLength(ITEMS.length);
    // A collapsible row drags as a whole: its Collapsible root, holding the row and its detail, is the source.
    await waitFor(() => expect(canvas.getByTestId('row-a-md').parentElement).toHaveAttribute('draggable', 'true'));

    // 2. Keyboard moves through the entered row's handle.
    const handles = within(list).getAllByRole('button', { name: 'Drag to rearrange' });
    const handle = handles[0];
    await expect(handle).toHaveAttribute('aria-roledescription', 'drag handle');
    await expect(handle).toHaveAttribute('tabindex', '-1');
    list.focus();
    await userEvent.keyboard('{Home}{ArrowRight}');
    await waitFor(() => expect(handle).toHaveFocus());
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(order).toHaveTextContent('b a c d e'));
    await waitFor(() => expect(handle).toHaveFocus());
    await userEvent.keyboard(' {ArrowDown}{ArrowDown}{Escape}');
    await waitFor(() => expect(order).toHaveTextContent('b c d a e'));
    await expect(handle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.keyboard('{Alt>}{ArrowDown}{ArrowDown}{ArrowDown}{/Alt}');
    await waitFor(() => expect(order).toHaveTextContent('b c d e a'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(list).toHaveFocus());

    // 3. Single-expand disclosure from the caret.
    await expect(canvas.queryByTestId('panel-b-md')).not.toBeInTheDocument();
    const bravo = canvas.getByRole('button', { name: 'Bravo' });
    const caret = bravo.getBoundingClientRect();
    await expect(caret.width).toBeCloseTo(caret.height, 0);
    await expect(caret.right).toBeCloseTo(canvas.getByTestId('row-b-md').getBoundingClientRect().right, 0);
    await userEvent.click(bravo);
    await waitFor(() => expect(canvas.getByTestId('panel-b-md')).toBeVisible());
    await expect(bravo).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Charlie' }));
    await waitFor(() => expect(canvas.getByTestId('panel-c-md')).toBeVisible());
    await waitFor(() => expect(canvas.queryByTestId('panel-b-md')).not.toBeInTheDocument());
    // The detail spans the row's width, under it.
    const row = canvas.getByTestId('row-c-md').getBoundingClientRect();
    const panel = canvas.getByTestId('panel-c-md').getBoundingClientRect();
    await expect(panel.top).toBeGreaterThanOrEqual(row.bottom - 0.5);

    // Content scrolls by default: the list is its own ScrollArea's viewport.
    await expect(list).toHaveClass('dx-scroll-viewport');

    // 4. Remove, named by the row's text.
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Delta' }));
    await waitFor(() => expect(order).toHaveTextContent('b c e a'));

    // 5. The drop target draws its edge.
    const target = canvas.getByTestId('row-e-md').closest<HTMLElement>('.dx-collapsible');
    target?.setAttribute('data-drop-target', 'bottom');
    const line = target ? getComputedStyle(target, '::after') : undefined;
    await expect(line?.content).toBe('""');
    await expect(line?.position).toBe('absolute');
    await expect(Number.parseFloat(line?.bottom ?? '0')).toBeLessThan(0);
    target?.removeAttribute('data-drop-target');

    // 6. The default preview: pragmatic-dnd renders it into a container on dragstart.
    const previews: HTMLElement[] = [];
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          const chip = node instanceof HTMLElement ? node.querySelector<HTMLElement>('.dx-drag-preview') : null;
          if (chip) {
            previews.push(chip);
          }
        }
      }
    });
    observer.observe(canvasElement.ownerDocument.body, { childList: true, subtree: true });
    const source = canvas.getByTestId('row-c-md').closest<HTMLElement>('[draggable]');
    const grip = within(canvas.getByTestId('row-c-md')).getByRole('button', { name: 'Drag to rearrange' });
    // pragmatic-dnd accepts a dragstart over the handle, which it finds by the event's point.
    const point = grip.getBoundingClientRect();
    source?.dispatchEvent(
      new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        clientX: point.left + point.width / 2,
        clientY: point.top + point.height / 2,
        dataTransfer: new DataTransfer(),
      }),
    );
    await waitFor(() => expect(previews.length).toBeGreaterThan(0));
    observer.disconnect();
    await expect(previews[0]).toHaveTextContent('Charlie');

    // Over another row's upper half, `useReorder` marks that row's top edge as the drop target.
    const over = canvas.getByTestId('row-b-md').parentElement;
    const rect = canvas.getByTestId('row-b-md').getBoundingClientRect();
    const at = { clientX: rect.left + rect.width / 2, clientY: rect.top + 2 };
    for (const type of ['dragenter', 'dragover']) {
      over?.dispatchEvent(
        new DragEvent(type, { bubbles: true, cancelable: true, ...at, dataTransfer: new DataTransfer() }),
      );
    }
    await waitFor(() => expect(over).toHaveAttribute('data-drop-target', 'top'));
    source?.dispatchEvent(new DragEvent('dragend', { bubbles: true, ...at }));
    await waitFor(() => expect(over).not.toHaveAttribute('data-drop-target'));
  },
};

/**
 * Plain strings keep their row identity through moves: a moved row's open detail moves with it.
 */
export const StableIds: Story = {
  render: () => <StableIdsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('listbox', { name: 'Directions' });
    await userEvent.click(canvas.getByRole('button', { name: 'East' }));
    await waitFor(() => expect(canvas.getByText('Heading East')).toBeVisible());
    list.focus();
    await userEvent.keyboard('{Home}{ArrowDown}{ArrowRight}');
    const handle = within(within(list).getByRole('option', { name: /East/ })).getByRole('button', {
      name: 'Drag to rearrange',
    });
    await waitFor(() => expect(handle).toHaveFocus());
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(canvas.getByTestId('directions')).toHaveTextContent('North South East West'));
    await expect(canvas.getByRole('button', { name: 'East' })).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('button', { name: 'South' })).toHaveAttribute('aria-expanded', 'false');
  },
};

/**
 * `virtual='fixed'` mounts a window of the 1,000 rows; the handle still moves its row.
 */
export const Virtual: Story = {
  render: () => <VirtualStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('listbox', { name: 'Many' });
    await expect(within(list).getAllByRole('option').length).toBeLessThan(60);
    list.focus();
    await userEvent.keyboard('{Home}{ArrowRight}{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(canvas.getByTestId('many-first')).toHaveTextContent('Row 2'));
    await userEvent.keyboard('{Escape}{End}');
    await waitFor(() => expect(within(list).getByRole('option', { name: 'Row 1000' })).toBeVisible());
  },
};

/**
 * Root `columns`: every row is a subgrid of the shared tracks.
 */
export const Columns: Story = {
  render: () => <ColumnsStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const left = (id: string) => canvas.getByTestId(`column-${id}`).getBoundingClientRect().left;
    await expect(left('a')).toBeCloseTo(left('c'), 0);
    await expect(canvas.getByTestId('column-a').getBoundingClientRect().width).toBeGreaterThan(90);
  },
};

/**
 * Removing every row leaves the Empty part.
 */
export const Empty: Story = {
  render: () => <CheckboxWithRemoveStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Nothing to do')).toBeNull();
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Done Alpha' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Alpha' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Bravo' }));
    await waitFor(() => expect(canvas.getByText('Nothing to do')).toBeVisible());
  },
};
