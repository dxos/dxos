//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/next/theme.css';
import { Next } from '@dxos/react-ui/next';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '@dxos/react-ui/next/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { osTranslations } from '@dxos/ui-theme';
import { arrayMove } from '@dxos/util';

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

// The app provides the os labels; stories provide their own.
const translations = [
  ...uiTranslations,
  { 'en-US': { [osTranslations]: { 'drag-handle.label': 'Drag to rearrange' } } },
];

const getId = (item: { id: string }) => item.id;

/** Handle cell, then the title. */
const HANDLE_COLUMNS = 'var(--nx-block-size) minmax(0, 1fr)';
/** Leading control, title, trailing action. */
const ACTION_COLUMNS = 'var(--nx-block-size) minmax(0, 1fr) var(--nx-block-size)';

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

/** Title-only rows: no drag, no disclosure. */
const SimpleStory = () => (
  <OrderedList.Root items={ITEMS} getId={getId}>
    {({ items }) => (
      <OrderedList.Content aria-label='Simple'>
        {items.map((item) => (
          <OrderedList.Item key={item.id} id={item.id}>
            <OrderedList.ItemText>{item.label}</OrderedList.ItemText>
          </OrderedList.Item>
        ))}
      </OrderedList.Content>
    )}
  </OrderedList.Root>
);

