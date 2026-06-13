//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { arrayMove } from '@dxos/util';

import { OrderedList } from './OrderedList';

type Item = { id: string; label: string };

const initialItems: Item[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Bravo' },
  { id: 'c', label: 'Charlie' },
];

const isItem = (value: any): value is Item =>
  !!value && typeof value === 'object' && typeof value.id === 'string';

const DefaultStory = () => {
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
            <OrderedList.Item<Item> key={item.id} id={item.id} item={item}>
              <OrderedList.Row>
                <OrderedList.DragHandle />
                <OrderedList.Title>{item.label}</OrderedList.Title>
                <OrderedList.DeleteButton
                  label='Delete'
                  onClick={() => handleDelete(item.id)}
                  data-testid={`delete-${item.id}`}
                />
                <OrderedList.ExpandCaret data-testid={`caret-${item.id}`} />
              </OrderedList.Row>
              <OrderedList.Expanded>
                <div data-testid={`panel-${item.id}`} className='p-2'>
                  Details for {item.label}
                </div>
              </OrderedList.Expanded>
            </OrderedList.Item>
          ))}
        </OrderedList.Content>
      )}
    </OrderedList.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-list/OrderedList',
  render: () => <DefaultStory />,
  decorators: [withTheme()],
};

export default meta;

export const Default: StoryObj<typeof meta> = {};
