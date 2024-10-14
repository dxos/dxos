//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { create, S } from '@dxos/echo-schema';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { List, type ListRootProps } from './List';
import { createList, TestItemSchema, type TestItemType } from '../../testing';

// TODO(burdon): var-icon-size.
const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2rem] rounded';

const Story = ({ items = [], ...props }: ListRootProps<TestItemType>) => {
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

export default {
  // TODO(burdon): Storybook collides with react-ui/List.
  title: 'react-ui-list/List',
  decorators: [withTheme, withSignals, withLayout({ fullscreen: true })],
  render: Story,
};

const list = create(createList(100));

export const Default = {
  args: {
    items: list.items,
    isItem: S.is(TestItemSchema),
  } satisfies ListRootProps<TestItemType>,
} as any; // TODO(burdon): TS2742: The inferred type of Default cannot be named without a reference to... (AST)

export const Simple = {
  render: SimpleStory,
  args: {
    items: list.items,
    isItem: S.is(TestItemSchema),
  } satisfies ListRootProps<TestItemType>,
} as any; // TODO(burdon): TS2742: The inferred type of Default cannot be named without a reference to... (AST)