/** A long draggable list in a fixed-height host; the Content scrolls and auto-scrolls under a drag. */
const ScrollableStory = () => {
  const [items, , move] = useItems(LONG);
  return (
    <div data-place='full' className='h-64 flex flex-col'>
      <OrderedList.Root items={items} getId={getId} onMove={move} dragPreview={(item) => item.label}>
        {({ items }) => (
          <OrderedList.Content aria-label='Scrollable'>
            {items.map((item) => (
              <OrderedList.Item key={item.id} id={item.id} columns={HANDLE_COLUMNS}>
                <OrderedList.DragHandle />
                <OrderedList.ItemText>{item.label}</OrderedList.ItemText>
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
    </div>
  );
};

type Todo = Item & { done: boolean };

/** Checkbox, title and remove; the order is intrinsic, so no handle. */
const CheckboxWithRemoveStory = () => {
  const [items, setItems] = useState<Todo[]>(ITEMS.map((item) => ({ ...item, done: false })));
  return (
    <OrderedList.Root items={items} getId={getId}>
      {({ items }) => (
        <OrderedList.Content aria-label='Todos'>
          {items.map((item) => (
            <OrderedList.Item key={item.id} id={item.id} columns={ACTION_COLUMNS}>
              <Next.Checkbox
                aria-label={`Done ${item.label}`}
                checked={item.done}
                onCheckedChange={({ checked }) =>
                  setItems((items) =>
                    items.map((todo) => (todo.id === item.id ? { ...todo, done: checked === true } : todo)),
                  )
                }
              />
              <OrderedList.ItemText tone={item.done ? 'description' : undefined}>{item.label}</OrderedList.ItemText>
              <Next.SystemButton.Remove
                label={`Remove ${item.label}`}
                onClick={() => setItems((items) => items.filter((todo) => todo.id !== item.id))}
              />
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

/** Master-detail rows: handle, the title as the disclosure trigger, a detail panel and a trailing remove. */
const DraggableWithToggleStory = ({ size = 'md' }: SizeArgs) => {
  const [items, setItems, move] = useItems(ITEMS);
  const [expandedId, setExpandedId] = useState<string>();
  return (
    <>
      <OrderedList.Root
        items={items}
        getId={getId}
        onMove={move}
        dragPreview={(item) => item.label}
        expandedId={expandedId}
        onExpandedChange={setExpandedId}
      >
        {({ items }) => (
          <OrderedList.Content aria-label='Letters'>
            {items.map((item) => (
              <OrderedList.DetailItem
                key={item.id}
                id={item.id}
                title={item.label}
                data-testid={`row-${item.id}-${size}`}
                trailing={
                  <Next.SystemButton.Remove
                    label={`Remove ${item.label}`}
                    onClick={() => setItems((items) => items.filter((entry) => entry.id !== item.id))}
                  />
                }
              >
                <Next.Typography data-testid={`panel-${item.id}-${size}`}>Details for {item.label}</Next.Typography>
              </OrderedList.DetailItem>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
      <Next.Typography data-testid={`order-${size}`}>{items.map((item) => item.id).join(' ')}</Next.Typography>
    </>
  );
};

type Group = Item & { children: Item[] };

const GROUPS: Group[] = [
  { id: 'vowels', label: 'Vowels', children: ['A', 'E', 'I'].map((label) => ({ id: `v-${label}`, label })) },
  { id: 'numbers', label: 'Numbers', children: ['One', 'Two', 'Three'].map((label) => ({ id: `n-${label}`, label })) },
];

/** A DetailItem whose detail is another OrderedList; each list only accepts its own rows. */
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
    <OrderedList.Root items={groups} getId={getId} onMove={move}>
      {({ items }) => (
        <OrderedList.Content aria-label='Groups'>
          {items.map((group) => (
            <OrderedList.DetailItem key={group.id} id={group.id} title={group.label}>
              <OrderedList.Root items={group.children} getId={getId} onMove={moveChild(group.id)}>
                {({ items }) => (
                  <OrderedList.Content aria-label={group.label} scroll={false}>
                    {items.map((item) => (
                      <OrderedList.Item key={item.id} id={item.id} columns={HANDLE_COLUMNS}>
                        <OrderedList.DragHandle />
                        <OrderedList.ItemText>{item.label}</OrderedList.ItemText>
                      </OrderedList.Item>
                    ))}
                  </OrderedList.Content>
                )}
              </OrderedList.Root>
            </OrderedList.DetailItem>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

const meta = {
  title: 'ui/react-ui-list/next/OrderedList',
  render: DraggableWithToggleStory,
  decorators: [withSizes(), withTheme()],
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

/**
 * Rows are `listitem`s in a `list`, each the pointer drag source (`draggable`) through its handle. From the keyboard the
 * handle moves its row (Alt+ArrowDown at once; Space grabs, arrows move, Escape drops) and keeps focus. Clicking a
 * title opens its detail and closes the previously open one (single-expand); remove takes the row out. The list scrolls in its own ScrollArea by default.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('list', { name: 'Letters' });
    const order = canvas.getByTestId('order-md');
    await expect(within(list).getAllByRole('listitem')).toHaveLength(ITEMS.length);
    await waitFor(() => expect(canvas.getByTestId('row-a-md')).toHaveAttribute('draggable', 'true'));

    // Keyboard moves through the handle.
    const handles = within(list).getAllByRole('button', { name: 'Drag to rearrange' });
    const handle = handles[0];
    await expect(handle).toHaveAttribute('aria-roledescription', 'drag handle');
    handle.focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(order).toHaveTextContent('b a c d e'));
    await waitFor(() => expect(handle).toHaveFocus());
    await userEvent.keyboard(' {ArrowDown}{ArrowDown}{Escape}');
    await waitFor(() => expect(order).toHaveTextContent('b c d a e'));
    await expect(handle).toHaveAttribute('aria-pressed', 'false');
    // Moving past the end is a no-op.
    await userEvent.keyboard('{Alt>}{ArrowDown}{ArrowDown}{ArrowDown}{/Alt}');
    await waitFor(() => expect(order).toHaveTextContent('b c d e a'));

    // Single-expand disclosure.
    await expect(canvas.queryByTestId('panel-b-md')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Bravo' }));
    await waitFor(() => expect(canvas.getByTestId('panel-b-md')).toBeVisible());
    await expect(canvas.getByRole('button', { name: 'Bravo' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'Charlie' }));
    await waitFor(() => expect(canvas.getByTestId('panel-c-md')).toBeVisible());
    await waitFor(() => expect(canvas.queryByTestId('panel-b-md')).not.toBeInTheDocument());

    // Content scrolls by default: the list is its own ScrollArea's viewport.
    await expect(list).toHaveClass('nx-scroll-viewport');

    // Remove.
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Delta' }));
    await waitFor(() => expect(order).toHaveTextContent('b c e a'));
  },
};
