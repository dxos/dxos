//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useContext, useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';
import { ghostHover, mx } from '@dxos/ui-theme';
import { arrayMove } from '@dxos/util';

import { List, type ListRootProps } from './List';
import { TestItemSchema, type TestItemType, type TestList, createList } from './testing';

// TODO(burdon): var-icon-size.
const grid = 'grid grid-cols-[32px_1fr_32px] min-block-[2rem] rounded-sm';

const DefaultStory = (props: Omit<ListRootProps<TestItemType>, 'items'>) => {
  const registry = useContext(RegistryContext);
  const listAtom = useMemo(() => Atom.make<TestList>(createList(100)).pipe(Atom.keepAlive), []);
  const list = useAtomValue(listAtom);
  const items = list.items;

  const handleSelect = (item: TestItemType) => {
    console.log('select', item);
  };
  const handleDelete = (item: TestItemType) => {
    const prev = registry.get(listAtom);
    registry.set(listAtom, {
      ...prev,
      items: prev.items.filter((i) => i.id !== item.id),
    });
  };
  const handleMove = (from: number, to: number) => {
    const prev = registry.get(listAtom);
    const newItems = [...prev.items];
    arrayMove(newItems, from, to);
    registry.set(listAtom, { ...prev, items: newItems });
  };

  return (
    <List.Root<TestItemType> dragPreview items={items} getId={(item) => item.id} onMove={handleMove} {...props}>
      {({ items }) => (
        <>
          <div className='flex flex-col inline-full'>
            <div role='none' className={grid}>
              <div />
              <div className='flex items-center text-sm'>Items</div>
            </div>

            <div role='list' className='inline-full block-full overflow-auto'>
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
              <List.ItemWrapper classNames={mx(grid, 'bg-modal-surface border border-separator')}>
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

const SimpleStory = (props: Omit<ListRootProps<TestItemType>, 'items'>) => {
  const listAtom = useMemo(() => Atom.make<TestList>(createList(100)).pipe(Atom.keepAlive), []);
  const list = useAtomValue(listAtom);
  const items = list.items;

  return (
    <List.Root<TestItemType> dragPreview items={items} {...props}>
      {({ items }) => (
        <div role='list' className='inline-full block-full overflow-auto'>
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

const meta = {
  title: 'ui/react-ui-list/List',
  component: List.Root,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withRegistry],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof List.Root>;

export default meta;

export const Default: StoryObj<typeof DefaultStory> = {
  render: DefaultStory,
  args: {
    isItem: Schema.is(TestItemSchema),
  },
};

export const Simple: StoryObj<typeof SimpleStory> = {
  render: SimpleStory,
  args: {
    isItem: Schema.is(TestItemSchema),
  },
};
