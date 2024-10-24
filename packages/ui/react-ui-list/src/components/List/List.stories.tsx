//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { create, S } from '@dxos/echo-schema';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { List, type ListRootProps } from './List';
import { createList, TestItemSchema, type TestItemType } from '../../testing';

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

  return (
    <List.Root<TestItemType> dragPreview items={items} {...props}>
      {({ items }) => (
        <>
          <div className='flex flex-col w-full'>
            <div role='none' className={grid}>
              <div />
              <div className='flex items-center text-sm'>Items</div>
            </div>

            <div role='list' className='w-full h-full overflow-auto'>
              {items.map((item) => (
                <List.Item<TestItemType> key={item.id} item={item} classNames={mx(grid, ghostHover)}>
                  <List.ItemDragHandle />
                  <List.ItemTitle onClick={() => handleSelect(item)}>{item.name}</List.ItemTitle>
                  <List.ItemDeleteButton onClick={() => handleDelete(item)} />
                </List.Item>
              ))}
            </div>

            <div role='none' className={grid}>
              <div />
              <div className='flex items-center text-sm'>{items.length} Items</div>
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
          {items.map((item) => (
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

const list = create(createList(100));

export const Default: StoryObj<ListRootProps<TestItemType>> = {
  render: DefaultStory,
  args: {
    items: list.items,
    isItem: S.is(TestItemSchema),
  },
};

export const Simple: StoryObj<ListRootProps<TestItemType>> = {
  render: SimpleStory,
  args: {
    items: list.items,
    isItem: S.is(TestItemSchema),
  },
};

const meta: Meta = {
  title: 'ui/react-ui-list/List',
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;
