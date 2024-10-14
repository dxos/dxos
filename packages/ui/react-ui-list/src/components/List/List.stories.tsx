//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { S } from '@dxos/echo-schema';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { List, type ListRootProps } from './List';
import { createItems, TestSchema, type TestType } from '../../testing';

const Story = (props: ListRootProps<TestType>) => {
  const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem] rounded';
  return (
    <List.Root<TestType> classNames='w-[300px]' dragPreview {...props}>
      {({ items }) => (
        <>
          <div className='w-full'>
            <div role='heading' className={grid}>
              <div />
              <div className='flex items-center text-sm'>Items</div>
            </div>

            <div role='list' className='flex flex-col w-full'>
              {items.map((item) => (
                <List.Item<TestType> key={item.id} item={item} classNames={mx(grid, ghostHover)}>
                  <List.ItemDragHandle />
                  <List.ItemTitle
                    onClick={() => {
                      console.log('select', item.id);
                    }}
                  >
                    {item.name}
                  </List.ItemTitle>
                  <List.ItemDeleteButton
                    onClick={() => {
                      console.log('delete', item.id);
                    }}
                  />
                </List.Item>
              ))}
            </div>
          </div>

          <List.ItemDragPreview<TestType>>
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

export default {
  title: 'react-ui-list/List',
  decorators: [withTheme, withSignals, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  render: Story,
};

const items = createItems(10);

export const Default = {
  args: {
    items,
    isItem: S.is(TestSchema),
  } satisfies ListRootProps<TestType>,
} as any; // TODO(burdon): TS2742: The inferred type of Default cannot be named without a reference to... (AST)
