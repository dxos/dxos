//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';

import { SearchList } from './SearchList';

type StoryItems = Record<string, string>;

const defaultItems: StoryItems = faker.helpers
  .uniqueArray(faker.commerce.productName, 16)
  .sort()
  .reduce((acc: StoryItems, label) => {
    acc[faker.string.uuid()] = label;
    return acc;
  }, {});

type StoryProps = {
  items: StoryItems;
};

const DefaultStory = ({ items = defaultItems }: StoryProps) => {
  return (
    <SearchList.Root filter={(value, search) => (items[value].includes(search) ? 1 : 0)}>
      <SearchList.Input placeholder='Search...' />
      <SearchList.Content>
        {Object.entries(items).map(([value, label]) => (
          <SearchList.Item key={value} value={value} onSelect={(value) => console.log('[item select]', value)}>
            {label}
          </SearchList.Item>
        ))}
      </SearchList.Content>
    </SearchList.Root>
  );
};

const meta = {
  title: 'ui/react-ui-searchlist/SearchList',
  component: SearchList.Root as any,
  render: DefaultStory,
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
