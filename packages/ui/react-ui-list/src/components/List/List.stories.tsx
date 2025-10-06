//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Schema } from 'effect';
import React from 'react';

import { live } from '@dxos/live-object';
import { withTheme } from '@dxos/react-ui/testing';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { arrayMove } from '@dxos/util';

import { List, type ListRootProps } from './List';
import { TestItemSchema, type TestItemType, createList } from './testing';

// TODO(burdon): var-icon-size.
const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2rem] rounded';

const DefaultStory = ({ items = [], ...props }: ListRootProps<TestItemType>) => {
  const handleSelect = (item: TestItemType) => {
    console.log('select', item);
  };
  const handleDelete = (item: TestItemType) => {
    const idx = items.findIndex((i) => i.id === item.id);
    items.splice(idx, 1);
  };
  const handleMove = (from: number, to: number) => {
    arrayMove(items, from, to);
  };

  return (
    <List.Root<TestItemType> dragPreview items={items} getId={(item) => item.id} onMove={handleMove} {...props}>
      {({ items }) => (
        <>
          <div className='flex flex-col w-full'>
            <div role='none' className={grid}>
              <div />
              <div className='flex items-center text-sm'>Items</div>
            </div>

            <div role='list' className='w-full h-full overflow-auto'>
              {items?.map((item) => (
                <List.Item<TestItemType> key={item.id} item={item} classNames={mx(grid, ghostHover)}>
                  <List.ItemDragHandle />
                  <List.ItemTitle onClick={() => handleSelect(item)}>{item.name}</List.ItemTitle>
                  <List.ItemDeleteButton onClick={() => handleDelete(item)} />
                </List.Item>
              ))}
            </div>

            <div role='none' className={grid}>
              <div />
              <div className='flex items-center text-sm'>{items?.length} Items</div>
            </div>
          </div>

          <List.ItemDragPreview<TestItemType>>
            {({ item }) => (
              <List.ItemWrapper classNames={mx(grid, 'bg-modalSurface border border-separator')}>
                <List.ItemDragHandle />
                <div className='flex items-center'>{item.name}</div>
              </List.ItemWrapper>
            )}
          </List.ItemDragPreview>
        </>
      )}
    </List.Root>
  );
};

const SimpleStory = ({ items = [], ...props }: ListRootProps<TestItemType>) => {
  return (
    <List.Root<TestItemType> dragPreview items={items} {...props}>
      {({ items }) => (
        <div role='list' className='w-full h-full overflow-auto'>
          {items?.map((item) => (
            <List.Item<TestItemType> key={item.id} item={item} classNames={mx(grid, ghostHover)}>
              <List.ItemDragHandle />
              <List.ItemTitle>{item.name}</List.ItemTitle>
              <List.ItemDeleteButton />
            </List.Item>
          ))}
        </div>
      )}
    </List.Root>
  );
};

const list = live(createList(100));

const meta = {
  title: 'ui/react-ui-list/List',
  component: List.Root,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof List.Root>;

export default meta;

export const Default: StoryObj<typeof DefaultStory> = {
  render: DefaultStory,
  args: {
    items: list.items,
    isItem: Schema.is(TestItemSchema),
  },
};

export const Simple: StoryObj<typeof SimpleStory> = {
  render: SimpleStory,
  args: {
    items: list.items,
    isItem: Schema.is(TestItemSchema),
  },
};
