//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { arrayMove } from '@dxos/util';
import { mx, osTranslations } from '@dxos/ui-theme';

import { OrderedList } from './OrderedList';

type Item = { id: string; label: string };

const initialItems: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
  { id: 'd', label: 'Delta' },
  { id: 'e', label: 'Echo' },
];

const isItem = (value: any): value is Item => !!value && typeof value === 'object' && typeof value.id === 'string';

//
// Simple — a static list with title only. No drag, no toggle, no delete. The lowest-noise
// shape `OrderedList` supports; useful when the chrome (drag/expand/delete) is overkill.
//

const SimpleStory = () => {
  const [items] = useState<Item[]>(initialItems);
  return (
    <OrderedList.Root<Item> items={items} isItem={isItem} getId={(item) => item.id}>
      {({ items: resolved }) => (
        <OrderedList.Content>
          {resolved.map((item) => (
            <OrderedList.Item key={item.id} id={item.id} item={item} hover classNames='px-3 py-2'>
              {item.label}
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

//
// Draggable / Ordered — drag handle + title, reorder via `onMove`. No expand, no delete.
// The canonical "user-curates-the-order" shape (matches the ordered ArrayField pattern).
//

const DraggableStory = () => {
  const [items, setItems] = useState<Item[]>(initialItems);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      arrayMove(next, fromIndex, toIndex);
      return next;
    });
  }, []);

  return (
    <OrderedList.Root<Item> items={items} isItem={isItem} getId={(item) => item.id} onMove={handleMove}>
      {({ items: resolved }) => (
        <OrderedList.Content>
          {resolved.map((item) => (
            <OrderedList.Item
              key={item.id}
              id={item.id}
              item={item}
              hover
              classNames='grid grid-cols-[var(--dx-rail-item)_1fr] items-center gap-1'
            >
              <OrderedList.DragHandle />
              <OrderedList.Title>{item.label}</OrderedList.Title>
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

//
// Checkbox + Delete — checkbox-led row that records a `done` flag, plus an `OrderedList.DeleteButton`
// in the trailing slot. No drag (the order is intrinsic). Matches todo-list shapes
// (`plugin-sidekick/ActionItems` etc.).
//

type TodoItem = Item & { done: boolean };

const initialTodos: TodoItem[] = initialItems.map((item) => ({ ...item, done: false }));

const CheckboxWithDeleteStory = () => {
  const [items, setItems] = useState<TodoItem[]>(initialTodos);

  const handleToggle = useCallback((id: string, checked: boolean) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done: checked } : item)));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <OrderedList.Root<TodoItem> items={items} isItem={isItem} getId={(item) => item.id}>
      {({ items: resolved }) => (
        <OrderedList.Content>
          {resolved.map((item) => (
            <OrderedList.Item
              key={item.id}
              id={item.id}
              item={item}
              hover
              classNames='grid grid-cols-[var(--dx-rail-item)_1fr_var(--dx-rail-item)] items-center gap-1 px-2'
            >
              <Input.Root>
                <Input.Checkbox checked={item.done} onCheckedChange={(next) => handleToggle(item.id, next === true)} />
              </Input.Root>
              <OrderedList.Title classNames={mx(item.done && 'line-through text-subdued')}>
                {item.label}
              </OrderedList.Title>
              <OrderedList.DeleteButton onClick={() => handleDelete(item.id)} />
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

//
// Draggable with Toggle — drag handle + clickable title that opens an inline detail panel,
// plus a trailing delete button. The full master-detail editor shape — same as the
// canonical `OrderedList.DetailItem` and the way `PipelineProperties` / `FieldList` /
// the ordered `ArrayField` consume the compound.
//

const DraggableWithToggleStory = () => {
  const { t } = useTranslation(osTranslations);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [expandedId, setExpandedId] = useState<string>();

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      const next = [...prev];
      arrayMove(next, fromIndex, toIndex);
      return next;
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setExpandedId((current) => (current === id ? undefined : current));
  }, []);

  return (
    <OrderedList.Root<Item>
      items={items}
      isItem={isItem}
      getId={(item) => item.id}
      onMove={handleMove}
      expandedId={expandedId}
      onExpandedChange={setExpandedId}
    >
      {({ items: resolved }) => (
        <OrderedList.Content>
          {resolved.map((item) => (
            <OrderedList.DetailItem<Item>
              key={item.id}
              id={item.id}
              item={item}
              title={item.label}
              trailing={
                <OrderedList.DeleteButton
                  label={t('delete.label')}
                  onClick={() => handleDelete(item.id)}
                  data-testid={`delete-${item.id}`}
                />
              }
            >
              <div data-testid={`panel-${item.id}`} className='p-2'>
                Details for {item.label}
              </div>
            </OrderedList.DetailItem>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-list/OrderedList',
  decorators: [withTheme(), withLayout({ layout: 'column' })],
};

export default meta;

type Story = StoryObj;

export const Simple: Story = { render: () => <SimpleStory /> };
export const Draggable: Story = { render: () => <DraggableStory /> };
export const CheckboxWithDelete: Story = { render: () => <CheckboxWithDeleteStory /> };
export const DraggableWithToggle: Story = { render: () => <DraggableWithToggleStory /> };

// Kept as an alias so the existing OrderedList tests (`composeStories(stories)` →
// `Default`) keep working without a rename. The test exercises the full feature set.
export const Default: Story = DraggableWithToggle;
